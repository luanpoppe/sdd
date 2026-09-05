'use strict';

const { SddDb } = require('./db');

/**
 * Escrita de explicação de código — trechos destacados e símbolos com exemplos.
 *
 * Vive fora das tools porque a estrutura é a MESMA para um arquivo de chunk e para um
 * step de `lp:review`. Sem isso, o review viraria um silo com seu próprio formato, e a
 * busca teria que aprender dois esquemas.
 *
 * A âncora é `{ fileChangePk }` OU `{ reviewStepPk }`, nunca as duas — o banco tem um
 * CHECK garantindo isso.
 */
class ExplainWriter {
  static anchorColumns(anchor) {
    if (anchor.fileChangePk) return { column: 'file_change_pk', value: anchor.fileChangePk };
    if (anchor.reviewStepPk) return { column: 'review_step_pk', value: anchor.reviewStepPk };
    throw new Error('âncora de explicação precisa de fileChangePk ou reviewStepPk');
  }

  /**
   * Apaga e reinsere. Um registro é sempre a foto completa daquele arquivo/step: se um
   * destaque saiu do escopo numa reescrita, ele tem que sair do banco também.
   */
  static replaceHighlights(db, anchor, highlights) {
    const { column, value } = ExplainWriter.anchorColumns(anchor);
    SddDb.run(db, `DELETE FROM code_highlights WHERE ${column} = ?`, [value]);

    const list = Array.isArray(highlights) ? highlights : [];
    list.forEach((highlight, index) => {
      SddDb.run(
        db,
        `INSERT INTO code_highlights
           (${column}, position, label, lines, language, snippet, explanation)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          value,
          index + 1,
          highlight.label ?? null,
          highlight.lines ?? null,
          highlight.language ?? null,
          highlight.snippet,
          highlight.explanation ?? null
        ]
      );
    });

    return list.length;
  }

  static replaceSymbols(db, anchor, symbols) {
    const { column, value } = ExplainWriter.anchorColumns(anchor);
    // Os exemplos caem por cascata junto com os símbolos.
    SddDb.run(db, `DELETE FROM symbols WHERE ${column} = ?`, [value]);

    const list = Array.isArray(symbols) ? symbols : [];
    let exampleCount = 0;

    list.forEach((symbol, index) => {
      const inserted = SddDb.run(
        db,
        `INSERT INTO symbols (${column}, position, name, kind, signature, purpose)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          value,
          index + 1,
          symbol.name,
          symbol.kind ?? null,
          symbol.signature ?? null,
          symbol.purpose ?? null
        ]
      );

      exampleCount += ExplainWriter.insertExamples(db, inserted.lastInsertRowid, symbol.examples);
    });

    return { symbols: list.length, examples: exampleCount };
  }

  static insertExamples(db, symbolPk, examples) {
    const list = Array.isArray(examples) ? examples : [];

    list.forEach((example, index) => {
      SddDb.run(
        db,
        `INSERT INTO symbol_examples (symbol_pk, position, label, input, output, note, is_edge)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          symbolPk,
          index + 1,
          example.label ?? null,
          ExplainWriter.asText(example.input),
          ExplainWriter.asText(example.output),
          example.note ?? null,
          example.is_edge ? 1 : 0
        ]
      );
    });

    return list.length;
  }

  /**
   * Entrada e saída chegam como string ou como objeto/array, conforme o agente achou
   * mais legível. Objeto vira JSON identado; string passa direto, para não transformar
   * `"Maria"` em `"\\"Maria\\""`.
   */
  static asText(value) {
    if (value === undefined || value === null) return null;
    if (typeof value === 'string') return value;

    try {
      return JSON.stringify(value, null, 2);
    } catch {
      return String(value);
    }
  }
}

// --- fragmentos de JSON Schema, compartilhados pelas tools -------------------

// As descrições aqui são curtas de propósito: elas entram no prompt de TODA requisição
// da sessão, enquanto o `../helpers/prompts/mcp-guide.md` só é lido quando o passo pede.
// Fica no schema o que muda o payload (limite, exclusão, formato); o resto mora no guia.
const HIGHLIGHTS_SCHEMA = {
  type: 'array',
  description:
    '0-3 trechos decisivos por arquivo (regra, query, erro, transformação), na ordem de ' +
    'leitura. Nunca import, boilerplate nem o arquivo inteiro.',
  items: {
    type: 'object',
    required: ['snippet'],
    properties: {
      label: { type: 'string', description: 'Título do trecho' },
      lines: { type: 'string', description: 'Faixa, ex: "34-48"' },
      language: { type: 'string', description: 'Ex: "csharp"' },
      snippet: { type: 'string', description: 'O código, 5-25 linhas' },
      explanation: { type: 'string', description: 'O que faz e por que importa' }
    }
  }
};

const SYMBOLS_SCHEMA = {
  type: 'array',
  description:
    'Só os símbolos que carregam comportamento, com exemplos. Pule DTO, getter, barrel ' +
    'e construtor.',
  items: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', description: 'Ex: "UsuarioResolver.ResolverNomesAsync"' },
      kind: {
        type: 'string',
        enum: ['method', 'function', 'class', 'endpoint', 'component', 'hook', 'query', 'other']
      },
      signature: { type: 'string', description: 'Assinatura real, com tipos' },
      purpose: { type: 'string', description: 'O que resolve, 1-2 frases' },
      examples: {
        type: 'array',
        description:
          'Dado plausível do domínio, nunca "foo"/"bar". Ao menos UM caso de borda ou falha.',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string', description: 'O caso, em poucas palavras' },
            input: { description: 'String ou objeto/array (vira JSON)' },
            output: { description: 'String ou objeto/array (vira JSON)' },
            note: { type: 'string', description: 'O que este caso prova' },
            is_edge: { type: 'boolean', description: 'true em borda ou falha' }
          }
        }
      }
    }
  }
};

module.exports = { ExplainWriter, HIGHLIGHTS_SCHEMA, SYMBOLS_SCHEMA };
