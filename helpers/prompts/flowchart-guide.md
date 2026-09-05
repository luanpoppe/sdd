# Flowchart guide — diagrama macro da implementação

Regras para gerar/atualizar `.sdd/changes/<id>/flow.html`: um diagrama **macro** (visão de componentes, não de linhas) mostrando o fluxo da implementação e em que ponto ela está.

## Toggle

- Só gere/atualize se `flowchart` no `.sdd/config.yaml` for `on` (default). Se `off`, **não faça nada** relativo ao diagrama.
- Com `flowchart: on`, o campo `flow_storage` decide **onde** ele vive — ver a seção abaixo. O resto deste guia descreve o modo `file`.
- O arquivo é **sempre HTML**, independente de `format` (igual `lp:explain`). Fica em `.sdd/changes/<id>/flow.html`.
- **O `<style>` do template é obrigatório.** Não troque por um link para `.sdd/assets/styles.css`: aquela folha estiliza as docs, e nenhuma classe do diagrama existe nela — o arquivo sairia sem estilo nenhum.
- Use o template `../templates/flow.html.tpl` (do ponto de vista das skills: `~/.claude/skills/lp-shared/templates/flow.html.tpl` ou o caminho equivalente do install). É autocontido — sem libs, offline.

## Onde o fluxo vive: `flow_storage`

| `flow_storage` | Onde | Quem desenha |
|---|---|---|
| `file` (padrão, ausente = `file`) | `.sdd/changes/<id>/flow.html` | o agente, seguindo este guia |
| `mcp` | banco global (`chunks`) | o **SDD Viewer**, aba Fluxo |

Com **`mcp`**, o `flow.html` **não é criado nem atualizado** — nem uma linha. O que era arquivo vira dois registros que o agente já faz de qualquer forma:

1. **Ao gerar o `tasks.md`** de uma feature, semeie o esqueleto: `sdd_write_tasks` com **`mode: "plan"`**, um item por chunk com `chunk_id`, `title`, `files`, `depends_on` e o **`component`** (o rótulo curto do nó — regra em "Modelo de nós", abaixo). É isso que faz o fluxo mostrar o que **ainda não foi feito**.
2. **No `g-bis`**, o `sdd_record_chunk` que você já chama passa a levar `component` também.

`mode: "plan"` **nunca apaga** — chunk já implementado mantém relatório, achados e modelagem. Reexecutar depois de editar o `tasks.md` é seguro.

O painel de detalhe não precisa de nada novo: ele é montado no Viewer a partir do `summary`, do `reasoning`, dos `highlights` e dos `symbols` que o `g-bis` já grava.

> **`flow_storage: mcp` exige `mcp: on`.** Mesma regra do `tasks_storage`/`state_storage`: sem servidor, não há onde gravar. Se o MCP estiver desligado, trate como `file` e diga isso em uma linha.

**Nada é migrado.** `flow.html` que já existe fica onde está, congelado — não apague, não converta, não atualize.

## Quando gerar / atualizar

- **Criar**: quando o `plan.md` é aprovado (transição para `awaiting-feature-spec` a 1ª vez). Nesse momento só existem features → um nó macro por feature.
- **Atualizar**: no FIM de cada `lp:continue` que muda o progresso. **Edição pontual, não reescrita** — ver a seção abaixo.
- **Regenerar inteiro**: só na skill `lp:flow`, quando um `tasks.md` novo expande uma feature em chunks, ou quando o arquivo está visivelmente dessincronizado.

## Atualização incremental (o caminho normal)

> **Não reescreva o `<main>` para marcar um chunk como pronto.** O painel de detalhe de cada chunk é imutável depois de escrito, e num diagrama com 20 chunks o `<main>` passa de 15 mil tokens — reescrevê-lo a cada chunk custa mais que todo o resto do passo somado, e cresce quanto mais o projeto anda.

Um chunk fechando são **três edições pontuais**, cada uma com âncora única no arquivo:

1. **O nó do chunk anterior** vira `done`: troque `class="node current has-detail"` por `class="node done has-detail"` e o `<span class="badge">►</span>` por `<span class="badge">✓</span>`. Âncora: o `data-detail="<ID>"` daquele nó.
2. **O nó deste chunk** deixa de ser `pending` e vira clicável: `class="node current has-detail"`, mais `data-detail="<ID>"`, `tabindex="0"`, o badge `►` e o `<span class="hint">detalhes</span>`. Âncora: o texto do `<div class="sub">` daquele nó, que já contém o ID.
3. **O painel deste chunk** é acrescentado imediatamente antes do `<!-- /detail-panel: <slug> -->` da feature — um `<div class="detail" data-detail-for="<ID>" hidden>` novo, sem tocar nos que já estão lá.

