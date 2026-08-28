# SDD — `lp:*` para Claude Code

Spec-driven development em 18 skills. Chunks micro revisáveis, fluxo sequencial por feature, fluxo enxuto de bug-fix (causa raiz → opções → correção), diagrama macro da implementação, base de conhecimento viva do projeto (`.sdd/context/`), implementação por subagentes (com modo paralelo opcional), memória autônoma, grilling anti-assunção e revisão guiada de código existente.

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

O Cursor lê `~/.claude/skills/` nativamente (suporte a skills do Claude Code) — então, se você já tem o Claude Code instalado, **uma única cópia em `~/.claude/skills/lp-*/` serve os dois**. O installer detecta isso e escreve só ali:

```
npx github:luanpoppe/sdd              # detecta ~/.claude e ~/.cursor
npx github:luanpoppe/sdd --tool=cursor
npx github:luanpoppe/sdd --tool=claude --dry-run
```

- **Claude Code presente** → escreve só em `~/.claude/skills/lp-*/`; Cursor lê de lá também. Invoca `/lp-review`, `/lp-new`… nos dois.
- **Só Cursor, sem Claude Code** → escreve em `~/.cursor/commands/lp-*.md` (+ `~/.cursor/lp-helpers/`) como fallback.

> ⚠️ Não escreva nos dois lugares ao mesmo tempo — o Cursor lista o mesmo comando duas vezes (uma pela skill do Claude, outra pelo command próprio). O installer evita isso automaticamente; rodar `npx github:luanpoppe/sdd` de novo também limpa duplicatas de instalações anteriores a v1.0.2.
>
> Roda via `npx github:...` sem precisar de npm publish. `--dry-run` mostra o que faria sem escrever.

## Skills

| Skill | O que faz |
|---|---|
| `lp:init` | Inicializa o SDD no projeto (`.sdd/config.yaml`, CSS global, preferências). |
| `lp:new` | Abre uma nova mudança (do zero) com grill anti-assunção; gera `plan.md` + `flow.html`. |
| `lp:bug-fix` | Fluxo enxuto pra corrigir bug: `diagnosis` (causa raiz) → `solutions` (opções) → correção em chunks. |
| `lp:continue` | Avança 1 passo. Feature: spec → tasks → chunks. Bug-fix: opções → tasks → chunks. Implementa via subagente. |
| `lp:review` | Revisão guiada de código existente (walkthrough do fluxo real). |
| `lp:flow` | Gera/regenera o diagrama macro (`flow.html`); nós implementados são clicáveis e abrem um mini-walkthrough (como funciona + código real + dados + conecta). Vale pra features e bug-fix. |
| `lp:parallel` | Liga/desliga o modo paralelo (chunks independentes, um subagente cada). |
| `lp:settings` | Lista e altera as configurações do `.sdd/config.yaml` (por campo/valor ou em linguagem natural). |
| `lp:context` | Base de conhecimento do projeto (`.sdd/context/`): health-check do índice/arquivos, dúvidas sobre como as coisas funcionam, documentar áreas. |
| `lp:auto-update` | Atualiza as skills para a versão mais recente do GitHub. |
| `lp:explain` | Gera explicação em HTML de um tópico. |
| `lp:audit` | Detecta divergência entre spec e implementação. |
| `lp:memory` | Gerencia a memória autônoma do SDD. |
| `lp:ask` | Pergunta pontual sobre o estado do SDD. |
| `lp:status` | Resumo de handoff sob demanda (pra retomar em conversa nova). |
| `lp:archive` | Arquiva uma mudança concluída. |
| `lp:help` | Estado atual do SDD + próximos passos. |
| `lp:desktop` | Abre o SDD Viewer (app desktop opcional pra ver os artefatos fora do chat); instala/atualiza se preciso. |

## Configuração (`.sdd/config.yaml`)

