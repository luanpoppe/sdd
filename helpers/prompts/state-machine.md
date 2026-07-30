# Máquina de estados do SDD (`lp:*`)

> Fluxo: **sequencial por feature**. Nunca gere todas as specs/tasks de uma vez. Cada feature passa por spec → tasks → implementação → revisão antes da próxima começar.

## Estado por mudança (`.sdd/changes/<id>/.sdd.yaml`)

```yaml
id: <kebab>
title: <título>
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
state: awaiting-plan | awaiting-feature-spec | awaiting-feature-tasks | implementing | awaiting-archive | archived
format: md | html | both
lang: pt-BR | en
chunk_size: micro | small | medium | large | xlarge
features:
  - slug: <feature-1-slug>
    title: <título curto>
    summary: <1 frase descrevendo o que faz>
    status: pending | speccing | tasking | implementing | done
  - slug: <feature-2-slug>
    ...
current_feature: <slug ou null>
current_chunk: <ref tipo "F1.C2" ou null>
last_review_plan: <texto curto ou null>
```

A **ordem da lista** define a ordem de execução. Não embaralhar.

## Layout de arquivos

```
.sdd/
  memory.md                     # preferências persistentes (Estilo/Processo, Stack/Domínio)
                                # OU memory-map.md + memory/<tema>.md quando dividido
  changes/<id>/
    .sdd.yaml
    plan.md                     # contexto + decisões macro + LISTA de features (1 frase cada)
    specs/
      <feature-1-slug>/
        spec.md                 # criado quando feature entra em "speccing"
        tasks.md                # criado quando feature entra em "tasking"
      <feature-2-slug>/...      # só existe quando a feature anterior está done
    explain/                    # on-demand (lp:explain)
```

> A memória vive no nível do **projeto** (`.sdd/memory.md`), não dentro de cada mudança. Persiste entre mudanças. Veja `./memory-guide.md`.

> **Não existe `tasks.md` global.** Cada feature tem seu próprio `specs/<slug>/tasks.md`.

## Transições

| Estado | Gatilho | Ação | Próximo |
|---|---|---|---|
| (sem mudança ativa) | `lp:continue` | Imprime: "Nenhuma mudança ativa. Comece com `/lp-new <id>`." Para. | — |
| `awaiting-plan` | fim de `lp:new` | Gera `plan.md` com contexto + decisões macro + **lista de features** (apenas slug/título/1-frase). Define ordem. | `awaiting-feature-spec` |
| `awaiting-feature-spec` | `lp:continue` | 1) Pega a próxima feature `pending` na ordem da lista. Marca `speccing` e `current_feature`. 2) **Grill profundo SÓ dela** (cenários BDD, edge cases, contratos). Uma pergunta por vez. 3) Gera `specs/<slug>/spec.md`. 4) Imprime plano de revisão da spec. | `awaiting-feature-tasks` |
| `awaiting-feature-tasks` | `lp:continue` (após usuário revisar spec) | 1) Grill curto se necessário (poucas perguntas; só se houver ambiguidade sobre como quebrar em chunks). 2) Gera `specs/<slug>/tasks.md` respeitando `chunk_size`. 3) Marca feature `tasking` → `implementing`. 4) Imprime plano de revisão das tasks. | `implementing` |
| `implementing` | `lp:continue` | 1) Auto-sync: detectar e propor diff em divergências. 2) Pegar próximo chunk `[ ]` da `current_feature`. 3) Implementar. 4) Marcar `[~]`. 5) Imprimir plano de revisão. | `implementing` (se há mais chunks) · `awaiting-feature-spec` (se feature done e há próxima) · `awaiting-archive` (se foi a última) |
| `awaiting-archive` | `lp:archive` | Verifica + arquiva. | `archived` |

## Transição "feature concluída"

Quando todos os chunks de `current_feature` estão `[~]` ou `[x]`:
1. Marca a feature como `done` no `.sdd.yaml`.
2. Limpa `current_feature` e `current_chunk`.
3. Se há próxima feature `pending`: estado → `awaiting-feature-spec`. Imprime: *"Feature `<X>` concluída (em revisão). Próximo `/lp-continue` inicia a feature `<Y>` (spec)."*
4. Senão: estado → `awaiting-archive`. Imprime sugestão de `/lp-archive`.

## Detecção de divergência (em `implementing` e `lp:audit`)

Escopo: `plan.md` + spec da `current_feature` + código tocado.

Sinais:
1. Arquivos editados em chunks já `[x]` cuja modificação não está documentada.
2. Decisão da conversa atual que contradiz `plan.md` ou a spec ativa.
3. Novo arquivo/módulo sem entrada no `tasks.md` da feature.
4. REQ da spec sem código correspondente.

Buckets: **decisão divergente** / **escopo extra** / **escopo faltante**. Propor diff por divergência. Não aplicar sem `OK`.

## Plano de revisão (após cada chunk)

**UMA lista só**: todos os arquivos tocados, já na ordem de revisão (não duas listas separadas). A lista é completa — serve de manifesto pra revert também. Arquivos de baixo valor de revisão (tipos gerados, config trivial, stubs) vão para o FIM, marcados "pode pular".

Formato obrigatório:

```
## Chunk F<n>.C<m> — <título> (em revisão)

Feature: <slug> (<i>/<total>)
Estado da feature: <X de Y chunks concluídos>

Revisão (na ordem — comece pelo topo):
1. caminho/arquivo1.ts (criado, +N) — <o que olhar>; comece por aqui.
2. caminho/arquivo2.ts (editado, +N -M) — <o que olhar>.
3. caminho/tipos.d.ts (criado) — tipos gerados, leitura rápida / pode pular.

Validação:
- eslint --fix: ok
- test: N passing

Próximo: /lp-continue (chunk F<n>.C<m+1>) ou — se foi o último da feature — inicia a próxima feature.
Reverter: peça "reverte o chunk F<n>.C<m>".
```

Regras da lista:
- **Inclua todos os arquivos mexidos** — não omita nenhum (o usuário precisa saber o que mudou pra reverter).
- **Ordene por prioridade de revisão**: comece pelo núcleo da lógica; termine nos triviais.
- Cada linha: `caminho (tipo de mudança, ±linhas) — o que olhar`. Nos triviais, o "o que olhar" vira "pode pular / leitura rápida".
- Sem segunda lista. Sem repetir arquivos.

## Perguntas/alterações durante a revisão de um chunk

Enquanto um chunk está em revisão (impresso, `[~]`, não aprovado), se o usuário perguntar algo ou pedir ajuste no chunk **sem** rodar `/lp-continue`: atenda, e **re-imprima a lista de revisão atualizada no fim da resposta** para ele continuar de onde parou. Se alterou arquivos, re-rode a validação e reflita novos arquivos/±linhas na lista. Não avance de chunk sem `/lp-continue` explícito.
