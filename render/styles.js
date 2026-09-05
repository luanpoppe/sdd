'use strict';

const fs = require('node:fs');
const path = require('node:path');

/**
 * Mantém o `.sdd/assets/styles.css` de um projeto em dia com o do plugin, sem destruir
 * a customização de cores feita no `lp:init`.
 *
 * O problema que isto resolve: toda skill que gera HTML diz "copie o CSS **se faltar**",
 * e nunca atualiza. Correção de template nunca chegava nas cópias — e sobrescrever era
 * proibido porque a cópia podia ter cor customizada dentro dela.
 *
 * A saída é separar os dois no mesmo arquivo, por um marcador: tudo **acima** é do
 * plugin e pode ser substituído; tudo **abaixo** é do projeto e é preservado sempre.
 *
 *   node styles.js <projeto>            relatório (padrão): compara versões
 *   node styles.js <projeto> --update   atualiza, preservando a customização
 *   node styles.js <projeto> --force    atualiza cópia SEM marcador (perde edição inline)
 */
class StylesCli {
  static main(argv) {
    const args = argv.slice(2);
    const target = args.find((arg) => !arg.startsWith('--'));
    if (!target) return StylesCli.usage();

    const mode = StylesCli.modeOf(args);
    const projectRoot = path.resolve(target);
    const copyPath = path.join(projectRoot, '.sdd', 'assets', 'styles.css');

    const source = StylesCli.readSource();
    if (!source) {
      console.error('CSS do plugin não encontrado — reinstale o SDD.');
      return 1;
    }

    if (!fs.existsSync(copyPath)) return StylesCli.install(copyPath, source, mode);

    const copy = fs.readFileSync(copyPath, 'utf-8');
    const report = StylesCli.compare(copy, source);
    StylesCli.printReport(copyPath, report);

    if (mode === 'check') return 0;
    if (report.upToDate) return 0;

    const canWrite = report.hasMarker || mode === 'force';
    if (!canWrite) {
      console.error(
        'Esta cópia não tem o marcador de customização, então não dá para saber o que nela é seu.\n' +
          'Revise o diff e, se puder descartar as edições inline, rode de novo com --force.'
      );
      return 1;
    }

    return StylesCli.write(copyPath, source, report.custom);
  }

  static usage() {
    console.error('uso: node styles.js <projeto> [--update | --force]');
    return 1;
  }

  static modeOf(args) {
    if (args.includes('--force')) return 'force';
    if (args.includes('--update')) return 'update';
    return 'check';
  }

  /**
   * O CSS do plugin. Ele não vive ao lado deste script: o instalador o copia para a
   * pasta de templates do harness (`~/.claude/skills/lp-shared/templates/`), enquanto
   * este script vai para `~/.sdd/render/`. A busca cobre os dois lados, mais o
   * repositório, para funcionar também rodando do fonte.
   */
  static readSource() {
    const home = process.env.USERPROFILE || process.env.HOME || '';
    const candidates = [
      path.join(home, '.claude', 'skills', 'lp-shared', 'templates', 'styles.css'),
      path.join(home, '.cursor', 'lp-helpers', 'templates', 'styles.css'),
      path.join(__dirname, '..', 'helpers', 'templates', 'styles.css'),
      path.join(__dirname, '..', 'templates', 'styles.css')
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(candidate)) return fs.readFileSync(candidate, 'utf-8');
    }
    return null;
  }

  /** Versão do plugin, escrita pelo instalador ao copiar esta pasta. */
  static pluginVersion() {
    try {
      const marker = path.join(__dirname, '.lp-version.json');
      return JSON.parse(fs.readFileSync(marker, 'utf-8')).version ?? 'desconhecida';
    } catch {
      return 'desconhecida';
    }
  }

  static compare(copy, source) {
    const markerAt = copy.indexOf(StylesCli.MARKER);
    const hasMarker = markerAt !== -1;
    const custom = hasMarker ? copy.slice(markerAt) : '';
    const base = hasMarker ? copy.slice(0, markerAt) : copy;

    const stamp = copy.match(StylesCli.STAMP) ;
    const version = stamp ? stamp[1] : null;
    const expected = StylesCli.pluginVersion();

    return {
      hasMarker,
      custom,
      version,
      expected,
      customLines: hasMarker ? custom.split('\n').length : 0,
      driftLines: StylesCli.countDrift(base, source),
      upToDate: version === expected && StylesCli.countDrift(base, source) === 0
    };
  }

  /** Quantas linhas diferem, só para o relatório dizer o tamanho da diferença. */
  static countDrift(base, source) {
    const left = new Set(base.split('\n'));
    return source.split('\n').filter((line) => line.trim() !== '' && !left.has(line)).length;
  }

  static printReport(copyPath, report) {
    console.log(`cópia:  ${copyPath}`);
    console.log(`versão: ${report.version ?? '(sem carimbo — anterior a este esquema)'}`);
    console.log(`plugin: ${report.expected}`);

    if (report.upToDate) {
      console.log('em dia.');
      return;
    }

    console.log(`linhas do plugin ausentes na cópia: ${report.driftLines}`);
    console.log(
      report.hasMarker
        ? `customização preservável: ${report.customLines} linha(s) abaixo do marcador`
        : 'sem marcador de customização'
    );
  }

  static install(copyPath, source, mode) {
    if (mode === 'check') {
      console.log(`cópia ausente: ${copyPath} — rode com --update para criar.`);
      return 0;
    }

    fs.mkdirSync(path.dirname(copyPath), { recursive: true });
    return StylesCli.write(copyPath, source, '');
  }

  static write(copyPath, source, custom) {
    const header = `/* sdd-styles ${StylesCli.pluginVersion()} — gerado pelo SDD.\n   NÃO edite acima do marcador: esta parte é substituída a cada atualização.\n   Customização do projeto vai abaixo do marcador e é sempre preservada. */\n`;
    const block = custom || StylesCli.emptyCustomBlock();

    fs.writeFileSync(copyPath, `${header}${source}\n${block}`, 'utf-8');
    console.log(`atualizado: ${copyPath}`);
    return 0;
  }

  static emptyCustomBlock() {
    return (
      `${StylesCli.MARKER}\n` +
      '/* Cores e ajustes deste projeto. Sobrescreve o que está acima.\n' +
      '   Ex:  :root { --accent: #2563eb; --bg: #ffffff; }  */\n'
    );
  }
}

StylesCli.MARKER = '/* >>> customização do projeto — preservada nas atualizações <<< */';
StylesCli.STAMP = /^\/\* sdd-styles ([^\s]+)/;

process.exitCode = StylesCli.main(process.argv);
