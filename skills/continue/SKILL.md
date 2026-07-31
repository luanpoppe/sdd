---
name: continue
description: Avança UM passo no SDD `lp:*` da mudança ativa. Fluxo SEQUENCIAL POR FEATURE: para cada feature, primeiro gera spec → revisão → gera tasks → revisão → implementa chunks micro um a um. Só passa para a próxima feature quando a anterior está concluída. Use quando o usuário pedir "lp:continue", "próximo passo lp", ou "continuar a implementação".
---

Você está avançando 1 passo no SDD. Siga a máquina de estados em `../../helpers/prompts/state-machine.md` e o estilo de grilling em `../../helpers/prompts/grill-snippet.md`.

## 0. Pré-checagem

- Se `.sdd/config.yaml` não existir → "Rode `/lp-init` primeiro." Pare.
- Identifique a **mudança ativa**: pasta em `.sdd/changes/` com `.sdd.yaml` `state` ≠ `archived`.
  - Nenhuma: imprima `"Nenhuma mudança ativa. Comece com /lp-new <id>."` e pare.
  - Mais de uma: prefira `state: implementing`; em empate, pergunte qual.
- Leia `.sdd.yaml`, `plan.md`, e os arquivos da **feature ativa atualmente** (se houver `current_feature`): `specs/<current_feature>/spec.md` e `tasks.md` se existirem.
- **NÃO leia specs de outras features** — elas podem nem existir ainda.
- **Carregue a memória**: leia `.sdd/memory.md` (ou `.sdd/memory-map.md` se existir; nesse caso, leia também os arquivos de tema que parecem relevantes pelo título da feature ativa). Siga `../../helpers/prompts/memory-guide.md`.

## 1. Despache por estado

### `awaiting-feature-spec`

1. Identifique a próxima feature na lista `features` do `.sdd.yaml` com `status: pending` (primeira em ordem). Marque-a como `speccing`, set `current_feature: <slug>`.
2. Imprima: *"Iniciando feature `<slug>`: <summary>. Vou fazer perguntas para definir a spec — uma por vez."*
3. **Grill profundo SÓ desta feature**, uma pergunta por vez via `AskUserQuestion`. Cubra (apenas o que não dá pra inferir do código):
   - Cenários BDD principais — pelo menos 1, geralmente 2-4. **Palavras-chave conforme `lang` do `.sdd/config.yaml`**: `pt-BR` → "Dado que / Quando / Então"; `en` → "Given / When / Then".
   - Edge cases conhecidos.
   - Contratos (tipos, schemas, eventos, endpoints) — referencie arquivos do projeto quando possível.
   - Dependências de outras features (já feitas, futuras, externas).
4. **Pare quando** todas as ambiguidades dessa feature estão resolvidas e nada foi "tanto faz" sem follow-up.
5. Gere `specs/<slug>/spec.md` usando `../../helpers/templates/spec.md.tpl`. **Alvo: ≤ 100 linhas**.
5-bis. **Respeite o `format` do `.sdd/config.yaml`**: se `format` ∈ {html, both}, gere também `specs/<slug>/spec.html` espelhando o conteúdo do `.md` (use `.sdd/assets/styles.css`; se não existir, copie de `../../helpers/templates/styles.css`). Confira o padrão das specs anteriores da mesma mudança e mantenha consistência.
6. Atualize `.sdd.yaml`: `state: awaiting-feature-tasks`, `updated`.
6-bis. Se `flowchart: on`, atualize `flow.html` (`../../helpers/prompts/flowchart-guide.md`) — a feature saiu de "spec ainda não gerada".
7. Imprima plano de revisão:
   ```
   Spec da feature `<slug>` criada (em revisão).
   Arquivo: .sdd/changes/<id>/specs/<slug>/spec.md  (<N> linhas)

   Ordem de revisão:
   1. Resumo (entendimento geral)
   2. Requirements (cenários BDD — o coração da spec)
   3. Edge cases
   4. Contratos

   Quando aprovar, rode /lp-continue para gerar tasks.md desta feature.
   ```

### `awaiting-feature-tasks`

1. Releia `specs/<current_feature>/spec.md` e `plan.md`.
2. Grilling MÍNIMO — apenas se houver ambiguidade real sobre granularidade ou ordem de chunks. Uma pergunta por vez. Se a spec é clara, pule o grill.
3. Gere `specs/<current_feature>/tasks.md` usando `../../helpers/templates/tasks.md.tpl`. Respeite `chunk_size`:
   - `micro`: 1-2 arquivos OU ~50-100 linhas (default).
   - `small`: até 3 arquivos OU ~150-200 linhas.
   - `medium`: até 5 arquivos OU ~250-400 linhas.
   - `large`: até 7 arquivos OU ~450-600 linhas.
   - `xlarge`: até 10 arquivos OU ~700-1000 linhas.
