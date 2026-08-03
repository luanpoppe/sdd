---
name: flow
description: Gera ou regenera o diagrama macro (HTML) do fluxo de implementação da mudança ativa do SDD lp:*, mostrando o que já foi feito, o que está em andamento, o que falta e o que foi feito diferente do planejado. Use quando o usuário pedir "lp:flow", "mostra o fluxograma", "diagrama da implementação", "onde estamos no fluxo".
---

Você está gerando/atualizando o diagrama macro da implementação da mudança ativa.

## 0. Pré-checagem

- Se `.sdd/config.yaml` não existir → "Rode `/lp-init` primeiro." Pare.
- Leia `.sdd/config.yaml`. Se `flowchart: off` → informe: *"O diagrama está desligado (`flowchart: off` no config). Ligue com `/lp-init` ou editando o config para usar `/lp-flow`."* e pare.
- Identifique a **mudança ativa**: pasta em `.sdd/changes/` com `state` ≠ `archived`. Nenhuma → "Nenhuma mudança ativa." e pare. Mais de uma → pergunte qual.
- Leia `.sdd.yaml`, `plan.md`, e os `specs/<slug>/tasks.md` que já existirem.

## 1. Gerar

Siga `../../helpers/prompts/flowchart-guide.md` para montar o `flow.html` a partir do estado atual (features do plan, chunks dos tasks.md existentes, status pelos checkboxes + `current_chunk`, desvios conhecidos).

- Regenere o `<main>` inteiro. Não remende nós.
- Cada nó já implementado (`done`/`current`/`deviated`) vira clicável, com um bloco de detalhe no `.detail-panel` da feature (o que faz + dados fluindo + trecho ilustrativo). Conteúdo vem da spec/tasks — **não leia o código-fonte**. Veja o guia.
- Salve em `.sdd/changes/<id>/flow.html`.

## 2. Reportar

Imprima:

```
Diagrama atualizado: .sdd/changes/<id>/flow.html
Progresso: <X> de <Y> chunks · feature atual: <slug> (<i>/<total>)
Abra no navegador para ver o fluxo. (macro — foca no que falta)
```

Se estiver rodando em um ambiente com navegador e o usuário pedir, ofereça abrir o arquivo.

## Princípios

- **Read-only sobre o SDD**: `lp:flow` só lê o estado e (re)escreve o `flow.html`. Nunca altera specs, tasks, código ou `.sdd.yaml`.
- **Macro**: visão de componentes, não de linhas. Veja os princípios do `flowchart-guide.md`.
