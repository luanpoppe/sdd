'use strict';

const { SddDb } = require('../db');
const { SddRepo } = require('../repo');
const { Log } = require('../log');

/**
 * Conhecimento de longo prazo do projeto: as áreas de `.sdd/context/` e os HTMLs
 * acumulativos do `lp:explain`.
 *
 * Eram os dois últimos produtores de entendimento invisíveis ao banco — e são,
 * ironicamente, os mais duradouros: o contexto descreve como o sistema funciona hoje,
 * não o que mudou num chunk. Sem isso, a busca não alcança justamente o material que
 * envelhece melhor.
 */
class RecordKnowledgeTool {
  static get definition() {
    return {
      name: 'sdd_record_knowledge',
      description:
        'Registra uma área de .sdd/context/ ou um tema do lp:explain, para a busca alcançar ' +
        'também o entendimento de longo prazo do projeto.',
      inputSchema: {
        type: 'object',
        required: ['kind', 'slug'],
        properties: {
          kind: {
            type: 'string',
            enum: ['context', 'explain'],
            description: '"context" = .sdd/context/; "explain" = tema do lp:explain'
          },
          slug: { type: 'string', description: 'Ex: "julgados/upload"' },
          title: { type: 'string' },
          path: { type: 'string', description: 'Arquivo correspondente em .sdd/' },
          change_id: { type: 'string', description: 'Se houver' },
          summary: { type: 'string', description: 'O que é, 1-2 frases' },
          detail: {
            type: 'string',
            description:
              'O que vale ser achado depois: como funciona, decisões, armadilhas. Não cole o ' +
              'arquivo inteiro.'
          }
        }
      }
    };
  }

  static run(ctx, args) {
    const projectId = SddRepo.ensureProject(ctx.db, ctx.projectRoot);
    const change = args.change_id ? SddRepo.findChange(ctx.db, projectId, args.change_id) : null;

    SddDb.run(
      ctx.db,
      `INSERT INTO knowledge_entries
         (project_id, change_pk, kind, slug, title, path, summary, detail, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (project_id, kind, slug) DO UPDATE SET
         change_pk  = COALESCE(excluded.change_pk, knowledge_entries.change_pk),
         title      = COALESCE(excluded.title, knowledge_entries.title),
         path       = COALESCE(excluded.path, knowledge_entries.path),
         summary    = COALESCE(excluded.summary, knowledge_entries.summary),
         detail     = COALESCE(excluded.detail, knowledge_entries.detail),
         updated_at = excluded.updated_at`,
      [
        projectId,
        change ? change.id : null,
        args.kind,
        args.slug,
        args.title ?? null,
        args.path ?? null,
        args.summary ?? null,
        args.detail ?? null,
        SddRepo.nowIso()
      ]
    );

    Log.info('conhecimento registrado', { kind: args.kind, slug: args.slug });
    return { kind: args.kind, slug: args.slug };
  }
}

module.exports = { RecordKnowledgeTool };