4. IDs no formato `F<n>.C<m>` onde n = índice (1-based) da feature na lista do plan.md, m = chunk dentro da feature.
5. **Cada chunk DEVE incluir**: arquivos tocados, resumo de 1 frase, ordem de revisão, comando de validação. Na dúvida, **parta em dois**.
5-bis. **Respeite o `format`**: se `format` ∈ {html, both}, gere também `specs/<current_feature>/tasks.html` espelhando o `.md` (use `.sdd/assets/styles.css`). Mantenha o padrão das tasks anteriores da mudança.
6. Atualize `.sdd.yaml`: feature `tasking` → `implementing`, state global → `implementing`, `updated`.
6-bis. Se `flowchart: on`, atualize `flow.html` (`../../helpers/prompts/flowchart-guide.md`) — **expanda a feature nos nós de componente** (um por chunk), todos `pending`.
7. Imprima plano de revisão das tasks (lista de chunks + estimativa de tamanho de cada). Avise: *"Valide a granularidade antes de seguir. Próximo `/lp-continue` executa o chunk F<n>.C1."*

### `implementing`

Coração da skill. Execute na ordem:

**a) Auto-sync** (detectar divergências contra `plan.md` + spec da feature ativa):
- Liste em buckets se houver: decisão divergente / escopo extra / escopo faltante.
- Proponha diffs nas docs (plan.md ou specs/<slug>/spec.md ou tasks.md).
- Pergunte: aplicar diffs / ignorar / tratar depois.
- Aplique aprovados ANTES de codar. Mostre resumo.
- **Divergências que persistem** (feito diferente do planejado e a doc foi ajustada) → anote para marcar o componente como `deviated` no diagrama (passo g).

**b) Próximo chunk**:
- Primeiro `[ ]` em `specs/<current_feature>/tasks.md`.
- Marque-o como em andamento (opcional: troque para `[~]` apenas no final).

**c) Executar APENAS este chunk**:
- Respeite `chunk_size`. Se o chunk como descrito vai exceder, **pare e divida em sub-chunks** atualizando o tasks.md antes de codar.
- Faça as edições.
- Rode `npx eslint --fix <arquivos editados>` (apenas neles).
- Se o projeto exige (ver CLAUDE.md do projeto), rode os testes.

**d) Marcar + registrar**:
- tasks.md: marque **TODOS os checkboxes do chunk** (`Arquivos`, `Faz`, `Ordem de revisão`, `Validação` e quaisquer outros) de `[ ]` → `[~]`. Não marque só o primeiro item — todo bullet `[ ]` do chunk concluído deve virar `[~]`. Conte quantos checkboxes o chunk tem ANTES de editar e confirme que esse mesmo número virou `[~]` DEPOIS.
- `.sdd.yaml`: `current_chunk: "F<n>.C<m>"`, `updated`.

**e) Plano de revisão obrigatório** (formato da state-machine.md):

**UMA lista só** de arquivos, já na ordem de revisão (não separe "Arquivos" de "Ordem de revisão"). Inclua TODOS os arquivos tocados (serve de manifesto pra revert), ordenados por prioridade; triviais (tipos gerados, config, stubs) no FIM marcados "pode pular".

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

