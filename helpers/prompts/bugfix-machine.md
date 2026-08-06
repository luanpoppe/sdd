# Máquina de estados do bug-fix (`lp:bug-fix` + `lp:continue`)

> Fluxo **enxuto** para corrigir um bug: **diagnóstico → opções → correção**. Não gera `plan.md` nem specs por feature — é mais curto e direto que o fluxo de `lp:new`.
>
> Uma mudança de bug é uma mudança normal em `.sdd/changes/<id>/` marcada com `kind: bugfix`. Por isso `lp:status`, `lp:flow`, `lp:audit`, `lp:archive` e `lp:parallel` funcionam nela sem mudança.

## Estado (`.sdd/changes/<id>/.sdd.yaml`)

```yaml
id: <kebab>
title: <título curto do bug>
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
kind: bugfix
state: bug-diagnosing | bug-proposing | bug-fixing | awaiting-archive | archived
format: md | html | both
lang: pt-BR | en
chunk_size: micro | small | medium | large | xlarge
chosen_solution: <null | "Opção N — título">   # preenchido quando o usuário escolhe uma opção
current_chunk: <null | "C<m>">
in_review: <null | {chunks: [ids], files: [paths], updated: data}>
```

> Sem `features[]`. O bug-fix tem uma única trilha de correção. Os chunks moram em `.sdd/changes/<id>/tasks.md` (raiz da mudança), com IDs `C1`, `C2`, … (sem prefixo de feature).

## Layout de arquivos

```
.sdd/changes/<id>/
  .sdd.yaml
  diagnosis.md        # entendimento + causa raiz (kind:bugfix; NÃO há plan.md)
  solutions.md        # opções de correção + recomendação
  tasks.md            # chunks da solução escolhida (criado em bug-fixing)
  flow.html           # opcional (flowchart: on)
```

> **Formato segue `format` do config.** Com `html`/`both`, gere o par `.md` + `.html` para `diagnosis`, `solutions` e `tasks` (espelho, usando `.sdd/assets/styles.css`). Templates: `../templates/diagnosis.*.tpl`, `../templates/solutions.*.tpl`, `../templates/tasks.md.tpl`.

## Transições

| Estado | Gatilho | Ação | Próximo |
|---|---|---|---|
| (criação) | fim de `lp:bug-fix` | Grill curto + investiga o código → gera `diagnosis` (causa raiz). | `bug-proposing` |
| `bug-proposing` | `lp:continue` (após revisar o diagnóstico) | Gera `solutions` (2-4 opções + recomendação). Pergunta qual o usuário quer (`AskUserQuestion`). Grava `chosen_solution`. | `bug-fixing` |
| `bug-fixing` | `lp:continue` | 1ª vez: gera `tasks.md` da solução escolhida (chunks `C<m>`, respeitando `chunk_size`) + define modo (paralelo/sequencial). Depois: implementa chunk(s) reusando o **motor `implementing`** (ver abaixo). | `bug-fixing` (mais chunks) · `awaiting-archive` (último chunk) |
| `awaiting-archive` | `lp:archive` | Verifica + arquiva. | `archived` |

## `bug-proposing` — gerar opções e escolher

1. Releia `diagnosis.md`. Se a causa raiz não estava clara, pode investigar mais um pouco o código antes.
2. Gere `solutions.(md/html)` com `../templates/solutions.*.tpl`: 2-4 opções, cada uma corrigindo a **causa raiz** (não o sintoma), com abordagem + prós + contras + esforço/risco. Sempre inclua sua recomendação.
3. Pergunte ao usuário qual opção seguir via `AskUserQuestion` (uma opção por alternativa + "Outro"). Grave em `chosen_solution`.
4. `state: bug-fixing`, `updated`. Imprima plano de revisão do `solutions.md` (ordem: Contexto → Opções → Recomendação) e avise: *"Escolhida `<opção>`. Próximo `/lp-continue` gera o tasks.md e começa a implementar."*

> **Não** gere `tasks.md` ainda — isso é o 1º passo de `bug-fixing`, já com a opção decidida.

## `bug-fixing` — implementar a solução escolhida

Reusa o **mesmo motor** da seção `implementing` de `../../skills/continue/SKILL.md` (passos **a–h**: auto-sync → modo → chunk → implementar por subagente/main → marcar → diagrama → plano de revisão → context-watch). Diferenças do bug-fix:

- **1ª vez em `bug-fixing`**: gere `.sdd/changes/<id>/tasks.md` a partir da `chosen_solution` usando `../templates/tasks.md.tpl`. Chunks com IDs `C1`, `C2`, … (sem `F<n>.`). Cada chunk com `Arquivos` / `Depende de` / `Ordem de revisão` / `Faz` / `Validação`, igual ao fluxo normal. Respeite `chunk_size`. Defina modo paralelo vs sequencial pelo `parallel-guide.md` (config `parallel` ou pergunta única).
- **Caminho dos chunks**: `tasks.md` na raiz da mudança (não em `specs/<slug>/`). Não há `current_feature`.
- **Diagrama** (`flowchart: on`): uma única swimlane = a correção; nós = chunks `C<m>` (o `flowchart-guide.md` trata isso como uma "feature única"). Atualize a cada chunk.
- **Transição final**: quando todos os chunks `C<m>` estão `[~]`/`[x]` → `state: awaiting-archive` (não há "próxima feature"). Sugira `/lp-archive`.
- Plano de revisão por chunk, `in_review`, perguntas/alterações inline e memória autônoma: **idênticos** ao `implementing` do `continue` (siga aquela seção).

## Princípios

- **Curto e direto.** É bug-fix, não implementação do zero. Diagnóstico e opções devem caber em poucas telas cada; nada de spec BDD completa.
- **Causa antes de solução.** Não pule para o fix sem causa raiz no `diagnosis.md`.
- **Uma escolha explícita.** A opção de correção é decisão do usuário (registrada em `chosen_solution`), nunca silenciosa.
- **Um passo por `lp:continue`.** Igual ao fluxo normal — o usuário revisa entre etapas.
