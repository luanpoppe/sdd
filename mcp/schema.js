'use strict';

/**
 * DDL do banco global do SDD (~/.sdd/sdd.db).
 *
 * Convenção de nomes de coluna: `*_pk` é chave estrangeira para o `id` numérico
 * de outra tabela; `*_id` é o identificador textual que o usuário vê no `.sdd/`
 * (ex: `changes.change_id` = "anonimizar-texto", `chunks.chunk_id` = "F2.C3").
 * Sem essa distinção os dois se confundem em toda query.
 */

const SCHEMA_VERSION = 2;

const CREATE_TABLES = [
  `CREATE TABLE IF NOT EXISTS schema_meta (
     id      INTEGER PRIMARY KEY CHECK (id = 1),
     version INTEGER NOT NULL
   )`,

  // `path` guarda a caixa original (serve de exibição), mas compara sem caixa: no
  // Windows o mesmo projeto pode chegar como `C:/Users/...` de um lado e
  // `c:/users/...` de outro, e sem NOCASE isso viraria dois projetos distintos —
  // o suficiente para o SDD Viewer não achar o histórico do projeto que está aberto.
  `CREATE TABLE IF NOT EXISTS projects (
     id           INTEGER PRIMARY KEY AUTOINCREMENT,
     path         TEXT NOT NULL UNIQUE COLLATE NOCASE,
     name         TEXT NOT NULL,
     created_at   TEXT NOT NULL,
     last_seen_at TEXT NOT NULL
   )`,

  `CREATE TABLE IF NOT EXISTS changes (
     id              INTEGER PRIMARY KEY AUTOINCREMENT,
     project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
     change_id       TEXT NOT NULL,
     kind            TEXT NOT NULL CHECK (kind IN ('feature','bugfix')),
     title           TEXT,
     state           TEXT,
     chosen_solution TEXT,
     created_at      TEXT,
     updated_at      TEXT,
     archived_at     TEXT,
     UNIQUE (project_id, change_id)
   )`,

  `CREATE TABLE IF NOT EXISTS features (
     id        INTEGER PRIMARY KEY AUTOINCREMENT,
     change_pk INTEGER NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
     slug      TEXT NOT NULL,
     title     TEXT,
     summary   TEXT,
     position  INTEGER,
     status    TEXT,
     UNIQUE (change_pk, slug)
   )`,

  `CREATE TABLE IF NOT EXISTS chunks (
     id          INTEGER PRIMARY KEY AUTOINCREMENT,
     change_pk   INTEGER NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
     feature_pk  INTEGER REFERENCES features(id) ON DELETE SET NULL,
     chunk_id    TEXT NOT NULL,
     title       TEXT,
     status      TEXT CHECK (status IN ('pending','in_progress','done','deviated')),
     wave        INTEGER,
     started_at  TEXT,
     finished_at TEXT,
     summary     TEXT,
     reasoning   TEXT,
     UNIQUE (change_pk, chunk_id)
   )`,

  `CREATE TABLE IF NOT EXISTS file_changes (
     id            INTEGER PRIMARY KEY AUTOINCREMENT,
     chunk_pk      INTEGER NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
     path          TEXT NOT NULL,
     operation     TEXT CHECK (operation IN ('created','modified','deleted')),
     lines_added   INTEGER,
     lines_removed INTEGER,
     does          TEXT,
     connects      TEXT,
     review_note   TEXT,
     detail        TEXT,
     review_order  INTEGER,
     is_test       INTEGER NOT NULL DEFAULT 0,
     UNIQUE (chunk_pk, path)
   )`,

  // Trechos de código que valem ser lidos, com a explicação de cada um. É o que
  // permite entender o arquivo sem abri-lo — o plano de revisão no chat continua
  // curto (3 linhas por arquivo), e a profundidade fica aqui.
  `CREATE TABLE IF NOT EXISTS code_highlights (
     id             INTEGER PRIMARY KEY AUTOINCREMENT,
     file_change_pk INTEGER NOT NULL REFERENCES file_changes(id) ON DELETE CASCADE,
     position       INTEGER NOT NULL,
     label          TEXT,
     lines          TEXT,
     language       TEXT,
     snippet        TEXT NOT NULL,
     explanation    TEXT
   )`,

  `CREATE TABLE IF NOT EXISTS reviews (
     id           INTEGER PRIMARY KEY AUTOINCREMENT,
     project_id   INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
     slug         TEXT NOT NULL,
     topic        TEXT,
     state        TEXT,
     current_step TEXT,
     created_at   TEXT,
     updated_at   TEXT,
     UNIQUE (project_id, slug)
   )`,

  `CREATE TABLE IF NOT EXISTS review_steps (
     id          INTEGER PRIMARY KEY AUTOINCREMENT,
     review_pk   INTEGER NOT NULL REFERENCES reviews(id) ON DELETE CASCADE,
     step_id     TEXT NOT NULL,
     label       TEXT,
     caller      TEXT,
     position    INTEGER,
     done        INTEGER NOT NULL DEFAULT 0,
     summary     TEXT,
     finished_at TEXT,
     UNIQUE (review_pk, step_id)
   )`,

  `CREATE TABLE IF NOT EXISTS review_files (
     id             INTEGER PRIMARY KEY AUTOINCREMENT,
     review_step_pk INTEGER NOT NULL REFERENCES review_steps(id) ON DELETE CASCADE,
     path           TEXT NOT NULL,
     note           TEXT
   )`,

  `CREATE TABLE IF NOT EXISTS test_runs (
     id           INTEGER PRIMARY KEY AUTOINCREMENT,
     change_pk    INTEGER NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
     feature_pk   INTEGER REFERENCES features(id) ON DELETE SET NULL,
     chunk_pk     INTEGER REFERENCES chunks(id) ON DELETE SET NULL,
     at           TEXT NOT NULL,
     runner       TEXT,
     passed       INTEGER,
     failed       INTEGER,
     coverage_pct REAL,
     report       TEXT,
     files        TEXT
   )`,

  `CREATE TABLE IF NOT EXISTS commits (
     id       INTEGER PRIMARY KEY AUTOINCREMENT,
     chunk_pk INTEGER NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
     at       TEXT NOT NULL,
     branch   TEXT,
     sha      TEXT,
     message  TEXT,
     mode     TEXT CHECK (mode IN ('full','suggest-only'))
   )`,

  `CREATE TABLE IF NOT EXISTS events (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
     change_pk  INTEGER REFERENCES changes(id) ON DELETE CASCADE,
     chunk_pk   INTEGER REFERENCES chunks(id) ON DELETE CASCADE,
     at         TEXT NOT NULL,
     kind       TEXT NOT NULL,
     actor      TEXT,
     summary    TEXT NOT NULL,
     detail     TEXT
   )`
];

