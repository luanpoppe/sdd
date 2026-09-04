'use strict';

const { SddDb } = require('../db');
const { SddRepo } = require('../repo');
const { Log } = require('../log');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const LIKE_ESCAPE_CHAR = '~';

/**
 * Busca textual no que já foi implementado. É a outra metade do ganho de memória:
 * "o que já mexemos no AuthService?" passa a ter resposta mesmo em outro projeto ou
 * em conversa antiga já compactada.
 *
 * Usa `LIKE`, não FTS5, deliberadamente: não há garantia de que o SQLite embutido no
 * Node traga FTS5 habilitado, e o banco é de poucos KB — a varredura é irrelevante.
 */
class RecallTool {
  static get definition() {
    return {
      name: 'sdd_recall',
      description:
        'Busca no histórico do SDD por termo livre — nome de arquivo, classe, conceito. ' +
        'Devolve os chunks e arquivos que casam, com a explicação do que foi feito neles. ' +
        'Use antes de mexer em algo que talvez já tenha sido tocado.',
      inputSchema: {
        type: 'object',
        required: ['query'],
        properties: {
          query: { type: 'string', description: 'Termo a buscar, ex: "AuthService" ou "anonimização"' },
          limit: { type: 'integer', description: `Máximo de resultados por lista (padrão ${DEFAULT_LIMIT})` },
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
      Log.info('recall sem registro para o projeto', { root: ctx.projectRoot });
      return { query: args.query, files: [], chunks: [] };
    }

    const pattern = RecallTool.likePattern(args.query);
    const limit = RecallTool.clampLimit(args.limit);
    const projectId = project ? project.id : null;

    const result = {
      query: args.query,
      scope: allProjects ? 'all_projects' : 'current_project',
      files: RecallTool.searchFiles(ctx.db, { pattern, limit, projectId, allProjects }),
      chunks: RecallTool.searchChunks(ctx.db, { pattern, limit, projectId, allProjects })
    };

    Log.info('recall executado', {
      query: args.query,
      files: result.files.length,
      chunks: result.chunks.length
    });
    return result;
  }

  static clampLimit(raw) {
    if (!Number.isInteger(raw) || raw < 1) return DEFAULT_LIMIT;
    return Math.min(raw, MAX_LIMIT);
  }

  /**
   * `%` e `_` digitados pelo usuário são coringas do LIKE — escapados para que a
   * busca por um caminho tipo `auth_service.ts` não vire um padrão amplo demais.
   */
  static likePattern(query) {
    const escaped = query
      .split(LIKE_ESCAPE_CHAR)
      .join(LIKE_ESCAPE_CHAR + LIKE_ESCAPE_CHAR)
      .split('%')
      .join(`${LIKE_ESCAPE_CHAR}%`)
      .split('_')
      .join(`${LIKE_ESCAPE_CHAR}_`);
    return `%${escaped}%`;
  }

  static projectClause(scope, column) {
    if (scope.allProjects) return { clause: '', params: [] };
    return { clause: `${column} = ? AND`, params: [scope.projectId] };
  }

  static searchFiles(db, scope) {
    const { clause, params } = RecallTool.projectClause(scope, 'c.project_id');
    const { pattern, limit } = scope;

    return SddDb.all(
      db,
      `SELECT p.name AS project, c.change_id, k.chunk_id, k.finished_at,
              fc.path, fc.operation, fc.does, fc.connects, fc.review_note, fc.is_test
         FROM file_changes fc
         JOIN chunks k ON k.id = fc.chunk_pk
         JOIN changes c ON c.id = k.change_pk
         JOIN projects p ON p.id = c.project_id
        WHERE ${clause} (
              fc.path LIKE ? ESCAPE '${LIKE_ESCAPE_CHAR}'
           OR fc.does LIKE ? ESCAPE '${LIKE_ESCAPE_CHAR}'
           OR fc.connects LIKE ? ESCAPE '${LIKE_ESCAPE_CHAR}'
           OR fc.review_note LIKE ? ESCAPE '${LIKE_ESCAPE_CHAR}'
        )
        ORDER BY k.finished_at DESC, fc.review_order ASC
        LIMIT ?`,
      [...params, pattern, pattern, pattern, pattern, limit]
    );
  }

  static searchChunks(db, scope) {
    const { clause, params } = RecallTool.projectClause(scope, 'c.project_id');
    const { pattern, limit } = scope;

    return SddDb.all(
      db,
      `SELECT p.name AS project, c.change_id, c.kind, f.slug AS feature,
              k.chunk_id, k.title, k.status, k.finished_at, k.summary, k.reasoning
         FROM chunks k
         JOIN changes c ON c.id = k.change_pk
         JOIN projects p ON p.id = c.project_id
         LEFT JOIN features f ON f.id = k.feature_pk
        WHERE ${clause} (
              k.title LIKE ? ESCAPE '${LIKE_ESCAPE_CHAR}'
           OR k.summary LIKE ? ESCAPE '${LIKE_ESCAPE_CHAR}'
           OR k.reasoning LIKE ? ESCAPE '${LIKE_ESCAPE_CHAR}'
        )
        ORDER BY k.finished_at DESC
        LIMIT ?`,
      [...params, pattern, pattern, pattern, limit]
    );
  }
}

module.exports = { RecallTool };
