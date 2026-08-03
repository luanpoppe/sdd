#!/usr/bin/env node
// Installer cross-tool do SDD lp:* — instala as skills no Claude Code e/ou Cursor.
//
// Uso:
//   npx github:luanpoppe/sdd            # detecta ferramentas e instala em todas
//   npx github:luanpoppe/sdd --tool=cursor
//   npx github:luanpoppe/sdd --tool=claude --dry-run
//   node bin/install.js --tool=all
//
// No Claude Code o jeito nativo é `/plugin install lp@sdd`. Este installer serve
// principalmente pro Cursor (e pra quem prefere skills pessoais sem o marketplace).
//
// Pure stdlib, zero deps.

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SKILLS_SRC = path.join(ROOT, 'skills');
const HELPERS_SRC = path.join(ROOT, 'helpers');
const HOME = os.homedir();
const PKG_VERSION = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude-plugin', 'plugin.json'), 'utf8')).version;
const VERSION_MARKER = '.lp-version.json';

const VALID_TOOLS = ['all', 'claude', 'cursor'];

// ---- args ----
function parseArgs(argv) {
  const out = { tool: 'all', dryRun: false };
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') out.dryRun = true;
    else if (a.startsWith('--tool=')) out.tool = a.slice('--tool='.length);
    else if (a === '-h' || a === '--help') out.help = true;
  }
  if (!VALID_TOOLS.includes(out.tool)) out.invalidTool = out.tool;
  return out;
}

function help() {
  process.stdout.write(`SDD lp:* installer

  --tool=claude|cursor|all   alvo (default: all detectado)
  --dry-run                  mostra o que faria, sem escrever
  -h, --help                 esta ajuda
`);
}

// ---- fs helpers ----
function listSkills() {
  return fs.readdirSync(SKILLS_SRC, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)
    .filter(name => fs.existsSync(path.join(SKILLS_SRC, name, 'SKILL.md')));
}

function copyDir(src, dest, actions) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d, actions);
    else { actions.push(['copy', s, d]); }
  }
}

function readSkill(name) {
  return fs.readFileSync(path.join(SKILLS_SRC, name, 'SKILL.md'), 'utf8');
}

