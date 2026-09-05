'use strict';

const { SddRepo } = require('../repo');
const { TasksStore } = require('../tasks-store');
const { Log } = require('../log');

const CHUNK_SCHEMA = {
  type: 'object',
  required: ['chunk_id'],
  properties: {
    chunk_id: { type: 'string', description: 'Ex: "F2.C3" ou "C3" em bug-fix' },
    title: { type: 'string' },
    files: {
      type: 'array',
      items: { type: 'string' },
      description: 'Arquivos que o chunk vai tocar'
    },
    depends_on: {
      type: 'array',
      items: { type: 'string' },
      description: 'Chunks que precisam vir antes deste'
    },
    review_order: { type: 'string', description: 'Ordem de revisão dos arquivos' },
    faz: {
      type: 'array',
      items: { type: 'string' },
      description: 'Bloco "Faz" — um item por checkbox'
    },
    validacao: {
      type: 'array',
      items: { type: 'string' },
      description: 'Bloco "Validação" — um item por checkbox'
    }
  }
};

/**
 * Plano de execução no banco, para `tasks_storage: mcp`.
 *
 * Com `tasks_storage: file` (padrão) estas duas tools não são usadas: o `tasks.md`
 * segue sendo escrito e lido como sempre.
 */
class WriteTasksTool {
  static get definition() {
    return {
      name: 'sdd_write_tasks',
      description:
        'Grava o plano de chunks, SUBSTITUINDO o que houver (nunca parcial). Só com ' +
        'tasks_storage: mcp, modo em que não existe tasks.md e este plano é a fonte de verdade.',
      inputSchema: {
        type: 'object',
        required: ['change_id', 'chunks'],
        properties: {
          change_id: { type: 'string' },
          feature_slug: { type: 'string', description: 'Omita em bug-fix' },
          chunks: { type: 'array', items: CHUNK_SCHEMA }
        }
      }
    };
  }

  static run(ctx, args) {
    const projectId = SddRepo.ensureProject(ctx.db, ctx.projectRoot);
    const change = SddRepo.requireChange(ctx.db, projectId, args.change_id);
    const feature = SddRepo.findFeature(ctx.db, change.id, args.feature_slug);

    if (args.feature_slug && !feature) {
      throw new Error(
        `feature "${args.feature_slug}" não existe nesta mudança — chame sdd_sync_change antes`
      );
    }

    const chunks = Array.isArray(args.chunks) ? args.chunks : [];
    const written = TasksStore.replace(ctx.db, change.id, feature ? feature.id : null, chunks);

    Log.info('tasks gravadas', {
      change: args.change_id,
      feature: args.feature_slug ?? null,
      chunks: written
    });
    return { change_pk: change.id, chunks_written: written };
  }
}

class ReadTasksTool {
  static get definition() {
    return {
      name: 'sdd_read_tasks',
      description:
        'Lê do banco o plano de chunks de uma mudança, com os checkboxes e o status de cada ' +
        'um, e qual é o próximo chunk pendente. Use com tasks_storage: mcp no lugar de ler o ' +
        'tasks.md.',
      inputSchema: {
        type: 'object',
        required: ['change_id'],
        properties: {
          change_id: { type: 'string' },
          feature_slug: { type: 'string', description: 'Omita para ler o plano da mudança inteira' }
        }
      }
    };
  }

  static run(ctx, args) {
    const projectId = SddRepo.ensureProject(ctx.db, ctx.projectRoot);
    const change = SddRepo.requireChange(ctx.db, projectId, args.change_id);
    const feature = SddRepo.findFeature(ctx.db, change.id, args.feature_slug);

    // Sem `feature_slug` a leitura é da mudança inteira; com ele, só daquela feature.
    // Em bug-fix não há feature, e os chunks ficam com `feature_pk` nulo.
    const featurePk = args.feature_slug ? (feature ? feature.id : null) : undefined;
    const chunks = TasksStore.read(ctx.db, change.id, featurePk);
    const next = TasksStore.nextPending(ctx.db, change.id);

    Log.info('tasks lidas', { change: args.change_id, chunks: chunks.length });
    return { change_id: args.change_id, chunks, next_pending: next };
  }
}

module.exports = { WriteTasksTool, ReadTasksTool };
