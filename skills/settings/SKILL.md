---
name: settings
description: Lista e altera as configurações do SDD `lp:*` — no `.sdd/config.yaml` do projeto ou na config global do usuário (`~/.sdd/config.yaml`, com a palavra "global"). Sem argumentos, mostra todas as configs personalizáveis (valor atual, opções, default). Com argumentos, aplica a mudança pedida (ex: "lp:settings chunk_size small", "muda o formato pra html", "liga o paralelo", "lp:settings global tests on", "salva isso como meu padrão"). Use quando o usuário pedir "lp:settings", "ver/mudar configurações do lp", "trocar chunk size", "desligar o flowchart", "config global do sdd", etc.
---

Você gerencia as configurações do SDD. Edita **apenas** arquivos de config (`.sdd/config.yaml` do projeto ou `~/.sdd/config.yaml` global). Nunca toca em specs, tasks, código, `.sdd.yaml` de mudanças ou memória.

## 0. Pré-checagem

**Primeiro, determine o ALVO** — projeto (padrão) ou global:

- O pedido contém **"global"** (ou equivalente claro: *"pra todos os projetos"*, *"salva como meu padrão"*, *"padrão da máquina"*) → alvo é **`~/.sdd/config.yaml`** (home do usuário). Siga `../../helpers/prompts/global-config-guide.md`.
- Caso contrário → alvo é o **`.sdd/config.yaml` do projeto** (comportamento padrão).

Depois, conforme o alvo:

- **Projeto**: se `.sdd/config.yaml` não existir → "SDD não inicializado. Rode `/lp-init`." Pare. Senão leia-o inteiro (campos + comentários).
- **Global**: leia `~/.sdd/config.yaml` se existir. **Se não existir, não é erro** — é o caso normal de quem nunca configurou. Numa leitura, informe que não há config global; numa escrita, crie o arquivo (ver passo 2).

## Configurações personalizáveis

| Campo | Valores | Default | O que faz |
|---|---|---|---|
| `format` | `md` / `html` / `both` | (grill) | Formato das docs de conteúdo (`plan`, `spec`). `html`/`both` gera o par `.html`. |
| `lang` | `pt-BR` / `en` | (grill) | Idioma das docs e do grilling. |
| `chunk_size` | `micro` / `small` / `medium` / `large` / `xlarge` | `micro` | Tamanho de cada chunk de implementação. |
| `context_watch` | `suggest` / `auto` / `off` | (grill) | Watch anti-degradação de contexto longo. |
| `flowchart` | `on` / `off` | `on` | Gera/atualiza o `flow.html` (diagrama macro). |
| `implementer` | `subagent` / `main` | `subagent` | Quem implementa o **código** do chunk: subagente ou a conversa principal. |
| `scribe` | `subagent` / `main` | `subagent` | Quem **escreve os artefatos** (docs, `flow.html`, `.sdd.yaml`): subagente escriba ou inline. |
| `context` | `true` / `false` | `true` | Mantém `.sdd/context/` (base de conhecimento do projeto) e lê o índice no início dos fluxos. `false` desliga tudo de contexto. |
| `tasks_format` | `md` / `follow` | `md` | Formato do `tasks`. `md`: só markdown. `follow`: acompanha o `format` global. |
| `tasks_autocontinue` | `on` / `off` | `on` | Após gerar o `tasks.md`, seguir direto pro 1º chunk (`on`) ou pausar pra revisão (`off`). |
| `parallel` | `on` / `off` | `off` | Chunks independentes em paralelo (um subagente cada). Também alternável por `lp:parallel`. |
| `chunk_order` | `inside-out` / `outside-in` / `free` | `inside-out` | Desempate de ordem entre features/chunks independentes (dependência real sempre manda primeiro). `inside-out`: domínio/persistência antes de controller/consumer (compila incremental, sem stub). `outside-in`: prioriza mostrar o esqueleto do fluxo primeiro. `free`: só dependência, sem preferência. |
| `tests` | `off` / `on` | `off` | Geração automática de testes. `on`: ao concluir cada feature (ou correção de bug-fix), um subagente tester escreve os testes da funcionalidade (borda e falha, não só caminho feliz), roda e reporta — nunca corrige. Ver `../../helpers/prompts/tester-guide.md`. |
| `subagents` | bloco aninhado (papel → harness → `{model, effort}`) | (ausente) | **Opcional.** Em qual modelo/thinking cada papel de subagente roda: `implementer`, `scribe`, `explorer`; harnesses `claude-code`, `cursor`, `codex`. Ausente = cada subagente herda o modelo do principal. Ver `../../helpers/prompts/subagents-guide.md`. |
| `auto_commit` | `full` / `suggest-only` / `off` | `suggest-only` | Git a cada chunk aprovado. `full`: commita de verdade (git add + commit só dos arquivos do chunk), exceto em branch protegida (main/master/develop/staging/... — aí só sugere, a menos que peça explicitamente). `suggest-only`: só mostra o comando pronto pra copiar. `off`: não menciona git. |

