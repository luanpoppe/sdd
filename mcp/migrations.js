'use strict';

/**
 * Degraus de migração, aplicados só a bancos que já existiam numa versão anterior.
 *
 * Banco novo nasce direto na versão corrente pelo `CREATE_TABLES` do `./schema.js`,
 * então um degrau NUNCA pode repetir o que já está lá — um `ADD COLUMN` de coluna
 * existente falha. Por isso o mapa é indexado pela versão de DESTINO, e o `db.js` só
 * aplica degraus quando o banco tinha versão anterior registrada.
 *
 * Os degraus rodam DEPOIS do `CREATE_TABLES`, então tabela nova não precisa de degrau
 * — só coluna nova em tabela antiga e mudança de formato de tabela existente.
 */

// SQLite não altera constraint de coluna com ALTER TABLE: para trocar o NOT NULL de
// `code_highlights.file_change_pk` (que passou a aceitar âncora em step de review) é
// preciso reconstruir a tabela. Os índices caem junto com o DROP e são recriados pelo
// passo de CREATE_INDEXES, que o `db.js` roda depois das migrações justamente por isso.
const REBUILD_CODE_HIGHLIGHTS = [
  `CREATE TABLE code_highlights_v3 (
     id             INTEGER PRIMARY KEY AUTOINCREMENT,
     file_change_pk INTEGER REFERENCES file_changes(id) ON DELETE CASCADE,
     review_step_pk INTEGER REFERENCES review_steps(id) ON DELETE CASCADE,
     position       INTEGER NOT NULL,
     label          TEXT,
     lines          TEXT,
     language       TEXT,
     snippet        TEXT NOT NULL,
     explanation    TEXT,
     CHECK ((file_change_pk IS NULL) <> (review_step_pk IS NULL))
   )`,
  `INSERT INTO code_highlights_v3
     (id, file_change_pk, review_step_pk, position, label, lines, language, snippet, explanation)
   SELECT id, file_change_pk, NULL, position, label, lines, language, snippet, explanation
     FROM code_highlights`,
  `DROP TABLE code_highlights`,
  `ALTER TABLE code_highlights_v3 RENAME TO code_highlights`
];

const MIGRATIONS = {
  2: [`ALTER TABLE file_changes ADD COLUMN detail TEXT`],
  3: [
    `ALTER TABLE file_changes ADD COLUMN diff TEXT`,
    `ALTER TABLE file_changes ADD COLUMN content_hash TEXT`,
    `ALTER TABLE review_steps ADD COLUMN detail TEXT`,
    ...REBUILD_CODE_HIGHLIGHTS
  ],
  4: [
    `ALTER TABLE chunks ADD COLUMN position INTEGER`,
    `ALTER TABLE chunks ADD COLUMN planned_files TEXT`,
    `ALTER TABLE chunks ADD COLUMN depends_on TEXT`,
    `ALTER TABLE chunks ADD COLUMN review_order TEXT`
  ],
  5: [
    `ALTER TABLE changes ADD COLUMN current_feature TEXT`,
    `ALTER TABLE changes ADD COLUMN current_chunk TEXT`,
    `ALTER TABLE changes ADD COLUMN in_review TEXT`
  ]
};

module.exports = { MIGRATIONS };
