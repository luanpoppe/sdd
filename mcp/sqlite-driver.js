'use strict';

const path = require('node:path');

const VENDOR_ENTRY = path.join(__dirname, 'vendor', 'node-sqlite3-wasm', 'node-sqlite3-wasm.js');

/**
 * Escolhe com o que falar SQLite e normaliza as duas APIs numa só.
 *
 * Dois motores, mesma interface:
 *
 * - **`node:sqlite`**, quando o Node é 22.5+ e o traz. É nativo e mais rápido.
 * - **`node-sqlite3-wasm`** vendorizado, em qualquer outro caso. É o que permite o MCP
 *   funcionar em Node LTS antigo, onde `node:sqlite` não existe — sem isso, quem estivesse
 *   em Node 18 ou 20 simplesmente não teria histórico.
 *
 * As duas APIs se parecem mas não são iguais: `node:sqlite` recebe parâmetros
 * espalhados (`stmt.run(a, b)`) e a WASM recebe um array (`stmt.run([a, b])`); a WASM
 * também não tem `exec`. A tradução mora aqui, e o `./db.js` fala só com o formato de
 * baixo — `exec`/`run`/`get`/`all`, sempre com array de parâmetros.
 *
 * **Nenhum dos dois usa WAL.** Ver `./journal.js` para o motivo e para o que isso custa.
 */
class SqliteDriver {
  /** `SDD_SQLITE_DRIVER=wasm|node` força um motor. Existe para teste; em uso normal, ausente. */
  static choose() {
    const forced = (process.env.SDD_SQLITE_DRIVER || '').trim().toLowerCase();
    if (forced === 'wasm') return 'wasm';
    if (forced === 'node') return 'node';
    return SqliteDriver.hasNodeSqlite() ? 'node' : 'wasm';
  }

  static hasNodeSqlite() {
    try {
      require('node:sqlite');
      return true;
    } catch {
      return false;
    }
  }

  static open(filePath) {
    const kind = SqliteDriver.choose();
    const handle = kind === 'node' ? SqliteDriver.openNode(filePath) : SqliteDriver.openWasm(filePath);
    handle.driver = kind;
    return handle;
  }

  static openNode(filePath) {
    const { DatabaseSync } = require('node:sqlite');
    const db = new DatabaseSync(filePath);

    return {
      exec: (sql) => db.exec(sql),
      run: (sql, params = []) => {
        const result = db.prepare(sql).run(...params);
        return {
          changes: Number(result.changes),
          lastInsertRowid: Number(result.lastInsertRowid)
        };
      },
      get: (sql, params = []) => {
        const row = db.prepare(sql).get(...params);
        return row === undefined ? null : row;
      },
      all: (sql, params = []) => db.prepare(sql).all(...params),
      close: () => db.close()
    };
  }

  static openWasm(filePath) {
    const { Database } = require(VENDOR_ENTRY);
    const db = new Database(filePath);

    return {
      // A WASM não tem `exec`; `run` aceita statement único, que é o caso de todo
      // uso do SDD (o schema é um array de statements, nunca um script colado).
      exec: (sql) => db.run(sql),
      run: (sql, params = []) => {
        const result = db.run(sql, params);
        return {
          changes: Number(result.changes ?? 0),
          lastInsertRowid: Number(result.lastInsertRowid ?? 0)
        };
      },
      get: (sql, params = []) => {
        const row = db.get(sql, params);
        return row === undefined ? null : row;
      },
      all: (sql, params = []) => db.all(sql, params),
      close: () => db.close()
    };
  }
}

module.exports = { SqliteDriver };
