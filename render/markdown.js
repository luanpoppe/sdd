'use strict';

/**
 * Markdown → HTML, só do que o SDD realmente emite nos artefatos: cabeçalho, lista
 * (aninhada, com checkbox), bloco de código, tabela, citação, régua e parágrafo.
 *
 * A regra que sustenta o resto: linha que não casa com nenhum bloco conhecido vira
 * parágrafo escapado. No pior caso ela perde formatação — nunca desaparece, e nunca
 * escapa HTML cru para dentro da página.
 *
 * Comentário HTML é descartado de propósito: nos templates do SDD ele carrega instrução
 * para o agente, não conteúdo para o leitor.
 */
class MarkdownRenderer {
  /** Converte um bloco de linhas já sem os comentários HTML. */
  static blocks(lines) {
    const out = [];
    let index = 0;

    while (index < lines.length) {
      const consumed = MarkdownRenderer.consumeBlock(lines, index, out);
      index += consumed;
    }

    return out.join('\n');
  }

  /**
   * Lê UM bloco a partir de `start` e devolve quantas linhas ele consumiu. Cada tipo
   * tem seu próprio leitor; a ordem aqui é a ordem de precedência entre eles.
   */
  static consumeBlock(lines, start, out) {
    const line = lines[start];

    if (line.trim() === '') return 1;

    if (MarkdownRenderer.isFence(line)) return MarkdownRenderer.readCode(lines, start, out);
    if (MarkdownRenderer.isRule(line)) {
      out.push('<hr>');
      return 1;
    }
    if (MarkdownRenderer.isQuote(line)) return MarkdownRenderer.readQuote(lines, start, out);
    if (MarkdownRenderer.isTableStart(lines, start)) return MarkdownRenderer.readTable(lines, start, out);
    if (MarkdownRenderer.isListItem(line)) return MarkdownRenderer.readList(lines, start, out);
    if (MarkdownRenderer.isHeading(line)) return MarkdownRenderer.readHeading(lines, start, out);

    return MarkdownRenderer.readParagraph(lines, start, out);
  }

  // --- reconhecimento de bloco -------------------------------------------------

  static isFence(line) {
    return line.trimStart().startsWith('```');
  }

