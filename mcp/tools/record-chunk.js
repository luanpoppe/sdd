'use strict';

const { SddDb } = require('../db');
const { SddRepo } = require('../repo');
const { Log } = require('../log');

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
                highlights: {
                  type: 'array',
                  description:
                    'Os trechos de código que valem ser lidos neste arquivo, na ordem de leitura. ' +
                    'Inclua só o que é decisivo — não cole o arquivo inteiro.',
                  items: {
                    type: 'object',
                    required: ['snippet'],
                    properties: {
                      label: { type: 'string', description: 'Título do trecho, ex: "Lookup em lote"' },
                      lines: { type: 'string', description: 'Faixa de linhas, ex: "34-48"' },
                      language: { type: 'string', description: 'Linguagem para destaque, ex: "csharp"' },
                      snippet: { type: 'string', description: 'O código, recortado no essencial' },
                      explanation: {
                        type: 'string',
                        description: 'O que este trecho faz e por que ele importa'
                      }
                    }
                  }
                },
                is_test: { type: 'boolean', description: 'Arquivo de teste criado no passo f-bis' }
              }
            }
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
    RecordChunkTool.replaceFiles(ctx.db, chunkPk, files);

    if (args.commit) RecordChunkTool.insertCommit(ctx.db, chunkPk, args.commit);

    const highlightCount = files.reduce(
      (total, file) => total + (Array.isArray(file.highlights) ? file.highlights.length : 0),
      0
    );

    Log.info('chunk registrado', {
      change: args.change_id,
      chunk: args.chunk_id,
      files: files.length,
      highlights: highlightCount,
      commit: Boolean(args.commit)
    });

    return { change_pk: change.id, chunk_pk: chunkPk, files_recorded: files.length };
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
  static replaceFiles(db, chunkPk, files) {
    SddDb.run(db, 'DELETE FROM file_changes WHERE chunk_pk = ?', [chunkPk]);

    files.forEach((file, index) => {
      const inserted = SddDb.run(
        db,
        `INSERT INTO file_changes
           (chunk_pk, path, operation, lines_added, lines_removed, does, connects, review_note,
            detail, review_order, is_test)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
          index + 1,
          file.is_test ? 1 : 0
        ]
      );

      const highlights = Array.isArray(file.highlights) ? file.highlights : [];
      RecordChunkTool.insertHighlights(db, inserted.lastInsertRowid, highlights);
    });
  }

  /**
   * Não precisa apagar antes: os `file_changes` acabaram de ser recriados, e o
   * `ON DELETE CASCADE` levou os destaques antigos junto.
   */
  static insertHighlights(db, fileChangePk, highlights) {
    highlights.forEach((highlight, index) => {
      SddDb.run(
        db,
        `INSERT INTO code_highlights
           (file_change_pk, position, label, lines, language, snippet, explanation)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          fileChangePk,
          index + 1,
          highlight.label ?? null,
          highlight.lines ?? null,
          highlight.language ?? null,
          highlight.snippet,
          highlight.explanation ?? null
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
