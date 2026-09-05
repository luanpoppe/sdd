'use strict';

const { SddRepo } = require('../repo');
const { StateStore } = require('../state-store');
const { Log } = require('../log');

const IN_REVIEW_SCHEMA = {
  type: ['object', 'null'],
  description:
    'Chunk(s) aguardando revisão do usuário. Mande null para limpar quando a revisão fechar.',
  properties: {
    chunks: { type: 'array', items: { type: 'string' } },
    files: { type: 'array', items: { type: 'string' }, description: 'Paths na ordem de revisão' },
    updated: { type: 'string' }
  }
};

/**
 * Bloco volátil do `.sdd.yaml` no banco, para `state_storage: mcp`.
 *
 * Com `state_storage: file` (padrão) estas duas tools não são usadas: o `.sdd.yaml`
 * segue completo e é lido e escrito como sempre.
 */
class WriteStateTool {
  static get definition() {
    return {
      name: 'sdd_write_state',
      description:
        'Grava no banco a parte do .sdd.yaml que muda a cada passo: state, current_feature, ' +
        'current_chunk, in_review e o status de cada feature. Use SOMENTE com state_storage: mcp ' +
        '— nesse modo esses campos não existem mais no arquivo e o banco é a fonte de verdade. ' +
        'Campo ausente do payload é preservado; campo mandado como null é apagado.',
      inputSchema: {
        type: 'object',
        required: ['change_id'],
        properties: {
          change_id: { type: 'string' },
          state: {
            type: ['string', 'null'],
            description: 'Estado da máquina, ex: "implementing", "bug-fixing"'
          },
          current_feature: { type: ['string', 'null'], description: 'Slug da feature em curso' },
          current_chunk: { type: ['string', 'null'], description: 'Ex: "F1.C2"' },
          in_review: IN_REVIEW_SCHEMA,
          updated: { type: 'string', description: 'ISO. Omita para usar o instante da chamada.' },
          features: {
            type: 'array',
            description: 'Só o status de cada feature. Título, resumo e ordem vêm do sdd_sync_change.',
            items: {
              type: 'object',
              required: ['slug'],
              properties: {
                slug: { type: 'string' },
                status: {
                  type: ['string', 'null'],
                  enum: ['pending', 'speccing', 'tasking', 'implementing', 'done', null]
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
    const change = SddRepo.requireChange(ctx.db, projectId, args.change_id);
    const featuresTouched = StateStore.write(ctx.db, change.id, args);

    Log.info('estado gravado', {
      change: args.change_id,
      state: args.state ?? '(preservado)',
      chunk: args.current_chunk ?? '(preservado)',
      features: featuresTouched
    });

    return { change_pk: change.id, change_id: args.change_id, features_touched: featuresTouched };
  }
}

class ReadStateTool {
  static get definition() {
    return {
      name: 'sdd_read_state',
      description:
        'Lê do banco o bloco volátil de uma mudança: state, current_feature, current_chunk, ' +
        'in_review e o status de cada feature. Use com state_storage: mcp no lugar de ler esses ' +
        'campos do .sdd.yaml — no modo padrão leia o arquivo.',
      inputSchema: {
        type: 'object',
        required: ['change_id'],
        properties: { change_id: { type: 'string' } }
      }
    };
  }

  static run(ctx, args) {
    const projectId = SddRepo.ensureProject(ctx.db, ctx.projectRoot);
    const change = SddRepo.requireChange(ctx.db, projectId, args.change_id);
    const state = StateStore.read(ctx.db, change.id);

    Log.info('estado lido', { change: args.change_id, state: state ? state.state : null });
    return state;
  }
}

module.exports = { WriteStateTool, ReadStateTool };
