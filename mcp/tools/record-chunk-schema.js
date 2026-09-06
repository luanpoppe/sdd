'use strict';

const { HIGHLIGHTS_SCHEMA, SYMBOLS_SCHEMA } = require('../explain');

/**
 * O contrato da tool `sdd_record_chunk`, separado do handler.
 *
 * Ele mora sozinho porque e grande e por um motivo que nao e so tamanho: cada descricao
 * daqui entra no prompt de TODA requisicao da sessao com o MCP ligado. Editar um texto
 * destes e mexer no custo de contexto do usuario, e essa decisao fica mais visivel num
 * arquivo que so tem isso dentro.
 */
const RECORD_CHUNK_DEFINITION = {
      name: 'sdd_record_chunk',
      description:
        'Registra um chunk implementado, com uma entrada por arquivo tocado. Chame no passo ' +
        'g-bis. Além das 3 linhas do plano de revisão, mande detail/highlights/symbols — o ' +
        'chat fica curto e a profundidade vive aqui. Ver mcp-guide.md.',
      inputSchema: {
        type: 'object',
        required: ['change_id', 'chunk_id'],
        properties: {
          change_id: { type: 'string' },
          chunk_id: { type: 'string', description: 'Ex: "F2.C3" (feature) ou "C3" (bugfix)' },
          feature_slug: { type: 'string', description: 'Omita em bugfix.' },
          title: { type: 'string', description: 'Título do chunk' },
          component: {
            type: 'string',
            description:
              'Rótulo curto do nó no fluxo: a camada/componente, não o título. ' +
              'Ex: "Controller", "Repository", "UseCase". Só com flow_storage: mcp.'
          },
          status: { type: 'string', enum: ['pending', 'in_progress', 'done', 'deviated'] },
          mark: {
            type: 'string',
            enum: [' ', '~', 'x'],
            description: 'Só com tasks_storage: mcp — marca os checkboxes deste chunk no banco.'
          },
          wave: { type: 'integer', description: 'Onda do modo paralelo. Omita no sequencial.' },
          started_at: { type: 'string', description: 'ISO 8601. Omitido = agora.' },
          finished_at: { type: 'string', description: 'ISO 8601. Omitido = agora.' },
          summary: { type: 'string', description: 'O que o chunk fez' },
          reasoning: { type: 'string', description: 'Por quê / como conecta com o macro' },
          files: {
            type: 'array',
            description:
              'Um por arquivo tocado, na ordem de revisão. Ao REGRAVAR o chunk, mande só os ' +
              'arquivos que mudaram: campo ausente preserva o que já está gravado, e arquivo ' +
              'não citado fica intacto. Omita `files` por inteiro se nenhum arquivo mudou.',
            items: {
              type: 'object',
              required: ['path'],
              properties: {
                path: { type: 'string' },
                operation: { type: 'string', enum: ['created', 'modified', 'deleted'] },
                lines_added: { type: 'integer' },
                lines_removed: { type: 'integer' },
                does: { type: 'string', description: 'A linha "Faz"' },
                connects: { type: 'string', description: 'A linha "Conecta"' },
                review_note: { type: 'string', description: 'A linha "Revisar"' },
                detail: {
                  type: 'string',
                  description:
                    'Explicação longa: mecanismo, fluxo de dados, decisão descartada, armadilha. ' +
                    'Deve bastar para entender o arquivo sem abri-lo. Vazio se só repetiria does.'
                },
                diff: {
                  type: 'string',
                  description:
                    'Diff unificado, só de arquivo modificado, cortado em ~200 linhas. ' +
                    'NÃO mande com auto_commit: full — o git já guarda o mesmo diff.'
                },
                highlights: HIGHLIGHTS_SCHEMA,
                symbols: SYMBOLS_SCHEMA,
                is_test: { type: 'boolean', description: 'Teste criado no passo f-bis' },
                drop: {
                  type: 'boolean',
                  description:
                    'Remove este arquivo do chunk. Único jeito de apagar — sumir da lista não apaga.'
                }
              }
            }
          },
          scenario_keys: {
            type: 'array',
            items: { type: 'string' },
            description: 'Cenários da spec que este chunk implementa, ex: ["CT-01","CT-03"].'
          },
          code_review: {
            type: 'array',
            description:
              'Achados do code review deste chunk (code_review: on). Upsert por path+title: ' +
              'rechamar com o mesmo achado atualiza, e achado não citado fica como estava. ' +
              'Use `status` para fechar o ciclo — achado sem desfecho é dívida invisível.',
            items: {
              type: 'object',
              required: ['severity', 'title'],
              properties: {
                severity: { type: 'string', enum: ['grave', 'medio', 'menor'] },
                path: { type: 'string' },
                line: { type: 'integer' },
                title: { type: 'string', description: 'O que está errado, em uma linha' },
                scenario: { type: 'string', description: 'Entrada concreta e o resultado errado' },
                cause: { type: 'string', description: 'O mecanismo do erro' },
                suggestion: { type: 'string', description: 'Caminho de correção, em uma frase' },
                scope: { type: 'string', enum: ['chunk', 'feature'] },
                status: {
                  type: 'string',
                  enum: ['aberto', 'corrigido', 'descartado', 'adiado'],
                  description: 'Omitido em achado novo = aberto. Só mande ao registrar o desfecho.'
                },
                resolution: {
                  type: 'string',
                  description: 'O que foi feito, ou por que foi descartado/adiado. Exigido fora de "aberto".'
                },
                drop: { type: 'boolean', description: 'Remove o achado. Sumir da lista não apaga.' }
              }
            }
          },
          data_model: {
            type: 'array',
            description:
              'Entidades modeladas neste chunk (data_model: on). Substitui as anteriores. ' +
              'O que não existe em nenhum outro lugar é decisions/rejected — mande sempre.',
            items: {
              type: 'object',
              required: ['name', 'kind'],
              properties: {
                name: { type: 'string', description: 'Tabela, coleção ou entidade' },
                kind: { type: 'string', enum: ['table', 'collection', 'entity'] },
                operation: { type: 'string', enum: ['created', 'altered', 'dropped'] },
                engine: { type: 'string', description: 'Ex: "PostgreSQL", "MongoDB", "Prisma"' },
                shape: {
                  type: 'string',
                  description: 'Colunas/campos com tipo, nulidade e chaves, uma por linha'
                },
                decisions: { type: 'string', description: 'Cada decisão não-óbvia com o porquê' },
                rejected: { type: 'string', description: 'Alternativa descartada e o motivo' },
                index_notes: { type: 'string', description: 'Índice + a consulta que o justifica' },
                migration: { type: 'string', description: 'Passos numerados e reversibilidade' }
              }
            }
          },
          commit: {
            type: 'object',
            description: 'Commit sugerido ou efetivado',
            required: ['message'],
            properties: {
              message: { type: 'string' },
              mode: { type: 'string', enum: ['full', 'suggest-only'] },
              branch: { type: 'string' },
              sha: { type: 'string' }
            }
          }
        }
      }
    };

module.exports = { RECORD_CHUNK_DEFINITION };
