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

const HIGHLIGHTS_SCHEMA = {
  type: 'array',
  description:
    'Os trechos de código que DECIDEM este arquivo, na ordem de leitura. Só o que é ' +
    'decisivo — regra de negócio, query, tratamento de erro, ponto onde o dado muda de ' +
    'forma. Nunca import, boilerplate, getter, nem o arquivo inteiro colado.',
  items: {
    type: 'object',
    required: ['snippet'],
    properties: {
      label: { type: 'string', description: 'Título do trecho, ex: "Lookup em lote"' },
      lines: { type: 'string', description: 'Faixa de linhas, ex: "34-48"' },
      language: { type: 'string', description: 'Linguagem para destaque, ex: "csharp"' },
      snippet: { type: 'string', description: 'O código, recortado no essencial (5-25 linhas)' },
      explanation: { type: 'string', description: 'O que este trecho faz e por que importa' }
    }
  }
};

const SYMBOLS_SCHEMA = {
  type: 'array',
  description:
    'Os métodos/funções/endpoints que carregam comportamento, cada um com exemplos de ' +
    'entrada e saída com dado que faz sentido. É o que responde "o que isso faz de ' +
    'verdade" — pergunta que o snippet de código não responde. Pule símbolo trivial ' +
    '(DTO, getter, barrel, construtor).',
  items: {
    type: 'object',
    required: ['name'],
    properties: {
      name: { type: 'string', description: 'Ex: "JulgadoUsuarioResolver.ResolverNomesAsync"' },
      kind: {
        type: 'string',
        enum: ['method', 'function', 'class', 'endpoint', 'component', 'hook', 'query', 'other']
      },
      signature: { type: 'string', description: 'Assinatura real, com tipos' },
      purpose: { type: 'string', description: 'O que ele resolve, em 1-2 frases' },
      examples: {
        type: 'array',
        description:
          'Entrada -> saída com dado plausível do domínio, não "foo"/"bar". ' +
          'Inclua ao menos UM caso de borda ou falha, não só o caminho feliz.',
        items: {
          type: 'object',
          properties: {
            label: { type: 'string', description: 'Ex: "página com 2 julgados do mesmo usuário"' },
            input: { description: 'Entrada: string ou objeto/array (vira JSON)' },
            output: { description: 'Saída: string ou objeto/array (vira JSON)' },
            note: { type: 'string', description: 'O que este caso prova' },
            is_edge: { type: 'boolean', description: 'true em caso de borda ou falha' }
          }
        }
      }
    }
  }
};

module.exports = { ExplainWriter, HIGHLIGHTS_SCHEMA, SYMBOLS_SCHEMA };
