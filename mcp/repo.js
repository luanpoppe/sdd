'use strict';

const { SddDb } = require('./db');
const { ProjectResolver } = require('./project');

/**
 * Upserts compartilhados por mais de uma tool.
 *
 * Toda tool precisa do `project_id`, e quatro delas precisam resolver um `change_id`
 * textual para a chave numérica — daí a extração. Nada específico de uma tool só
 * mora aqui.
 */
class SddRepo {
  /** Timestamp completo, com hora. É o que o `.sdd.yaml` não tem (lá é só a data). */
  static nowIso() {
    return new Date().toISOString();
  }

  static ensureProject(db, projectRoot) {
    const path = ProjectResolver.normalize(projectRoot);
    const name = ProjectResolver.name(path);
    const now = SddRepo.nowIso();

    SddDb.run(
      db,
      `INSERT INTO projects (path, name, created_at, last_seen_at) VALUES (?, ?, ?, ?)
       ON CONFLICT (path) DO UPDATE SET last_seen_at = excluded.last_seen_at, name = excluded.name`,
      [path, name, now, now]
    );

    const row = SddDb.one(db, 'SELECT id FROM projects WHERE path = ?', [path]);
    return row.id;
  }

  static findProject(db, projectRoot) {
    const path = ProjectResolver.normalize(projectRoot);
    return SddDb.one(db, 'SELECT id, path, name FROM projects WHERE path = ?', [path]);
  }

  /**
   * Cria a mudança se não existir e atualiza só os campos recebidos — `COALESCE`
   * preserva o que já estava lá quando a tool é chamada com payload parcial (uma
   * transição de estado, por exemplo, não reenvia `created_at`).
   */
  static upsertChange(db, projectId, input) {
    const kind = input.kind === 'bugfix' ? 'bugfix' : 'feature';

    SddDb.run(
      db,
      `INSERT INTO changes (project_id, change_id, kind, title, state, chosen_solution, created_at, updated_at, archived_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT (project_id, change_id) DO UPDATE SET
         kind            = excluded.kind,
         title           = COALESCE(excluded.title, changes.title),
         state           = COALESCE(excluded.state, changes.state),
         chosen_solution = COALESCE(excluded.chosen_solution, changes.chosen_solution),
         created_at      = COALESCE(changes.created_at, excluded.created_at),
         updated_at      = COALESCE(excluded.updated_at, changes.updated_at),
         archived_at     = COALESCE(excluded.archived_at, changes.archived_at)`,
      [
        projectId,
        input.change_id,
        kind,
        input.title ?? null,
        input.state ?? null,
        input.chosen_solution ?? null,
        input.created ?? SddRepo.nowIso(),
        input.updated ?? SddRepo.nowIso(),
        input.archived ?? null
      ]
    );

    return SddRepo.requireChange(db, projectId, input.change_id);
  }

  static findChange(db, projectId, changeId) {
    return SddDb.one(
      db,
      'SELECT id, change_id, kind, title, state FROM changes WHERE project_id = ? AND change_id = ?',
      [projectId, changeId]
    );
  }

  static requireChange(db, projectId, changeId) {
    const change = SddRepo.findChange(db, projectId, changeId);
    if (!change) {
      throw new Error(
        `mudança "${changeId}" não existe no banco para este projeto — chame sdd_sync_change antes`
      );
    }
    return change;
  }

  static findFeature(db, changePk, slug) {
    if (!slug) return null;
    return SddDb.one(db, 'SELECT id, slug, title FROM features WHERE change_pk = ? AND slug = ?', [
      changePk,
      slug
    ]);
  }

  static findChunk(db, changePk, chunkId) {
    if (!chunkId) return null;
    return SddDb.one(db, 'SELECT id, chunk_id, status FROM chunks WHERE change_pk = ? AND chunk_id = ?', [
      changePk,
      chunkId
    ]);
  }
}

module.exports = { SddRepo };
