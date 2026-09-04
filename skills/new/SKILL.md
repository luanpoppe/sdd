---
name: new
description: Inicia uma nova mudança no SDD `lp:*`. Cria `.sdd/changes/<id>/`, conduz grill agressivo (perguntas em batches de até 4 independentes) para resolver ambiguidades de alto nível, e gera o `plan.md` enxuto (contexto + decisões macro + LISTA de features). Não detalha features aqui — isso fica para `lp:continue`. Use quando o usuário pedir "lp:new", "nova mudança lp", ou ao iniciar qualquer trabalho novo via SDD.
---

Você está iniciando uma nova mudança no SDD `lp:*`. Siga `../../helpers/prompts/grill-snippet.md` para o estilo de grilling.

> **Escrita de artefatos (scribe)**: com `scribe: subagent` (default; **campo ausente = subagent**), a escrita do `plan.md` (+`.html`), do `flow.html` e do `.sdd.yaml` é delegada a um **subagente escriba** numa única chamada, ao final — tudo-ou-nada, nada inline. Você conduz o grill e decide o conteúdo; o escriba renderiza/escreve e devolve a lista. Siga `../../helpers/prompts/scribe-guide.md`. Inline só com `scribe: main` explícito ou se a chamada de subagente falhar.

## 1. Pré-checagem

- Se `.sdd/config.yaml` não existir → diga ao usuário para rodar `/lp-init` primeiro. Pare.
- Leia `.sdd/config.yaml` (formato, idioma, chunk size).
- **Carregue a memória**: leia `.sdd/memory.md` (ou `.sdd/memory-map.md` + arquivos relevantes pelo título da mudança). Siga `../../helpers/prompts/memory-guide.md`. Regra crítica: itens de **Estilo/Processo** aplicam direto; itens de **Stack/Domínio** só viram pergunta de confirmação ("Vi na memória que você usa X — confirma para esta mudança?"). Memória NUNCA substitui grill.
- **Carregue o contexto** (se `context: true`/ausente): leia `.sdd/context/index.md` e os arquivos das áreas que a mudança provavelmente toca — ajuda o grill a não perguntar o que já é sabido e a referenciar o que existe. Siga `../../helpers/prompts/context-guide.md`.
- Pergunte o **id** da mudança (kebab-case curto) se não foi passado como argumento. Valide unicidade contra `.sdd/changes/` e `.sdd/archive/`.
- **Sugestão de branch**: com o id definido, siga `../../helpers/prompts/git-guide.md` (seção 1) — sugira `feature/<id>`, pergunte criar/manual/continuar. Pule em silêncio se não for repo git.

## 2. Criar estrutura inicial

```
.sdd/changes/<id>/
  .sdd.yaml         # state: awaiting-plan
```

`.sdd.yaml`:

```yaml
id: <id>
title: <a definir após grill>
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
state: awaiting-plan
format: <copiado do config.yaml>
lang: <copiado>
chunk_size: <copiado>
features: []
current_feature: null
current_chunk: null
in_review: null
```

Com **`mcp: on`** no `.sdd/config.yaml`, chame `sdd_sync_change` logo depois de criar o arquivo (`change_id`, `kind: feature`, `state: awaiting-plan`). Com `off`/ausente, não mencione MCP. Ver `../../helpers/prompts/mcp-guide.md`.

## 3. Grill (estilo grill-me — EM BATCHES de até 4 independentes)

> **Crítico**: NÃO assuma defaults. Use `AskUserQuestion` agrupando perguntas **independentes** (a resposta de uma não muda outra) em batches de 3-4; perguntas dependentes vão em batches posteriores. Cada pergunta com 2-4 opções concretas + sua recomendação + trade-offs. Releia `grill-snippet.md` antes.

**Cubra apenas o macro.** Detalhes de cada feature SÃO responsabilidade do `lp:continue` quando aquela feature entrar em foco. Aqui você apenas:

