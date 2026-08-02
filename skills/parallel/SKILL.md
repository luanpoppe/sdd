---
name: parallel
description: Liga ou desliga o modo de implementação paralela do SDD lp:* (chunks independentes implementados ao mesmo tempo, um subagente cada). Use quando o usuário pedir "lp:parallel", "ativar paralelo", "implementar em paralelo", "desligar paralelo".
---

Você está ligando/desligando o modo paralelo do SDD (campo `parallel` no `.sdd/config.yaml`).

## 0. Pré-checagem

- Se `.sdd/config.yaml` não existir → "Rode `/lp-init` primeiro." Pare.

## 1. Interprete o argumento

- `on` / `ligar` / `ativar` (ou sem argumento e hoje está `off`) → set `parallel: on`.
- `off` / `desligar` (ou sem argumento e hoje está `on`) → set `parallel: off`.
- Sem argumento → **alterna** o valor atual (toggle).

Atualize o `parallel` no `.sdd/config.yaml` e `updated` se houver.

## 2. Reporte

- Ligou: *"Modo paralelo LIGADO. Chunks independentes serão implementados em paralelo (um subagente cada), em ondas, respeitando dependências e arquivos disjuntos. Cada onda termina com plano de revisão. Veja `../../helpers/prompts/parallel-guide.md`."*
- Desligou: *"Modo paralelo DESLIGADO. Volta a implementar um chunk por vez."*

## Princípios

- **Só muda config**: não implementa nada, não toca specs/tasks/código. Só o campo `parallel`.
- Paralelo sempre usa subagentes (ignora `implementer: main` nos chunks paralelos) e nunca pula revisão — ver `../../helpers/prompts/parallel-guide.md`.
- Mesmo com `parallel: off`, o `lp:continue` pergunta uma vez antes do 1º chunk se o usuário quer paralelizar aquela feature.
