'use strict';

/**
 * DDL do banco global do SDD (~/.sdd/sdd.db).
 *
 * Convenção de nomes de coluna: `*_pk` é chave estrangeira para o `id` numérico
 * de outra tabela; `*_id` é o identificador textual que o usuário vê no `.sdd/`
 * (ex: `changes.change_id` = "anonimizar-texto", `chunks.chunk_id` = "F2.C3").
 * Sem essa distinção os dois se confundem em toda query.
 */

const SCHEMA_VERSION = 5;

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

  // As tres ultimas colunas (`current_feature`, `current_chunk`, `in_review`) so sao a
  // fonte de verdade com `state_storage: mcp`. No modo padrao elas espelham o
  // `.sdd.yaml`, e servir apenas para o SDD Viewer mostrar onde a mudanca parou.
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
     current_feature TEXT,
     current_chunk   TEXT,
     in_review       TEXT,
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
     position       INTEGER,
     planned_files  TEXT,
     depends_on     TEXT,
     review_order   TEXT,
     UNIQUE (change_pk, chunk_id)
   )`,

  // Os checkboxes de um chunk no tasks. Só usados com `tasks_storage: mcp`, quando o
  // tasks.md deixa de existir e o plano de execução passa a morar aqui.
  `CREATE TABLE IF NOT EXISTS chunk_checks (
     id        INTEGER PRIMARY KEY AUTOINCREMENT,
     chunk_pk  INTEGER NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
     position  INTEGER NOT NULL,
     kind      TEXT NOT NULL CHECK (kind IN ('faz','validacao')),
     text      TEXT NOT NULL,
     done      TEXT NOT NULL DEFAULT ' ' CHECK (done IN (' ','~','x'))
   )`,

  // Cenários BDD e edge cases da spec de uma feature. Existem para dar
  // rastreabilidade: qual cenário cada chunk implementa, e o que ficou sem chunk.
  `CREATE TABLE IF NOT EXISTS scenarios (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     change_pk  INTEGER NOT NULL REFERENCES changes(id) ON DELETE CASCADE,
     feature_pk INTEGER REFERENCES features(id) ON DELETE CASCADE,
     key        TEXT NOT NULL,
     title      TEXT,
     body       TEXT,
     kind       TEXT CHECK (kind IN ('scenario','edge')),
     position   INTEGER,
     UNIQUE (change_pk, key)
   )`,

  `CREATE TABLE IF NOT EXISTS chunk_scenarios (
     chunk_pk    INTEGER NOT NULL REFERENCES chunks(id) ON DELETE CASCADE,
     scenario_pk INTEGER NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
     PRIMARY KEY (chunk_pk, scenario_pk)
   )`,

  // Conhecimento de longo prazo: .sdd/context/ (como cada área funciona) e os HTMLs
  // acumulativos do lp:explain. Os dois são pura explicação e eram, até aqui, os
  // únicos produtores de entendimento invisíveis ao banco.
  `CREATE TABLE IF NOT EXISTS knowledge_entries (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     project_id INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
     change_pk  INTEGER REFERENCES changes(id) ON DELETE SET NULL,
     kind       TEXT NOT NULL CHECK (kind IN ('context','explain')),
     slug       TEXT NOT NULL,
     title      TEXT,
     path       TEXT,
     summary    TEXT,
     detail     TEXT,
     updated_at TEXT NOT NULL,
     UNIQUE (project_id, kind, slug)
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
     diff          TEXT,
     content_hash  TEXT,
     review_order  INTEGER,
     is_test       INTEGER NOT NULL DEFAULT 0,
     UNIQUE (chunk_pk, path)
   )`,

  // Trechos de código que valem ser lidos, com a explicação de cada um. É o que
  // permite entender o arquivo sem abri-lo — o plano de revisão no chat continua
  // curto (3 linhas por arquivo), e a profundidade fica aqui.
  `CREATE TABLE IF NOT EXISTS code_highlights (
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

  // Um por metodo/funcao/endpoint que carrega comportamento. Ancorado em arquivo de
  // chunk OU em step de review, nunca nos dois — é o que faz o lp:review alimentar a
  // mesma memoria que a implementacao, em vez de virar silo.
  `CREATE TABLE IF NOT EXISTS symbols (
     id             INTEGER PRIMARY KEY AUTOINCREMENT,
     file_change_pk INTEGER REFERENCES file_changes(id) ON DELETE CASCADE,
     review_step_pk INTEGER REFERENCES review_steps(id) ON DELETE CASCADE,
     position       INTEGER NOT NULL,
     name           TEXT NOT NULL,
     kind           TEXT,
     signature      TEXT,
     purpose        TEXT,
     CHECK ((file_change_pk IS NULL) <> (review_step_pk IS NULL))
   )`,

  // Entrada -> saida com dado que faz sentido. Responde "o que isso faz de verdade",
  // pergunta que snippet de codigo nao responde.
  `CREATE TABLE IF NOT EXISTS symbol_examples (
     id         INTEGER PRIMARY KEY AUTOINCREMENT,
     symbol_pk  INTEGER NOT NULL REFERENCES symbols(id) ON DELETE CASCADE,
     position   INTEGER NOT NULL,
     label      TEXT,
     input      TEXT,
     output     TEXT,
     note       TEXT,
     is_edge    INTEGER NOT NULL DEFAULT 0
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
     detail      TEXT,
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
  `CREATE INDEX IF NOT EXISTS idx_highlights_step    ON code_highlights(review_step_pk)`,
  `CREATE INDEX IF NOT EXISTS idx_symbols_file       ON symbols(file_change_pk)`,
  `CREATE INDEX IF NOT EXISTS idx_symbols_step       ON symbols(review_step_pk)`,
  `CREATE INDEX IF NOT EXISTS idx_symbols_name       ON symbols(name)`,
  `CREATE INDEX IF NOT EXISTS idx_examples_symbol    ON symbol_examples(symbol_pk)`,
  `CREATE INDEX IF NOT EXISTS idx_checks_chunk       ON chunk_checks(chunk_pk)`,
  `CREATE INDEX IF NOT EXISTS idx_scenarios_change   ON scenarios(change_pk)`,
  `CREATE INDEX IF NOT EXISTS idx_scenarios_feature  ON scenarios(feature_pk)`,
  `CREATE INDEX IF NOT EXISTS idx_knowledge_project  ON knowledge_entries(project_id, kind)`,
  `CREATE INDEX IF NOT EXISTS idx_reviews_project    ON reviews(project_id)`,
  `CREATE INDEX IF NOT EXISTS idx_review_steps_rev   ON review_steps(review_pk)`,
  `CREATE INDEX IF NOT EXISTS idx_events_project_at  ON events(project_id, at)`,
  `CREATE INDEX IF NOT EXISTS idx_events_kind        ON events(kind)`
];

module.exports = { SCHEMA_VERSION, CREATE_TABLES, CREATE_INDEXES };
