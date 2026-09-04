'use strict';

const { SddDb } = require('../db');
const { SddRepo } = require('../repo');
const { Log } = require('../log');

/**
 * Registra o progresso de um `lp:review` — o tour guiado de código existente, que
 * tem estado próprio em `.sdd/reviews/<slug>/.sdd.yaml` e não passa pela máquina de
 * changes.
 */
class RecordReviewTool {
  static get definition() {
    return {
      name: 'sdd_record_review',
      description:
        'Registra no banco do SDD um review (lp:review) e, opcionalmente, o step recém-fechado ' +
        'com os arquivos percorridos. Chame ao marcar cada step como done.',
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
            description: 'O step que acabou de fechar. Omita se está só atualizando o review.',
            required: ['step_id'],
            properties: {
              step_id: { type: 'string', description: 'Ex: "0", "5", "5.1"' },
              label: { type: 'string' },
              caller: { type: 'string', description: 'Ex: "RJController.criar() em RJController.java:34"' },
              position: { type: 'integer' },
              done: { type: 'boolean' },
              summary: { type: 'string', description: 'O que o step explicou' },
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
    const files = Array.isArray(args.step.files) ? args.step.files : [];
    RecordReviewTool.replaceStepFiles(ctx.db, stepPk, files);

    Log.info('step de review registrado', {
      slug: args.slug,
      step: args.step.step_id,
      files: files.length
    });

    return { review_pk: reviewPk, step_pk: stepPk, files_recorded: files.length };
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
      `INSERT INTO review_steps (review_pk, step_id, label, caller, position, done, summary, finished_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (review_pk, step_id) DO UPDATE SET
         label       = COALESCE(excluded.label, review_steps.label),
         caller      = COALESCE(excluded.caller, review_steps.caller),
         position    = COALESCE(excluded.position, review_steps.position),
         done        = excluded.done,
         summary     = COALESCE(excluded.summary, review_steps.summary),
         finished_at = COALESCE(excluded.finished_at, review_steps.finished_at)`,
      [
        reviewPk,
        step.step_id,
        step.label ?? null,
        step.caller ?? null,
        step.position ?? null,
        step.done === false ? 0 : 1,
        step.summary ?? null,
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
