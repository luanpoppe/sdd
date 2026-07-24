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

// ---- args ----
function parseArgs(argv) {
  const out = { tool: 'all', dryRun: false };
  for (const a of argv.slice(2)) {
    if (a === '--dry-run') out.dryRun = true;
    else if (a.startsWith('--tool=')) out.tool = a.slice('--tool='.length);
    else if (a === '-h' || a === '--help') out.help = true;
  }
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

// ---- targets ----
function detect(tool) {
  const targets = [];
  const wantClaude = tool === 'all' || tool === 'claude';
  const wantCursor = tool === 'all' || tool === 'cursor';
  if (wantClaude && fs.existsSync(path.join(HOME, '.claude'))) targets.push('claude');
  if (wantCursor && fs.existsSync(path.join(HOME, '.cursor'))) targets.push('cursor');
  // se pediu explicitamente um tool que não existe, ainda tenta (cria a pasta)
  if (tool === 'claude' && !targets.includes('claude')) targets.push('claude');
  if (tool === 'cursor' && !targets.includes('cursor')) targets.push('cursor');
  return targets;
}

function planClaude(skills, actions) {
  const skillsDest = path.join(HOME, '.claude', 'skills');
  const helpersDest = path.join(skillsDest, 'lp-shared');
  const helpersBase = '~/.claude/skills/lp-shared';
  // helpers
  copyDir(HELPERS_SRC, helpersDest, actions);
  // skills -> lp-<name>/SKILL.md, prefixo lp- restaurado, refs absolutas
  for (const name of skills) {
    let c = readSkill(name);
    c = rewriteHelperRefs(c, helpersBase);
    c = setFrontmatterName(c, `lp-${name}`);
    actions.push(['write', `lp-${name}/SKILL.md`, path.join(skillsDest, `lp-${name}`, 'SKILL.md'), c]);
  }
  return `Claude Code → ${skillsDest} (invoca /lp-<nome>)`;
}

function planCursor(skills, actions) {
  const cmdDest = path.join(HOME, '.cursor', 'commands');
  const helpersDest = path.join(HOME, '.cursor', 'lp-helpers');
  const helpersBase = '~/.cursor/lp-helpers';
  copyDir(HELPERS_SRC, helpersDest, actions);
  for (const name of skills) {
    let c = readSkill(name);
    c = rewriteHelperRefs(c, helpersBase);
    // Cursor invoca pelo nome do arquivo; mantém lp- pra evitar colisão
    actions.push(['write', `lp-${name}.md`, path.join(cmdDest, `lp-${name}.md`), c]);
  }
  return `Cursor → ${cmdDest} (invoca /lp-<nome>)`;
}

// ---- run ----
function main() {
  const args = parseArgs(process.argv);
  if (args.help) return help();

  const skills = listSkills();
  if (!skills.length) { process.stderr.write('Nenhuma skill encontrada em skills/.\n'); process.exit(1); }

  const targets = detect(args.tool);
  if (!targets.length) {
    process.stderr.write('Nenhuma ferramenta detectada (~/.claude ou ~/.cursor). Use --tool=claude|cursor.\n');
    process.exit(1);
  }

  const actions = [];
  const summaries = [];
  for (const t of targets) {
    if (t === 'claude') summaries.push(planClaude(skills, actions));
    if (t === 'cursor') summaries.push(planCursor(skills, actions));
  }

  process.stdout.write(`SDD lp:* — ${skills.length} skills\nAlvos: ${targets.join(', ')}\n`);
  summaries.forEach(s => process.stdout.write(`  • ${s}\n`));

  if (args.dryRun) {
    process.stdout.write(`\n[dry-run] ${actions.length} arquivos seriam escritos:\n`);
    for (const a of actions) {
      const dest = a[0] === 'write' ? a[2] : a[2];
      process.stdout.write(`  ${a[0]}  ${dest}\n`);
    }
    return;
  }

  let n = 0;
  for (const a of actions) {
    if (a[0] === 'copy') {
      fs.mkdirSync(path.dirname(a[2]), { recursive: true });
      fs.copyFileSync(a[1], a[2]); n++;
    } else if (a[0] === 'write') {
      fs.mkdirSync(path.dirname(a[2]), { recursive: true });
      fs.writeFileSync(a[2], a[3]); n++;
    }
  }
  process.stdout.write(`\n✓ ${n} arquivos instalados.\n`);
  if (targets.includes('cursor')) process.stdout.write('  Cursor: reinicie ou recarregue pra ver os /comandos.\n');
  if (targets.includes('claude')) process.stdout.write('  Claude Code: skills já disponíveis como /lp-<nome>.\n');
}

main();
