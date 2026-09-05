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
    component: {
      type: 'string',
      description:
        'Rótulo curto do nó no fluxo: a camada/componente, não o título. ' +
        'Ex: "Controller", "Repository". Só com flow_storage: mcp.'
    },
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
        'Grava o plano de chunks. mode "replace" (padrão) substitui o plano inteiro — é o ' +
        'modo de tasks_storage: mcp, em que não há tasks.md e este plano é a fonte de verdade. ' +
        'mode "plan" só semeia o esqueleto (id, título, arquivos, component) sem apagar nada, ' +
        'para o fluxo no banco quando o tasks.md continua sendo o plano real.',
      inputSchema: {
        type: 'object',
        required: ['change_id', 'chunks'],
        properties: {
          change_id: { type: 'string' },
          feature_slug: { type: 'string', description: 'Omita em bug-fix' },
          chunks: { type: 'array', items: CHUNK_SCHEMA },
          mode: {
            type: 'string',
            enum: ['replace', 'plan'],
            description: 'replace (padrão) = tasks_storage: mcp · plan = esqueleto do fluxo'
          }
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
    const featurePk = feature ? feature.id : null;
    const isPlanOnly = args.mode === 'plan';

    // O modo "plan" existe justamente para NÃO apagar: quem já implementou tem relatório
    // por arquivo, achados e modelagem pendurados no chunk por cascade.
    const written = isPlanOnly
      ? TasksStore.plan(ctx.db, change.id, featurePk, chunks)
      : TasksStore.replace(ctx.db, change.id, featurePk, chunks);

    Log.info('tasks gravadas', {
      change: args.change_id,
      feature: args.feature_slug ?? null,
      mode: isPlanOnly ? 'plan' : 'replace',
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
        'Lê do banco o plano de chunks de uma mudança, com feature, component, status, ' +
        'checkboxes e qual é o próximo pendente. Use com tasks_storage: mcp no lugar de ler o ' +
        'tasks.md, e com flow_storage: mcp para montar o fluxo (omita feature_slug para ler a ' +
        'mudança inteira).',
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
