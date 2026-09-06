# SDD — `lp:*` para Claude Code

Spec-driven development em 20 skills. Chunks micro revisáveis, fluxo sequencial por feature, fluxo enxuto de bug-fix (causa raiz → opções → correção), diagrama macro da implementação, base de conhecimento viva do projeto (`.sdd/context/`), implementação por subagentes (com modo paralelo opcional), memória autônoma, grilling anti-assunção (cada pergunta explicada no chat antes de ser feita), revisão guiada de código existente, sugestão de branch + commits (automáticos ou sugeridos) por chunk, um MCP local opcional que persiste cada etapa num SQLite (histórico e memória entre conversas), e um app desktop opcional (SDD Viewer) pra visualizar os artefatos fora do chat.

## Instalação

```
/plugin marketplace add luanpoppe/sdd
/plugin install lp@sdd
```

Pronto — as skills ficam disponíveis como `lp:init`, `lp:new-feature`, `lp:continue`, `lp:review-walkthrough`, etc.

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

- **Claude Code presente** → escreve só em `~/.claude/skills/lp-*/`; Cursor lê de lá também. Invoca `/lp-review-walkthrough`, `/lp-new-feature`… nos dois.
- **Só Cursor, sem Claude Code** → escreve em `~/.cursor/commands/lp-*.md` (+ `~/.cursor/lp-helpers/`) como fallback.

> ⚠️ Não escreva nos dois lugares ao mesmo tempo — o Cursor lista o mesmo comando duas vezes (uma pela skill do Claude, outra pelo command próprio). O installer evita isso automaticamente; rodar `npx github:luanpoppe/sdd` de novo também limpa duplicatas de instalações anteriores a v1.0.2.
>
> Roda via `npx github:...` sem precisar de npm publish. `--dry-run` mostra o que faria sem escrever.

## Skills

| Skill | O que faz |
|---|---|
| `lp:init` | Inicializa o SDD no projeto (`.sdd/config.yaml`, CSS global, preferências). |
| `lp:new-feature` | Abre uma nova mudança (do zero) com grill anti-assunção; gera `plan.md` + `flow.html`. |
| `lp:bug-fix` | Fluxo enxuto pra corrigir bug: `diagnosis` (causa raiz) → `solutions` (opções) → correção em chunks. |
| `lp:continue` | Avança 1 passo. Feature: spec → tasks → chunks. Bug-fix: opções → tasks → chunks. Implementa via subagente. |
| `lp:review-walkthrough` | Revisão guiada de código existente (walkthrough do fluxo real). Chamava-se `lp:review-walkthrough`, nome que continua sendo entendido. |
| `lp:code-review` | Auditoria adversarial de código recém-escrito: acha defeito, classifica por severidade, exige cenário de falha e não corrige nada. |
| `lp:data-model` | Modelagem de dados: desenha tabela, tipo, chave, constraint, índice e a ordem da migração, espera sua aprovação e só então escreve. `auditar` revisa o schema que já existe. |
| `lp:flow` | Gera/regenera o diagrama macro (`flow.html`); nós implementados são clicáveis e abrem um mini-walkthrough (como funciona + código real + dados + conecta). Vale pra features e bug-fix. |
| `lp:parallel` | Liga/desliga o modo paralelo (chunks independentes, um subagente cada). |
| `lp:settings` | Lista e altera as configurações do `.sdd/config.yaml` (por campo/valor ou em linguagem natural). Com a palavra `global`, mexe na config global do usuário (`~/.sdd/config.yaml`). |
| `lp:context` | Base de conhecimento do projeto (`.sdd/context/`): health-check do índice/arquivos, dúvidas sobre como as coisas funcionam, documentar áreas. |
| `lp:auto-update` | Atualiza as skills para a versão mais recente do GitHub. |
| `lp:explain` | Explica um assunto e acumula num HTML global por tema (`~/.sdd/explain/`), com fila de estudo. Dispara sozinho em pergunta conceitual dentro de um fluxo ativo. |
| `lp:audit` | Detecta divergência entre spec e implementação. |
| `lp:memory` | Gerencia a memória autônoma do SDD. |
| `lp:ask` | Pergunta pontual sobre o estado do SDD, sem gravar nada. |
| `lp:status` | Resumo de handoff sob demanda (pra retomar em conversa nova). |
| `lp:archive` | Arquiva uma mudança concluída. |
| `lp:help` | Estado atual do SDD + próximos passos. |
| `lp:desktop` | Abre o SDD Viewer (app desktop opcional pra ver os artefatos fora do chat); instala/atualiza se preciso. |

