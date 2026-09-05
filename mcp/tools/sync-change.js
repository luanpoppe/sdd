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
        'Espelha a mudança e suas features. Chame na criação e em toda transição de estado. ' +
        'Campo omitido preserva o valor atual. Ver mcp-guide.md.',
      inputSchema: {
        type: 'object',
        required: ['change_id', 'kind'],
        properties: {
          change_id: { type: 'string', description: 'Nome da pasta em .sdd/changes/' },
          kind: { type: 'string', enum: ['feature', 'bugfix'] },
          title: { type: 'string' },
          state: { type: 'string', description: 'Ex: "implementing", "bug-fixing"' },
          chosen_solution: { type: 'string', description: 'Só bugfix: a opção escolhida' },
          created: { type: 'string', description: 'YYYY-MM-DD' },
          updated: { type: 'string' },
          archived: { type: 'string', description: 'Só no lp:archive' },
          features: {
            type: 'array',
            description: 'Lista completa e ordenada. Omita em bugfix.',
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
                },
                scenarios: {
                  type: 'array',
                  description:
                    'Cenários BDD e edge cases da spec. Mande ao gerar a spec — é o que revela ' +
                    'depois o cenário sem chunk nenhum.',
                  items: {
                    type: 'object',
                    required: ['key'],
                    properties: {
                      key: { type: 'string', description: 'Curto e estável, ex: "CT-03"' },
                      title: { type: 'string', description: 'O cenário em uma linha' },
                      body: { type: 'string', description: 'Dado/Quando/Então, se houver' },
                      kind: { type: 'string', enum: ['scenario', 'edge'] }
                    }
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

      SyncChangeTool.syncScenarios(db, changePk, feature);
    });
  }

  /**
   * Cenarios sao upsert por `key`, nunca apagados: um chunk ja pode estar amarrado a
   * um deles, e regerar a spec nao pode desfazer essa rastreabilidade.
   */
  static syncScenarios(db, changePk, feature) {
    const scenarios = Array.isArray(feature.scenarios) ? feature.scenarios : [];
    if (scenarios.length === 0) return;

    const stored = SddDb.one(db, 'SELECT id FROM features WHERE change_pk = ? AND slug = ?', [
      changePk,
      feature.slug
    ]);

    scenarios.forEach((scenario, index) => {
      SddDb.run(
        db,
        `INSERT INTO scenarios (change_pk, feature_pk, key, title, body, kind, position)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT (change_pk, key) DO UPDATE SET
           feature_pk = excluded.feature_pk,
           title      = COALESCE(excluded.title, scenarios.title),
           body       = COALESCE(excluded.body, scenarios.body),
           kind       = COALESCE(excluded.kind, scenarios.kind),
           position   = excluded.position`,
        [
          changePk,
          stored ? stored.id : null,
          scenario.key,
          scenario.title ?? null,
          scenario.body ?? null,
          scenario.kind ?? 'scenario',
          index + 1
        ]
      );
    });
  }
}

module.exports = { SyncChangeTool };
