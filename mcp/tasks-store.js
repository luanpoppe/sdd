'use strict';

const { SddDb } = require('./db');

/**
 * Leitura e escrita do plano de execução quando ele mora no banco
 * (`tasks_storage: mcp`) em vez de num `tasks.md`.
 *
 * ATENÇÃO — este é o único lugar do MCP onde o banco deixa de ser índice derivado e
 * vira **fonte de verdade**. Com `tasks_storage: mcp` não existe arquivo do qual
 * re-derivar o plano, então o `sdd_reindex` não recupera nada disso e o fluxo passa a
 * depender do servidor estar de pé. É o preço declarado do modo; o padrão continua
 * sendo o arquivo.
 */
class TasksStore {
  /** Substitui o plano inteiro de uma mudança/feature. Escrita parcial não existe. */
  static replace(db, changePk, featurePk, chunks) {
    const scope = featurePk === null ? 'feature_pk IS NULL' : 'feature_pk = ?';
    const scopeParams = featurePk === null ? [] : [featurePk];

    SddDb.run(db, `DELETE FROM chunks WHERE change_pk = ? AND ${scope}`, [changePk, ...scopeParams]);

    chunks.forEach((chunk, index) => {
      const inserted = SddDb.run(
        db,
        `INSERT INTO chunks
           (change_pk, feature_pk, chunk_id, title, status, position,
            planned_files, depends_on, review_order, component)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)`,
        [
          changePk,
          featurePk,
          chunk.chunk_id,
          chunk.title ?? null,
          index + 1,
          JSON.stringify(chunk.files ?? []),
          JSON.stringify(chunk.depends_on ?? []),
          chunk.review_order ?? null,
          chunk.component ?? null
        ]
      );

      TasksStore.insertChecks(db, inserted.lastInsertRowid, chunk);
    });

    return chunks.length;
  }

  /**
   * Esqueleto do plano para o modo `flow_storage: mcp` com o `tasks.md` ainda em arquivo.
   *
   * Diferente do `replace`, este **nunca apaga**: o chunk que já foi implementado carrega
   * relatório por arquivo, achados de review e modelagem pendurados por `ON DELETE
   * CASCADE`, e um DELETE aqui levaria tudo junto. Só os campos de plano são atualizados;
   * `status`, `summary` e `reasoning` de quem já rodou ficam intactos.
   */
  static plan(db, changePk, featurePk, chunks) {
    chunks.forEach((chunk, index) => {
      SddDb.run(
        db,
        `INSERT INTO chunks
           (change_pk, feature_pk, chunk_id, title, status, position,
            planned_files, depends_on, review_order, component)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?, ?)
         ON CONFLICT (change_pk, chunk_id) DO UPDATE SET
           feature_pk    = COALESCE(excluded.feature_pk, chunks.feature_pk),
           title         = COALESCE(excluded.title, chunks.title),
           position      = excluded.position,
           planned_files = excluded.planned_files,
           depends_on    = excluded.depends_on,
           review_order  = COALESCE(excluded.review_order, chunks.review_order),
           component     = COALESCE(excluded.component, chunks.component)`,
        [
          changePk,
          featurePk,
          chunk.chunk_id,
          chunk.title ?? null,
          index + 1,
          JSON.stringify(chunk.files ?? []),
          JSON.stringify(chunk.depends_on ?? []),
          chunk.review_order ?? null,
          chunk.component ?? null
        ]
      );
    });

    return chunks.length;
  }

  static insertChecks(db, chunkPk, chunk) {
    const items = [
      ...(chunk.faz ?? []).map((text) => ({ kind: 'faz', text })),
      ...(chunk.validacao ?? []).map((text) => ({ kind: 'validacao', text }))
    ];

    items.forEach((item, index) => {
      SddDb.run(
        db,
        `INSERT INTO chunk_checks (chunk_pk, position, kind, text, done) VALUES (?, ?, ?, ?, ' ')`,
        [chunkPk, index + 1, item.kind, item.text]
      );
    });

    return items.length;
  }

  /**
   * Marca todos os checkboxes de um chunk. É o equivalente a trocar `[ ]` por `[~]` no
   * arquivo, e o status do chunk é derivado disso — nunca gravado à parte, para os dois
   * não divergirem.
   */
  static mark(db, chunkPk, mark) {
    SddDb.run(db, 'UPDATE chunk_checks SET done = ? WHERE chunk_pk = ?', [mark, chunkPk]);
    SddDb.run(db, 'UPDATE chunks SET status = ? WHERE id = ?', [TasksStore.statusFor(mark), chunkPk]);
  }

  static statusFor(mark) {
    if (mark === ' ') return 'pending';
    return 'done';
  }

  /**
   * `featurePk` ausente (`undefined`) lê o plano da mudança inteira; `null` lê só os
   * chunks sem feature, que é o caso do bug-fix. A distinção importa: tratar os dois
   * como a mesma coisa faria a leitura de uma feature devolver o plano do projeto todo.
   */
  static read(db, changePk, featurePk) {
    let scope = '';
    let scopeParams = [];

    if (featurePk === null) scope = 'AND c.feature_pk IS NULL';
    else if (featurePk !== undefined) {
      scope = 'AND c.feature_pk = ?';
      scopeParams = [featurePk];
    }

    // O slug da feature entra na leitura porque a mesma consulta serve ao fluxo
    // (`flow_storage: mcp`), onde os chunks saem agrupados por swimlane.
    const chunks = SddDb.all(
      db,
      `SELECT c.id, c.chunk_id, c.title, c.status, c.position, c.planned_files,
              c.depends_on, c.review_order, c.component, f.slug AS feature
         FROM chunks c
         LEFT JOIN features f ON f.id = c.feature_pk
        WHERE c.change_pk = ? ${scope}
        ORDER BY c.position ASC, c.id ASC`,
      [changePk, ...scopeParams]
    );

    return chunks.map((chunk) => ({
      chunk_id: chunk.chunk_id,
      feature: chunk.feature ?? null,
      title: chunk.title,
      component: chunk.component ?? null,
      status: chunk.status,
      files: TasksStore.parseList(chunk.planned_files),
      depends_on: TasksStore.parseList(chunk.depends_on),
      review_order: chunk.review_order,
      checks: TasksStore.readChecks(db, chunk.id)
    }));
  }

  static readChecks(db, chunkPk) {
    return SddDb.all(
      db,
      'SELECT kind, text, done FROM chunk_checks WHERE chunk_pk = ? ORDER BY position ASC',
      [chunkPk]
    );
  }

  static parseList(raw) {
    if (!raw) return [];

    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  /** O primeiro chunk ainda pendente — o que o `lp:continue` implementaria a seguir. */
  static nextPending(db, changePk) {
    return SddDb.one(
      db,
      `SELECT chunk_id, title FROM chunks
        WHERE change_pk = ? AND status = 'pending'
        ORDER BY position ASC, id ASC
        LIMIT 1`,
      [changePk]
    );
  }
}

module.exports = { TasksStore };
