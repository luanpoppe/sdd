'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { SddDb } = require('./db');

/**
 * Reconstrói `explain_topics` a partir dos HTML em `~/.sdd/explain/`.
 *
 * Esta tabela nasceu declarada como "não reindexável", porque o `sdd_reindex` varre o
 * `.sdd/` de um projeto e os temas do `lp:explain` são globais. Mas eles **têm** origem
 * em arquivo — só que numa pasta fixa, fora de projeto —, e o estado da fila mora no
 * `data-status` do próprio HTML. Então dá para re-derivar, e a promessa de banco-índice
 * vale aqui também.
 *
 * O caso que motivou: tema escrito com o MCP desligado (ou antes do schema 6) fica
 * invisível no SDD Viewer, que lê o banco. O arquivo existe, a fila não aparece.
 */
class ExplainScanner {
  static explainDir() {
    const home = process.env.USERPROFILE || process.env.HOME || '';
    return path.join(home, '.sdd', 'explain');
  }

  /** Um registro por HTML da pasta. Pasta ausente devolve lista vazia, sem erro. */
  static scan(dir = ExplainScanner.explainDir()) {
    if (!fs.existsSync(dir)) return [];

    const topics = [];
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith('.html')) continue;

      const filePath = path.join(dir, name);
      const html = fs.readFileSync(filePath, 'utf-8');
      topics.push(ExplainScanner.parse(name, filePath, html));
    }

    return topics;
  }

  static parse(name, filePath, html) {
    const slug = name.replace(/\.html$/, '');
    const status = ExplainScanner.match(html, /<body[^>]*data-status="([^"]+)"/) ?? 'aberto';
    const title = ExplainScanner.match(html, /<h1[^>]*>([\s\S]*?)<\/h1>/) ?? slug;
    // A seção é um `<details id="overview">`, não um `<section>` — e o primeiro `<p>`
    // dentro dela é o resumo que o template pede.
    const summary = ExplainScanner.match(html, /id="overview"[^>]*>[\s\S]*?<p[^>]*>([\s\S]*?)<\/p>/);
    // Uma pergunta é um `<li data-asked-at=...>` dentro de `<ol class="lp-questions">`.
    const questions = (html.match(/<li[^>]*data-asked-at=/g) ?? []).length;
    const origins = ExplainScanner.origins(html);
    const stat = fs.statSync(filePath);

    return {
      slug,
      title: ExplainScanner.text(title),
      path: filePath,
      status: status === 'estudado' ? 'estudado' : 'aberto',
      summary: summary ? ExplainScanner.text(summary) : null,
      questions,
      origins,
      updated_at: stat.mtime.toISOString()
    };
  }

  /** Procedência de cada pergunta, como o `data-origin` do `<li>` a declara. */
  static origins(html) {
    const found = html.match(/data-origin="([^"]*)"/g) ?? [];
    const list = found.map((entry) => entry.slice('data-origin="'.length, -1));
    return [...new Set(list)];
  }

  static match(html, pattern) {
    const found = html.match(pattern);
    return found ? found[1] : null;
  }

  /** Tira as tags e normaliza espaço — o índice guarda texto, não marcação. */
  static text(fragment) {
    return fragment
      .replace(/<[^>]+>/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Insere o que falta e corrige o status do que já existe. **Não apaga** e não toca no
   * `detail`: o conteúdo acumulado pelas rodadas do `lp:explain` é mais rico do que o
   * que dá para extrair do HTML, e sobrescrevê-lo com um resumo seria perda.
   */
  static sync(db, topics) {
    let inserted = 0;
    let updated = 0;

    for (const topic of topics) {
      const existing = SddDb.one(db, 'SELECT id, status FROM explain_topics WHERE slug = ?', [
        topic.slug
      ]);

      if (!existing) {
        SddDb.run(
          db,
          `INSERT INTO explain_topics
             (slug, title, path, status, summary, questions, origins, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            topic.slug,
            topic.title,
            topic.path,
            topic.status,
            topic.summary,
            topic.questions,
            JSON.stringify(topic.origins ?? []),
            topic.updated_at,
            topic.updated_at
          ]
        );
        inserted += 1;
        continue;
      }

      if (existing.status === topic.status) continue;

      SddDb.run(db, 'UPDATE explain_topics SET status = ?, path = ? WHERE id = ?', [
        topic.status,
        topic.path,
        existing.id
      ]);
      updated += 1;
    }

    return { inserted, updated, scanned: topics.length };
  }
}

module.exports = { ExplainScanner };