> `created` e `version` são metadados — não são configuráveis por aqui, nem existem no global.

> **Todos os campos acima valem igualmente no global** (`~/.sdd/config.yaml`) — é o mesmo esquema, sem subconjunto. Campo novo adicionado no futuro já nasce válido nos dois. Ver `../../helpers/prompts/global-config-guide.md`.

## 1. Sem argumentos → listar

Imprima o estado atual, valor a valor, e as opções. Formato sugerido:

```
Configurações do SDD (.sdd/config.yaml):

  format=<v>              (md | html | both)
  lang=<v>                (pt-BR | en)
  chunk_size=<v>          (micro | small | medium | large | xlarge)
  context_watch=<v>       (suggest | auto | off)
  flowchart=<v>           (on | off)
  implementer=<v>         (subagent | main)
  scribe=<v>              (subagent | main)
  context=<v>             (true | false)
  tasks_format=<v>        (md | follow)
  tasks_autocontinue=<v>  (on | off)
  parallel=<v>            (on | off)
  chunk_order=<v>         (inside-out | outside-in | free)
  auto_commit=<v>         (full | suggest-only | off)
  tests=<v>               (off | on)
  subagents=<resumo>      (opcional — modelo por papel de subagente; "não configurado" se ausente)

Pra mudar: /lp-settings <campo> <valor>  (ex: /lp-settings chunk_size small)
ou descreva em linguagem natural (ex: "muda o formato pra html", "desliga o flowchart").
Pra mudar o padrão de TODOS os projetos novos: /lp-settings global <campo> <valor>
```

**`/lp-settings global` (sem campo) → liste o global** em vez do projeto: mesmo formato, cabeçalho `Configurações globais do SDD (~/.sdd/config.yaml):`, e **"não configurado"** em cada campo que não estiver no arquivo (ele é esparso de propósito — ausente = usa o default do plugin). Se o arquivo não existir: *"Você ainda não tem config global. Crie com `/lp-settings global <campo> <valor>` — ela vira o padrão dos próximos `/lp-init`."*

Marque com o default entre parênteses quando o valor atual estiver ausente (assumido).

## 2. Com argumentos → aplicar

O argumento pode ser `campo valor` (ex: `chunk_size small`) ou linguagem natural (ex: "liga o paralelo", "docs em inglês", "não pausa no tasks"). Interprete para um ou mais pares campo/valor.

