---
name: init
description: Inicializa o SDD (spec-driven development) `lp:*` no projeto atual. Cria `.sdd/config.yaml`, copia CSS global se aplicável, e grava as preferências do usuário. Use quando o usuário pedir para "iniciar o SDD", "configurar lp neste projeto", "lp:init", ou quando outra skill `lp-*` detectar ausência de `.sdd/config.yaml`.
---

Você está configurando o spec-driven development `lp:*` neste projeto. Siga este protocolo.

## 1. Pré-checagem

- Se `.sdd/config.yaml` já existe, **mostre o conteúdo atual** e pergunte se o usuário quer:
  1. Manter como está (sair).
  2. Reconfigurar (sobrescrever após confirmação explícita).
- Caso contrário, prossiga.
- **Leia a config global** `~/.sdd/config.yaml` (home do usuário), se existir — são as preferências do usuário para projetos novos. Siga `../../helpers/prompts/global-config-guide.md`. **Se não existir, ignore em silêncio**: não mencione global em lugar nenhum e siga o fluxo normal.

## 2. Grill curto (use `AskUserQuestion`)

Faça as perguntas abaixo. Siga as diretrizes de `../../helpers/prompts/grill-snippet.md` — como formato, idioma e chunk size são independentes entre si, mande as três num único batch de `AskUserQuestion`.

> **Se a config global definir algum destes campos**, continue perguntando, mas ponha o valor global como a **primeira opção e a recomendada**, sinalizando a origem no rótulo (ex: *"HTML e Markdown (seu padrão global)"*) em vez do "(Recomendado)" padrão. O usuário confirma ou muda só neste projeto.

**Q1. Formato dos artefatos**
- Markdown apenas (Recomendado) — diff-friendly, simples.
- HTML apenas — visual rico, usa CSS global.
- Ambos — gera MD e HTML lado a lado (mais arquivos).

**Q2. Idioma dos artefatos**
- Português-BR (Recomendado).
- Inglês.

**Q3. Tamanho default de chunk em `lp:continue` (fase de implementação)**
- micro — 1-2 arquivos, ~50-100 linhas (Recomendado). Revisão profunda sem cansar.
- small — até 3 arquivos, ~150-200 linhas. Uma camada lógica por vez.
- medium — até 5 arquivos, ~250-400 linhas. Componente completo pequeno.
- large — até 7 arquivos, ~450-600 linhas. Vertical slice; exige disciplina.
- xlarge — até 10 arquivos, ~700-1000 linhas. Fatia grande; revisão demorada.

> Quanto menor o chunk, mais granular a revisão, porém mais idas e voltas. Você pode mudar depois editando `.sdd/config.yaml`.

**Q4. Watch de contexto longo (anti-degradação)**
- suggest — agente avisa quando conversa estiver longa, mas você decide se compacta (Recomendado).
- auto — agente compacta automaticamente sem perguntar.
- off — agente ignora; você gerencia manualmente.

> O agente usa uma heurística subjetiva (entre 5 e 10 chunks implementados + volume de mensagens) para detectar conversas longas. Quando dispara, tenta primeiro um comando de compactação nativo do ambiente (ex: `/compact` no Claude Code); se não houver, gera um resumo + instruções de handoff para você começar uma conversa nova.

**Q5. Diagrama macro do fluxo de implementação**
- on — gera um `flow.html` por mudança, com boxes+setas dos componentes, atualizado a cada `lp:continue` (a fazer / em andamento / feito / feito diferente). (Recomendado)
- off — não gera diagrama.

> Visão macro (Config → Controller → UseCase → Mapper/Repository…), foca no que falta. HTML autocontido, abre no navegador. Regenerável com `lp:flow`.

## 3. Criação de arquivos

Crie no diretório do projeto:

