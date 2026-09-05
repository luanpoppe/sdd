'use strict';

const { SyncChangeTool } = require('./sync-change');
const { RecordChunkTool } = require('./record-chunk');
const { RecordEventTool } = require('./record-event');
const { RecordTestsTool } = require('./record-tests');
const { RecordReviewTool } = require('./record-review');
const { QueryHistoryTool } = require('./query-history');
const { RecallTool } = require('./recall');
const { ReindexTool } = require('./reindex');
const { RecordKnowledgeTool } = require('./record-knowledge');
const { WriteTasksTool, ReadTasksTool } = require('./tasks');
const { WriteStateTool, ReadStateTool } = require('./state');
const { RecordExplainTool, ReadExplainTool } = require('./explain');

/**
 * Registro das tools expostas pelo servidor.
 *
 * A superfície é pequena de propósito: a descrição de cada tool ocupa contexto em
 * **toda** sessão em que o MCP está ligado. Cada tool aqui cobre um ponto distinto —
 * escrita nos passos da máquina de estados, leitura para memória, e reconstrução.
 *
 * Antes de acrescentar uma nova, verifique se o caso não cabe como campo de uma
 * existente: cenários entraram no `sdd_sync_change` e o vínculo com o chunk no
 * `sdd_record_chunk` justamente para não virarem duas tools a mais.
 */
const TOOL_CLASSES = [
  SyncChangeTool,
  RecordChunkTool,
  RecordEventTool,
  RecordTestsTool,
  RecordReviewTool,
  RecordKnowledgeTool,
  WriteTasksTool,
  ReadTasksTool,
  WriteStateTool,
  ReadStateTool,
  RecordExplainTool,
  ReadExplainTool,
  QueryHistoryTool,
  RecallTool,
  ReindexTool
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