Próximo: /lp-continue (próximo chunk OU início da próxima feature, se essa foi a última).
Reverter: peça "reverte o chunk F<n>.C<m>".
```

> Enquanto o usuário revisa: se ele perguntar algo ou pedir ajuste no chunk (sem rodar `/lp-continue`), atenda e **re-imprima a lista de revisão atualizada no fim da resposta** (ver seção "Durante a revisão de um chunk").

**Pare aqui.** Não execute o próximo chunk no mesmo turno.

**g) Atualizar diagrama** — se `flowchart: on` no `.sdd/config.yaml` (default), regenere `.sdd/changes/<id>/flow.html` seguindo `../../helpers/prompts/flowchart-guide.md`: marque este chunk como concluído, mova o `current` para o próximo, marque `deviated` os componentes anotados no auto-sync. Cite no plano de revisão: *"Diagrama atualizado: flow.html"*.

**f-bis) Context watch** — antes de fechar o turno, siga `../../helpers/prompts/context-watch.md` usando `context_watch` do `.sdd/config.yaml`. Heurística subjetiva: na faixa de 5-10 chunks implementados nesta MESMA conversa, comece a observar. Se julgar pesada → siga o protocolo (suggest/auto/off).

**f) Transição "feature concluída"**:
- Se todos os chunks da `current_feature` estão `[~]`/`[x]`:
  - Marque a feature como `done` no `.sdd.yaml`.
  - Limpe `current_feature` e `current_chunk`.
  - Se há próxima feature `pending`: `state: awaiting-feature-spec`. Imprima: *"Feature `<X>` concluída (em revisão). Próximo `/lp-continue` inicia a feature `<Y>` (spec)."*
  - Senão: `state: awaiting-archive`. Sugira `/lp-archive`.

### `awaiting-archive`

Diga ao usuário para rodar `/lp-archive`. Não faça mais nada.

## Durante a revisão de um chunk (perguntas e alterações inline)

Vale enquanto há um chunk **em revisão** (recém-impresso o plano, chunk `[~]`, ainda não aprovado e sem novo `/lp-continue`). Se, nesse meio, o usuário **faz uma pergunta** sobre o que foi implementado OU **pede uma alteração** no chunk — sem rodar `/lp-continue`:

1. Responda a pergunta / aplique a alteração normalmente e explique o que fez.
2. Se **alterou arquivos**: rode `npx eslint --fix` nos editados e, se o projeto exigir, os testes. A lista de arquivos pode ter mudado (novos arquivos, novos ±linhas) — reflita isso.
3. **No FIM da resposta, re-imprima a lista de revisão atualizada**, para o usuário continuar de onde parou:

   ```
   Revisão (na ordem — continue de onde parou):
   1. caminho/arquivo1.ts (criado, +N) — <o que olhar>.
   2. caminho/arquivo2.ts (editado, +N -M) — <o que olhar>.
   ...
   ```

- Se o usuário já disse quais arquivos revisou, mova o "comece por aqui" para o primeiro ainda **não** revisado (ou marque os revisados com ✓). Não force se não souber.
- **Não avance** para o próximo chunk aqui — isso só acontece com `/lp-continue` explícito.
- Não re-imprima o cabeçalho inteiro do plano (Feature/Estado/Validação) toda vez — só a **lista de revisão** basta, salvo se a alteração invalidou a validação (aí re-rode e mostre).
- Se a pergunta NÃO for sobre o chunk em revisão (dúvida geral, outro assunto) → responda normal, **sem** re-imprimir a lista.

## Memória — varredura e salvamento autônomo (em qualquer fase)

Antes de fechar o turno, **revise a conversa** procurando sinais de preferência (correção, rejeição com alternativa, "lembra disso", "sempre/nunca faça X", padrão repetido). Siga `../../helpers/prompts/memory-guide.md`:

1. **Detectou sinal claro** → classifique (Estilo/Processo ou Stack/Domínio), verifique duplicação, e **grave direto** em `.sdd/memory.md` (ou no arquivo de tema se houver `memory-map.md`). Sem perguntar.
2. **Detectou sinal ambíguo** (classificação incerta, generalização duvidosa, ou conflito com entrada existente) → faça UMA pergunta curta.
3. **Sempre** cite no plano de revisão: *"Memória: +1 em Estilo/Processo — `<resumo>`"* (ou "atualizei entrada existente").
4. Se `memory.md` passar de ~150 linhas → **divida sozinho** em `.sdd/memory/<tema>.md` + `memory-map.md` e informe no plano de revisão.

## Princípios não-negociáveis

1. **Uma feature por vez.** NUNCA gere specs ou tasks de duas features no mesmo turno.
2. **Um passo por invocação.** Mesmo que o usuário peça "faz tudo", redirecione: "no SDD, cada passo é um `/lp-continue` para que você possa revisar".
3. **Grilling agressivo na criação da spec**, mínimo na criação das tasks (se a spec resolveu as dúvidas).
4. **Auto-sync antes de implementar.** Nunca codifique sobre docs desatualizadas.
4-bis. **Respeite o `format` em TODA doc gerada.** `format: both` ou `html` → spec e tasks saem em `.md` E `.html`, não só `.md`. Antes de fechar o passo, confira o `format` e o padrão das docs anteriores da mudança.
5. **Plano de revisão sempre.** Sem exceções.
6. **Não leia specs de outras features** que ainda não foram processadas — elas não existem.
