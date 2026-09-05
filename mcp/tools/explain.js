'use strict';

const { SddDb } = require('../db');
const { SddRepo } = require('../repo');
const { Log } = require('../log');

const DEFAULT_LIMIT = 30;
const MAX_LIMIT = 200;
const MAX_ORIGINS = 20;

/**
 * Temas do `lp:explain` — a única coisa neste banco que não pertence a um projeto.
 *
 * O que você entendeu sobre JWT, sobre WAL ou sobre backpressure continua valendo no
 * próximo repositório, então o tema é global e a procedência de cada pergunta vira
 * metadado (`origins`). É também a única fonte com **estado de leitura**: um tema nasce
 * `aberto` e só vira `estudado` quando o usuário disser, o que transforma o arquivo de
 * histórico numa fila do que ficou pela metade.
 */
class RecordExplainTool {
  static get definition() {
    return {
      name: 'sdd_record_explain',
      description:
        'Registra ou atualiza um tema global do lp:explain (o HTML em ~/.sdd/explain/). ' +
        'Acumula: chamar de novo no mesmo slug soma a pergunta e reescreve o resumo.',
      inputSchema: {
        type: 'object',
        required: ['slug'],
        properties: {
          slug: { type: 'string', description: 'Tema em kebab-case, ex: "jwt" ou "wal-sqlite"' },
          title: { type: 'string' },
          path: { type: 'string', description: 'Caminho do HTML global' },
          summary: { type: 'string', description: 'O que o tema cobre hoje, 1-2 frases' },
          detail: {
            type: 'string',
            description:
              'O que a busca precisa alcançar: conceitos, contrastes, armadilhas. Não cole o HTML.'
          },
          question: { type: 'string', description: 'A pergunta desta rodada, como foi feita' },
          origin: {
            type: 'string',
            description: 'De onde veio, ex: "projeto tal / mudança tal" — vira metadado'
          },
          status: { type: 'string', enum: ['aberto', 'estudado'] }
        }
      }
    };
  }

  static run(ctx, args) {
    const now = SddRepo.nowIso();
    const existing = RecordExplainTool.find(ctx.db, args.slug);
    const origins = RecordExplainTool.mergeOrigins(existing, args, now);

    if (!existing) {
      SddDb.run(
        ctx.db,
        `INSERT INTO explain_topics
           (slug, title, path, status, summary, detail, origins, questions, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          args.slug,
          args.title ?? args.slug,
          args.path ?? null,
          args.status ?? 'aberto',
          args.summary ?? null,
          args.detail ?? null,
          JSON.stringify(origins),
          args.question ? 1 : 0,
          now,
          now
        ]
      );
      Log.info('tema de explain criado', { slug: args.slug });
      return { slug: args.slug, created: true, status: args.status ?? 'aberto', questions: args.question ? 1 : 0 };
    }

    // `detail` acumula em vez de substituir: cada rodada acrescenta um ângulo do mesmo
    // tema, e sobrescrever apagaria o que a busca já alcançava.
    const detail = RecordExplainTool.appendDetail(existing.detail, args.detail);
    const status = args.status ?? existing.status;
    const questions = existing.questions + (args.question ? 1 : 0);

    SddDb.run(
      ctx.db,
      `UPDATE explain_topics
          SET title = ?, path = ?, status = ?, summary = ?, detail = ?, origins = ?,
              questions = ?, updated_at = ?, studied_at = ?
        WHERE id = ?`,
      [
        args.title ?? existing.title,
        args.path ?? existing.path,
        status,
        args.summary ?? existing.summary,
        detail,
        JSON.stringify(origins),
        questions,
        now,
        status === 'estudado' ? (existing.studied_at ?? now) : null,
        existing.id
      ]
    );

    Log.info('tema de explain atualizado', { slug: args.slug, questions, status });
    return { slug: args.slug, created: false, status, questions };
  }

  static find(db, slug) {
    return SddDb.one(db, `SELECT * FROM explain_topics WHERE slug = ?`, [slug]) ?? null;
  }

  static appendDetail(current, addition) {
    if (!addition) return current ?? null;
    if (!current) return addition;
    if (current.includes(addition)) return current;
    return `${current}\n\n${addition}`;
  }

  /**
   * Guarda de onde cada pergunta veio, mais recente primeiro, sem repetir origem e sem
   * crescer para sempre — a lista serve para lembrar o contexto, não para auditoria.
   */
  static mergeOrigins(existing, args, now) {
    const previous = RecordExplainTool.parseOrigins(existing);
    if (!args.origin && !args.question) return previous;

    const entry = { at: now, origin: args.origin ?? null, question: args.question ?? null };
    const withoutDuplicate = previous.filter(
      (item) => !(item.origin === entry.origin && item.question === entry.question)
    );
    return [entry, ...withoutDuplicate].slice(0, MAX_ORIGINS);
  }

  static parseOrigins(existing) {
    if (!existing || !existing.origins) return [];
    try {
      const parsed = JSON.parse(existing.origins);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}

/**
 * Leitura da fila. Sem filtro devolve o que está `aberto`, porque é a pergunta que se
 * faz na prática: "o que ficou pela metade?".
 */
class ReadExplainTool {
  static get definition() {
    return {
      name: 'sdd_read_explain',
      description:
        'Lista os temas globais do lp:explain. Sem filtro, devolve a fila de estudo (status ' +
        'aberto, do mais antigo). Com slug, devolve o tema inteiro.',
      inputSchema: {
        type: 'object',
        properties: {
          slug: { type: 'string', description: 'Um tema específico' },
          status: { type: 'string', enum: ['aberto', 'estudado', 'todos'] },
          limit: { type: 'integer', description: `Padrão ${DEFAULT_LIMIT}` }
        }
      }
    };
  }

  static run(ctx, args) {
    if (args.slug) {
      const topic = RecordExplainTool.find(ctx.db, args.slug);
      if (!topic) return { slug: args.slug, found: false };
      return { found: true, topic: ReadExplainTool.shape(topic, true) };
    }

    const status = args.status ?? 'aberto';
    const limit = ReadExplainTool.clampLimit(args.limit);
    const where = status === 'todos' ? '' : 'WHERE status = ?';
    const params = status === 'todos' ? [limit] : [status, limit];

    // Fila ordena pelo mais antigo primeiro: o tema esquecido há mais tempo é o que
    // precisa aparecer, não o que você acabou de perguntar.
    const order = status === 'estudado' ? 'studied_at DESC' : 'updated_at ASC';
    const rows = SddDb.all(
      ctx.db,
      `SELECT * FROM explain_topics ${where} ORDER BY ${order} LIMIT ?`,
      params
    );

    Log.info('fila de explain lida', { status, total: rows.length });
    return { status, total: rows.length, topics: rows.map((row) => ReadExplainTool.shape(row, false)) };
  }

  static clampLimit(raw) {
    if (!Number.isInteger(raw) || raw < 1) return DEFAULT_LIMIT;
    return Math.min(raw, MAX_LIMIT);
  }

  static shape(row, full) {
    const base = {
      slug: row.slug,
      title: row.title,
      status: row.status,
      questions: row.questions,
      summary: row.summary,
      updated_at: row.updated_at
    };
    if (!full) return base;
    return {
      ...base,
      path: row.path,
      detail: row.detail,
      origins: RecordExplainTool.parseOrigins(row),
      created_at: row.created_at,
      studied_at: row.studied_at
    };
  }
}

module.exports = { RecordExplainTool, ReadExplainTool };
