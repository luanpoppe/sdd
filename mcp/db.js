'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { Log } = require('./log');
const { SqliteDriver } = require('./sqlite-driver');
const { JournalMode } = require('./journal');
const { ProjectResolver } = require('./project');
const { SCHEMA_VERSION, CREATE_TABLES, CREATE_INDEXES } = require('./schema');
const { MIGRATIONS } = require('./migrations');

const DB_FILE_NAME = 'sdd.db';
const BUSY_TIMEOUT_MS = 4000;

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

    const driverKind = SqliteDriver.choose();
    SddDb.ensureRollbackJournal(dbPath, driverKind);

    const db = SqliteDriver.open(dbPath);
    db.exec('PRAGMA foreign_keys = ON');
    // Sem WAL (ver ./journal.js), o escritor tranca o arquivo durante a escrita. O
    // timeout faz o SDD Viewer esperar em vez de receber SQLITE_BUSY na cara.
    db.exec(`PRAGMA busy_timeout = ${BUSY_TIMEOUT_MS}`);

    SddDb.migrate(db);
    Log.info('banco aberto', { path: dbPath, driver: db.driver, schemaVersion: SCHEMA_VERSION });
    return db;
  }

  /**
   * Banco criado por uma versão antiga do SDD está em WAL, e o motor WASM não abre um
   * arquivo assim. Converter na abertura é o que faz a troca de motor ser invisível para
   * quem já usava — não há passo manual, e um banco já convertido sai daqui em no-op.
   *
   * A conversão pode falhar legitimamente: outra sessão com o MCP ligado, ou o SDD Viewer,
   * mantêm o arquivo aberto, e o SQLite recusa a troca enquanto houver conexão. O que fazer
   * depende de quem vai abrir em seguida:
   *
   * - motor **node**: ele lê WAL sem problema. A falha é irrelevante agora, e a conversão
   *   acontece sozinha na primeira abertura em que ninguém mais estiver segurando o arquivo.
   * - motor **wasm**: sem a conversão a abertura falha com "unable to open database file",
   *   que não diz nada sobre a causa. Melhor parar aqui, com a instrução do que fazer.
   */
  static ensureRollbackJournal(dbPath, driverKind) {
    if (!JournalMode.isWal(dbPath)) return;

    const { converted, reason } = JournalMode.toRollback(dbPath);
    if (converted) {
      Log.info('journal convertido', { path: dbPath, reason });
      return;
    }

    if (driverKind === 'node') {
      Log.debug('banco ainda em WAL; o motor nativo lê assim mesmo', { reason });
      return;
    }

    throw new Error(
      `o banco ${dbPath} está em WAL e este Node não tem node:sqlite para convertê-lo ` +
        `(${reason}). Feche o SDD Viewer e as outras sessões com o MCP ligado e tente de novo, ` +
        `ou rode a instalação do SDD uma vez num Node 22.5+.`
    );
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

    db.run(
      `INSERT INTO schema_meta (id, version) VALUES (1, ?)
       ON CONFLICT (id) DO UPDATE SET version = excluded.version`,
      [SCHEMA_VERSION]
    );
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
      const row = db.get('SELECT version FROM schema_meta WHERE id = 1');
      return row ? row.version : null;
    } catch {
      return null;
    }
  }

  // --- wrappers finos -------------------------------------------------------
  // Ficaram finos porque o `./sqlite-driver.js` já normalizou as duas APIs de SQLite
  // numa só. Continuam existindo para as tools nunca precisarem saber qual motor abriu
  // o banco, e para manter o nome `one` que o resto do código usa.

  static run(db, sql, params = []) {
    return db.run(sql, params);
  }

  static one(db, sql, params = []) {
    return db.get(sql, params);
  }

  static all(db, sql, params = []) {
    return db.all(sql, params);
  }
}

module.exports = { SddDb, DB_FILE_NAME };
