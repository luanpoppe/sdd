'use strict';

const { SddDb } = require('../db');
const { SddRepo } = require('../repo');
const { Log } = require('../log');
const { ExplainWriter } = require('../explain');
const { RECORD_CHUNK_DEFINITION } = require('./record-chunk-schema');
const { FindingsWriter } = require('../findings');
const { DataModelWriter } = require('../data-models');
const { FileHash } = require('../file-hash');
const { TasksStore } = require('../tasks-store');

/**
 * Registra um chunk implementado e o relatório por arquivo. Chamada no passo g-bis,
 * que é o único momento em que o agente principal já tem tudo junto: relatório do
 * implementer, ordem de revisão e a mensagem de commit sugerida.
 *
 * O banco guarda MAIS do que o chat mostra. O plano de revisão precisa ser escaneável
 * (1-2 frases por linha), mas quem abre o histórico depois quer profundidade — daí
 * `detail` (explicação longa) e `highlights` (os trechos de código que decidem o
 * arquivo, cada um com sua explicação) existirem só aqui.
 */
class RecordChunkTool {
  static get definition() {
    return RECORD_CHUNK_DEFINITION;
  }

  static run(ctx, args) {
    const projectId = SddRepo.ensureProject(ctx.db, ctx.projectRoot);
    const change = SddRepo.requireChange(ctx.db, projectId, args.change_id);
    const feature = SddRepo.findFeature(ctx.db, change.id, args.feature_slug);

    const chunkPk = RecordChunkTool.upsertChunk(ctx.db, change.id, feature, args);

    const files = Array.isArray(args.files) ? args.files : null;
    if (files) RecordChunkTool.mergeFiles(ctx.db, chunkPk, files, ctx.projectRoot);

    if (args.commit) RecordChunkTool.insertCommit(ctx.db, chunkPk, args.commit);
    if (args.mark) TasksStore.mark(ctx.db, chunkPk, args.mark);
    RecordChunkTool.linkScenarios(ctx.db, change.id, chunkPk, args.scenario_keys);
    FindingsWriter.merge(ctx.db, chunkPk, args.code_review);
    DataModelWriter.replace(ctx.db, chunkPk, args.data_model);

    const totals = RecordChunkTool.countDepth(files ?? []);
    const semProfundidade = RecordChunkTool.filesWithoutDepth(ctx.db, chunkPk);

    Log.info('chunk registrado', {
      change: args.change_id,
      chunk: args.chunk_id,
      files: files ? files.length : 'inalterado',
      highlights: totals.highlights,
      symbols: totals.symbols,
      examples: totals.examples,
      commit: Boolean(args.commit),
      findings: Array.isArray(args.code_review) ? args.code_review.length : 0,
      entities: Array.isArray(args.data_model) ? args.data_model.length : 0,
      semProfundidade: semProfundidade.length
    });

    return {
      change_pk: change.id,
      chunk_pk: chunkPk,
      files_recorded: files ? files.length : null,
      // A tool devolve o que FALTA, em vez de só confirmar o que entrou. `detail`,
      // `highlights` e `symbols` são opcionais no schema e ficam no fim de um passo
      // longo da skill: sem esta resposta, esquecer deles não deixa rastro nenhum, e o
      // histórico nasce raso sem ninguém perceber.
      files_without_depth: semProfundidade
    };
  }

  /**
   * Chave desconhecida é ignorada em silêncio: a spec pode ter sido escrita numa
   * conversa em que o MCP estava desligado, e travar o registro do chunk por causa de
   * uma referência solta seria pior que perder o vínculo.
   */
  static linkScenarios(db, changePk, chunkPk, keys) {
    if (!Array.isArray(keys)) return;

    SddDb.run(db, 'DELETE FROM chunk_scenarios WHERE chunk_pk = ?', [chunkPk]);

    for (const key of keys) {
      const scenario = SddDb.one(db, 'SELECT id FROM scenarios WHERE change_pk = ? AND key = ?', [
        changePk,
        key
      ]);
      if (!scenario) continue;

      SddDb.run(
        db,
        'INSERT OR IGNORE INTO chunk_scenarios (chunk_pk, scenario_pk) VALUES (?, ?)',
        [chunkPk, scenario.id]
      );
    }
  }

  /** Só para o log: quanto de profundidade este chunk trouxe. */
  static countDepth(files) {
    const size = (list) => (Array.isArray(list) ? list.length : 0);

    let highlights = 0;
    let symbols = 0;
    let examples = 0;

    for (const file of files) {
      highlights += size(file.highlights);
      symbols += size(file.symbols);
      for (const symbol of file.symbols ?? []) examples += size(symbol.examples);
    }

    return { highlights, symbols, examples };
  }

  /**
   * Arquivos de código do chunk que ficaram sem `detail`, sem `highlights` e sem
   * `symbols` — ou seja, sem nada além das duas frases do plano de revisão.
   *
   * Consulta o banco, e não o payload, porque o merge é incremental: o que importa é o
   * estado final do chunk, não o que veio nesta chamada.
   *
   * Teste fica fora: o valor de um `.spec` está na lista de cenários, e exigir
   * explicação longa de cada arquivo de teste transformaria o aviso em ruído.
   */
  static filesWithoutDepth(db, chunkPk) {
    const rows = SddDb.all(
      db,
      `SELECT fc.path
         FROM file_changes fc
        WHERE fc.chunk_pk = ?
          AND fc.is_test = 0
          AND (fc.detail IS NULL OR fc.detail = '')
          AND NOT EXISTS (SELECT 1 FROM code_highlights h WHERE h.file_change_pk = fc.id)
          AND NOT EXISTS (SELECT 1 FROM symbols s WHERE s.file_change_pk = fc.id)
        ORDER BY fc.review_order ASC`,
      [chunkPk]
    );

    return rows.map((row) => row.path);
  }

