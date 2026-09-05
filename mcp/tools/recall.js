'use strict';

const { SddDb } = require('../db');
const { SddRepo } = require('../repo');
const { Log } = require('../log');

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const LIKE_ESCAPE_CHAR = '~';

/**
 * Busca textual em tudo que já foi explicado. É metade do ganho de memória do MCP:
 * "o que já mexemos no AuthService?" passa a ter resposta mesmo em outro projeto ou em
 * conversa antiga já compactada.
 *
 * A cobertura é o ponto crítico desta tool. Todo campo de explicação novo TEM que
 * entrar aqui — conteúdo que a busca não alcança é conteúdo que ninguém encontra, e o
 * custo de tê-lo gravado vira desperdício.
 *
 * Usa `LIKE`, não FTS5, deliberadamente: não há garantia de que o SQLite embutido no
 * Node traga FTS5 habilitado, e o banco é de poucos MB — a varredura é irrelevante.
 */
class RecallTool {
  static get definition() {
    return {
      name: 'sdd_recall',
      description:
        'Busca no histórico do SDD por termo livre — nome de arquivo, classe, método, conceito. ' +
        'Varre chunks, arquivos, trechos de código destacados, métodos com seus exemplos de ' +
        'entrada e saída, steps de review, cenários da spec, a base de conhecimento do projeto ' +
        'e as decisões registradas. Use antes de mexer em algo ' +
        'que talvez já tenha sido tocado, ou para lembrar como uma parte do sistema funciona.',
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
      return {
        query: args.query,
        files: [],
        chunks: [],
        symbols: [],
        reviews: [],
        knowledge: [],
        scenarios: [],
        decisions: []
      };
    }

    const scope = {
      pattern: RecallTool.likePattern(args.query),
      limit: RecallTool.clampLimit(args.limit),
      projectId: project ? project.id : null,
      allProjects
    };

    const result = {
      query: args.query,
      scope: allProjects ? 'all_projects' : 'current_project',
      symbols: RecallTool.searchSymbols(ctx.db, scope).map(RecallTool.parseExamples),
      files: RecallTool.searchFiles(ctx.db, scope),
      chunks: RecallTool.searchChunks(ctx.db, scope),
      reviews: RecallTool.searchReviewSteps(ctx.db, scope),
      knowledge: RecallTool.searchKnowledge(ctx.db, scope),
      scenarios: RecallTool.searchScenarios(ctx.db, scope),
      decisions: RecallTool.searchEvents(ctx.db, scope)
    };

    Log.info('recall executado', {
      query: args.query,
      symbols: result.symbols.length,
      files: result.files.length,
      chunks: result.chunks.length,
      reviews: result.reviews.length,
      knowledge: result.knowledge.length,
      scenarios: result.scenarios.length,
      decisions: result.decisions.length
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

  /** `campo LIKE ? OR campo LIKE ? ...` mais os parâmetros repetidos, um por campo. */
  static anyColumnMatches(columns, pattern) {
    const clause = columns
      .map((column) => `${column} LIKE ? ESCAPE '${LIKE_ESCAPE_CHAR}'`)
      .join(' OR ');
    return { clause: `(${clause})`, params: columns.map(() => pattern) };
  }

  static projectClause(scope, column) {
    if (scope.allProjects) return { clause: '', params: [] };
    return { clause: `${column} = ? AND`, params: [scope.projectId] };
  }

  /**
   * Símbolos vêm primeiro no resultado: quando alguém busca por um método, a resposta
   * mais útil é a assinatura com os exemplos de entrada e saída, não o chunk que o
   * criou. Os exemplos vêm agregados em JSON para não multiplicar as linhas.
   */
  static searchSymbols(db, scope) {
    const { clause: projectClause, params: projectParams } = RecallTool.projectClause(scope, 'p.id');
    const match = RecallTool.anyColumnMatches(
      ['s.name', 's.signature', 's.purpose', 'e.label', 'e.input', 'e.output', 'e.note'],
      scope.pattern
    );

    return SddDb.all(
      db,
      `SELECT p.name AS project, s.name, s.kind, s.signature, s.purpose,
              c.change_id, k.chunk_id, fc.path, rs.step_id, r.slug AS review_slug,
              (SELECT json_group_array(json_object(
                       'label', ex.label, 'input', ex.input, 'output', ex.output,
                       'note', ex.note, 'is_edge', ex.is_edge))
                 FROM symbol_examples ex WHERE ex.symbol_pk = s.id) AS examples
         FROM symbols s
         LEFT JOIN symbol_examples e ON e.symbol_pk = s.id
         LEFT JOIN file_changes fc ON fc.id = s.file_change_pk
         LEFT JOIN chunks k ON k.id = fc.chunk_pk
         LEFT JOIN changes c ON c.id = k.change_pk
         LEFT JOIN review_steps rs ON rs.id = s.review_step_pk
         LEFT JOIN reviews r ON r.id = rs.review_pk
         JOIN projects p ON p.id = COALESCE(c.project_id, r.project_id)
        WHERE ${projectClause} ${match.clause}
        GROUP BY s.id
        ORDER BY s.id DESC
        LIMIT ?`,
      [...projectParams, ...match.params, scope.limit]
    );
  }

  /**
   * `json_group_array` devolve texto, então o agente receberia JSON escapado dentro de
   * string — ilegível e caro em token. Aqui vira array de verdade.
   */
  static parseExamples(row) {
    if (!row.examples) return row;

    try {
      return { ...row, examples: JSON.parse(row.examples) };
    } catch {
      return { ...row, examples: [] };
    }
  }

  static searchFiles(db, scope) {
    const { clause, params } = RecallTool.projectClause(scope, 'c.project_id');
    const match = RecallTool.anyColumnMatches(
      ['fc.path', 'fc.does', 'fc.connects', 'fc.review_note', 'fc.detail', 'h.label', 'h.snippet', 'h.explanation'],
      scope.pattern
    );

    return SddDb.all(
      db,
      `SELECT p.name AS project, c.change_id, k.chunk_id, k.finished_at,
              fc.path, fc.operation, fc.does, fc.connects, fc.review_note, fc.detail, fc.is_test
         FROM file_changes fc
         LEFT JOIN code_highlights h ON h.file_change_pk = fc.id
         JOIN chunks k ON k.id = fc.chunk_pk
         JOIN changes c ON c.id = k.change_pk
         JOIN projects p ON p.id = c.project_id
        WHERE ${clause} ${match.clause}
        GROUP BY fc.id
        ORDER BY k.finished_at DESC, fc.review_order ASC
        LIMIT ?`,
      [...params, ...match.params, scope.limit]
    );
  }

  static searchChunks(db, scope) {
    const { clause, params } = RecallTool.projectClause(scope, 'c.project_id');
    const match = RecallTool.anyColumnMatches(
      ['k.title', 'k.summary', 'k.reasoning'],
      scope.pattern
    );

    return SddDb.all(
      db,
      `SELECT p.name AS project, c.change_id, c.kind, f.slug AS feature,
              k.chunk_id, k.title, k.status, k.finished_at, k.summary, k.reasoning
         FROM chunks k
         JOIN changes c ON c.id = k.change_pk
         JOIN projects p ON p.id = c.project_id
         LEFT JOIN features f ON f.id = k.feature_pk
        WHERE ${clause} ${match.clause}
        ORDER BY k.finished_at DESC
        LIMIT ?`,
      [...params, ...match.params, scope.limit]
    );
  }

  static searchReviewSteps(db, scope) {
    const { clause, params } = RecallTool.projectClause(scope, 'r.project_id');
    const match = RecallTool.anyColumnMatches(
      ['rs.label', 'rs.summary', 'rs.detail', 'rs.caller', 'rf.path', 'rf.note', 'h.snippet', 'h.explanation'],
      scope.pattern
    );

    return SddDb.all(
      db,
      `SELECT p.name AS project, r.slug AS review, r.topic, rs.step_id, rs.label,
              rs.caller, rs.summary, rs.detail, rs.finished_at
         FROM review_steps rs
         JOIN reviews r ON r.id = rs.review_pk
         JOIN projects p ON p.id = r.project_id
         LEFT JOIN review_files rf ON rf.review_step_pk = rs.id
         LEFT JOIN code_highlights h ON h.review_step_pk = rs.id
        WHERE ${clause} ${match.clause}
        GROUP BY rs.id
        ORDER BY rs.finished_at DESC, rs.id DESC
        LIMIT ?`,
      [...params, ...match.params, scope.limit]
    );
  }

  /**
   * Contexto do projeto e temas do `lp:explain`. É o material que envelhece melhor —
   * descreve como o sistema funciona hoje, não o que mudou num chunk —, então costuma
   * ser o resultado mais útil numa busca por conceito.
   */
  static searchKnowledge(db, scope) {
    const { clause, params } = RecallTool.projectClause(scope, 'k.project_id');
    const match = RecallTool.anyColumnMatches(
      ['k.slug', 'k.title', 'k.summary', 'k.detail'],
      scope.pattern
    );

    return SddDb.all(
      db,
      `SELECT p.name AS project, k.kind, k.slug, k.title, k.path, k.summary, k.detail, k.updated_at
         FROM knowledge_entries k
         JOIN projects p ON p.id = k.project_id
        WHERE ${clause} ${match.clause}
        ORDER BY k.updated_at DESC
        LIMIT ?`,
      [...params, ...match.params, scope.limit]
    );
  }

  /** Cenário da spec, com os chunks que o implementaram (vazio = sem cobertura). */
  static searchScenarios(db, scope) {
    const { clause, params } = RecallTool.projectClause(scope, 'c.project_id');
    const match = RecallTool.anyColumnMatches(['s.key', 's.title', 's.body'], scope.pattern);

    return SddDb.all(
      db,
      `SELECT p.name AS project, c.change_id, f.slug AS feature, s.key, s.title, s.body, s.kind,
              (SELECT group_concat(k2.chunk_id, ', ')
                 FROM chunk_scenarios cs
                 JOIN chunks k2 ON k2.id = cs.chunk_pk
                WHERE cs.scenario_pk = s.id) AS implementado_por
         FROM scenarios s
         JOIN changes c ON c.id = s.change_pk
         JOIN projects p ON p.id = c.project_id
         LEFT JOIN features f ON f.id = s.feature_pk
        WHERE ${clause} ${match.clause}
        ORDER BY s.position ASC
        LIMIT ?`,
      [...params, ...match.params, scope.limit]
    );
  }

  /** O `detail` do evento é JSON; a busca é textual sobre ele mesmo, sem parsear. */
  static searchEvents(db, scope) {
    const { clause, params } = RecallTool.projectClause(scope, 'e.project_id');
    const match = RecallTool.anyColumnMatches(['e.summary', 'e.detail'], scope.pattern);

    return SddDb.all(
      db,
      `SELECT p.name AS project, c.change_id, e.at, e.kind, e.summary, e.detail
         FROM events e
         JOIN projects p ON p.id = e.project_id
         LEFT JOIN changes c ON c.id = e.change_pk
        WHERE ${clause} ${match.clause}
        ORDER BY e.at DESC
        LIMIT ?`,
      [...params, ...match.params, scope.limit]
    );
  }
}

module.exports = { RecallTool };
