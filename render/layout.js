'use strict';

const { MarkdownRenderer } = require('./markdown');
const { SddDocument } = require('./document');

/**
 * Monta a página HTML de um artefato. É aqui que vive tudo que é convenção do SDD e
 * não do markdown: o `<details class="lp-sec">` por seção, o índice lateral, o
 * breadcrumb e o rodapé que diz qual skill gerou o arquivo.
 *
 * Os `.html.tpl` em `helpers/templates/` continuam sendo a referência visual — e o
 * caminho de fallback, quando o agente precisa escrever o HTML à mão.
 */
class HtmlLayout {
  static render(context) {
    const doc = SddDocument.parse(context.markdown);
    const artifact = HtmlLayout.ARTIFACTS[context.artifact];
    const isTasks = context.artifact === 'tasks';

    const main = isTasks ? HtmlLayout.tasksMain(doc) : HtmlLayout.sectionsMain(doc);
    const toc = isTasks ? HtmlLayout.tasksToc(doc) : HtmlLayout.sectionsToc(doc);

    return HtmlLayout.retargetLinks(
      HtmlLayout.page({
        lang: context.lang,
        pageTitle: artifact.pageTitle(doc, context),
        stylesHref: context.stylesHref,
        tocLabel: artifact.tocLabel,
        toc,
        breadcrumb: artifact.breadcrumb(context),
        heading: artifact.heading(doc, context),
        meta: HtmlLayout.meta(doc, context),
        main,
        footer: artifact.footer,
        source: context.sourceName
      })
    );
  }

  // --- corpo -------------------------------------------------------------------

  /** Caso geral: cada `##` do markdown vira uma seção colapsável com âncora própria. */
  static sectionsMain(doc) {
    return doc.sections.map(HtmlLayout.sectionBlock).join('\n\n');
  }

  static sectionBlock(section) {
    return HtmlLayout.details({
      classes: 'lp-sec',
      id: section.id,
      heading: MarkdownRenderer.inline(section.title),
      body: MarkdownRenderer.blocks(section.lines)
    });
  }

  /**
   * O `tasks.md` é o único que não mapeia seção para seção: cada CHUNK (um `###`
   * dentro de "Chunks") vira seu próprio bloco, com `data-chunk` e `data-status` —
   * é o que o SDD Viewer e o `flow.html` usam para saber em que pé está cada um.
   */
  static tasksMain(doc) {
    return doc.sections
      .map((section) => {
        const isChunkSection = HtmlLayout.CHUNK_SECTION.test(section.title);
        if (!isChunkSection) return HtmlLayout.sectionBlock(section);

        const { subsections } = SddDocument.splitSubsections(section.lines);
        return subsections.map(HtmlLayout.chunkBlock).join('\n\n');
      })
      .join('\n\n');
  }

  static chunkBlock(subsection) {
    const chunkId = HtmlLayout.chunkId(subsection.title);
    const status = HtmlLayout.chunkStatus(subsection.lines);
    const label = HtmlLayout.STATUS_LABEL[status];
    const heading = `${MarkdownRenderer.inline(subsection.title)} <span class="lp-status">[${label}]</span>`;

    return HtmlLayout.details({
      classes: 'lp-sec lp-chunk',
      id: chunkId ? chunkId.replace('.', '-') : subsection.id,
      extraAttrs: chunkId ? ` data-chunk="${chunkId}" data-status="${status}"` : '',
      heading,
      body: MarkdownRenderer.blocks(subsection.lines)
    });
  }

  /** `F1.C2` ou `C3` no início do título do chunk. Sem isso, não é um chunk. */
  static chunkId(title) {
    const match = title.match(/^((?:F\d+\.)?C\d+)\b/);
    return match ? match[1] : null;
  }

  /**
   * O status sai dos próprios checkboxes, que são a verdade do `tasks.md`:
   * algum `[ ]` pendente mantém o chunk pendente; só `[x]` fecha.
   */
  static chunkStatus(lines) {
    const marks = lines.join('\n').match(/^\s*-\s*\[([ x~X])\]/gm) ?? [];
    if (marks.length === 0) return 'pending';

    const states = marks.map((mark) => mark.trim().slice(-2, -1).toLowerCase());
    if (states.includes(' ')) return 'pending';
    if (states.includes('~')) return 'in-review';
    return 'done';
  }

  // --- índice ------------------------------------------------------------------

  static sectionsToc(doc) {
    return doc.sections
      .map((section) => `<li><a href="#${section.id}">${MarkdownRenderer.inline(section.title)}</a></li>`)
      .join('\n      ');
  }

  static tasksToc(doc) {
    const entries = [];

    for (const section of doc.sections) {
      if (!HtmlLayout.CHUNK_SECTION.test(section.title)) continue;

      const { subsections } = SddDocument.splitSubsections(section.lines);
      for (const subsection of subsections) {
        const chunkId = HtmlLayout.chunkId(subsection.title);
        const anchor = chunkId ? chunkId.replace('.', '-') : subsection.id;
        entries.push(`<li><a href="#${anchor}">${MarkdownRenderer.inline(subsection.title)}</a></li>`);
      }
    }

    return entries.join('\n      ');
  }

  // --- montagem ----------------------------------------------------------------

  static details({ classes, id, extraAttrs = '', heading, body }) {
    return [
      `    <details class="${classes}" id="${id}"${extraAttrs} open>`,
      `      <summary><h2>${heading}</h2></summary>`,
      body
        .split('\n')
        .map((line) => (line ? `      ${line}` : line))
        .join('\n'),
      '    </details>'
    ].join('\n');
  }

