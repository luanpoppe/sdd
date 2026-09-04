'use strict';

const { SyncChangeTool } = require('./sync-change');
const { RecordChunkTool } = require('./record-chunk');
const { RecordEventTool } = require('./record-event');
const { RecordTestsTool } = require('./record-tests');
const { RecordReviewTool } = require('./record-review');
const { QueryHistoryTool } = require('./query-history');
const { RecallTool } = require('./recall');

/**
 * Registro das tools expostas pelo servidor.
 *
 * A superfície é pequena de propósito: a descrição de cada tool ocupa contexto em
 * **toda** sessão em que o MCP está ligado. Cinco de escrita (uma por ponto da
 * máquina de estados) e duas de leitura (é delas que vem o ganho de memória).
 */
const TOOL_CLASSES = [
  SyncChangeTool,
  RecordChunkTool,
  RecordEventTool,
  RecordTestsTool,
  RecordReviewTool,
  QueryHistoryTool,
  RecallTool
];

class ToolRegistry {
  static definitions() {
    return TOOL_CLASSES.map((toolClass) => toolClass.definition);
  }

  static find(name) {
    return TOOL_CLASSES.find((toolClass) => toolClass.definition.name === name) ?? null;
  }
}

module.exports = { ToolRegistry, TOOL_CLASSES };
