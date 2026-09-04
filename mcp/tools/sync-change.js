'use strict';

const { SddDb } = require('../db');
const { SddRepo } = require('../repo');
const { Log } = require('../log');

/**
 * Espelha o `.sdd/changes/<id>/.sdd.yaml` no banco: a mudança e a lista de features.
 * Chamada na criação e em toda transição de `state`.
 */
class SyncChangeTool {
  static get definition() {
    return {
      name: 'sdd_sync_change',
      description:
        'Espelha no banco do SDD o estado de uma mudança (feature ou bugfix) e suas features. ' +
        'Chame na criação da mudança e em toda transição de estado. Campos omitidos preservam o valor atual.',
      inputSchema: {
        type: 'object',
        required: ['change_id', 'kind'],
        properties: {
          change_id: { type: 'string', description: 'ID da pasta em .sdd/changes/, ex: "anonimizar-texto"' },
          kind: { type: 'string', enum: ['feature', 'bugfix'] },
          title: { type: 'string' },
          state: { type: 'string', description: 'Estado da máquina, ex: "implementing", "bug-fixing"' },
          chosen_solution: { type: 'string', description: 'Só bugfix: a opção escolhida' },
          created: { type: 'string', description: 'Data de criação do .sdd.yaml (YYYY-MM-DD)' },
          updated: { type: 'string' },
          archived: { type: 'string', description: 'Preenchido só no lp:archive' },
          features: {
            type: 'array',
            description: 'Lista completa e ordenada das features. Omita em bugfix.',
            items: {
              type: 'object',
              required: ['slug'],
              properties: {
                slug: { type: 'string' },
                title: { type: 'string' },
                summary: { type: 'string' },
                status: {
                  type: 'string',
                  enum: ['pending', 'speccing', 'tasking', 'implementing', 'done']
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
    const change = SddRepo.upsertChange(ctx.db, projectId, args);

    const features = Array.isArray(args.features) ? args.features : [];
    SyncChangeTool.syncFeatures(ctx.db, change.id, features);

    Log.info('mudança sincronizada', {
      change: args.change_id,
      state: args.state ?? null,
      features: features.length
    });

    return {
      project_id: projectId,
      change_pk: change.id,
      change_id: args.change_id,
      features_synced: features.length
    };
  }

  /**
   * Upsert por slug, preservando o que veio vazio. Features não são removidas quando
   * saem da lista: o `plan.md` pode ser reescrito, e apagar levaria embora os chunks
   * já registrados junto (FK em cascata).
   */
  static syncFeatures(db, changePk, features) {
    features.forEach((feature, index) => {
      SddDb.run(
        db,
        `INSERT INTO features (change_pk, slug, title, summary, position, status)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (change_pk, slug) DO UPDATE SET
           title    = COALESCE(excluded.title, features.title),
           summary  = COALESCE(excluded.summary, features.summary),
           position = excluded.position,
           status   = COALESCE(excluded.status, features.status)`,
        [
          changePk,
          feature.slug,
          feature.title ?? null,
          feature.summary ?? null,
          index + 1,
          feature.status ?? null
        ]
      );
    });
  }
}

module.exports = { SyncChangeTool };
