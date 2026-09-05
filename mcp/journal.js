'use strict';

const fs = require('node:fs');

// Bytes 18 e 19 do cabeçalho do arquivo SQLite são `write version` e `read version`.
// Valem 1 em rollback journal e 2 em WAL. Ler os dois é a única forma de saber o modo
// de um banco SEM abri-lo — e abrir é justamente o que falha quando o motor é WASM.
const HEADER_BYTES = 20;
const WRITE_VERSION_OFFSET = 18;
const WAL_MARKER = 2;

/**
 * Modo de journal do banco, e a conversão de WAL para rollback.
 *
 * Por que isso existe: o `node-sqlite3-wasm` não tem VFS de memória compartilhada, então
 * não suporta WAL. Ele não apenas deixa de usar — ele **não abre** um arquivo marcado como
 * WAL, e falha com `unable to open database file`. Versões antigas do SDD criavam o banco
 * em WAL, então há bancos em campo que precisam ser convertidos uma vez.
 *
 * O que se perde com rollback journal: em WAL, leitor e escritor não se bloqueiam; em
 * rollback, o escritor tranca o arquivo durante a escrita, e um leitor que chegue naquele
 * instante recebe `SQLITE_BUSY`. Como as escritas do SDD são pequenas e esparsas (algumas
 * por chunk) e os dois lados usam `busy_timeout`, a janela de colisão é de milissegundos.
 * É o preço de rodar em Node LTS antigo, e é menor que não rodar.
 */
class JournalMode {
  /** `true` se o arquivo está marcado como WAL. Banco inexistente ou vazio → `false`. */
  static isWal(filePath) {
    if (!fs.existsSync(filePath)) return false;

    let handle;
    try {
      handle = fs.openSync(filePath, 'r');
      const header = Buffer.alloc(HEADER_BYTES);
      const read = fs.readSync(handle, header, 0, HEADER_BYTES, 0);
      if (read < HEADER_BYTES) return false;
      return header[WRITE_VERSION_OFFSET] === WAL_MARKER;
    } catch {
      return false;
    } finally {
      if (handle !== undefined) fs.closeSync(handle);
    }
  }

  /**
   * Converte um banco WAL para rollback journal. Devolve `{ converted, reason }`.
   *
   * Só o `node:sqlite` consegue fazer isso, porque só ele abre um arquivo WAL — daí o
   * requisito de Node 22.5+ **para converter**, que não é o mesmo requisito de usar.
   * Na prática isso não aperta ninguém: um banco só está em WAL se foi criado por uma
   * versão antiga do SDD, que já exigia Node 23+.
   */
  static toRollback(filePath) {
    if (!JournalMode.isWal(filePath)) return { converted: false, reason: 'já está em rollback' };

    let DatabaseSync;
    try {
      ({ DatabaseSync } = require('node:sqlite'));
    } catch {
      return {
        converted: false,
        reason:
          'este banco está em WAL e só o node:sqlite consegue convertê-lo — rode a instalação ' +
          'do SDD uma vez num Node 22.5+, ou apague ~/.sdd/sdd.db e reconstrua com sdd_reindex'
      };
    }

    try {
      const db = new DatabaseSync(filePath);
      db.exec('PRAGMA journal_mode = DELETE');
      db.close();
    } catch (error) {
      const locked = /locked|busy/i.test(error.message || '');
      return {
        converted: false,
        reason: locked
          ? 'o arquivo está aberto por outra sessão com o MCP ligado ou pelo SDD Viewer'
          : error.message
      };
    }

    // Confirma pelo cabeçalho, não pelo retorno do PRAGMA: se ainda houver conexão
    // aberta noutro processo, o SQLite recusa a troca e responde "wal" mesmo assim.
    if (JournalMode.isWal(filePath)) {
      return {
        converted: false,
        reason: 'o SQLite recusou a troca — feche o SDD Viewer e qualquer sessão com o MCP ligado'
      };
    }

    return { converted: true, reason: 'WAL convertido para rollback journal' };
  }
}

module.exports = { JournalMode };
