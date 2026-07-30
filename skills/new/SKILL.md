---
name: new
description: Inicia uma nova mudança no SDD `lp:*`. Cria `.sdd/changes/<id>/`, conduz grill agressivo (uma pergunta por vez) para resolver ambiguidades de alto nível, e gera o `plan.md` enxuto (contexto + decisões macro + LISTA de features). Não detalha features aqui — isso fica para `lp:continue`. Use quando o usuário pedir "lp:new", "nova mudança lp", ou ao iniciar qualquer trabalho novo via SDD.
---

Você está iniciando uma nova mudança no SDD `lp:*`. Siga `../../helpers/prompts/grill-snippet.md` para o estilo de grilling.

## 1. Pré-checagem

- Se `.sdd/config.yaml` não existir → diga ao usuário para rodar `/lp-init` primeiro. Pare.
- Leia `.sdd/config.yaml` (formato, idioma, chunk size).
- **Carregue a memória**: leia `.sdd/memory.md` (ou `.sdd/memory-map.md` + arquivos relevantes pelo título da mudança). Siga `../../helpers/prompts/memory-guide.md`. Regra crítica: itens de **Estilo/Processo** aplicam direto; itens de **Stack/Domínio** só viram pergunta de confirmação ("Vi na memória que você usa X — confirma para esta mudança?"). Memória NUNCA substitui grill.
- Pergunte o **id** da mudança (kebab-case curto) se não foi passado como argumento. Valide unicidade contra `.sdd/changes/` e `.sdd/archive/`.

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
last_review_plan: null
```

## 3. Grill (estilo grill-me — UMA PERGUNTA POR VEZ)

> **Crítico**: NÃO faça uma rajada de perguntas. NÃO assuma defaults. Use `AskUserQuestion` para cada decisão real, com 2-4 opções concretas + sua recomendação + trade-offs. Releia `grill-snippet.md` antes.

**Cubra apenas o macro.** Detalhes de cada feature SÃO responsabilidade do `lp:continue` quando aquela feature entrar em foco. Aqui você apenas:

1. **Problema/objetivo** — o que essa mudança resolve? (1 pergunta, 1 frase de resposta esperada).
2. **Restrições/decisões macro** — algo já decidido sobre stack/arquitetura/integração que afeta TODAS as features? Pergunte uma decisão por vez se houver várias.
3. **Reúso** — explore o código (Read/Grep/Glob/Agent Explore) para identificar módulos/utilidades existentes. Confirme com o usuário em 1 pergunta o que deve ser reutilizado vs criado do zero.
4. **Lista de features** — pergunte ao usuário quais features compõem essa mudança. Para cada uma, capture apenas: slug (kebab), título curto, 1 frase de descrição. **NÃO entre em detalhes técnicos de nenhuma feature aqui.** Se o usuário descrever uma feature em detalhe, anote o slug+frase e diga: *"Os detalhes dessa feature serão grillados quando ela for ativada via `/lp-continue`."*
5. **Ordem de execução** — pergunte a ordem em que as features devem ser implementadas (importa, porque o fluxo é sequencial). Recomende uma ordem baseada em dependências e justifique.
6. **Escopo dentro/fora** — uma pergunta para cada.

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

Se `format` ∈ {html, both}, gere também `plan.html` espelhando o conteúdo.

## 5. Atualizar `.sdd.yaml`

- `state: awaiting-feature-spec`
- `title`: preencher
- `features`: lista completa (slug, title, summary, status: `pending`) na ordem definida.
- `updated`: hoje.

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
- **Uma pergunta por vez** durante o grill (exceto perguntas comprovadamente ortogonais).
- **Plan.md curto.** Se passar de ~80 linhas, está detalhando demais — corte.
