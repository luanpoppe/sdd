'use strict';

const { Log } = require('./log');
const { SddDb } = require('./db');
const { ProjectResolver } = require('./project');
const { ToolRegistry } = require('./tools');

const PROTOCOL_VERSION = '2025-06-18';
const SERVER_NAME = 'sdd';

const METHOD_NOT_FOUND = -32601;
const INTERNAL_ERROR = -32603;

/**
 * Dispatch dos métodos JSON-RPC do MCP. Separado do transporte (`server.js`) para
 * que o loop de stdin não misture parsing de linha com regra de protocolo.
 */
class RpcHandler {
  constructor(serverVersion) {
    this.serverVersion = serverVersion;
    this.projectRoot = ProjectResolver.root();
    this.db = null;
  }

  /**
   * O banco só abre na primeira tool chamada — abrir no `initialize` criaria
   * `~/.sdd/sdd.db` em toda sessão, inclusive nas que nunca gravam nada.
   */
  context() {
    if (!this.db) this.db = SddDb.open();
    return { db: this.db, projectRoot: this.projectRoot };
  }

  /** Devolve a resposta, ou `null` quando a mensagem é uma notificação. */
  handle(message) {
    const isNotification = message.id === undefined || message.id === null;

    if (isNotification) {
      Log.debug('notificação recebida', { method: message.method });
      return null;
    }

    try {
      const result = this.dispatch(message.method, message.params ?? {});
      if (result === undefined) {
        return RpcHandler.errorResponse(message.id, METHOD_NOT_FOUND, `método desconhecido: ${message.method}`);
      }
      return { jsonrpc: '2.0', id: message.id, result };
    } catch (error) {
      Log.error('falha ao tratar requisição', { method: message.method, message: error.message });
      return RpcHandler.errorResponse(message.id, INTERNAL_ERROR, error.message);
    }
  }

  dispatch(method, params) {
    if (method === 'initialize') return this.initialize(params);
    if (method === 'ping') return {};
    if (method === 'tools/list') return { tools: ToolRegistry.definitions() };
    if (method === 'tools/call') return this.callTool(params);
    return undefined;
  }

  initialize(params) {
    const clientVersion = params.protocolVersion ?? PROTOCOL_VERSION;
    Log.info('sessão iniciada', {
      client: params.clientInfo?.name ?? 'desconhecido',
      protocol: clientVersion,
      projectRoot: this.projectRoot,
      hasSdd: ProjectResolver.hasSdd(this.projectRoot)
    });

    return {
      protocolVersion: PROTOCOL_VERSION,
      capabilities: { tools: {} },
      serverInfo: { name: SERVER_NAME, version: this.serverVersion }
    };
  }

  /**
   * Falha de tool volta como resultado com `isError`, não como erro JSON-RPC: assim o
   * agente lê a mensagem e decide, em vez de o harness derrubar a chamada.
   */
  callTool(params) {
    const toolClass = ToolRegistry.find(params.name);
    if (!toolClass) return RpcHandler.toolError(`tool desconhecida: ${params.name}`);

    try {
      const output = toolClass.run(this.context(), params.arguments ?? {});
      return { content: [{ type: 'text', text: JSON.stringify(output) }] };
    } catch (error) {
      Log.error('tool falhou', { tool: params.name, message: error.message });
      return RpcHandler.toolError(error.message);
    }
  }

  static toolError(message) {
    return { content: [{ type: 'text', text: message }], isError: true };
  }

  static errorResponse(id, code, message) {
    return { jsonrpc: '2.0', id, error: { code, message } };
  }
}

module.exports = { RpcHandler, PROTOCOL_VERSION, SERVER_NAME };