1. **Mapeie** cada pedido a um campo da tabela e ao valor canônico. Ex: "inglês" → `lang: en`; "liga paralelo" → `parallel: on`; "não pausa no tasks" → `tasks_autocontinue: on`; "tasks em html" → `tasks_format: follow`; "implementa de fora pra dentro" → `chunk_order: outside-in`; "comita automático" / "commita sozinho" → `auto_commit: full`; "só sugere o commit" → `auto_commit: suggest-only`; "não mexe com git" → `auto_commit: off`; "gera testes automático" / "quero testes no final" → `tests: on`; "roda o escriba no haiku" → `subagents.scribe.<harness atual>.model: haiku`; "implementer no opus com thinking alto" → `subagents.implementer.<harness atual>: {model: opus, effort: high}`. **Sinais de alvo global**: "globalmente", "pra todos os projetos", "salva como meu padrão", "sempre uso assim" → mesmo campo/valor, mas gravando em `~/.sdd/config.yaml`.
2. **Valide** o valor contra a coluna "Valores". Se inválido ou ambíguo, **não edite** — liste as opções válidas daquele campo e pergunte (`AskUserQuestion`).
3. **Edite o arquivo do ALVO** (`.sdd/config.yaml` do projeto, ou `~/.sdd/config.yaml` se o pedido for global): altere só a(s) linha(s) do(s) campo(s) pedido(s). **Preserve o comentário inline** de cada campo e o resto do arquivo (não reordene, não remova comentários, não reescreva o arquivo inteiro). Se o campo não existir ainda no arquivo (config antigo), **adicione a linha** com o comentário padrão (veja `lp:init`).
3-ter. **Se o alvo é global e `~/.sdd/config.yaml` não existe**: crie o arquivo com um cabeçalho curto (`# ~/.sdd/config.yaml — preferências do usuário para projetos novos (esparso)`) e **só o campo pedido**. Nunca materialize os outros defaults — o arquivo é esparso de propósito: campo ausente = default do plugin, e assim o usuário continua recebendo mudanças de default em versões novas. Nunca grave `version`/`created` no global.
3-bis. **`subagents` é aninhado — trate diferente dos campos de linha única.** É o único campo em bloco:
   - Não valide o nome do modelo contra lista fixa (o catálogo de cada harness muda) — grave o que o usuário pediu. Valide só o **papel** (`implementer`/`scribe`/`explorer`) e, se o usuário nomear um, o **harness** (`claude-code`/`cursor`/`codex`).
   - Se o usuário não disser o harness, use **o harness atual** e diga qual assumiu na confirmação.
   - Ao aplicar: crie o bloco `subagents:` no fim do arquivo se não existir; se existir, **acrescente só a sub-chave pedida**, preservando os outros papéis/harnesses e a indentação. Nunca reescreva o bloco inteiro.
   - Pra desligar ("volta o escriba pro padrão"), **remova** a sub-chave (e o papel/bloco, se ficarem vazios) — não grave valor vazio.
4. Atualize a data `updated` se o arquivo tiver esse campo (config não tem por padrão — pule se ausente).
5. **Confirme** mostrando o diff conceitual:

   ```
   Config do PROJETO atualizado (.sdd/config.yaml):
     <campo>: <antigo> → <novo>

   Efeito: <1 frase do que muda no fluxo daqui pra frente>.
   ```

   No global, deixe o alvo igualmente explícito — o usuário precisa saber que mexeu na máquina toda, não neste projeto:

   ```
   Config GLOBAL atualizada (~/.sdd/config.yaml):
     <campo>: <antigo ou "não configurado"> → <novo>

   Efeito: novos projetos (`/lp-init`) já nascem com isso. Projetos existentes não mudam.
   ```

## Princípios

- **Só arquivos de config.** `.sdd/config.yaml` (projeto) ou `~/.sdd/config.yaml` (global). Nada de mudar docs, código ou estado de mudança.
- **Projeto é o padrão; global só com a palavra.** Na dúvida sobre a intenção, edite o projeto — errar no projeto afeta um repo, errar no global afeta todos os futuros.
- **Sempre diga qual arquivo foi tocado.** "Config do PROJETO" vs "Config GLOBAL", explicitamente, em toda confirmação.
- **Escopo do projeto**: a config do projeto vale pro projeto todo; muda o comportamento das próximas execuções (`lp:new`, `lp:continue`, `lp:bug-fix`). Não reprocessa o que já foi gerado.
- **Escopo do global**: vale como **semente de projetos novos** (`lp:init`). Não afeta projeto já criado — cada um tem sua cópia materializada. Se o usuário estranhar isso, explique; não é bug. Ver `../../helpers/prompts/global-config-guide.md`.
- **Valores canônicos e validados.** Nunca grave um valor fora da tabela. Na dúvida, pergunte com `AskUserQuestion`.
- **Preserve o arquivo**: edição cirúrgica linha a linha, mantendo comentários e ordem. Não regenere o `config.yaml` do zero.
- Para `parallel`, mencione que `lp:parallel` faz o mesmo toggle de forma rápida.