const CREATE_INDEXES = [
  `CREATE INDEX IF NOT EXISTS idx_changes_project    ON changes(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_features_change    ON features(change_pk)`,
  `CREATE INDEX IF NOT EXISTS idx_chunks_change      ON chunks(change_pk)`,
  `CREATE INDEX IF NOT EXISTS idx_files_chunk        ON file_changes(chunk_pk)`,
  `CREATE INDEX IF NOT EXISTS idx_files_path         ON file_changes(path)`,
  `CREATE INDEX IF NOT EXISTS idx_highlights_file    ON code_highlights(file_change_pk)`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_project    ON reviews(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_review_steps_rev   ON review_steps(review_pk)`,
  `CREATE INDEX IF NOT EXISTS idx_events_project_at  ON events(project_id, at)`,
  `CREATE INDEX IF NOT EXISTS idx_events_kind        ON events(kind)`
];

/**
 * Degraus de migração, aplicados só a bancos que já existiam numa versão anterior.
 * Banco novo nasce direto na versão corrente pelo CREATE_TABLES acima, então o
 * degrau NÃO pode repetir o que já está lá (um `ADD COLUMN` de coluna existente
 * falha) — daí ser indexado pela versão de destino.
 */
const MIGRATIONS = {
  2: [`ALTER TABLE file_changes ADD COLUMN detail TEXT`]
};

module.exports = { SCHEMA_VERSION, CREATE_TABLES, CREATE_INDEXES, MIGRATIONS };