| Campo | Valores | Padrão | O que faz |
|---|---|---|---|
| `format` | `md` / `html` / `both` | (grill) | Formato das docs (plan/spec/tasks). `html`/`both` gera o par `.html`. |
| `lang` | `pt-BR` / `en` | (grill) | Idioma das docs e do grilling. |
| `chunk_size` | `micro`…`xlarge` | `micro` | Tamanho de cada chunk de implementação. |
| `context_watch` | `suggest` / `auto` / `off` | (grill) | Watch anti-degradação de contexto longo. |
| `flowchart` | `on` / `off` | `on` | Gera/atualiza o `flow.html` (diagrama macro). |
| `implementer` | `subagent` / `main` | `subagent` | Quem implementa o **código** do chunk: subagente delegado ou a conversa principal. |
| `scribe` | `subagent` / `main` | `subagent` | Quem **escreve os artefatos** do SDD (docs, `flow.html`, `.sdd.yaml`): subagente escriba (mantém o contexto principal limpo) ou inline na conversa principal. |
| `context` | `true` / `false` | `true` | Mantém a **base de conhecimento** do projeto em `.sdd/context/` (como as funcionalidades funcionam + decisões) e lê o índice no início dos fluxos. `false` desliga. |
| `tasks_format` | `md` / `follow` | `md` | Formato do `tasks`. `md`: só markdown, mesmo com `format` html/both. `follow`: acompanha o `format` global (gera `tasks.html` também). |
| `tasks_autocontinue` | `on` / `off` | `on` | Após gerar o `tasks.md`, seguir direto pro 1º chunk sem pausar (`on`) ou pausar pro usuário revisar a granularidade e esperar `/lp-continue` (`off`). |
| `parallel` | `on` / `off` | `off` | Chunks independentes em paralelo (um subagente cada). Ligar com `lp:parallel`. |
| `chunk_order` | `inside-out` / `outside-in` / `free` | `inside-out` | Desempate de ordem entre features/chunks independentes (dependência real sempre manda primeiro). `inside-out`: domínio/persistência antes de controller/consumer. `outside-in`: prioriza mostrar o esqueleto do fluxo primeiro. `free`: só dependência. |
| `auto_commit` | `full` / `suggest-only` / `off` | `suggest-only` | Git a cada chunk aprovado. `full`: commita de verdade (só os arquivos do chunk), exceto em branch protegida (main/master/develop/staging/...). `suggest-only`: mostra o comando pronto pra copiar. `off`: não menciona git. |

> `flowchart`, `implementer`, `scribe`, `tasks_format`, `tasks_autocontinue`, `context`, `parallel`, `chunk_order` e `auto_commit` não são perguntados no grill — vêm com o padrão e você edita no `.sdd/config.yaml` quando quiser (ou usa `lp:parallel`). `lp:new`/`lp:bug-fix` também sugerem uma branch dedicada no início (aceitar/criar manual/continuar na atual).

Para ver/alterar qualquer config, use **`lp:settings`** (`/lp-settings` lista tudo; `/lp-settings chunk_size small` ou "muda o formato pra html" aplica).

## Estrutura do repositório

```
sdd/
├── .claude-plugin/
│   ├── marketplace.json   # catálogo (este repo é o marketplace)
│   └── plugin.json        # manifesto do plugin "lp"
├── skills/                # 18 skills (dir + frontmatter name sem prefixo lp-)
├── helpers/
│   ├── prompts/           # prompts compartilhados (grill, memória, context, state-machine, bugfix-machine, flowchart, parallel, scribe, git…)
│   └── templates/         # templates de plan/spec/tasks/explain/flow + diagnosis/solutions (bug-fix) + styles.css
├── bin/install.js         # installer cross-tool (npx github:luanpoppe/sdd)
├── package.json           # @luanpoppe/sdd (publicação npm)
├── LICENSE
└── README.md
```

As skills referenciam os arquivos compartilhados por caminho relativo portável (`../../helpers/...`), então funcionam em qualquer máquina onde o plugin for instalado.

## Release (mantenedor)

```bash
# 1. bump da versão (semver) em .claude-plugin/plugin.json E em package.json (mesmo número)
# 2. commitar + tag + push:
git add -A && git commit -m "release: vX.Y.Z" && git tag vX.Y.Z && git push && git push --tags
```

O update dos usuários dispara ao ver a nova versão no `plugin.json`.

> Distribuição via npm (`@luanpoppe/sdd`) fica opcional — o `package.json` já está pronto caso queira publicar depois (`npm publish --access public`) e trocar o `source` do `marketplace.json` para npm.

## Licença

MIT © Luan Poppe