1. **Problema/objetivo** — o que essa mudança resolve? (1 pergunta, 1 frase de resposta esperada).
2. **Restrições/decisões macro** — algo já decidido sobre stack/arquitetura/integração que afeta TODAS as features? Se houver várias e forem independentes, agrupe num batch; as dependentes ficam para batch posterior.
3. **Reúso** — explore o código (Read/Grep/Glob/Agent Explore — papel `explorer` para modelo/thinking, ver `../../helpers/prompts/subagents-guide.md`) para identificar módulos/utilidades existentes. Confirme com o usuário em 1 pergunta o que deve ser reutilizado vs criado do zero.
4. **Lista de features** — pergunte ao usuário quais features compõem essa mudança. Para cada uma, capture apenas: slug (kebab), título curto, 1 frase de descrição. **NÃO entre em detalhes técnicos de nenhuma feature aqui.** Se o usuário descrever uma feature em detalhe, anote o slug+frase e diga: *"Os detalhes dessa feature serão grillados quando ela for ativada via `/lp-continue`."*
5. **Ordem de execução** — pergunte a ordem em que as features devem ser implementadas (importa, porque o fluxo é sequencial). Recomende uma ordem baseada em dependências reais primeiro; quando duas ou mais features são independentes entre si, desempate pela heurística de `chunk_order` (default `inside-out`, ausente = `inside-out`): prioriza construir de dentro pra fora — o que é a base (domínio, persistência, lógica interna) antes do que expõe pro mundo externo (controller, consumer, endpoint) — porque isso é o que permite cada chunk compilar/validar incrementalmente. Justifique a ordem recomendada. Se o usuário pedir outra ordem (inclusive de fora pra dentro), siga a pedida.
6. **Escopo dentro/fora** — "dentro" e "fora" são independentes; podem ir no mesmo batch.

**Pare o grill** quando:
- Tudo acima está respondido SEM "tanto faz" pendente.
- Você consegue listar as features na ordem correta.
- Nenhuma decisão macro está aberta.

## 4. Gerar `plan.md` (enxuto)

Use `../../helpers/templates/plan.md.tpl`. **Alvo: ≤ 80 linhas** (preferência forte).

Preencha:
- **Contexto** — 1 parágrafo curto. Sem repetir motivações em 3 lugares.
- **Decisões macro** — só as que afetam múltiplas features. NÃO inclua decisões específicas de feature.
- **Features** — lista numerada com SLUG + TÍTULO + 1 frase. Nada mais. Se você está tentado a escrever mais por feature, PARE — isso vai para a spec dela.
- **Escopo** — dentro/fora em listas curtas.

Se `format` ∈ {html, both}, gere também `plan.html` usando `../../helpers/templates/plan.html.tpl` (espelha o `.md`; garanta que `.sdd/assets/styles.css` exista).

## 5. Atualizar `.sdd.yaml`

- `state: awaiting-feature-spec`
- `title`: preencher
- `features`: lista completa (slug, title, summary, status: `pending`) na ordem definida.
- `updated`: hoje.
- Com **`mcp: on`**: `sdd_sync_change` com o `title`, o `state` novo e o `features[]` completo — é o momento em que a estrutura da mudança fica conhecida.

## 6. Mensagem final e pausa para revisão

Imprima:

```
Mudança `<id>` criada.
Plan.md tem <N> linhas — leitura rápida.

Features (executadas sequencialmente):
1. <slug-1> — <summary> [pending]
2. <slug-2> — <summary> [pending]
...

Revise agora .sdd/changes/<id>/plan.md. Quer ajustar algo (contexto, decisões macro, lista/ordem de features, escopo)?
```

**Pare e aguarde resposta do usuário.** NÃO sugira `/lp-continue` ainda.

- Se o usuário pedir ajustes: aplique no `plan.md` e/ou `.sdd.yaml` (se mudou lista/ordem de features) e pergunte de novo se está bom.
- Quando o usuário aprovar (ex: "tá bom", "pode seguir", "ok"):
  - Se `flowchart` no `.sdd/config.yaml` for `on` (default), **crie `flow.html`** seguindo `../../helpers/prompts/flowchart-guide.md` — nesta fase, um nó macro por feature (ainda sem chunks).
  - Aí sim imprima:

  ```
  Plan.md aprovado. Próximo passo: /lp-continue (vai grillar e gerar a spec apenas da primeira feature: <slug-1>).
  Diagrama do fluxo: .sdd/changes/<id>/flow.html (atualiza a cada /lp-continue).
  ```

## Princípios não-negociáveis

- **Não gere specs nem tasks aqui.** Isso é responsabilidade exclusiva do `lp:continue`.
- **Não detalhe features no plan.md.** Detalhes vivem nas specs (criadas uma por vez).
- **Perguntas em batches** de até 4 independentes durante o grill; dependentes em batches posteriores (ver `grill-snippet.md`).
- **Plan.md curto.** Se passar de ~80 linhas, está detalhando demais — corte.
