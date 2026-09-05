'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const { Log } = require('./log');
const { ProjectResolver } = require('./project');
const { SCHEMA_VERSION, CREATE_TABLES, CREATE_INDEXES } = require('./schema');
const { MIGRATIONS } = require('./migrations');

const DB_FILE_NAME = 'sdd.db';

/**
 * Conexão com o banco global (`~/.sdd/sdd.db`) e aplicação do schema.
 *
 * O banco é global de propósito: um histórico só, com `projects.path` separando os
 * repositórios, o que permite consulta cruzada e sobrevive a apagar o `.sdd/` de um
 * projeto. Ele é **índice e log derivado** — o markdown/YAML em `.sdd/` continua a
 * fonte de verdade, então perder este arquivo degrada a visualização e nunca corrompe
 * um projeto.
 */
class SddDb {
  /**
   * `SDD_DB_PATH` existe só para teste e desenvolvimento — aponta o servidor para um
   * banco descartável em vez do banco real do usuário. Em uso normal fica ausente.
   */
  static filePath() {
    const override = process.env.SDD_DB_PATH;
    if (override && override.trim()) return path.resolve(override);

    const homeDir = ProjectResolver.homeDir();
    return path.join(homeDir, DB_FILE_NAME);
  }

  static open() {
    const dbPath = SddDb.filePath();
    const dbDir = path.dirname(dbPath);
    fs.mkdirSync(dbDir, { recursive: true });

    const db = new DatabaseSync(dbPath);
    // WAL: leitor (o SDD Viewer) não bloqueia escritor (este servidor) e vice-versa.
    db.exec('PRAGMA journal_mode = WAL');
    db.exec('PRAGMA foreign_keys = ON');

    SddDb.migrate(db);
    Log.info('banco aberto', { path: dbPath, schemaVersion: SCHEMA_VERSION });
    return db;
  }

  /**
   * Idempotente, e a ordem dos três passos não é intercambiável:
   *
   * 1. `CREATE TABLE IF NOT EXISTS` — cria as tabelas novas de uma versão nova sem
   *    tocar nas que já existem (num banco antigo, é no-op para elas).
   * 2. Migrações — fazem o que o `CREATE` não faz num banco antigo: `ADD COLUMN` e
   *    reconstrução de tabela cuja constraint mudou.
   * 3. `CREATE INDEX IF NOT EXISTS` — por último, porque um índice pode apontar para
   *    coluna que só existe depois do passo 2, e porque a reconstrução do passo 2
   *    derruba os índices da tabela antiga junto com ela.
   */
  static migrate(db) {
    const before = SddDb.readSchemaVersion(db);

    for (const statement of CREATE_TABLES) db.exec(statement);

    SddDb.applyMigrations(db, before);

    for (const statement of CREATE_INDEXES) db.exec(statement);

    const current = SddDb.readSchemaVersion(db);
    if (current === SCHEMA_VERSION) return;

    const upsert = db.prepare(
      `INSERT INTO schema_meta (id, version) VALUES (1, ?)
       ON CONFLICT (id) DO UPDATE SET version = excluded.version`
    );
    upsert.run(SCHEMA_VERSION);
    Log.info('schema registrado', { from: current, to: SCHEMA_VERSION });
  }

  /**
   * `installedVersion` nulo = banco recém-criado pelo CREATE_TABLES desta versão, que
   * já nasce completo; aplicar degraus aí quebraria (coluna duplicada). Só migra
   * banco que existia antes.
   */
  static applyMigrations(db, installedVersion) {
    if (installedVersion === null) return;

    for (let target = installedVersion + 1; target <= SCHEMA_VERSION; target += 1) {
      const statements = MIGRATIONS[target];
      if (!statements) continue;

      for (const statement of statements) db.exec(statement);
      Log.info('migração aplicada', { target, statements: statements.length });
    }
  }

  /**
   * `null` quando o banco é novo. É lido ANTES do CREATE_TABLES (para decidir se há
   * migração a aplicar), momento em que `schema_meta` pode nem existir — daí o
   * catch, que aqui significa "banco vazio", não erro.
   */
  static readSchemaVersion(db) {
    try {
      const row = db.prepare('SELECT version FROM schema_meta WHERE id = 1').get();
      return row ? row.version : null;
    } catch {
      return null;
    }
  }

  // --- wrappers finos -------------------------------------------------------
  // Existem para que nenhuma tool precise repetir prepare/run e para converter o
  // BigInt que o `lastInsertRowid` pode devolver.

  static run(db, sql, params = []) {
    const statement = db.prepare(sql);
    const result = statement.run(...params);
    return {
      changes: Number(result.changes),
      lastInsertRowid: Number(result.lastInsertRowid)
    };
  }

  static one(db, sql, params = []) {
    const statement = db.prepare(sql);
    const row = statement.get(...params);
    return row === undefined ? null : row;
  }

  static all(db, sql, params = []) {
    const statement = db.prepare(sql);
    return statement.all(...params);
  }
}

module.exports = { SddDb, DB_FILE_NAME };