  static isRule(line) {
    return /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line);
  }

  static isQuote(line) {
    return /^\s*>/.test(line);
  }

  static isHeading(line) {
    return /^\s*#{1,6}\s+/.test(line);
  }

  static isListItem(line) {
    return /^\s*([-*+]|\d+[.)])\s+/.test(line);
  }

  /** Tabela só é tabela com a linha de separação (`|---|---|`) logo abaixo. */
  static isTableStart(lines, start) {
    const hasPipe = lines[start].includes('|');
    const next = lines[start + 1] ?? '';
    const nextIsSeparator = /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(next) && next.includes('-');
    return hasPipe && nextIsSeparator;
  }

  // --- leitores ----------------------------------------------------------------

  static readCode(lines, start, out) {
    const language = lines[start].trim().slice(3).trim();
    const body = [];
    let index = start + 1;

    while (index < lines.length && !MarkdownRenderer.isFence(lines[index])) {
      body.push(lines[index]);
      index += 1;
    }

    const classAttr = language ? ` class="lang-${MarkdownRenderer.escape(language)}"` : '';
    const code = MarkdownRenderer.escape(body.join('\n'));
    out.push(`<pre class="code"><code${classAttr}>${code}</code></pre>`);

    // +1 pela cerca de fechamento, quando ela existe (arquivo truncado não quebra).
    const closed = index < lines.length ? 1 : 0;
    return index - start + closed;
  }

  static readQuote(lines, start, out) {
    const body = [];
    let index = start;

    while (index < lines.length && MarkdownRenderer.isQuote(lines[index])) {
      body.push(lines[index].replace(/^\s*>\s?/, ''));
      index += 1;
    }

    out.push(`<blockquote>${MarkdownRenderer.blocks(body)}</blockquote>`);
    return index - start;
  }

  static readTable(lines, start, out) {
    const cells = (row) =>
      row
        .trim()
        .replace(/^\|/, '')
        .replace(/\|$/, '')
        .split('|')
        .map((cell) => MarkdownRenderer.inline(cell.trim()));

    const header = cells(lines[start]);
    const rows = [];
    let index = start + 2;

    while (index < lines.length && lines[index].includes('|') && lines[index].trim() !== '') {
      rows.push(cells(lines[index]));
      index += 1;
    }

    const head = header.map((cell) => `<th>${cell}</th>`).join('');
    const body = rows
      .map((row) => `    <tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`)
      .join('\n');

    out.push(
      ['<table>', `  <thead><tr>${head}</tr></thead>`, '  <tbody>', body, '  </tbody>', '</table>'].join('\n')
    );
    return index - start;
  }

  /**
   * Lista com aninhamento por indentação. O nível é a indentação do item dividida por
   * 2, então um sub-item de 2 espaços entra dentro do anterior — que é exatamente como
   * o `tasks.md` e o `spec.md` escrevem.
   */
  static readList(lines, start, out) {
    const items = [];
    let index = start;

    while (index < lines.length) {
      const line = lines[index];
      const isContinuation = line.trim() !== '' && !MarkdownRenderer.isListItem(line) && items.length > 0;

      if (MarkdownRenderer.isListItem(line)) {
        items.push(MarkdownRenderer.parseItem(line));
        index += 1;
        continue;
      }

      // Linha solta logo abaixo de um item pertence a ele (quebra de linha do autor).
      if (isContinuation && line.startsWith(' ')) {
        items[items.length - 1].text += ` ${line.trim()}`;
        index += 1;
        continue;
      }

      break;
    }

    out.push(MarkdownRenderer.renderItems(items, 0).html);
    return index - start;
  }

  static parseItem(line) {
    const indent = line.length - line.trimStart().length;
    const ordered = /^\s*\d+[.)]\s+/.test(line);
    const text = line.trimStart().replace(/^([-*+]|\d+[.)])\s+/, '');
    const checkbox = text.match(/^\[([ x~X])\]\s*/);

    return {
      level: Math.floor(indent / 2),
      ordered,
      checked: checkbox ? checkbox[1].toLowerCase() : null,
      text: checkbox ? text.slice(checkbox[0].length) : text
    };
  }

  /** Monta a lista recursivamente: item mais indentado vira lista dentro do anterior. */
  static renderItems(items, position) {
    const first = items[position];
    const tag = first.ordered ? 'ol' : 'ul';
    const parts = [];
    let index = position;

    while (index < items.length && items[index].level >= first.level) {
      const item = items[index];

      if (item.level > first.level) {
        const nested = MarkdownRenderer.renderItems(items, index);
        parts[parts.length - 1] = parts[parts.length - 1].replace(/<\/li>$/, `${nested.html}</li>`);
        index = nested.next;
        continue;
      }

      parts.push(MarkdownRenderer.renderItem(item));
      index += 1;
    }

    const items_ = parts.map((part) => `  ${part}`).join('\n');
    return { html: `<${tag}>\n${items_}\n</${tag}>`, next: index };
  }

  static renderItem(item) {
    const text = MarkdownRenderer.inline(item.text);
    if (item.checked === null) return `<li>${text}</li>`;

    const done = item.checked !== ' ';
    const state = MarkdownRenderer.CHECK_STATE[item.checked] ?? 'pending';
    const attrs = done ? ' checked' : '';
    return `<li class="task task-${state}"><input type="checkbox" disabled${attrs}> ${text}</li>`;
  }

  static readHeading(lines, start, out) {
    const match = lines[start].trim().match(/^(#{1,6})\s+(.*)$/);
    const level = match[1].length;
    out.push(`<h${level}>${MarkdownRenderer.inline(match[2])}</h${level}>`);
    return 1;
  }

  static readParagraph(lines, start, out) {
    const body = [];
    let index = start;

    while (index < lines.length) {
      const line = lines[index];
      const startsOtherBlock =
        line.trim() === '' ||
        MarkdownRenderer.isHeading(line) ||
        MarkdownRenderer.isListItem(line) ||
        MarkdownRenderer.isQuote(line) ||
        MarkdownRenderer.isFence(line) ||
        MarkdownRenderer.isRule(line);

      if (startsOtherBlock) break;
      body.push(line.trim());
      index += 1;
    }

    out.push(`<p>${MarkdownRenderer.inline(body.join(' '))}</p>`);
    return index - start;
  }

  // --- inline ------------------------------------------------------------------

  /**
   * Marcação dentro da linha. `código` sai primeiro e vira marcador, para que asterisco
   * e underscore dentro dele não sejam interpretados como ênfase.
   */
  static inline(text) {
    const spans = [];
    // O marcador usa NUL nas pontas porque NUL nunca aparece em markdown escrito à mão.
    // Um número solto entre espaços colidiria com "em 2 casos" no meio do texto.
    const withPlaceholders = text.replace(/`([^`]+)`/g, (_match, code) => {
      spans.push(code);
      return `\u0000${spans.length - 1}\u0000`;
    });

    let html = MarkdownRenderer.escape(withPlaceholders);
    html = html.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, '<a href="$2">$1</a>');
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/(^|[^*\w])\*([^*]+)\*/g, '$1<em>$2</em>');
    html = html.replace(/(^|\s)_([^_]+)_(?=\s|$|[.,;:!?)])/g, '$1<em>$2</em>');

    return html.replace(
      /\u0000(\d+)\u0000/g,
      (_match, index) => `<code>${MarkdownRenderer.escape(spans[Number(index)])}</code>`
    );
  }

  static escape(text) {
    return text
      .split('&')
      .join('&amp;')
      .split('<')
      .join('&lt;')
      .split('>')
      .join('&gt;')
      .split('"')
      .join('&quot;');
  }
}

MarkdownRenderer.CHECK_STATE = { ' ': 'pending', '~': 'in-review', x: 'done' };

module.exports = { MarkdownRenderer };