Mais a linha de progresso do cabeçalho (`{{PCT}}`, `{{PROGRESS_LABEL}}`, `{{UPDATED}}`), que é uma edição de uma linha.

Quando a feature fecha, some uma quarta: a classe do `<details class="feature ...">` e a `<span class="tag">` do `<summary>`.

**Nada mais muda.** Se você se pegar reescrevendo nós `pending` que não foram tocados, ou repetindo o painel de um chunk que já tinha um, parou de editar e voltou a regenerar.

> **Regeneração é o plano B, não o padrão.** Se uma edição pontual falhar por âncora ambígua, regenere aquela feature inteira (o `<details>` dela), não o arquivo. Só regenere tudo se o `<main>` estiver realmente inconsistente com o estado.

## Bug-fix (`kind: bugfix`)

Numa mudança de bug-fix não há `features[]` — há uma única trilha de correção. Trate-a como **uma feature única**: uma swimlane com nome do bug (ou "correção"), nós = os chunks `C<m>` do `tasks.md` na raiz da mudança. Antes do `tasks.md` existir (estados `bug-diagnosing`/`bug-proposing`), mostre um único nó macro ("diagnóstico" / "aguardando escolha da solução"). O resto (status por checkboxes, `current_chunk`, `deviated`) é igual.

## Modelo de nós (granularidade progressiva)

- **Feature SEM `tasks.md` ainda** → um único nó macro = a própria feature (nome = slug; sub = "spec ainda não gerada" ou "aguardando tasks").
- **Feature COM `tasks.md`** → expanda em nós de **componente**, um por chunk `F<n>.C<m>`:
  - Nome do nó = o **componente/camada** que o chunk implementa, inferido de "arquivos tocados" + resumo. Ex: `SecurityConfig` → "Config"; `AuthController` → "Controller"; `LoginUseCase` → "UseCase"; `UserMapper` → "Mapper"; `UserRepository` → "Repository". Nomes curtos e reconhecíveis.
  - Sub-texto = `F<n>.C<m> · <NomeDaClasse/arquivo principal>`.
- **Macro, não micro**: no máximo ~1 nó por chunk. Não crie nós por arquivo nem por linha. Se um chunk toca vários arquivos, use o componente principal como nome e cite os outros no sub só se ajudar.

## Detalhe clicável por nó

Todo nó **já implementado** (`done`, `current` ou `deviated`) é clicável e abre um painel abaixo do fluxo da feature, explicando aquela parte. Nós `pending` (sem código ainda) **não** são clicáveis.

Para cada nó implementado:

1. No nó, adicione a classe `has-detail`, o atributo `data-detail="F<n>.C<m>"`, `tabindex="0"` e um `<span class="hint">detalhes</span>` dentro dele.
2. No `<div class="detail-panel" hidden>` da MESMA feature (um por feature, logo depois do `.flow`), adicione um bloco = **mini-walkthrough do chunk, com código REAL** (estilo `lp:review-walkthrough`):
   ```html
   <div class="detail" data-detail-for="F<n>.C<m>" hidden>
     <h4>Componente <span class="chunk-id">F<n>.C<m> · ClassePrincipal</span></h4>
     <p class="what">1-2 frases: o papel deste chunk no fluxo.</p>
     <p class="block-label">Como funciona</p>
     <p>prosa curta explicando a lógica implementada</p>
     <pre data-file="caminho/real/Arquivo.ext"><code>trechos REAIS decisivos do arquivo</code></pre>
     <!-- um <pre data-file> por arquivo relevante do chunk; use <h5> por arquivo se forem vários -->
     <p class="block-label">Dados fluindo</p>
     <div class="data">exemplo real: request/response, evento, ou valor antes→depois (bug-fix)</div>
     <p class="block-label">Conecta</p>
     <ul><li>quem chama/usa e pra onde aponta (nomes reais)</li></ul>
     <p class="note">opcional — ex: "feito diferente: usou X em vez de Y".</p>
   </div>
   ```

Conteúdo do detalhe (regras):

- **Leia o código REAL dos chunks implementados.** Para `done`/`current`/`deviated`, abra os arquivos que o chunk tocou (listados no `tasks.md`, ou o diff) e extraia os **trechos decisivos de verdade** — não pseudo-código. O objetivo é um walkthrough como o do `lp:review-walkthrough`: quem clica entende como aquela parte foi implementada de fato.
  - **Barato no `lp:continue`**: o chunk acabou de ser implementado neste turno — reuse o relatório do subagente / o diff que você já tem em contexto em vez de reler tudo. No `lp:flow` avulso (sem esse contexto), aí sim leia os arquivos do chunk.
  - Nós `pending` continuam **sem** `has-detail` (não há código ainda).
