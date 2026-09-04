'use strict';

/**
 * Logger do servidor MCP.
 *
 * REGRA DURA: tudo sai em **stderr**. O stdout é o canal do protocolo JSON-RPC —
 * um único `console.log` ali corrompe a sessão MCP inteira e o harness derruba o
 * servidor com um erro de parse que não diz nada sobre a causa.
 */

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 };

// Nível fixo: `info` mostra o ciclo de vida e toda escrita, sem despejar payload.
// Troque para 'debug' aqui quando precisar ver os argumentos de cada tool.
const LOG_LEVEL = 'info';

class Log {
  static write(level, message, extra) {
    if (LEVELS[level] > LEVELS[LOG_LEVEL]) return;
    const stamp = new Date().toISOString();
    const suffix = extra === undefined ? '' : ` ${Log.stringify(extra)}`;
    process.stderr.write(`[sdd-mcp] ${stamp} ${level.toUpperCase()} ${message}${suffix}\n`);
  }

  static stringify(extra) {
    try {
      return JSON.stringify(extra);
    } catch {
      return String(extra);
    }
  }

  static error(message, extra) { Log.write('error', message, extra); }
  static warn(message, extra) { Log.write('warn', message, extra); }
  static info(message, extra) { Log.write('info', message, extra); }
  static debug(message, extra) { Log.write('debug', message, extra); }
}

module.exports = { Log, LOG_LEVEL };
