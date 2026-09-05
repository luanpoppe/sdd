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
        'Registra um chunk implementado no banco do SDD, com uma entrada por arquivo tocado. ' +
        'Além das 3 linhas do plano de revisão (does/connects/review_note), mande a explicação ' +
        'longa (detail) e os trechos de código decisivos (highlights): o chat fica curto, e a ' +
        'profundidade vive aqui. Chame no passo g-bis, junto de gravar in_review.',
      inputSchema: {
        type: 'object',
        required: ['change_id', 'chunk_id'],
        properties: {
          change_id: { type: 'string' },
          chunk_id: { type: 'string', description: 'ID do chunk, ex: "F2.C3" (feature) ou "C3" (bugfix)' },
          feature_slug: { type: 'string', description: 'Slug da feature dona do chunk. Omita em bugfix.' },
          title: { type: 'string', description: 'Título do chunk como está no tasks.md' },
          status: { type: 'string', enum: ['pending', 'in_progress', 'done', 'deviated'] },
          mark: {
            type: 'string',
            enum: [' ', '~', 'x'],
            description:
              'Só com tasks_storage: mcp — marca os checkboxes deste chunk no plano guardado ' +
              'no banco, equivalente a trocar [ ] por [~] no tasks.md.'
          },
          wave: { type: 'integer', description: 'Número da onda no modo paralelo. Omita no sequencial.' },
          started_at: { type: 'string', description: 'ISO 8601 com hora. Omitido = agora.' },
          finished_at: { type: 'string', description: 'ISO 8601 com hora. Omitido = agora.' },
          summary: { type: 'string', description: 'O que o chunk fez, em prosa' },
          reasoning: { type: 'string', description: 'Por quê / como conecta com o macro (passo b-bis)' },
          files: {
            type: 'array',
            description: 'Um item por arquivo tocado, na ordem de revisão',
            items: {
              type: 'object',
              required: ['path'],
              properties: {
                path: { type: 'string' },
                operation: { type: 'string', enum: ['created', 'modified', 'deleted'] },
                lines_added: { type: 'integer' },
                lines_removed: { type: 'integer' },
                does: { type: 'string', description: 'A linha "Faz" do plano de revisão' },
                connects: { type: 'string', description: 'A linha "Conecta"' },
                review_note: { type: 'string', description: 'A linha "Revisar"' },
                detail: {
                  type: 'string',
                  description:
                    'Explicação longa do arquivo, sem o limite de 1-2 frases do plano de revisão: ' +
                    'o mecanismo, o fluxo de dados, o que foi decidido e descartado, armadilhas. ' +
                    'O leitor deve entender o arquivo sem abrir o código.'
                },
                diff: {
                  type: 'string',
                  description:
                    'Diff unificado do que mudou neste arquivo (so de arquivo modificado; ' +
                    'em arquivo criado o diff seria o arquivo inteiro e os highlights ja bastam). ' +
                    'Corte em ~200 linhas — o banco e indice, nao copia do repo.'
                },
                highlights: HIGHLIGHTS_SCHEMA,
                symbols: SYMBOLS_SCHEMA,
                is_test: { type: 'boolean', description: 'Arquivo de teste criado no passo f-bis' }
              }
            }
          },
          scenario_keys: {
            type: 'array',
            items: { type: 'string' },
            description:
              'Chaves dos cenarios da spec que este chunk implementa (ex: ["CT-01","CT-03"]). ' +
              'E o que da rastreabilidade spec <-> codigo e revela cenario sem cobertura.'
          },
          commit: {
            type: 'object',
            description: 'Commit sugerido ou já efetivado deste chunk',
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

    const files = Array.isArray(args.files) ? args.files : [];
    RecordChunkTool.replaceFiles(ctx.db, chunkPk, files, ctx.projectRoot);

    if (args.commit) RecordChunkTool.insertCommit(ctx.db, chunkPk, args.commit);
    if (args.mark) TasksStore.mark(ctx.db, chunkPk, args.mark);
    RecordChunkTool.linkScenarios(ctx.db, change.id, chunkPk, args.scenario_keys);

    const totals = RecordChunkTool.countDepth(files);

    Log.info('chunk registrado', {
      change: args.change_id,
      chunk: args.chunk_id,
      files: files.length,
      highlights: totals.highlights,
      symbols: totals.symbols,
      examples: totals.examples,
      commit: Boolean(args.commit)
    });

    return { change_pk: change.id, chunk_pk: chunkPk, files_recorded: files.length };
  }

  /**
   * Chave desconhecida é ignorada em silêncio: a spec pode ter sido escrita numa
   * conversa em que o MCP estava desligado, e travar o registro do chunk por causa de
   * uma referência solta seria pior que perder o vínculo.
   */
  static linkScenarios(db, changePk, chunkPk, keys) {
    const list = Array.isArray(keys) ? keys : [];
    SddDb.run(db, 'DELETE FROM chunk_scenarios WHERE chunk_pk = ?', [chunkPk]);

    for (const key of list) {
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
      `INSERT INTO chunks (change_pk, feature_pk, chunk_id, title, status, wave, started_at, finished_at, summary, reasoning)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (change_pk, chunk_id) DO UPDATE SET
         feature_pk  = COALESCE(excluded.feature_pk, chunks.feature_pk),
         title       = COALESCE(excluded.title, chunks.title),
         status      = COALESCE(excluded.status, chunks.status),
         wave        = COALESCE(excluded.wave, chunks.wave),
         started_at  = COALESCE(chunks.started_at, excluded.started_at),
         finished_at = COALESCE(excluded.finished_at, chunks.finished_at),
         summary     = COALESCE(excluded.summary, chunks.summary),
         reasoning   = COALESCE(excluded.reasoning, chunks.reasoning)`,
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
        args.reasoning ?? null
      ]
    );

    const chunk = SddRepo.findChunk(db, changePk, args.chunk_id);
    return chunk.id;
  }

  /**
   * Apaga e reinsere em vez de fazer upsert por arquivo. O relatório de um chunk é
   * uma foto completa: se o chunk for re-registrado depois de uma alteração inline,
   * um arquivo que saiu do escopo tem que sair do banco também.
   */
  static replaceFiles(db, chunkPk, files, projectRoot) {
    SddDb.run(db, 'DELETE FROM file_changes WHERE chunk_pk = ?', [chunkPk]);

    files.forEach((file, index) => {
      const inserted = SddDb.run(
        db,
        `INSERT INTO file_changes
           (chunk_pk, path, operation, lines_added, lines_removed, does, connects, review_note,
            detail, diff, content_hash, review_order, is_test)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          chunkPk,
          file.path,
          file.operation ?? null,
          file.lines_added ?? null,
          file.lines_removed ?? null,
          file.does ?? null,
          file.connects ?? null,
          file.review_note ?? null,
          file.detail ?? null,
          file.diff ?? null,
          FileHash.of(projectRoot, file.path),
          index + 1,
          file.is_test ? 1 : 0
        ]
      );

      const anchor = { fileChangePk: inserted.lastInsertRowid };
      ExplainWriter.replaceHighlights(db, anchor, file.highlights);
      ExplainWriter.replaceSymbols(db, anchor, file.symbols);
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