- **Como funciona**: 1 parágrafo curto + os trechos reais. Um `<pre data-file="path">` por arquivo relevante (o `data-file` vira o nome do arquivo no topo do bloco). ≤ ~15 linhas por bloco; corte o resto com `…`. Escape `<`, `>`, `&`.
- **Dados fluindo**: exemplo concreto e real, **um passo por linha** (o `.data` usa `white-space: pre-wrap`, então quebras de linha no HTML aparecem empilhadas). NÃO escreva tudo em texto corrido numa linha só — quebra a legibilidade. Numa sequência/pipeline, ponha o `→` no início de cada linha de transição; linhas flush-left (sem indentação, que o pre-wrap preservaria). Em bug-fix, mostre o estado **antes → depois** (uma linha cada).
- **Conecta**: liste as ligações reais (quem chama, o que consome, qual porta implementa). Se citar outro chunk, cite-o pelo **componente/o que ele faz**, não pelo ID cru (*"consumido pelo endpoint criado no chunk do Controller"*) — ver a regra de citação em `./state-machine.md`. No nó e no `<h4>`, o ID aparece sempre ao lado do nome do componente, então lá está ok.
- **`deviated`**: use `<p class="note">` para o que mudou em relação ao planejado.
- **Macro na CAIXA, detalhe no PAINEL**: continua 1 nó/painel por chunk (não crie nós por arquivo). O painel pode ter vários arquivos, mas focado no chunk — não despeje o arquivo inteiro, só o que explica a implementação.

## Setas / ordem (stages)

- Ordem padrão dentro da feature = ordem dos chunks no `tasks.md` (que já segue a ordem de implementação).
- Cada `.stage` é um passo; separe stages com `.connector`.
- **Fan-out**: quando um componente aponta para vários (ex: UseCase → Mapper + Repository), ponha os destinos como nós paralelos no MESMO `.stage` seguinte. Use as dependências declaradas na spec ("Dependências") e o bom senso arquitetural. Não invente ligações que não existem.
- Não desenhe setas entre features diferentes; mantenha cada feature no seu swimlane. Dependências entre features aparecem só na ordem dos swimlanes (features executam sequencialmente).

## Status de cada nó

> Um chunk = um bloco `### F<n>.C<m>` no `tasks.md` (que tem VÁRIOS checkboxes). O status do chunk vem do conjunto dos seus checkboxes, não de um só.

- `pending` — chunk que ainda tem algum `[ ]` (ou feature sem spec).
- `current` — o `current_chunk` do `.sdd.yaml` (badge ►). No modo paralelo pode haver mais de um (os da onda atual).
- `done` — chunk com todos os checkboxes `[~]`/`[x]` (badge ✓, levemente esmaecido).
- `deviated` — componente onde o **auto-sync** (passo a do `implementing`) registrou "decisão divergente" — algo foi feito diferente do planejado. Sub-texto curto dizendo o quê (ex: "usou JWT stateless, não sessão"). Um nó pode ser `done` E `deviated` — nesse caso use a classe `deviated` (vermelho vence, com badge ✓).

## Classe da feature (swimlane)

- `done` — todos os chunks concluídos.
- `current` — contém o `current_chunk`, ou é a `current_feature`.
- `pending` — ainda não começou.
- Cada feature é um `<details class="feature ..." open>` colapsável; o cabeçalho fica no `<summary>` com a tag ("concluído", "em andamento · X/Y", "a fazer"). X/Y = chunks feitos / total da feature.

## Cabeçalho e progresso

- `{{PCT}}` = % de chunks concluídos no total (todos as features com tasks). Se nenhuma feature tem tasks ainda, use % de features concluídas.
- `{{PROGRESS_LABEL}}` = ex: "3 de 8 chunks concluídos · feature atual: auth-endpoint (1/2)".
- `{{UPDATED}}` = data de hoje. `{{TITLE}}`, `{{ID}}`, `{{LANG}}` do `.sdd.yaml`/config.

## Foco no que falta

- Nós `done` ficam esmaecidos (o CSS já faz via `opacity`).
- O usuário deve bater o olho e ver imediatamente o nó `current` e a cadeia `pending` à frente. Não adicione ruído (sem legendas extras, sem detalhes de implementação concluída).

## Princípios

- **Editar > regenerar**: no `lp:continue`, altere só os nós e o painel que mudaram (ver "Atualização incremental"). Regeneração inteira é para o `lp:flow`, para quando um `tasks.md` novo expande a feature em chunks, e para dessincronia real. O painel de um chunk fechado nunca é reescrito — o conteúdo dele não muda mais.
- **Não inventar arquitetura**: nós e setas saem do `plan.md`/`spec`/`tasks.md` reais. Se não sabe qual componente um chunk é, use o nome do arquivo principal.
- **Macro sempre**: se o diagrama está ficando com dezenas de nós, você desceu detalhe demais — agrupe.
- **Silencioso quando `off`**: nunca gere o arquivo se o toggle estiver desligado.
