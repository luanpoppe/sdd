'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { HtmlLayout } = require('./layout');

/**
 * Gera o espelho `.html` de um artefato `.md` do SDD, sem agente e sem dependência.
 *
 * Existe por um motivo de custo: com `format: both`, o mesmo documento era escrito duas
 * vezes pelo agente — a segunda sem nenhuma decisão nova, só reformatando o que já
 * estava decidido. O `.md` continua sendo a fonte; o `.html` passa a ser derivado.
 *
 *   node html.js <caminho.md> [...]   um ou mais arquivos
 *   node html.js --all [raiz]         todo espelho sob a raiz (padrão: cwd)
 *
 * Sai com código 1 se algum arquivo falhar, para o chamador conseguir cair no fallback.
 */
class RenderCli {
  static main(argv) {
    const args = argv.slice(2);
    if (args.length === 0) return RenderCli.usage();

    const isBatch = args[0] === '--all';
    const targets = isBatch ? RenderCli.findMirrors(args[1] ?? process.cwd()) : args;

    if (isBatch && targets.length === 0) {
      console.log('Nenhum artefato .md espelhável encontrado.');
      return 0;
    }

    let failed = 0;
    for (const target of targets) {
      const ok = RenderCli.renderFile(path.resolve(target));
      if (!ok) failed += 1;
    }

    console.log(`${targets.length - failed}/${targets.length} arquivo(s) gerado(s).`);
    return failed > 0 ? 1 : 0;
  }

  static usage() {
    console.error('uso: node html.js <caminho.md> [...]  |  node html.js --all [raiz]');
    return 1;
  }

  static renderFile(mdPath) {
    try {
      const context = RenderCli.buildContext(mdPath);
      if (!context) {
        console.error(`ignorado (não é artefato espelho): ${mdPath}`);
        return false;
      }

      const html = HtmlLayout.render(context);
      const htmlPath = mdPath.replace(/\.md$/, '.html');
      fs.writeFileSync(htmlPath, html, 'utf-8');
      console.log(`ok: ${htmlPath}`);
      return true;
    } catch (error) {
      console.error(`falhou: ${mdPath} — ${error.message}`);
      return false;
    }
  }

  /** Reúne tudo que a página precisa e que não está dentro do próprio markdown. */
  static buildContext(mdPath) {
    const artifact = RenderCli.artifactOf(mdPath);
    if (!artifact) return null;

    const sddRoot = RenderCli.findSddRoot(mdPath);
    const place = RenderCli.placeOf(mdPath, sddRoot);

    return {
      artifact,
      sourceName: path.basename(mdPath),
      markdown: fs.readFileSync(mdPath, 'utf-8'),
      updated: RenderCli.updatedAt(mdPath),
      lang: RenderCli.readLang(sddRoot),
      stylesHref: RenderCli.stylesHref(mdPath, sddRoot),
      changeId: place.changeId,
      featureSlug: place.featureSlug
    };
  }

  static artifactOf(mdPath) {
    const name = path.basename(mdPath);
    return RenderCli.MIRRORS.includes(name) ? name.replace(/\.md$/, '') : null;
  }

  /** Sobe pelos diretórios até achar o `.sdd/` da mudança. Fora dele, devolve null. */
  static findSddRoot(mdPath) {
    let dir = path.dirname(mdPath);

    while (true) {
      if (path.basename(dir) === '.sdd') return dir;
      const parent = path.dirname(dir);
      if (parent === dir) return null;
      dir = parent;
    }
  }

  /**
   * De onde o arquivo veio: qual mudança e, quando houver, qual feature. Sai do próprio
   * caminho (`.sdd/changes/<id>/specs/<slug>/spec.md`) — nada de abrir o `.sdd.yaml`,
   * que tornaria a geração dependente de um segundo arquivo estar em dia.
   */
  static placeOf(mdPath, sddRoot) {
    if (!sddRoot) return { changeId: path.basename(path.dirname(mdPath)), featureSlug: null };

    const parts = path.relative(sddRoot, mdPath).split(path.sep);
    const inChanges = parts[0] === 'changes' || parts[0] === 'archive';
    const changeId = inChanges ? parts[1] : parts[0];
    const featureSlug = parts.includes('specs') ? parts[parts.indexOf('specs') + 1] : null;

    return { changeId, featureSlug };
  }

  /** O CSS mora em `<.sdd>/assets/styles.css`; o caminho é relativo à pasta do arquivo. */
  static stylesHref(mdPath, sddRoot) {
    if (!sddRoot) return 'styles.css';

    const depth = path.relative(sddRoot, path.dirname(mdPath)).split(path.sep).filter(Boolean).length;
    return `${'../'.repeat(depth)}assets/styles.css`;
  }

  /** Data de modificação do `.md`: o espelho nunca diz ser mais novo que a fonte. */
  static updatedAt(mdPath) {
    return fs.statSync(mdPath).mtime.toISOString().slice(0, 10);
  }

  /**
   * `lang` do config do projeto. Leitura por regex de propósito: um parser de YAML
   * inteiro seria dependência nova para ler um campo de uma linha.
   */
  static readLang(sddRoot) {
    if (!sddRoot) return RenderCli.DEFAULT_LANG;

    try {
      const config = fs.readFileSync(path.join(sddRoot, 'config.yaml'), 'utf-8');
      const match = config.match(/^\s*lang:\s*([A-Za-z-]+)/m);
      return match ? match[1] : RenderCli.DEFAULT_LANG;
    } catch {
      return RenderCli.DEFAULT_LANG;
    }
  }

  /** Varre a raiz atrás de todo `.md` espelho, pulando o que não é do SDD. */
  static findMirrors(root) {
    const found = [];

    const walk = (dir) => {
      let entries = [];
      try {
        entries = fs.readdirSync(dir, { withFileTypes: true });
      } catch {
        return;
      }

      for (const entry of entries) {
        const full = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (RenderCli.SKIP_DIRS.has(entry.name)) continue;
          walk(full);
          continue;
        }

        if (RenderCli.MIRRORS.includes(entry.name)) found.push(full);
      }
    };

    walk(path.resolve(root));
    return found;
  }
}

RenderCli.MIRRORS = ['plan.md', 'spec.md', 'tasks.md', 'diagnosis.md', 'solutions.md'];
RenderCli.SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', 'out', 'vendor']);
RenderCli.DEFAULT_LANG = 'pt-BR';

process.exitCode = RenderCli.main(process.argv);