  /**
   * A linha de metadados: o que o `>` do markdown já dizia, mais a data do arquivo.
   *
   * A data que o próprio markdown carrega é descartada: ela envelhece no texto, e o
   * espelho passaria a anunciar duas datas diferentes para o mesmo arquivo.
   */
  static meta(doc, context) {
    const fromLead = doc.lead
      .join(' · ')
      .split(' · ')
      .filter((part) => !HtmlLayout.DATE_PART.test(part.trim()));

    const parts = fromLead.length > 0 ? [MarkdownRenderer.inline(fromLead.join(' · '))] : [];
    parts.push(`atualizado em ${context.updated}`);
    return parts.join(' · ');
  }

  /**
   * Dentro do espelho, link para artefato irmão aponta para o `.html` dele. No `.md` o
   * alvo é `plan.md`, e é o certo lá; seguir para o markdown a partir do HTML tiraria o
   * leitor da versão que ele escolheu ler.
   */
  static retargetLinks(html) {
    const retargeted = html.replace(/href="([^"]+)\.md"/g, (match, target) => {
      const name = target.split('/').pop();
      const isMirror = HtmlLayout.MIRROR_NAMES.includes(name);
      return isMirror ? `href="${target}.html"` : match;
    });

    // O rótulo acompanha o destino: um link que leva ao `.html` e se anuncia como
    // `spec.md` faz o leitor achar que vai sair do espelho.
    return retargeted.replace(
      /(<a href="[^"]*?([A-Za-z0-9_-]+)\.html">(?:<code>)?)\2\.md((?:<\/code>)?<\/a>)/g,
      (_match, head, name, tail) => `${head}${name}.html${tail}`
    );
  }

  static page(view) {
    return `<!DOCTYPE html>
<html lang="${view.lang}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${view.pageTitle}</title>
  <link rel="stylesheet" href="${view.stylesHref}">
</head>
<body>
  <aside class="toc">
    <p class="toc-title">${view.tocLabel}</p>
    <ol>
      ${view.toc}
    </ol>
  </aside>

  <header class="lp-header">
    <p class="lp-breadcrumb">${view.breadcrumb}</p>
    <h1>${view.heading}</h1>
    <p class="lp-meta">${view.meta}</p>
  </header>

  <main class="lp-main">
${view.main}
  </main>

  <footer class="lp-footer">
    <p>Gerado pelo SDD <code>${view.footer}</code> a partir do <code>${view.source}</code> — a fonte é o .md.</p>
  </footer>
</body>
</html>
`;
  }
}

HtmlLayout.CHUNK_SECTION = /^chunks?$/i;

HtmlLayout.MIRROR_NAMES = ['plan', 'spec', 'tasks', 'diagnosis', 'solutions'];

// Trecho de metadado que é data — sai da linha porque a data vem do arquivo.
HtmlLayout.DATE_PART = /^(atualizado|criad[ao]|updated|created)/i;

HtmlLayout.STATUS_LABEL = {
  pending: 'pendente',
  'in-review': 'em revisão',
  done: 'concluído'
};

/**
 * Um registro por artefato espelho. Título da aba, cabeçalho, breadcrumb e rodapé são
 * o que difere entre eles — o resto do caminho é comum.
 */
HtmlLayout.ARTIFACTS = {
  plan: {
    tocLabel: 'Índice',
    pageTitle: (doc, ctx) => `Plano — ${ctx.changeId}`,
    heading: (doc) => MarkdownRenderer.inline(doc.title),
    breadcrumb: (ctx) => `<strong>${ctx.changeId}</strong> / plan`,
    footer: 'lp:new-feature'
  },
  spec: {
    tocLabel: 'Índice',
    pageTitle: (doc, ctx) => `Spec: ${ctx.featureSlug} — ${ctx.changeId}`,
    heading: (doc, ctx) => `Spec: ${ctx.featureSlug}`,
    breadcrumb: (ctx) =>
      `<a href="../../plan.html">${ctx.changeId}</a> / specs / <strong>${ctx.featureSlug}</strong> / spec`,
    footer: 'lp:continue'
  },
  tasks: {
    tocLabel: 'Chunks',
    pageTitle: (doc, ctx) =>
      ctx.featureSlug ? `Tasks: ${ctx.featureSlug} — ${ctx.changeId}` : `Tasks — ${ctx.changeId}`,
    heading: (doc, ctx) => (ctx.featureSlug ? `Tasks: ${ctx.featureSlug}` : 'Tasks'),
    breadcrumb: (ctx) =>
      ctx.featureSlug
        ? `<a href="../../plan.html">${ctx.changeId}</a> / specs / <strong>${ctx.featureSlug}</strong> / tasks`
        : `<strong>${ctx.changeId}</strong> / tasks`,
    footer: 'lp:continue'
  },
  diagnosis: {
    tocLabel: 'Índice',
    pageTitle: (doc, ctx) => `Diagnóstico — ${ctx.changeId}`,
    heading: (doc) => MarkdownRenderer.inline(doc.title),
    breadcrumb: (ctx) => `<strong>${ctx.changeId}</strong> / diagnóstico`,
    footer: 'lp:bug-fix'
  },
  solutions: {
    tocLabel: 'Índice',
    pageTitle: (doc, ctx) => `Soluções — ${ctx.changeId}`,
    heading: (doc) => MarkdownRenderer.inline(doc.title),
    breadcrumb: (ctx) =>
      `<strong>${ctx.changeId}</strong> / <a href="diagnosis.html">diagnóstico</a> / soluções`,
    footer: 'lp:continue'
  }
};

module.exports = { HtmlLayout };