```
.sdd/
  config.yaml          # com os valores escolhidos
  memory.md            # esqueleto vazio com 2 seções (Estilo/Processo e Stack/Domínio)
  changes/             # vazio
  archive/             # vazio
  context/             # base de conhecimento do projeto (só se context: true)
    index.md           # índice mestre (esqueleto; populado no passo 3-bis)
```

O `memory.md` começa assim (preserve esse formato):

```markdown
# Memória do SDD

> Preferências e decisões recorrentes deste projeto. Mantida pelo `lp:continue`. Edite manualmente se quiser.

## Estilo / Processo

<!-- Como o agente deve trabalhar. Carrega SEMPRE. Não pré-supõe nada sobre features. -->

(vazio — entradas serão adicionadas conforme decisões surgirem)

## Stack / Domínio

<!-- Decisões sobre tecnologia/arquitetura. Carrega, mas só para CONFIRMAR rápido — nunca substitui grill. -->

(vazio)
```

`config.yaml` (use os valores do grill; **para os campos NÃO perguntados, se a config global definir o campo, grave o valor do global em vez do default abaixo**):

```yaml
version: 1
format: <md|html|both>
lang: <pt-BR|en>
chunk_size: <micro|small|medium|large|xlarge>
context_watch: <suggest|auto|off>
flowchart: <on|off>
context: true           # true (padrão): mantém .sdd/context/ (base de conhecimento do projeto por funcionalidade) e lê o índice no início dos fluxos | false: desliga. Ver helpers/prompts/context-guide.md.
implementer: subagent   # subagent (padrão): lp:continue delega a implementação do chunk a um subagente | main: a conversa principal implementa
scribe: subagent        # subagent (padrão): as escritas de artefato do SDD (docs, flow.html, .sdd.yaml) vão para um subagente escriba, mantendo o contexto principal limpo | main: o principal escreve inline. Ver helpers/prompts/scribe-guide.md.
tasks_format: md        # md (padrão): o tasks.md sai só em markdown, mesmo com format=html/both | follow: o tasks acompanha o format global (gera tasks.html também).
tasks_autocontinue: on  # on (padrão): após gerar o tasks.md, segue direto pra implementar o 1º chunk, sem pausar pra aprovação | off: pausa e imprime o plano de revisão do tasks, esperando /lp-continue.
parallel: off           # off (padrão): um chunk por vez | on: chunks independentes rodam em paralelo (um subagente cada). Ligar com lp:parallel.
chunk_order: inside-out # inside-out (padrão): ordem de features/chunks prioriza construir de dentro pra fora (domínio/persistência antes de controller/consumer) | outside-in: prioriza de fora pra dentro | free: só dependência real, sem preferência de direção.
tests: off              # off (padrão): não gera testes automaticamente | on: ao concluir cada feature (ou a correção de um bug-fix), um subagente tester dedicado escreve os testes da funcionalidade — foco em borda e falha, não só caminho feliz — roda e reporta sem corrigir. Ver helpers/prompts/tester-guide.md.
auto_commit: suggest-only # suggest-only (padrão): a cada chunk aprovado, sugere o git add + git commit pronto pra copiar | full: commita de verdade (exceto em branch protegida) | off: não menciona git. Ver helpers/prompts/git-guide.md.
created: <YYYY-MM-DD>
```

> **`context`, `implementer`, `scribe`, `tasks_format`, `tasks_autocontinue`, `parallel`, `chunk_order` e `auto_commit` NÃO são perguntados no grill** — gravados com os defaults acima. `context: false` desliga a base de conhecimento. `implementer: main` faz a conversa principal implementar o código. `scribe: main` faz o principal escrever os artefatos inline. `tasks_format: follow` faz o `tasks` acompanhar o `format` global (gera `tasks.html`). `tasks_autocontinue: off` faz o `lp:continue` pausar após o `tasks.md` (em vez de seguir direto pro 1º chunk). `parallel: on` (ou `lp:parallel`) liga o modo paralelo; mesmo com `off`, o `lp:continue` pergunta uma vez antes do 1º chunk se você quer paralelizar. `chunk_order` muda a heurística de ordenação de features (lp:new) e chunks (lp:continue) — ver `helpers/prompts/state-machine.md`. `tests: on` liga a geração automática de testes ao final de cada feature/correção (desligado por padrão) — ver `helpers/prompts/tester-guide.md`. `auto_commit: full` faz o `lp:continue` commitar de verdade cada chunk aprovado (exceto em branch protegida); `off` desliga qualquer menção a git — ver `helpers/prompts/git-guide.md`. Quem quiser, edita esses campos no `.sdd/config.yaml` depois (ou via `lp:settings`).