  static upsertChunk(db, changePk, feature, args) {
    const now = SddRepo.nowIso();
    const featurePk = feature ? feature.id : null;

    SddDb.run(
      db,
      `INSERT INTO chunks (change_pk, feature_pk, chunk_id, title, status, wave, started_at, finished_at, summary, reasoning, component)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (change_pk, chunk_id) DO UPDATE SET
         feature_pk  = COALESCE(excluded.feature_pk, chunks.feature_pk),
         title       = COALESCE(excluded.title, chunks.title),
         status      = COALESCE(excluded.status, chunks.status),
         wave        = COALESCE(excluded.wave, chunks.wave),
         started_at  = COALESCE(chunks.started_at, excluded.started_at),
         finished_at = COALESCE(excluded.finished_at, chunks.finished_at),
         summary     = COALESCE(excluded.summary, chunks.summary),
         reasoning   = COALESCE(excluded.reasoning, chunks.reasoning),
         component   = COALESCE(excluded.component, chunks.component)`,
      [
        changePk,
        featurePk,
        args.chunk_id,
        args.title ?? null,
        args.status ?? 'done',
        args.wave ?? null,
        args.started_at ?? now,
        args.finished_at ?? now,
        args.summary ?? null,
        args.reasoning ?? null,
        args.component ?? null
      ]
    );

    const chunk = SddRepo.findChunk(db, changePk, args.chunk_id);
    return chunk.id;
  }

  /**
   * Grava o relatório por arquivo **somando ao que já existe**, nunca substituindo a
   * lista inteira.
   *
   * A versão anterior apagava todos os arquivos do chunk antes de reinserir, tratando
   * o payload como foto completa. Isso custou caro: regravar um chunk depois de um
   * ajuste inline — que é o que o fluxo manda fazer — com um payload que trazia só o
   * `summary` zerava o relatório inteiro do chunk, e com ele os destaques e símbolos
   * pendurados por cascata.
   *
   * Agora vale a mesma regra do resto da tool: **campo ausente preserva**. Arquivo não
   * citado fica como estava; arquivo citado tem só os campos enviados sobrescritos; e
   * remover um arquivo do chunk virou um gesto explícito (`drop: true`).
   */
  static mergeFiles(db, chunkPk, files, projectRoot) {
    files.forEach((file, index) => {
      if (file.drop === true) {
        SddDb.run(db, 'DELETE FROM file_changes WHERE chunk_pk = ? AND path = ?', [
          chunkPk,
          file.path
        ]);
        return;
      }

      const fileChangePk = RecordChunkTool.upsertFile(db, chunkPk, file, index, projectRoot);
      const anchor = { fileChangePk };

      ExplainWriter.replaceHighlights(db, anchor, file.highlights);
      ExplainWriter.replaceSymbols(db, anchor, file.symbols);
    });
  }

  /**
   * Um arquivo do relatório. O merge é feito em JavaScript, e não em `COALESCE` no SQL,
   * porque `is_test` é `NOT NULL` e não distingue "não mandou" de "mandou false" — ler a
   * linha antiga antes deixa a regra visível num lugar só.
   */
  static upsertFile(db, chunkPk, file, index, projectRoot) {
    const previous = SddDb.one(db, 'SELECT * FROM file_changes WHERE chunk_pk = ? AND path = ?', [
      chunkPk,
      file.path
    ]);

    const keep = (incoming, column) => {
      if (incoming === undefined || incoming === null) return previous ? previous[column] : null;
      return incoming;
    };

    const hash = FileHash.of(projectRoot, file.path);
    const isTest = file.is_test === undefined ? (previous ? previous.is_test : 0) : file.is_test ? 1 : 0;

    // A ordem de revisão do arquivo que já existe é preservada. Sem isto, reexplicar UM
    // arquivo de um chunk de seis o jogaria para a primeira posição — o payload de uma
    // reexplicação não é a lista completa, então o índice dele não diz nada.
    const reviewOrder = previous ? previous.review_order : index + 1;

    const values = [
      chunkPk,
      file.path,
      keep(file.operation, 'operation'),
      keep(file.lines_added, 'lines_added'),
      keep(file.lines_removed, 'lines_removed'),
      keep(file.does, 'does'),
      keep(file.connects, 'connects'),
      keep(file.review_note, 'review_note'),
      keep(file.detail, 'detail'),
      keep(file.diff, 'diff'),
      keep(hash, 'content_hash'),
      reviewOrder,
      isTest
    ];

    if (previous) {
      SddDb.run(
        db,
        `UPDATE file_changes
            SET operation = ?, lines_added = ?, lines_removed = ?, does = ?, connects = ?,
                review_note = ?, detail = ?, diff = ?, content_hash = ?, review_order = ?,
                is_test = ?
          WHERE id = ?`,
        [...values.slice(2), previous.id]
      );
      return previous.id;
    }

    const inserted = SddDb.run(
      db,
      `INSERT INTO file_changes
         (chunk_pk, path, operation, lines_added, lines_removed, does, connects, review_note,
          detail, diff, content_hash, review_order, is_test)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      values
    );

    return inserted.lastInsertRowid;
  }

  static insertCommit(db, chunkPk, commit) {
    SddDb.run(
      db,
      `INSERT INTO commits (chunk_pk, at, branch, sha, message, mode) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        chunkPk,
        SddRepo.nowIso(),
        commit.branch ?? null,
        commit.sha ?? null,
        commit.message,
        commit.mode ?? 'suggest-only'
      ]
    );
  }
}

module.exports = { RecordChunkTool };
