---
name: status
description: Gera um resumo de handoff sob demanda da mudança ativa do SDD lp:* — estado, o que já foi feito, o que está em revisão, próximos passos e decisões-chave — pronto pra colar numa conversa nova e retomar sem perder contexto. Use quando o usuário pedir "lp:status", "resumo pra continuar", "handoff", "onde paramos", ou antes de reiniciar a conversa.
---

Você está gerando um **resumo de handoff** da mudança ativa: o suficiente pra outra conversa (ou você mesmo depois) retomar do zero. **Apenas LEITURA** — nunca mute arquivos.

## 0. Pré-checagem

- Se `.sdd/config.yaml` não existir → "SDD não inicializado. Rode `/lp-init`." Pare.
- Identifique a mudança ativa (pasta em `.sdd/changes/` com `state` ≠ `archived`). Nenhuma → diga isso e sugira `/lp-new`. Mais de uma → pergunte qual (ou resuma todas, curto).

## 1. Coleta

- `.sdd.yaml`: `id`, `title`, `state`, `kind`, `current_feature`, `current_chunk`, `in_review`, `features[]` (com status), `updated`. **Se `kind: bugfix`** → é um bug-fix (sem `features[]`; estados `bug-diagnosing`/`bug-proposing`/`bug-fixing`; chunks `C<m>` em `tasks.md` na raiz; solução em `chosen_solution`). Colete de `diagnosis.md`/`solutions.md`/`tasks.md` conforme a etapa. Ver `../../helpers/prompts/bugfix-machine.md`.
- `plan.md`: contexto + decisões macro (resumir, não copiar inteiro).
- Feature ativa: `specs/<current_feature>/tasks.md` — conte chunks **por bloco `### F<n>.C<m>`** (concluído = todos os checkboxes `[~]`/`[x]`), não por checkbox cru.
- `in_review`: se preenchido, é o chunk/onda aguardando revisão + os arquivos.
- Memória relevante (`.sdd/memory.md`): decisões de Estilo/Processo e Stack/Domínio que afetam a retomada.

## 2. Output — bloco de handoff

Formato (conciso, colável):

```
## Handoff — <id>: <title>   (<data>)

Estado: <state> · feature ativa: <current_feature> (<i>/<total>) · chunk atual: <current_chunk> — <o que ele faz>

Contexto (1-2 frases): <do plan.md>
Decisões macro que importam: <bullets curtos>

Features:
  ✓ <slug> [done]   ▶ <slug> [implementing] (X/Y chunks)   ◌ <slug> [pending]
  (bug-fix: troque esta linha pela etapa — diagnóstico / opções (escolhida: <opção>) / correção (X/Y chunks))

Em revisão agora: <in_review: chunk(s) — o que faz(em) — + arquivos, ou "nada">
Feito recentemente: <últimos 1-3 chunks concluídos, cada um pelo que fez>
Próximo passo: /lp-continue → <o que ele fará concretamente>

Preferências salvas (memória): <1-3 itens que mudam como implementar>
Arquivos-chave da feature ativa: <spec.md, tasks.md, e 2-4 arquivos de código centrais>
```

## Princípios

- **Não muta nada** — nem docs, nem `.sdd.yaml`, nem código.
- **Colável e completo**: quem ler o bloco numa conversa nova deve conseguir rodar `/lp-continue` e seguir sem perguntar "onde estávamos?".
- **Conciso**: resuma o plan/spec, não cole inteiro. Aponte caminhos pra quem quiser detalhe.
- **Nada se cita só pelo número**: um handoff que diz só "chunk atual: F2.C4" ou "frente F3" é inútil pra quem retoma — sempre acompanhe da descrição (`Faz` do chunk no `tasks.md`; título/`summary` da feature no `plan.md`/`.sdd.yaml`). Ver `../../helpers/prompts/state-machine.md`.
- Diferente do `lp:help` (status + lista de comandos): aqui o foco é **retomada de contexto**.
