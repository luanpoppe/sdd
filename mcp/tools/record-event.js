'use strict';

const { SddDb } = require('../db');
const { SddRepo } = require('../repo');
const { Log } = require('../log');

const EVENT_KINDS = [
  'state_transition',
  'mode_decision',
  'wave_planned',
  'deviation',
  'commit',
  'note'
];

/**
 * Log append-only para o que não tem tabela própria. É a válvula de escape do
 * schema: um `kind` novo não exige migração.
 *
 * `mode_decision` fecha um buraco real — a escolha sequencial-vs-paralelo do passo b0
 * é perguntada uma vez por feature e hoje não é persistida em lugar nenhum, então
 * reiniciar a conversa perde a decisão.
 */
class RecordEventTool {
  static get definition() {
    return {
      name: 'sdd_record_event',
      description:
        'Registra um evento pontual no histórico do SDD: transição de estado, decisão de modo ' +
        '(sequencial/paralelo), onda planejada no paralelo, divergência detectada no auto-sync, ' +
        'commit efetivado, ou nota livre.',
      inputSchema: {
        type: 'object',
        required: ['kind', 'summary'],
        properties: {
          kind: { type: 'string', enum: EVENT_KINDS },
          summary: { type: 'string', description: 'Uma frase descrevendo o evento' },
          actor: {
            type: 'string',
            enum: ['main', 'implementer', 'scribe', 'tester', 'explorer'],
            description: 'Quem produziu o evento. Omitido = main.'
          },
          change_id: { type: 'string', description: 'Mudança relacionada, se houver' },
          chunk_id: { type: 'string', description: 'Chunk relacionado, se houver' },
          at: { type: 'string', description: 'ISO 8601 com hora. Omitido = agora.' },
          detail: {
            type: 'object',
            description: 'Dados estruturados livres (ex: os chunks da onda e o motivo de exclusão)',
            additionalProperties: true
          }
        }
      }
    };
  }

  static run(ctx, args) {
    const projectId = SddRepo.ensureProject(ctx.db, ctx.projectRoot);

    const change = args.change_id ? SddRepo.findChange(ctx.db, projectId, args.change_id) : null;
    const chunk = change ? SddRepo.findChunk(ctx.db, change.id, args.chunk_id) : null;
    const detail = args.detail === undefined ? null : JSON.stringify(args.detail);

    const inserted = SddDb.run(
      ctx.db,
      `INSERT INTO events (project_id, change_pk, chunk_pk, at, kind, actor, summary, detail)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        projectId,
        change ? change.id : null,
        chunk ? chunk.id : null,
        args.at ?? SddRepo.nowIso(),
        args.kind,
        args.actor ?? 'main',
        args.summary,
        detail
      ]
    );

    Log.info('evento registrado', { kind: args.kind, change: args.change_id ?? null });

    return { event_id: inserted.lastInsertRowid, kind: args.kind };
  }
}

module.exports = { RecordEventTool, EVENT_KINDS };
