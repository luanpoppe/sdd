#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readline = require('node:readline');

const { Log } = require('./log');

// `node:sqlite` emite um ExperimentalWarning ao ser carregado. O harness mostra o
// stderr do MCP como se fosse problema, então o aviso é engolido aqui — antes de
// qualquer require que carregue o módulo — e vira uma linha de debug nossa.
const emitWarningOriginal = process.emitWarning.bind(process);
process.emitWarning = (warning, ...rest) => {
  const text = typeof warning === 'string' ? warning : String(warning?.message ?? '');
  const isSqliteExperimental = rest[0] === 'ExperimentalWarning' && text.includes('SQLite');
  if (isSqliteExperimental) {
    Log.debug('ExperimentalWarning de node:sqlite silenciado');
    return;
  }
  emitWarningOriginal(warning, ...rest);
};

const { RpcHandler } = require('./rpc');

// `node:sqlite` só existe sem flag a partir do Node 23. Abaixo disso o servidor
// morreria com um erro de módulo que não diz nada sobre a causa real.
const MIN_NODE_MAJOR = 23;

class SddMcpServer {
  static version() {
    const pluginJson = path.join(__dirname, '..', '.claude-plugin', 'plugin.json');
    try {
      const raw = fs.readFileSync(pluginJson, 'utf-8');
      return JSON.parse(raw).version;
    } catch {
      return '0.0.0';
    }
  }

  static checkNodeVersion() {
    const major = Number(process.versions.node.split('.')[0]);
    if (major >= MIN_NODE_MAJOR) return;

    process.stderr.write(
      `[sdd-mcp] Node ${process.versions.node} é antigo demais: o banco do SDD usa ` +
        `node:sqlite, disponível a partir do Node ${MIN_NODE_MAJOR}. ` +
        `Atualize o Node ou desligue o MCP com "/lp-settings mcp off".\n`
    );
    process.exit(1);
  }

  static start() {
    SddMcpServer.checkNodeVersion();

    const handler = new RpcHandler(SddMcpServer.version());
    const reader = readline.createInterface({ input: process.stdin, terminal: false });

    reader.on('line', (line) => SddMcpServer.onLine(handler, line));
    reader.on('close', () => {
      Log.info('stdin fechou, encerrando');
      process.exit(0);
    });

    Log.info('servidor pronto', { version: SddMcpServer.version(), node: process.versions.node });
  }

  static onLine(handler, line) {
    const trimmed = line.trim();
    if (!trimmed) return;

    const message = SddMcpServer.parse(trimmed);
    if (!message) return;

    const response = handler.handle(message);
    if (response) SddMcpServer.send(response);
  }

  static parse(line) {
    try {
      return JSON.parse(line);
    } catch (error) {
      // Sem `id` não há a quem responder o erro de parse — só registra e segue.
      Log.error('linha ilegível descartada', { message: error.message });
      return null;
    }
  }

  static send(response) {
    process.stdout.write(`${JSON.stringify(response)}\n`);
  }
}

process.on('uncaughtException', (error) => {
  Log.error('exceção não tratada', { message: error.message, stack: error.stack });
});

SddMcpServer.start();
