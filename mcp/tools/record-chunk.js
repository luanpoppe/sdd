'use strict';

const { SddDb } = require('../db');
const { SddRepo } = require('../repo');
const { Log } = require('../log');
const { ExplainWriter, HIGHLIGHTS_SCHEMA, SYMBOLS_SCHEMA } = require('../explain');
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
    return {
      name: 'sdd_record_chunk',
      description:
        'Registra um chunk implementado, com uma entrada por arquivo tocado. Chame no passo ' +
        'g-bis. Além das 3 linhas do plano de revisão, mande detail/highlights/symbols — o ' +
        'chat fica curto e a profundidade vive aqui. Ver mcp-guide.md.',
      inputSchema: {
        type: 'object',
        required: ['change_id', 'chunk_id'],
        properties: {
          change_id: { type: 'string' },
          chunk_id: { type: 'string', description: 'Ex: "F2.C3" (feature) ou "C3" (bugfix)' },
          feature_slug: { type: 'string', description: 'Omita em bugfix.' },
          title: { type: 'string', description: 'Título do chunk' },
          component: {
            type: 'string',
            description:
              'Rótulo curto do nó no fluxo: a camada/componente, não o título. ' +
              'Ex: "Controller", "Repository", "UseCase". Só com flow_storage: mcp.'
          },
          status: { type: 'string', enum: ['pending', 'in_progress', 'done', 'deviated'] },
          mark: {
            type: 'string',
            enum: [' ', '~', 'x'],
            description: 'Só com tasks_storage: mcp — marca os checkboxes deste chunk no banco.'
          },
          wave: { type: 'integer', description: 'Onda do modo paralelo. Omita no sequencial.' },
          started_at: { type: 'string', description: 'ISO 8601. Omitido = agora.' },
          finished_at: { type: 'string', description: 'ISO 8601. Omitido = agora.' },
          summary: { type: 'string', description: 'O que o chunk fez' },
          reasoning: { type: 'string', description: 'Por quê / como conecta com o macro' },
          files: {
            type: 'array',
            description:
              'Um por arquivo tocado, na ordem de revisão. Ao REGRAVAR o chunk, mande só os ' +
              'arquivos que mudaram: campo ausente preserva o que já está gravado, e arquivo ' +
              'não citado fica intacto. Omita `files` por inteiro se nenhum arquivo mudou.',
            items: {
              type: 'object',
              required: ['path'],
              properties: {
                path: { type: 'string' },
                operation: { type: 'string', enum: ['created', 'modified', 'deleted'] },
                lines_added: { type: 'integer' },
                lines_removed: { type: 'integer' },
                does: { type: 'string', description: 'A linha "Faz"' },
                connects: { type: 'string', description: 'A linha "Conecta"' },
                review_note: { type: 'string', description: 'A linha "Revisar"' },
                detail: {
                  type: 'string',
                  description:
                    'Explicação longa: mecanismo, fluxo de dados, decisão descartada, armadilha. ' +
                    'Deve bastar para entender o arquivo sem abri-lo. Vazio se só repetiria does.'
                },
                diff: {
                  type: 'string',
                  description:
                    'Diff unificado, só de arquivo modificado, cortado em ~200 linhas. ' +
                    'NÃO mande com auto_commit: full — o git já guarda o mesmo diff.'
                },
                highlights: HIGHLIGHTS_SCHEMA,
                symbols: SYMBOLS_SCHEMA,
                is_test: { type: 'boolean', description: 'Teste criado no passo f-bis' },
                drop: {
                  type: 'boolean',
                  description:
                    'Remove este arquivo do chunk. Único jeito de apagar — sumir da lista não apaga.'
                }
              }
            }
          },
          scenario_keys: {
            type: 'array',
            items: { type: 'string' },
            description: 'Cenários da spec que este chunk implementa, ex: ["CT-01","CT-03"].'
          },
          code_review: {
            type: 'array',
            description: 'Achados do code review deste chunk (code_review: on). Substitui os anteriores.',
            items: {
              type: 'object',
              required: ['severity', 'title'],
              properties: {
                severity: { type: 'string', enum: ['grave', 'medio', 'menor'] },
                path: { type: 'string' },
                line: { type: 'integer' },
                title: { type: 'string', description: 'O que está errado, em uma linha' },
                scenario: { type: 'string', description: 'Entrada concreta e o resultado errado' },
                cause: { type: 'string' },
                suggestion: { type: 'string' },
                scope: { type: 'string', enum: ['chunk', 'feature'] }
              }
            }
          },
          data_model: {
            type: 'array',
            description:
              'Entidades modeladas neste chunk (data_model: on). Substitui as anteriores. ' +
              'O que não existe em nenhum outro lugar é decisions/rejected — mande sempre.',
            items: {
              type: 'object',
              required: ['name', 'kind'],
              properties: {
                name: { type: 'string', description: 'Tabela, coleção ou entidade' },
                kind: { type: 'string', enum: ['table', 'collection', 'entity'] },
                operation: { type: 'string', enum: ['created', 'altered', 'dropped'] },
                engine: { type: 'string', description: 'Ex: "PostgreSQL", "MongoDB", "Prisma"' },
                shape: {
                  type: 'string',
                  description: 'Colunas/campos com tipo, nulidade e chaves, uma por linha'
                },
                decisions: { type: 'string', description: 'Cada decisão não-óbvia com o porquê' },
                rejected: { type: 'string', description: 'Alternativa descartada e o motivo' },
                index_notes: { type: 'string', description: 'Índice + a consulta que o justifica' },
                migration: { type: 'string', description: 'Passos numerados e reversibilidade' }
              }
            }
          },
          commit: {
            type: 'object',
            description: 'Commit sugerido ou efetivado',
            required: ['message'],
            properties: {
              message: { type: 'string' },
              mode: { type: 'string', enum: ['full', 'suggest-only'] },
              branch: { type: 'string' },
              sha: { type: 'string' }
            }
          }
        }
      }
    };
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
    RecordChunkTool.replaceFindings(ctx.db, chunkPk, args.code_review);
    RecordChunkTool.replaceDataModels(ctx.db, chunkPk, args.data_model);

    const totals = RecordChunkTool.countDepth(files ?? []);

    Log.info('chunk registrado', {
      change: args.change_id,
      chunk: args.chunk_id,
      files: files ? files.length : 'inalterado',
      highlights: totals.highlights,
      symbols: totals.symbols,
      examples: totals.examples,
      commit: Boolean(args.commit),
      findings: Array.isArray(args.code_review) ? args.code_review.length : 0,
      entities: Array.isArray(args.data_model) ? args.data_model.length : 0
    });

    return { change_pk: change.id, chunk_pk: chunkPk, files_recorded: files ? files.length : null };
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
      index + 1,
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

  /**
   * Achados do code review. Substitui em bloco, como `replaceFiles`: rechamar a tool
   * para o mesmo chunk (ex: depois do commit) tem que deixar a lista igual, não somar
   * os mesmos achados de novo.
   *
   * Campo ausente NÃO apaga o que já existe — é o caso da rechamada só para gravar o
   * commit, que não carrega os achados junto.
   */
  static replaceFindings(db, chunkPk, findings) {
    if (!Array.isArray(findings)) return;

    SddDb.run(db, 'DELETE FROM review_findings WHERE chunk_pk = ?', [chunkPk]);

    const at = SddRepo.nowIso();
    findings.forEach((finding, index) => {
      SddDb.run(
        db,
        `INSERT INTO review_findings
           (chunk_pk, position, severity, path, line, title, scenario, cause, suggestion, scope, at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          chunkPk,
          index,
          finding.severity,
          finding.path ?? null,
          Number.isInteger(finding.line) ? finding.line : null,
          finding.title,
          finding.scenario ?? null,
          finding.cause ?? null,
          finding.suggestion ?? null,
          finding.scope ?? 'chunk',
          at
        ]
      );
    });
  }

  /**
   * Entidades modeladas. Mesma regra de substituição em bloco dos achados: campo ausente
   * não apaga o que já existe, porque a rechamada só para gravar o commit não carrega o
   * modelo junto.
   */
  static replaceDataModels(db, chunkPk, entities) {
    if (!Array.isArray(entities)) return;

    SddDb.run(db, 'DELETE FROM data_models WHERE chunk_pk = ?', [chunkPk]);

    const at = SddRepo.nowIso();
    entities.forEach((entity, index) => {
      SddDb.run(
        db,
        `INSERT INTO data_models
           (chunk_pk, position, name, kind, operation, engine, shape, decisions, rejected,
            index_notes, migration, at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          chunkPk,
          index,
          entity.name,
          entity.kind,
          entity.operation ?? null,
          entity.engine ?? null,
          entity.shape ?? null,
          entity.decisions ?? null,
          entity.rejected ?? null,
          entity.index_notes ?? null,
          entity.migration ?? null,
          at
        ]
      );
    });
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
