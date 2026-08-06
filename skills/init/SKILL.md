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

## 2. Grill curto (use `AskUserQuestion`)

Faça as perguntas abaixo. Siga as diretrizes de `../../helpers/prompts/grill-snippet.md` — como formato, idioma e chunk size são independentes entre si, mande as três num único batch de `AskUserQuestion`.

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

`config.yaml` (use os valores do grill):

```yaml
version: 1
format: <md|html|both>
lang: <pt-BR|en>
chunk_size: <micro|small|medium|large|xlarge>
context_watch: <suggest|auto|off>
flowchart: <on|off>
implementer: subagent   # subagent (padrão): lp:continue delega a implementação do chunk a um subagente | main: a conversa principal implementa
parallel: off           # off (padrão): um chunk por vez | on: chunks independentes rodam em paralelo (um subagente cada). Ligar com lp:parallel.
created: <YYYY-MM-DD>
```

> **`implementer` e `parallel` NÃO são perguntados no grill** — gravados como `subagent` e `off`. `implementer: main` faz a conversa principal implementar. `parallel: on` (ou `lp:parallel`) liga o modo paralelo; mesmo com `off`, o `lp:continue` pergunta uma vez antes do 1º chunk se você quer paralelizar.

Se `format` ∈ {html, both}: copie `../../helpers/templates/styles.css` para `.sdd/assets/styles.css` e pergunte se o usuário quer ajustar o esquema de cores (caso sim, faça um mini-grill sobre cor primária/fundo e edite o CSS).

## 4. Mensagem final

Imprima:

```
SDD inicializado em .sdd/
Próximo passo: /lp-new <id-da-mudanca>
```

Liste os arquivos criados em ordem de revisão (config primeiro, depois assets se houver).

## Princípios

- Não comite nada automaticamente.
- Não adicione `.sdd/` ao `.gitignore` (docs devem entrar no repo).
- Se algo já existe e seria sobrescrito, pare e pergunte.
