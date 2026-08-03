# Flowchart guide — diagrama macro da implementação

Regras para gerar/atualizar `.sdd/changes/<id>/flow.html`: um diagrama **macro** (visão de componentes, não de linhas) mostrando o fluxo da implementação e em que ponto ela está.

## Toggle

- Só gere/atualize se `flowchart` no `.sdd/config.yaml` for `on` (default). Se `off`, **não faça nada** relativo ao diagrama.
- O arquivo é **sempre HTML**, independente de `format` (igual `lp:explain`). Fica em `.sdd/changes/<id>/flow.html`.
- Use o template `../templates/flow.html.tpl` (do ponto de vista das skills: `~/.claude/skills/lp-shared/templates/flow.html.tpl` ou o caminho equivalente do install). É autocontido — sem libs, offline.

## Quando gerar / atualizar

- **Criar**: quando o `plan.md` é aprovado (transição para `awaiting-feature-spec` a 1ª vez). Nesse momento só existem features → um nó macro por feature.
- **Atualizar**: no FIM de cada `lp:continue` que muda o progresso (spec gerada, tasks gerados, chunk implementado, feature concluída). Regenere o `<main>` inteiro a partir do estado atual — é barato e evita dessincronia.
- **Sob demanda**: a skill `lp:flow` regenera e reporta o caminho.

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
2. No `<div class="detail-panel" hidden>` da MESMA feature (um por feature, logo depois do `.flow`), adicione um bloco:
   ```html
   <div class="detail" data-detail-for="F<n>.C<m>" hidden>
     <h4>Componente <span class="chunk-id">F<n>.C<m> · ClassePrincipal</span></h4>
     <p class="what">1-3 frases: o que esse chunk faz e por quê.</p>
     <p class="block-label">Dados fluindo</p>
     <div class="data">exemplo concreto: request/response, evento publicado, ou objeto transformado</div>
     <p class="block-label">Trecho ilustrativo</p>
     <pre><code>pseudo-código / assinatura representativa</code></pre>
     <p class="note">opcional — ex: "feito diferente: usou X em vez de Y".</p>
   </div>
   ```

Conteúdo do detalhe (regras):

- **Fonte = spec/tasks, NÃO o código-fonte.** `lp:flow` continua read-only e **não lê os arquivos implementados**. Baseie a explicação nos `requirements`/`contratos`/`edge cases` da spec e no resumo do chunk no `tasks.md`.
- **Dados fluindo**: use exemplos reais dos contratos da spec (payloads, eventos, status). Mostre o que entra e o que sai daquela parte.
- **Trecho ilustrativo**: pseudo-código ou assinatura representativa — deixe claro que é ilustrativo, não o fonte literal. Curto (≤ ~8 linhas). Escape `<`, `>`, `&` no HTML.
- **`deviated`**: use a `<p class="note">` para dizer o que mudou em relação ao planejado (mesmo texto curto do sub-texto do nó).
- **Macro ainda vale**: 1 bloco por chunk, não por arquivo. Nada de despejar implementação inteira.

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

- **Regenerar > remendar**: reescreva o `<main>` a cada update a partir do estado real. Não tente editar nós individualmente.
- **Não inventar arquitetura**: nós e setas saem do `plan.md`/`spec`/`tasks.md` reais. Se não sabe qual componente um chunk é, use o nome do arquivo principal.
- **Macro sempre**: se o diagrama está ficando com dezenas de nós, você desceu detalhe demais — agrupe.
- **Silencioso quando `off`**: nunca gere o arquivo se o toggle estiver desligado.