> **Bloco `subagents`: só copie se vier do global.** Se `~/.sdd/config.yaml` tiver um bloco `subagents`, **copie-o inteiro** para o config do projeto — é a exceção deliberada à regra abaixo (o usuário já declarou essa preferência globalmente). Sem global, siga a regra: não escreva o bloco.

> **Não escreva o bloco `subagents`** (quando não veio do global). Existe também um campo opcional `subagents`, que escolhe em qual modelo/thinking cada papel de subagente roda (`implementer`/`scribe`/`explorer`/`tester`), por harness. Ele é **omitido de propósito** no config gerado — ausente significa "cada subagente herda o modelo do principal", que é o comportamento desejado pela maioria. Quem quiser ligar, usa `lp:settings` (ex: *"roda o escriba no haiku"*) ou edita à mão seguindo `../../helpers/prompts/subagents-guide.md`.

Se `format` ∈ {html, both}: copie `../../helpers/templates/styles.css` para `.sdd/assets/styles.css` e pergunte se o usuário quer ajustar o esquema de cores (caso sim, faça um mini-grill sobre cor primária/fundo e edite o CSS).

## 3-bis. Bootstrap do contexto (só se `context: true`)

Semeie a base de conhecimento em `.sdd/context/` seguindo `../../helpers/prompts/context-guide.md`:

- **Projeto pré-existente** (já tem código): rode uma análise **macro** — com `scribe: subagent` (default/ausente), delegue a um **subagente** (papel `explorer` para modelo/thinking, ver `../../helpers/prompts/subagents-guide.md`) que (a) mapeia os principais módulos/funcionalidades do projeto e (b) escreve o `.sdd/context/index.md` + um arquivo de contexto por funcionalidade principal (formato do guia: o que é / como funciona / decisões / notas), agrupando em subpasta quando um tema junta vários. O subagente retorna só a lista de arquivos criados. Não desça a detalhe linha a linha — é contexto macro.
- **Projeto novo/vazio**: crie só o `index.md` esqueleto (cabeçalho + seção "Áreas / funcionalidades" vazia). O contexto cresce conforme os fluxos (`lp:continue`/`lp:bug-fix`/`lp:review`) forem implementando/revisando.
- Cite no resumo final quantos arquivos de contexto foram semeados.

## 4. Mensagem final

Imprima:

```
SDD inicializado em .sdd/
Herdado do global (~/.sdd/config.yaml): implementer=main · tests=on · subagents.scribe
Próximo passo: /lp-new <id-da-mudanca>
```

A linha "Herdado do global" só aparece **se** a config global existir e tiver contribuído com algum valor — liste os campos que vieram de lá. Sem global, omita a linha inteira.

Liste os arquivos criados em ordem de revisão (config primeiro, depois assets se houver).

## Princípios

- **Config global é semente, não vínculo**: os valores herdados de `~/.sdd/config.yaml` são **materializados** no `.sdd/config.yaml` do projeto. Mudar o global depois não altera este projeto (nem o contrário). Ver `../../helpers/prompts/global-config-guide.md`.
- Não comite nada automaticamente.
- Não adicione `.sdd/` ao `.gitignore` (docs devem entrar no repo).
- Se algo já existe e seria sobrescrito, pare e pergunte.
