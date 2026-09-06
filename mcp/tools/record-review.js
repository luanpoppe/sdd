'use strict';

const { SddDb } = require('../db');
const { SddRepo } = require('../repo');
const { Log } = require('../log');
const { ExplainWriter, HIGHLIGHTS_SCHEMA, SYMBOLS_SCHEMA } = require('../explain');

/**
 * Registra o progresso de um `lp:review` — o tour guiado de código existente, que
 * tem estado próprio em `.sdd/reviews/<slug>/.sdd.yaml` e não passa pela máquina de
 * changes.
 *
 * Um step grava a MESMA estrutura de explicação de um arquivo de chunk (destaques de
 * código, símbolos com exemplos de entrada e saída). É de propósito: o `lp:review` é o
 * fluxo que mais produz entendimento de código, e sem isso ele viraria um silo com
 * formato próprio, invisível para a busca que já cobre a implementação.
 */
class RecordReviewTool {
  static get definition() {
    return {
      name: 'sdd_record_review',
      description:
        'Registra um review (lp:review) e, opcionalmente, o step recém-fechado com a mesma ' +
        'profundidade de um chunk. Chame ao marcar cada step como done. Ver mcp-guide.md.',
      inputSchema: {
        type: 'object',
        required: ['slug'],
        properties: {
          slug: { type: 'string', description: 'Slug da pasta em .sdd/reviews/' },
          topic: { type: 'string' },
          state: { type: 'string', enum: ['planning', 'walking', 'paused', 'done'] },
          current_step: { type: 'string' },
          created: { type: 'string' },
          updated: { type: 'string' },
          step: {
            type: 'object',
            description: 'O step recém-fechado. Omita se só atualiza o review.',
            required: ['step_id'],
            properties: {
              step_id: { type: 'string', description: 'Ex: "0", "5", "5.1"' },
              label: { type: 'string' },
              caller: { type: 'string', description: 'Quem chama, com arquivo:linha' },
              position: { type: 'integer' },
              done: { type: 'boolean' },
              summary: { type: 'string', description: 'O que o step explicou, 1-2 frases' },
              detail: {
                type: 'string',
                description:
                  'Explicação longa: mecanismo, fluxo de dados, decisão inferível do código, ' +
                  'armadilha.'
              },
              highlights: HIGHLIGHTS_SCHEMA,
              symbols: SYMBOLS_SCHEMA,
              files: {
                type: 'array',
                items: {
                  type: 'object',
                  required: ['path'],
                  properties: {
                    path: { type: 'string' },
                    note: { type: 'string' }
                  }
                }
              }
            }
          }
        }
      }
    };
  }

  static run(ctx, args) {
    const projectId = SddRepo.ensureProject(ctx.db, ctx.projectRoot);
    const reviewPk = RecordReviewTool.upsertReview(ctx.db, projectId, args);

    if (!args.step) {
      Log.info('review sincronizado', { slug: args.slug, state: args.state ?? null });
      return { review_pk: reviewPk, step_recorded: false };
    }

    const stepPk = RecordReviewTool.upsertStep(ctx.db, reviewPk, args.step);
    // Ausente preserva, como no `sdd_record_chunk`: fechar o step depois, mandando só
    // `done`, não pode apagar os arquivos que ele já tinha listado.
    const files = Array.isArray(args.step.files) ? args.step.files : null;
    if (files) RecordReviewTool.replaceStepFiles(ctx.db, stepPk, files);

    const anchor = { reviewStepPk: stepPk };
    const highlights = ExplainWriter.replaceHighlights(ctx.db, anchor, args.step.highlights);
    const symbols = ExplainWriter.replaceSymbols(ctx.db, anchor, args.step.symbols);

    Log.info('step de review registrado', {
      slug: args.slug,
      step: args.step.step_id,
      files: files ? files.length : 'inalterado',
      highlights,
      symbols: symbols.symbols,
      examples: symbols.examples
    });

    return {
      review_pk: reviewPk,
      step_pk: stepPk,
      files_recorded: files ? files.length : null,
      highlights_recorded: highlights,
      symbols_recorded: symbols.symbols,
      examples_recorded: symbols.examples
    };
  }

  static upsertReview(db, projectId, args) {
    const now = SddRepo.nowIso();

    SddDb.run(
      db,
      `INSERT INTO reviews (project_id, slug, topic, state, current_step, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (project_id, slug) DO UPDATE SET
         topic        = COALESCE(excluded.topic, reviews.topic),
         state        = COALESCE(excluded.state, reviews.state),
         current_step = COALESCE(excluded.current_step, reviews.current_step),
         created_at   = COALESCE(reviews.created_at, excluded.created_at),
         updated_at   = COALESCE(excluded.updated_at, reviews.updated_at)`,
      [
        projectId,
        args.slug,
        args.topic ?? null,
        args.state ?? null,
        args.current_step ?? null,
        args.created ?? now,
        args.updated ?? now
      ]
    );

    const row = SddDb.one(db, 'SELECT id FROM reviews WHERE project_id = ? AND slug = ?', [
      projectId,
      args.slug
    ]);
    return row.id;
  }

  static upsertStep(db, reviewPk, step) {
    SddDb.run(
      db,
      `INSERT INTO review_steps
         (review_pk, step_id, label, caller, position, done, summary, detail, finished_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (review_pk, step_id) DO UPDATE SET
         label       = COALESCE(excluded.label, review_steps.label),
         caller      = COALESCE(excluded.caller, review_steps.caller),
         position    = COALESCE(excluded.position, review_steps.position),
         done        = excluded.done,
         summary     = COALESCE(excluded.summary, review_steps.summary),
         detail      = COALESCE(excluded.detail, review_steps.detail),
         finished_at = COALESCE(excluded.finished_at, review_steps.finished_at)`,
      [
        reviewPk,
        step.step_id,
        step.label ?? null,
        step.caller ?? null,
        step.position ?? null,
        step.done === false ? 0 : 1,
        step.summary ?? null,
        step.detail ?? null,
        step.done === false ? null : SddRepo.nowIso()
      ]
    );

    const row = SddDb.one(db, 'SELECT id FROM review_steps WHERE review_pk = ? AND step_id = ?', [
      reviewPk,
      step.step_id
    ]);
    return row.id;
  }

  static replaceStepFiles(db, stepPk, files) {
    SddDb.run(db, 'DELETE FROM review_files WHERE review_step_pk = ?', [stepPk]);

    for (const file of files) {
      SddDb.run(db, 'INSERT INTO review_files (review_step_pk, path, note) VALUES (?, ?, ?)', [
        stepPk,
        file.path,
        file.note ?? null
      ]);
    }
  }
}

module.exports = { RecordReviewTool };
