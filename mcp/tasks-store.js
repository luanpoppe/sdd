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
            planned_files, depends_on, review_order)
         VALUES (?, ?, ?, ?, 'pending', ?, ?, ?, ?)`,
        [
          changePk,
          featurePk,
          chunk.chunk_id,
          chunk.title ?? null,
          index + 1,
          JSON.stringify(chunk.files ?? []),
          JSON.stringify(chunk.depends_on ?? []),
          chunk.review_order ?? null
        ]
      );

      TasksStore.insertChecks(db, inserted.lastInsertRowid, chunk);
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

    if (featurePk === null) scope = 'AND feature_pk IS NULL';
    else if (featurePk !== undefined) {
      scope = 'AND feature_pk = ?';
      scopeParams = [featurePk];
    }

    const chunks = SddDb.all(
      db,
      `SELECT id, chunk_id, title, status, position, planned_files, depends_on, review_order
         FROM chunks
        WHERE change_pk = ? ${scope}
        ORDER BY position ASC, id ASC`,
      [changePk, ...scopeParams]
    );

    return chunks.map((chunk) => ({
      chunk_id: chunk.chunk_id,
      title: chunk.title,
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
