'use strict';

/**
 * Lê um artefato `.md` do SDD e devolve a estrutura que a página HTML precisa:
 * título, linha de metadados e as seções de nível 2, cada uma com suas linhas.
 *
 * Não interpreta markdown — isso é do `./markdown.js`. Aqui só se resolve o recorte
 * do documento, que é o que muda de artefato para artefato.
 */
class SddDocument {
  static parse(text) {
    const lines = SddDocument.stripComments(text).split('\n');
    const title = SddDocument.readTitle(lines);
    const lead = SddDocument.readLead(lines);
    const sections = SddDocument.readSections(lines);

    return { title, lead, sections };
  }

  /**
   * Comentário HTML some. Nos templates do SDD ele é instrução para o agente ("NÃO
   * detalhe aqui", "ex JS: ..."), e mostrá-la ao leitor do artefato seria vazar o
   * bastidor para dentro do documento.
   */
  static stripComments(text) {
    return text.replace(/<!--[\s\S]*?-->/g, '');
  }

  static readTitle(lines) {
    const heading = lines.find((line) => /^#\s+/.test(line));
    return heading ? heading.replace(/^#\s+/, '').trim() : '';
  }

  /**
   * O bloco de citação logo abaixo do `# título` — é onde plan/spec/tasks põem id,
   * data e links irmãos. Vira a linha de metadados do cabeçalho da página.
   */
  static readLead(lines) {
    const start = lines.findIndex((line) => /^#\s+/.test(line));
    if (start === -1) return [];

    const lead = [];
    for (let index = start + 1; index < lines.length; index += 1) {
      const line = lines[index];
      if (line.trim() === '') continue;
      if (!line.startsWith('>')) break;
      lead.push(line.replace(/^>\s?/, '').trim());
    }

    return lead;
  }

  /** Uma entrada por `##`, com as `###` de dentro preservadas nas linhas da seção. */
  static readSections(lines) {
    const sections = [];
    let current = null;

    for (const line of lines) {
      const heading = line.match(/^##\s+(?!#)(.*)$/);

      if (heading) {
        current = { title: heading[1].trim(), id: SddDocument.slug(heading[1]), lines: [] };
        sections.push(current);
        continue;
      }

      if (current) current.lines.push(line);
    }

    return sections;
  }

  /** Divide uma seção nos seus `###`. O que vem antes do primeiro é a introdução. */
  static splitSubsections(lines) {
    const intro = [];
    const subsections = [];
    let current = null;

    for (const line of lines) {
      const heading = line.match(/^###\s+(?!#)(.*)$/);

      if (heading) {
        current = { title: heading[1].trim(), id: SddDocument.slug(heading[1]), lines: [] };
        subsections.push(current);
        continue;
      }

      if (current) {
        current.lines.push(line);
        continue;
      }

      intro.push(line);
    }

    return { intro, subsections };
  }

  /**
   * Id de âncora a partir do título. Acento é removido em vez de escapado para que a
   * URL do índice continue legível — `#validacao`, não `#valida%C3%A7%C3%A3o`.
   */
  static slug(text) {
    return text
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
}

module.exports = { SddDocument };