// reescreve refs ../../helpers/{prompts,templates}/ para o path base do alvo
function rewriteHelperRefs(content, helpersBase) {
  return content
    .replace(/\.\.\/\.\.\/helpers\/prompts\//g, `${helpersBase}/prompts/`)
    .replace(/\.\.\/\.\.\/helpers\/templates\//g, `${helpersBase}/templates/`);
}

// troca a linha `name: X` do frontmatter por `name: <newName>`
function setFrontmatterName(content, newName) {
  return content.replace(/^name:\s*.+$/m, `name: ${newName}`);
}

// ---- version marker (pra auto-update saber o que já tá instalado) ----
function readInstalledVersion(helpersDest) {
  const p = path.join(helpersDest, VERSION_MARKER);
  if (!fs.existsSync(p)) return null;
  try { return JSON.parse(fs.readFileSync(p, 'utf8')).version; } catch { return null; }
}

function writeVersionMarker(helpersDest, actions) {
  actions.push(['write', VERSION_MARKER, path.join(helpersDest, VERSION_MARKER),
    JSON.stringify({ version: PKG_VERSION, updatedAt: new Date().toISOString().slice(0, 10) }, null, 2)]);
}

// ---- targets ----
// Cursor lê ~/.claude/skills/ nativamente (suporte a Claude Code skills). Se
// o Claude Code também estiver instalado, escrever SÓ lá evita que os mesmos
// comandos apareçam duplicados no Cursor (uma vez como skill do Claude, outra
// vez como command próprio dele). Só escrevemos em ~/.cursor/commands quando
// o Cursor for o único alvo disponível (sem ~/.claude no sistema).
function detect(tool) {
  const hasClaude = fs.existsSync(path.join(HOME, '.claude'));
  const hasCursor = fs.existsSync(path.join(HOME, '.cursor'));
  const wantClaude = tool === 'all' || tool === 'claude';
  const wantCursor = tool === 'all' || tool === 'cursor';

  const targets = [];
  if (wantClaude && (hasClaude || tool === 'claude')) targets.push('claude');

  const claudeCoversCursor = tool === 'all' && targets.includes('claude');
  if (wantCursor && (hasCursor || tool === 'cursor') && !claudeCoversCursor) targets.push('cursor');

  return { targets, claudeCoversCursor };
}

// Remove entradas lp-* órfãs no diretório de destino ANTES de recopiar, pra
// que skills/helpers renomeados ou removidos numa versão nova não fiquem
// acumulando lixo. `predicate(nome)` decide o que é do nosso namespace.
function planPurgeOrphans(destDir, predicate, actions) {
  if (!fs.existsSync(destDir)) return;
  for (const entry of fs.readdirSync(destDir, { withFileTypes: true })) {
    if (!predicate(entry.name)) continue;
    const p = path.join(destDir, entry.name);
    actions.push([entry.isDirectory() ? 'deleteDir' : 'delete', p]);
  }
}

function planClaude(skills, actions) {
  const skillsDest = path.join(HOME, '.claude', 'skills');
  const helpersDest = path.join(skillsDest, 'lp-shared');
  const helpersBase = '~/.claude/skills/lp-shared';
  const installed = readInstalledVersion(helpersDest);
  // limpa lp-* (skills lp-<nome> + lp-shared) antes de recopiar — remove órfãos
  planPurgeOrphans(skillsDest, n => n.startsWith('lp-'), actions);
  // helpers
  copyDir(HELPERS_SRC, helpersDest, actions);
  writeVersionMarker(helpersDest, actions);
  // skills -> lp-<name>/SKILL.md, prefixo lp- restaurado, refs absolutas
  for (const name of skills) {
    let c = readSkill(name);
    c = rewriteHelperRefs(c, helpersBase);
    c = setFrontmatterName(c, `lp-${name}`);
    actions.push(['write', `lp-${name}/SKILL.md`, path.join(skillsDest, `lp-${name}`, 'SKILL.md'), c]);
  }
  return { line: `Claude Code → ${skillsDest} (invoca /lp-<nome>)`, installed };
}

// Remove lp-*.md e lp-helpers/ deixados por instalações antigas do installer
// (antes desta versão, que sempre escrevia em ~/.cursor/commands mesmo com
// Claude Code presente — causava os comandos duplicados no Cursor).
function planCleanupCursorDuplicates(skills, actions) {
  const cmdDest = path.join(HOME, '.cursor', 'commands');
  const helpersDest = path.join(HOME, '.cursor', 'lp-helpers');
  let found = 0;
  for (const name of skills) {
    const f = path.join(cmdDest, `lp-${name}.md`);
    if (fs.existsSync(f)) { actions.push(['delete', f]); found++; }
  }
  if (fs.existsSync(helpersDest)) { actions.push(['deleteDir', helpersDest]); found++; }
  return found;
}

function planCursor(skills, actions) {
  const cmdDest = path.join(HOME, '.cursor', 'commands');
  const helpersDest = path.join(HOME, '.cursor', 'lp-helpers');
  const helpersBase = '~/.cursor/lp-helpers';
  const installed = readInstalledVersion(helpersDest);
  // limpa lp-*.md órfãos + lp-helpers antes de recopiar
  planPurgeOrphans(cmdDest, n => n.startsWith('lp-') && n.endsWith('.md'), actions);
  if (fs.existsSync(helpersDest)) actions.push(['deleteDir', helpersDest]);
  copyDir(HELPERS_SRC, helpersDest, actions);
  writeVersionMarker(helpersDest, actions);
  for (const name of skills) {
    let c = readSkill(name);
    c = rewriteHelperRefs(c, helpersBase);
    // Cursor pode listar o comando pelo `name:` do frontmatter E pelo nome do
    // arquivo — se divergirem (ex: name: new, arquivo lp-new.md), aparece
    // duplicado no menu. Mantém os dois sincronizados em lp-<nome>.
    c = setFrontmatterName(c, `lp-${name}`);
    actions.push(['write', `lp-${name}.md`, path.join(cmdDest, `lp-${name}.md`), c]);
  }
  return { line: `Cursor → ${cmdDest} (invoca /lp-<nome>)`, installed };
}

// ---- run ----
function main() {
  const args = parseArgs(process.argv);
  if (args.help) return help();
  if (args.invalidTool) {
    process.stderr.write(`--tool inválido: "${args.invalidTool}". Use: ${VALID_TOOLS.join(' | ')}.\n`);
    process.exit(2);
  }

  const skills = listSkills();
  if (!skills.length) { process.stderr.write('Nenhuma skill encontrada em skills/.\n'); process.exit(1); }

  const { targets, claudeCoversCursor } = detect(args.tool);
  if (!targets.length) {
    process.stderr.write('Nenhuma ferramenta detectada (~/.claude ou ~/.cursor). Use --tool=claude|cursor.\n');
    process.exit(1);
  }

  const actions = [];
  const plans = [];
  for (const t of targets) {
    if (t === 'claude') plans.push(planClaude(skills, actions));
    if (t === 'cursor') plans.push(planCursor(skills, actions));
  }

  process.stdout.write(`SDD lp:* — versão do repo: ${PKG_VERSION} (${skills.length} skills)\nAlvos: ${targets.join(', ')}\n`);
  plans.forEach(p => {
    process.stdout.write(`  • ${p.line}\n`);
    if (p.installed === null) process.stdout.write(`    (nenhuma instalação anterior encontrada — instalando do zero)\n`);
    else if (p.installed === PKG_VERSION) process.stdout.write(`    já está na versão mais recente (${p.installed})\n`);
    else process.stdout.write(`    atualizando: ${p.installed} → ${PKG_VERSION}\n`);
  });
  if (claudeCoversCursor) {
    const n = planCleanupCursorDuplicates(skills, actions);
    process.stdout.write(`  • Cursor lê ~/.claude/skills/lp-* nativamente — não escrevendo em ~/.cursor/commands (evita duplicar).\n`);
    if (n > 0) process.stdout.write(`  • Removendo ${n} arquivo(s) duplicado(s) de uma instalação antiga em ~/.cursor/commands.\n`);
  }

  if (args.dryRun) {
    process.stdout.write(`\n[dry-run] ${actions.length} ações seriam executadas:\n`);
    for (const a of actions) {
      const dest = (a[0] === 'delete' || a[0] === 'deleteDir') ? a[1] : a[2];
      process.stdout.write(`  ${a[0]}  ${dest}\n`);
    }
    return;
  }

  let n = 0, deleted = 0;
  for (const a of actions) {
    if (a[0] === 'copy') {
      fs.mkdirSync(path.dirname(a[2]), { recursive: true });
      fs.copyFileSync(a[1], a[2]); n++;
    } else if (a[0] === 'write') {
      fs.mkdirSync(path.dirname(a[2]), { recursive: true });
      fs.writeFileSync(a[2], a[3]); n++;
    } else if (a[0] === 'delete') {
      fs.rmSync(a[1], { force: true }); deleted++;
    } else if (a[0] === 'deleteDir') {
      fs.rmSync(a[1], { recursive: true, force: true }); deleted++;
    }
  }
  process.stdout.write(`\n✓ ${n} arquivos instalados${deleted ? `, ${deleted} removidos (duplicatas antigas)` : ''}.\n`);
  if (targets.includes('cursor') || claudeCoversCursor) process.stdout.write('  Cursor: reinicie a janela pra ver os /comandos (só uma vez cada agora).\n');
  if (targets.includes('claude')) process.stdout.write('  Claude Code: skills já disponíveis como /lp-<nome>.\n');
}

main();
