# SDD — `lp:*` para Claude Code

Spec-driven development em 10 skills. Chunks micro revisáveis, fluxo sequencial por feature, memória autônoma, grilling anti-assunção e revisão guiada de código existente.

## Instalação

```
/plugin marketplace add luanpoppe/sdd
/plugin install lp@sdd
```

Pronto — as skills ficam disponíveis como `lp:init`, `lp:new`, `lp:continue`, `lp:review`, etc.

> O plugin é distribuído direto por este repositório GitHub (o próprio repo é o marketplace). Não precisa npm.

## Atualização

O Claude Code checa updates no startup. Para forçar:

```
/plugin marketplace update sdd
/plugin update lp@sdd
```

O update compara a versão instalada com a do repo e baixa a mais recente. Novas versões saem quando o mantenedor faz bump semver no `plugin.json` + push.

## Cursor (e outras ferramentas)

O formato de plugin do Claude Code não é lido pelo Cursor. Use o installer cross-tool — copia as skills como comandos `/lp-<nome>` e ajusta os caminhos dos arquivos compartilhados por ferramenta:

```
npx github:luanpoppe/sdd              # detecta ~/.claude e ~/.cursor, instala em ambos
npx github:luanpoppe/sdd --tool=cursor
npx github:luanpoppe/sdd --tool=claude --dry-run
```

- **Cursor** → `~/.cursor/commands/lp-*.md` (+ `~/.cursor/lp-helpers/`). Invoca `/lp-review`, `/lp-new`…
- **Claude Code** → `~/.claude/skills/lp-*/` (skills pessoais). Alternativa ao `/plugin` pra quem não quer o marketplace.

> Roda via `npx github:...` sem precisar de npm publish. `--dry-run` mostra o que faria sem escrever.

## Skills

| Skill | O que faz |
|---|---|
| `lp:init` | Inicializa o SDD no projeto (`.sdd/config.yaml`, CSS global, preferências). |
| `lp:new` | Abre uma nova mudança com grill anti-assunção. |
| `lp:continue` | Avança 1 passo do fluxo (spec → revisão → tasks → chunks). |
| `lp:review` | Revisão guiada de código existente (walkthrough do fluxo real). |
| `lp:explain` | Gera explicação em HTML de um tópico. |
| `lp:audit` | Detecta divergência entre spec e implementação. |
| `lp:memory` | Gerencia a memória autônoma do SDD. |
| `lp:ask` | Pergunta pontual sobre o estado do SDD. |
| `lp:archive` | Arquiva uma mudança concluída. |
| `lp:help` | Ajuda das skills `lp:*`. |

## Estrutura do repositório

```
sdd/
├── .claude-plugin/
│   ├── marketplace.json   # catálogo (este repo é o marketplace)
│   └── plugin.json        # manifesto do plugin "lp"
├── skills/                # 10 skills (dir + frontmatter name sem prefixo lp-)
├── helpers/
│   ├── prompts/           # prompts compartilhados (grill, memória, state-machine…)
│   └── templates/         # templates de spec/tasks/plan/explain + styles.css
├── package.json           # @luanpoppe/sdd (publicação npm)
├── LICENSE
└── README.md
```

As skills referenciam os arquivos compartilhados por caminho relativo portável (`../../helpers/...`), então funcionam em qualquer máquina onde o plugin for instalado.

## Release (mantenedor)

```bash
# 1. bump da versão (semver) em .claude-plugin/plugin.json
# 2. commitar + tag + push:
git add -A && git commit -m "release: vX.Y.Z" && git tag vX.Y.Z && git push && git push --tags
```

O update dos usuários dispara ao ver a nova versão no `plugin.json`.

> Distribuição via npm (`@luanpoppe/sdd`) fica opcional — o `package.json` já está pronto caso queira publicar depois (`npm publish --access public`) e trocar o `source` do `marketplace.json` para npm.

## Licença

MIT © Luan Poppe