## SDD Viewer (app desktop opcional)

[`luanpoppe/sdd-viewer`](https://github.com/luanpoppe/sdd-viewer) — app Electron read-only que lê `.sdd/` (mudanças, features, bug-fixes, reviews) e renderiza os artefatos `.md`/`.html` com fast refresh (atualiza sozinho quando o agente regrava um arquivo). Sidebar separa projeto → mudança/review → artefato. Não é dependência de nenhum fluxo `lp:*` — é só uma forma alternativa de ler o que o SDD já gera.

- Com o MCP ligado, ganha uma aba **Timeline** por mudança (chunks em ordem, com duração, arquivos explicados, métodos com exemplos e diff), uma **busca** que atravessa projetos e a **Fila de estudo** do `lp:explain` — os temas ainda abertos, do mais antigo, com a origem de cada pergunta.
- Abrir/instalar/atualizar: `lp:desktop` (Windows por enquanto; checa update em paralelo sem travar o uso).
- Instalador `.exe` (NSIS, por-usuário, sem admin) publicado em [GitHub Releases](https://github.com/luanpoppe/sdd-viewer/releases).
- Rodar em outro SO / modo dev: clone o repo e `npm install && npm run dev`.

## MCP local (opcional) — histórico estruturado

Um servidor MCP que roda na sua máquina e grava cada etapa do SDD num SQLite global (`~/.sdd/sdd.db`). **Desligado por padrão**; o `lp:init` pergunta se você quer, e `/lp-settings mcp on` liga depois.

O problema que ele resolve: o SDD produz informação estruturada que hoje **morre no chat**. O relatório `Faz`/`Conecta`/`Revisar` de cada arquivo, a decisão sequencial-vs-paralelo, a composição das ondas, as divergências do auto-sync, o relatório do tester — nada disso sobrevive a fechar a conversa. E o `.sdd.yaml` só guarda data, sem hora, então não há como medir duração de chunk.

Duas vantagens, independentes:

- **Visualização** — o SDD Viewer passa a mostrar a timeline de chunks e o que revisar arquivo por arquivo, informação que ele não tem como extrair do markdown.
- **Memória** — o agente responde *"o que já mexemos no `AuthService`?"* e *"onde paramos?"* consultando o banco, inclusive em outro projeto e depois de a conversa ter sido compactada.

Detalhes:

O que é registrado, em cada etapa:

- **Chunk implementado** → um item por arquivo com o que faz, com o que conecta e o que revisar, mais a explicação longa, os trechos de código decisivos, os **métodos com exemplos de entrada e saída** (incluindo casos de borda) e o diff.
- **Cenários da spec** → e qual chunk implementou cada um, o que revela cenário sem cobertura.
- **Decisões** → grill, modo sequencial/paralelo, divergências do auto-sync, commits.
- **`lp:review-walkthrough`** → os steps com a mesma profundidade de um chunk.
- **Achados do code review** → amarrados ao chunk que os gerou, com severidade e cenário — dá para perguntar depois o que foi apontado e nunca corrigido.
- **`.sdd/context/`** → a base de conhecimento de longo prazo do projeto.
- **`lp:explain`** → os temas globais, com o estado da fila de estudo. É a única tabela do banco sem projeto: o que você entendeu sobre um assunto num repositório vale no próximo.

Detalhes:

- **Zero dependência a instalar**: fala JSON-RPC direto e traz o próprio SQLite, sem `npm install` na sua máquina. Requer **Node 18+**.
- **`sdd_reindex`** reconstrói mudanças, features e chunks a partir do `.sdd/` — é o que sustenta a afirmação de que o banco é derivado. Explicações e decisões não voltam, porque não têm origem fora dele.
- Instalado em `~/.sdd/mcp/` a cada `lp:auto-update` (fora do alcance da limpeza de `lp-*` que o installer faz).
- O `lp:init` registra o servidor no `.mcp.json` do projeto (merge, nunca sobrescrita), então o time herda. As tools só aparecem **após reiniciar a sessão**.
- Banco **global**, com uma tabela `projects` separando os repos: permite consulta cruzada e o histórico sobrevive a apagar o `.sdd/` de um projeto.
- O banco é **índice e log derivado** — o markdown/YAML em `.sdd/` continua a fonte de verdade. As duas exceções são `tasks_storage: mcp` (o plano de chunks) e `state_storage: mcp` (o bloco volátil do `.sdd.yaml`), que passam a viver só no banco. Apagar o `sdd.db` degrada a visualização e não corrompe projeto nenhum, e nenhum fluxo `lp:*` depende dele para funcionar.

## `lp:explain` — base de conhecimento sua, com fila de estudo

Explica um assunto e acumula a explicação num HTML por tema em **`~/.sdd/explain/`** — fora de qualquer repositório, então serve tanto para dúvida sobre o código quanto sobre uma stack ou um conceito solto.

- **O tema é do assunto, não do projeto.** `jwt` é um arquivo só, e cada pergunta registra de onde veio. O que você aprendeu num repositório aparece quando o assunto volta noutro.
- **Dispara sozinho** em pergunta conceitual (*"o que é X"*, *"por que isso acontece"*) feita dentro de um fluxo `lp:*` ativo. Pergunta de operação (*"roda o teste"*, *"já commitou?"*) não entra — e em conversa sem relação com o SDD a skill não se convida.
- **Responder nunca espera a escrita**: a resposta sai na hora e um subagente em background grava o HTML.
- **Fila de estudo**: todo tema nasce `aberto` e só vira `estudado` quando você disser (`/lp-explain estudei <tema>`). `/lp-explain fila` lista o que está aberto, do mais antigo — o esquecido há mais tempo primeiro.
- Quer resposta sem rastro nenhum? É o `lp:ask`.

O estado mora no próprio HTML (`data-status`), então a fila funciona com o MCP desligado; ligado, ela também fica buscável e aparece no SDD Viewer.

## Fluxo no banco, sem `flow.html`

O diagrama macro é o maior artefato do SDD: entre **7 mil e 32 mil tokens** nos projetos reais medidos. Cada chunk fechado precisa abri-lo para achar as âncoras das edições pontuais.

Com **`flow_storage: mcp`** ele deixa de existir como arquivo:

- **Ao gerar o `tasks.md`**, o esqueleto do fluxo vai para o banco (`sdd_write_tasks` com `mode: "plan"`) — um nó por chunk, com o rótulo da camada (`Config`, `Controller`, `UseCase`). É o que faz o fluxo mostrar o que **ainda não foi feito**.
- **No `g-bis`**, o `component` acompanha o registro do chunk que você já faz.
- **O SDD Viewer desenha**, na aba Fluxo: swimlane por feature, nó por chunk com cor de status, clique abre o detalhe com o relatório por arquivo.

`mode: "plan"` nunca apaga — chunk implementado mantém relatório, achados e modelagem, então re-semear depois de editar o `tasks.md` é seguro. Exige `mcp: on`, e `flow.html` que já existe fica intocado.

## `format: both` sem pagar duas vezes

Com `format: html` ou `both`, o `.html` de `plan`, `spec`, `tasks`, `diagnosis` e `solutions` é gerado **por código** — `~/.sdd/render/html.js`, instalado junto do plugin, sem dependência nenhuma.

- **O agente escreve só o `.md`.** O espelho sai de um conversor determinístico, então `both` custa praticamente o mesmo que `md`.
- **O espelho passou a ser fiel.** Escrito à mão, ele saía resumido: o HTML dizia menos que a fonte. Agora é o mesmo conteúdo.
- **Fallback preservado**: sem node ou com o conversor falhando, o agente escreve o HTML como antes e avisa em uma linha. `both` continua entregando os dois arquivos em qualquer máquina.
- **`--all` regenera em lote** todos os espelhos de um projeto — é como um artefato antigo recebe melhoria de template. Não toca no `styles.css`, que pode ter cor customizada no `lp:init`.

`flow.html`, `explain.html` e `walkthrough.html` ficam de fora: os dois primeiros não têm `.md` de origem, e o terceiro é montado pelo `lp:review-walkthrough`.

## O CSS dos projetos, atualizável sem perder as cores

O `styles.css` é copiado para cada projeto, e nunca era atualizado — as skills diziam "copie se faltar". Correção de template não chegava nas cópias, e sobrescrever destruiria as cores escolhidas no `lp:init`.

Agora a cópia carrega um marcador: **acima é do plugin** e pode ser trocado inteiro; **abaixo é do projeto** e é preservado sempre.

```
node ~/.sdd/render/styles.js <projeto>            relatório de versão
node ~/.sdd/render/styles.js <projeto> --update   atualiza, preservando a customização
```

Cópia antiga (sem marcador) **não** é atualizada em silêncio: o comando reporta o tamanho da diferença e recusa até alguém pedir `--force`. O `lp:audit` aponta quando a cópia ficou para trás.

## Legibilidade dos artefatos

Duas regras que valem em toda spec, tasks, diagnosis e plano de revisão gerados:

- **Uma afirmação por linha.** No BDD, a primeira vai em `Então` e cada seguinte numa linha própria começando com `E`. Cada linha vira um caso de teste e um ponto de conferência na revisão — empilhadas, ninguém verifica item a item.
- **`  ||  ` no lugar de `;`** quando duas partes são mesmo da mesma linha (o valor e o motivo, o resultado e a ressalva). Ponto e vírgula não marca nada visualmente; o separador com espaços dos dois lados, sim.

## `lp:data-model` — modelagem antes da migração

Com **`data_model: on`**, todo chunk que toca dados passa antes por um subagente `data-modeler`. Ele desenha o modelo, você aprova, e **só então** a migração é escrita.

- **O que ele decide**: tipo exato (dinheiro em decimal, timestamp com fuso), nulidade, `PK`/`FK`/`UNIQUE`/`CHECK`, normalização e chave, índice — sempre com a consulta que o justifica ao lado — e a ordem segura da migração (expand-contract, backfill antes do `NOT NULL`, lock em tabela grande, reversibilidade).
- **É o único passo do fluxo que bloqueia.** Migração aplicada não volta com `git checkout`, e é essa assimetria que paga o turno a mais. Nas bifurcações reais (chave natural vs surrogate, embutir vs referenciar, enum vs lookup) ele pergunta; no que o checklist já decide, não.
- **Cada arquivo tem um dono só**: migração e schema do ORM são dele, o código que os usa é do implementer.
- **A convenção do projeto vence o guia** — schema misto é pior que schema imperfeito.
- Serve relacional, documento (embutir vs referenciar, chave de partição) e entidade de ORM.
- `/lp-data-model auditar` revisa o schema que **já existe**: FK ausente, tipo errado, coluna nulável que nunca é nula, índice sem consulta. Aponta e não corrige — a correção vira chunk.

Com `mcp: on`, cada entidade fica gravada junto do chunk, com as decisões e o que foi descartado. É o que responde depois *"por que essa coluna é nulável?"* sem arqueologia de migração.

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
| `code_review` | `off` / `on` | `off` | Auditoria adversarial do código recém-escrito. `on`: um subagente `code-reviewer` revisa cada chunk e, de novo, a feature inteira ao fechar — bug, borda não tratada, contrato divergente da spec, erro engolido, vazamento, segurança. Cada achado vem com severidade e **cenário concreto de falha**; sem cenário, não entra. Reporta, nunca corrige, nunca bloqueia. Acrescente critérios em `~/.sdd/code-review.md` (seus, todo projeto) e `.sdd/code-review.md` (do repo, versionado). |
| `data_model` | `off` / `on` | `off` | Modelagem de dados antes da migração. `on`: em chunk que toca dados (migração, schema de ORM, coleção nova), um subagente `data-modeler` desenha tabela, tipo, nulidade, chave, constraint, índice e a ordem segura da migração, **mostra a proposta e espera sua aprovação** — só então escreve a migração; o implementer fica com o código que a usa. É o único passo do fluxo que bloqueia, porque migração aplicada não volta com `git checkout`. |
| `tests` | `off` / `on` | `off` | Geração automática de testes. `on`: ao concluir cada feature (ou correção de bug-fix), um **subagente tester dedicado** escreve os testes da funcionalidade — foco explícito em cenários de borda e falha, não só o caminho feliz — roda, mede coverage e **reporta sem corrigir** (teste falhando é decisão sua: bug real ou teste mal escrito?). |
| `subagents` | bloco aninhado (papel → harness → `{model, effort}`) | (ausente) | **Opcional.** Em qual modelo/thinking cada papel de subagente roda — `implementer`, `scribe`, `explorer`, `tester` — declarado por harness (`claude-code`, `cursor`, `codex`), já que cada um tem seu próprio catálogo de modelos. Ausente = cada subagente herda o modelo da conversa principal. Ex: escriba no modelo barato, implementer no forte com thinking alto. |
| `mcp` | `off` / `on` | `off` | **Opcional.** Liga o MCP local do SDD: cada etapa (chunk implementado, arquivos tocados e o que revisar em cada um, testes, divergências, steps de `lp:review-walkthrough`) também é gravada num SQLite global (`~/.sdd/sdd.db`). Destrava a timeline no SDD Viewer e dá memória ao agente entre conversas e projetos. Exige Node 18+ e reiniciar a sessão. |
| `flow_storage` | `file` \ `mcp` | `file` | Onde vive o diagrama. `file`: `flow.html` na pasta da mudança. `mcp`: o arquivo **não existe** — o fluxo é gravado no banco (rótulo do nó + status) e desenhado pela aba Fluxo do SDD Viewer, o que tira do caminho quente o maior artefato do SDD. Exige `mcp: on`; `flow.html` já existente fica intocado. |
| `tasks_storage` | `file` / `mcp` | `file` | Onde vive o plano de chunks. `file`: `tasks.md` no repo, versionado e revisável em PR. `mcp`: o `tasks.md` não é gerado e o plano fica no banco — **nesse modo o MCP deixa de ser opcional**, e o plano sai do repositório. |
| `state_storage` | `file` / `mcp` | `file` | Onde vive a parte do `.sdd.yaml` que muda a cada passo (`state`, `current_feature`, `current_chunk`, `in_review`, `updated`, `status` de cada feature). `file`: tudo no arquivo. `mcp`: esses campos vão para o banco e o arquivo guarda só a identidade da mudança e a lista de features — **nesse modo o MCP deixa de ser opcional**. |
| `mcp_record` | bloco aninhado (`symbols`, `diff`, `context`, `explain`, `scenarios`, `code_review`, `data_model`) | (ausente = tudo ligado) | **Opcional.** Desliga partes do registro sem desligar o MCP. Ex: `symbols: false` para de gravar métodos com exemplos de entrada/saída. O `diff` é pulado sozinho quando `auto_commit: full`, porque o git guarda o mesmo conteúdo. |
| `auto_commit` | `full` / `suggest-only` / `off` | `suggest-only` | Git a cada chunk aprovado. `full`: commita de verdade (só os arquivos do chunk), exceto em branch protegida (main/master/develop/staging/...). `suggest-only`: mostra o comando pronto pra copiar. `off`: não menciona git. |

> `flowchart`, `implementer`, `scribe`, `tasks_format`, `tasks_autocontinue`, `context`, `parallel`, `chunk_order`, `auto_commit` e `tests` não são perguntados no grill (o `mcp` é) — vêm com o padrão e você edita no `.sdd/config.yaml` quando quiser (ou usa `lp:parallel`). `lp:new-feature`/`lp:bug-fix` também sugerem uma branch dedicada no início (aceitar/criar manual/continuar na atual). O bloco `subagents` nem é escrito no config — só existe se você ligar (`/lp-settings "roda o escriba no haiku"`).

### Configuração global (`~/.sdd/config.yaml`)

Para não repetir as mesmas escolhas em todo projeto novo, dá pra guardar suas preferências numa config global, na home do usuário:

```
/lp-settings global tests on          # cria/atualiza ~/.sdd/config.yaml
/lp-settings global                   # lista o que está configurado globalmente
"liga o paralelo globalmente"         # linguagem natural também funciona
```

- Aceita **todos** os campos da tabela acima (incluindo o bloco `subagents`) — é o mesmo esquema, sem subconjunto. Só `version`/`created` ficam de fora, por serem metadados do projeto.
- É **esparso**: só existe o que você põe. Campo ausente = default do plugin (assim você continua recebendo mudanças de default em versões novas).
- É **semente, não herança dinâmica**: o `lp:init` copia os valores para o `.sdd/config.yaml` do projeto e mostra o que herdou. Nos campos do grill, o valor global vem pré-selecionado — dá pra divergir num projeto específico.
- Portanto, **mudar o global não altera projetos já criados** — de propósito: o `.sdd/config.yaml` versionado no repo é a verdade daquele projeto, igual pra todo mundo do time. Pra mudar um projeto existente, `lp:settings` normal.
- Fica em `~/.sdd/` (não em `~/.claude/`) porque o installer limpa `lp-*` da pasta de skills a cada update, e porque assim serve Claude Code, Cursor e Codex igualmente.

Para ver/alterar qualquer config, use **`lp:settings`** (`/lp-settings` lista tudo; `/lp-settings chunk_size small` ou "muda o formato pra html" aplica).

## Estrutura do repositório

```
sdd/
├── .claude-plugin/
│   ├── marketplace.json   # catálogo (este repo é o marketplace)
│   └── plugin.json        # manifesto do plugin "lp"
├── skills/                # 20 skills (dir + frontmatter name sem prefixo lp-)
├── helpers/
│   ├── prompts/           # prompts compartilhados (grill, memória, context, state-machine, bugfix-machine, flowchart, parallel, scribe, git, subagents, tester, global-config, mcp…)
│   └── templates/         # templates de plan/spec/tasks/explain/flow + diagnosis/solutions (bug-fix) + styles.css
├── mcp/                   # servidor MCP local, zero-dep (node:sqlite) — instalado em ~/.sdd/mcp/
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
