'use strict';

const { SddDb } = require('../db');
const { SddRepo } = require('../repo');
const { Log } = require('../log');

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 200;

/**
 * Timeline do que já foi feito. É metade do ganho de memória do MCP: o agente
 * responde "onde paramos?" e "o que já foi implementado aqui?" sem reler markdown,
 * inclusive depois de a conversa ter sido compactada.
 */
class QueryHistoryTool {
  static get definition() {
    return {
      name: 'sdd_query_history',
      description:
        'Consulta o histórico do SDD: mudanças, chunks implementados (com duração) e eventos, ' +
        'em ordem cronológica decrescente. Use para retomar contexto de trabalho anterior.',
      inputSchema: {
        type: 'object',
        properties: {
          change_id: { type: 'string', description: 'Restringe a uma mudança' },
          kind: { type: 'string', description: 'Restringe os eventos a um kind (ex: "deviation")' },
          since: { type: 'string', description: 'Data ou ISO 8601 — só o que veio depois' },
          limit: { type: 'integer', description: `Máximo de itens por lista (padrão ${DEFAULT_LIMIT})` },
          all_projects: {
            type: 'boolean',
            description: 'true = busca em todos os projetos do banco, não só no atual'
          }
        }
      }
    };
  }

  static run(ctx, args) {
    const project = SddRepo.findProject(ctx.db, ctx.projectRoot);
    const allProjects = args.all_projects === true;

    if (!project && !allProjects) {
      Log.info('histórico consultado sem registro para o projeto', { root: ctx.projectRoot });
      return { project: null, changes: [], chunks: [], events: [] };
    }

    const limit = QueryHistoryTool.clampLimit(args.limit);
    const scope = { projectId: project ? project.id : null, allProjects, limit, args };

    const result = {
      project: project ? { path: project.path, name: project.name } : null,
      changes: QueryHistoryTool.selectChanges(ctx.db, scope),
      chunks: QueryHistoryTool.selectChunks(ctx.db, scope),
      events: QueryHistoryTool.selectEvents(ctx.db, scope)
    };

    Log.info('histórico consultado', {
      changes: result.changes.length,
      chunks: result.chunks.length,
      events: result.events.length
    });
    return result;
  }

  static clampLimit(raw) {
    if (!Number.isInteger(raw) || raw < 1) return DEFAULT_LIMIT;
    return Math.min(raw, MAX_LIMIT);
  }

  /**
   * Monta o par `WHERE ... / params` comum às três consultas. Extraído porque as
   * três filtram pelo mesmo trio projeto / mudança / data.
   */
  static scopeClause(scope, columns) {
    const conditions = [];
    const params = [];

    if (!scope.allProjects) {
      conditions.push(`${columns.project} = ?`);
      params.push(scope.projectId);
    }
    if (scope.args.change_id) {
      conditions.push(`${columns.changeId} = ?`);
      params.push(scope.args.change_id);
    }
    if (scope.args.since) {
      conditions.push(`${columns.at} >= ?`);
      params.push(scope.args.since);
    }

    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    return { where, params };
  }

  static selectChanges(db, scope) {
    const { where, params } = QueryHistoryTool.scopeClause(scope, {
      project: 'c.project_id',
      changeId: 'c.change_id',
      at: 'c.updated_at'
    });

    return SddDb.all(
      db,
      `SELECT p.name AS project, c.change_id, c.kind, c.title, c.state, c.chosen_solution,
              c.created_at, c.updated_at, c.archived_at,
              (SELECT COUNT(*) FROM features f WHERE f.change_pk = c.id) AS feature_count,
              (SELECT COUNT(*) FROM chunks k WHERE k.change_pk = c.id) AS chunk_count
         FROM changes c
         JOIN projects p ON p.id = c.project_id
         ${where}
        ORDER BY c.updated_at DESC, c.id DESC
        LIMIT ?`,
      [...params, scope.limit]
    );
  }

  static selectChunks(db, scope) {
    const { where, params } = QueryHistoryTool.scopeClause(scope, {
      project: 'c.project_id',
      changeId: 'c.change_id',
      at: 'k.finished_at'
    });

    return SddDb.all(
      db,
      `SELECT p.name AS project, c.change_id, f.slug AS feature, k.chunk_id, k.title, k.status,
              k.wave, k.started_at, k.finished_at, k.summary, k.reasoning,
              (SELECT COUNT(*) FROM file_changes fc WHERE fc.chunk_pk = k.id) AS file_count
         FROM chunks k
         JOIN changes c ON c.id = k.change_pk
         JOIN projects p ON p.id = c.project_id
         LEFT JOIN features f ON f.id = k.feature_pk
         ${where}
        ORDER BY k.finished_at DESC, k.id DESC
        LIMIT ?`,
      [...params, scope.limit]
    );
  }

  static selectEvents(db, scope) {
    const { where, params } = QueryHistoryTool.scopeClause(scope, {
      project: 'e.project_id',
      changeId: 'c.change_id',
      at: 'e.at'
    });

    const kindFilter = scope.args.kind ? `${where ? ' AND' : 'WHERE'} e.kind = ?` : '';
    const kindParams = scope.args.kind ? [scope.args.kind] : [];

    return SddDb.all(
      db,
      `SELECT p.name AS project, c.change_id, k.chunk_id, e.at, e.kind, e.actor, e.summary, e.detail
         FROM events e
         JOIN projects p ON p.id = e.project_id
         LEFT JOIN changes c ON c.id = e.change_pk
         LEFT JOIN chunks k ON k.id = e.chunk_pk
         ${where}${kindFilter}
        ORDER BY e.at DESC, e.id DESC
        LIMIT ?`,
      [...params, ...kindParams, scope.limit]
    );
  }
}

module.exports = { QueryHistoryTool };
