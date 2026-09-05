# Máquina de estados do SDD (`lp:*`)

> Fluxo: **sequencial por feature**. Nunca gere todas as specs/tasks de uma vez. Cada feature passa por spec → tasks → implementação → revisão antes da próxima começar.

> **Dois tipos de mudança.** Sem `kind` (ou `kind: feature`) = fluxo completo desta página (`lp:new-feature` → `lp:continue`). Com **`kind: bugfix`** = fluxo enxuto de correção (`lp:bug-fix` → `lp:continue`), em `./bugfix-machine.md`: diagnóstico → opções → correção, sem `plan.md` nem specs por feature. O `kind` vive no `.sdd.yaml`.

## Toggles que mudam este fluxo

Cada linha tem o default entre parênteses; **campo ausente conta como o default**. Abra o guia só quando o passo em questão chegar — o resumo aqui basta para saber se ele chega.

| Campo | Efeito no fluxo | Guia |
|---|---|---|
| `scribe` (`subagent`) | `subagent`: TODAS as escritas de arquivo do passo vão num único pacote para o escriba — tudo-ou-nada, nunca parcial. `main`: você escreve inline. | `./scribe-guide.md` |
| `implementer` (`subagent`) | Quem escreve o **código** do chunk. Ortogonal ao `scribe`. | `./subagents-guide.md` |
| `tests` (`off`) | `on`: ao concluir uma feature (ou a correção), roda o passo **f-bis** — um tester dedicado escreve os testes da funcionalidade inteira, roda e **reporta sem corrigir**. Nunca por chunk. | `./tester-guide.md` |
| `mcp` (`off`) | `on`: cada ponto desta máquina também é registrado no banco global, pelo **agente principal** (não pelo escriba). Tool ausente → 1 linha de aviso e siga. | `./mcp-guide.md` |
| `tasks_storage` (`file`) · `state_storage` (`file`) | Em `mcp`, o plano de chunks e/ou o bloco volátil do `.sdd.yaml` saem do arquivo e passam a viver no banco. São as **duas únicas** exceções a "o banco é índice derivado", e nesses modos o passo trava se a tool faltar. | `./mcp-guide.md` |
| `subagents` (ausente) | Modelo/thinking por papel de subagente, por harness. Sem entrada, lance normal **em silêncio**. | `./subagents-guide.md` |
| `auto_commit` (`suggest-only`) | `suggest-only`: mostra o comando de commit no plano de revisão. `full`: commita quando o chunk é aprovado, exceto em branch protegida. `off`: não menciona git. `lp:new-feature`/`lp:bug-fix` também sugerem uma branch dedicada no início. | `./git-guide.md` |
| `flowchart` (`on`) | Mantém o `flow.html` da mudança atualizado a cada passo que muda o progresso. | `./flowchart-guide.md` |

> **Ordem de construção (`chunk_order`).** Default `inside-out`: entre features/chunks independentes, prioriza construir de dentro pra fora — domínio/persistência/lógica interna antes de controller/consumer/endpoint — porque é a ordem que deixa cada chunk compilando e validando sozinho, sem stub. `outside-in` inverte o desempate (esqueleto do fluxo primeiro, aceitando stub temporário). `free` = só dependência real importa. **`Depende de:` real sempre vence a heurística** — `chunk_order` só desempata quando a spec permite mais de uma ordem válida. Usado em `lp:new-feature` (ordem das features) e `lp:continue` (ordem dos chunks).

> **Como citar chunks, features e qualquer coisa numerada em texto explicativo.** Toda etiqueta do SDD — chunk (`C6`, `F2.C3`), feature/frente (`F3`, slug), onda, opção de solução (`Opção 2`) — é **referência, não descrição**. Ninguém lembra de cabeça o que era `C6` nem qual era a "frente F3". Em toda prosa dirigida ao usuário (explicação do chunk, `Vem de`/`Prepara`, "Conecta com o macro", transições, resumo de onda, resposta a pergunta, plano de revisão, handoff), **nunca use a etiqueta sozinha como se ela explicasse algo**. Sempre acompanhe do que aquilo é/faz:
>
> - Chunk: *"o chunk que renormalizou o prompt (`C7`)"* — não *"o `C7`"*.
> - Feature/frente: *"a frente de transparência do diagnóstico (`F3`)"* — não *"frente F3"*. Puxe o título/`summary` da feature no `plan.md`/`.sdd.yaml`.
> - Opção de solução: *"a opção que recalcula no mapper (Opção 2)"* — não *"a Opção 2"*.
>
> Se a frase continua clara sem a etiqueta, prefira só a descrição; a etiqueta entra entre parênteses quando o usuário pode querer referenciá-la (revert, achar no `tasks.md`/`plan.md`). **Exceções** (etiqueta crua é o certo): cabeçalhos no formato `<ID> — <título>` (o título já vem ao lado), campos do `.sdd.yaml`/`tasks.md`, `data-*` do `flow.html`, e comandos que o usuário vai copiar ("reverte o chunk `F2.C3`").

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
in_review: <null | {chunks: [ids], files: [paths na ordem], updated: data}>  # chunk(s) aguardando revisão do usuário; persiste entre turnos/compactação
```

A **ordem da lista** define a ordem de execução. Não embaralhar.

> Com **`state_storage: mcp`** (padrão `file`), as seis últimas informações — `updated`, `state`, o `status` de cada feature, `current_feature`, `current_chunk` e `in_review` — saem deste arquivo e passam a viver no banco, lidas e escritas por `sdd_read_state`/`sdd_write_state`. O resto do bloco continua igual, versionado. Ver `./mcp-guide.md`.

## Layout de arquivos

```
.sdd/
  memory.md                     # preferências persistentes (Estilo/Processo, Stack/Domínio)
                                # OU memory-map.md + memory/<tema>.md quando dividido
  context/                      # base de conhecimento do projeto (context: true) — ver context-guide.md
    index.md                    # índice mestre (aponta p/ todo arquivo de contexto)
    <area>.md                   # como cada funcionalidade funciona + decisões
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

> **Contexto** (`.sdd/context/`, se `context: true`/ausente): base de conhecimento por funcionalidade, no nível do projeto. Todo fluxo lê o `index.md` no início; features/bug-fix/review concluídos gravam/atualizam o contexto da área. Ver `./context-guide.md`. Não confundir com memória (preferências) nem com specs (detalhe de uma mudança).

> **Não existe `tasks.md` global.** Cada feature tem seu próprio `specs/<slug>/tasks.md`.

> **Formato das docs segue `format` do config.** `plan`, `spec` e `tasks`: com `format: both` ou `html`, gere sempre o par `.md` + `.html` (o `.html` espelha o `.md`, usando `.sdd/assets/styles.css`). Nunca gere só `.md` quando o config pede html.

## Transições

| Estado | Gatilho | Ação | Próximo |
|---|---|---|---|
| (sem mudança ativa) | `lp:continue` | Imprime: "Nenhuma mudança ativa. Comece com `/lp-new-feature <id>`." Para. | — |
| `awaiting-plan` | fim de `lp:new-feature` | Gera `plan.md` com contexto + decisões macro + **lista de features** (apenas slug/título/1-frase). Define ordem. | `awaiting-feature-spec` |
| `awaiting-feature-spec` | `lp:continue` | 1) Pega a próxima feature `pending` na ordem da lista. Marca `speccing` e `current_feature`. 2) **Grill profundo SÓ dela** (cenários BDD, edge cases, dependências — **não** pergunte contratos). Em batches de até 4 perguntas independentes. 3) Gera `specs/<slug>/spec.md`. 4) Imprime plano de revisão da spec. | `awaiting-feature-tasks` |
| `awaiting-feature-tasks` | `lp:continue` (após usuário revisar spec) | 1) Grill curto se necessário. 2) Gera `specs/<slug>/tasks.md` (só `.md` por padrão — ver `tasks_format`) respeitando `chunk_size`. 3) Marca feature `tasking` → `implementing`. 4) **Auto-continua por padrão** (`tasks_autocontinue: on`): segue direto pro 1º chunk na mesma invocação, sem pausar; com `off`, imprime o plano de revisão das tasks e para. | `implementing` |
| `implementing` | `lp:continue` | 1) Auto-sync. 2) Definir modo (paralelo se `parallel: on` ou usuário pediu; senão sequencial). 3a) **Sequencial**: próximo chunk `[ ]`, explicação breve do chunk (o quê/por quê/conecta com macro/anteriores/próximos — timing conforme `implementer`), implementar por subagente (default) ou main. 3b) **Paralelo** (`../parallel-guide.md`): uma onda de chunks independentes, um subagente cada (sem a explicação breve — comunicação é por onda). 4) Marcar `[~]`. 4-bis) Se a feature fechou e `tests: on`, gerar testes via subagente tester (f-bis). 5) Plano de revisão (combinado no paralelo) + commit/sugestão de commit conforme `auto_commit`. 6) Com `mcp: on`, registrar o chunk e os arquivos no banco (g-bis). | `implementing` (se há mais chunks/ondas) · `awaiting-feature-spec` (se feature done e há próxima) · `awaiting-archive` (se foi a última) |
| `awaiting-archive` | `lp:archive` | Verifica + arquiva. | `archived` |

> Com `tasks_storage: mcp`, a geração do `tasks.md` na transição `awaiting-feature-tasks` é substituída por uma chamada `sdd_write_tasks`, e toda leitura de chunk passa a ser `sdd_read_tasks` — ver `./mcp-guide.md`. O padrão (`file`) mantém o arquivo.

> Com `state_storage: mcp`, os campos `state`, `current_feature`, `current_chunk`, `in_review`, `updated` e o `status` das features **não existem no `.sdd.yaml`**: onde a tabela diz para escrevê-los, chame `sdd_write_state`; onde diz para lê-los, chame `sdd_read_state`. O resto do arquivo (identidade e lista de features) continua igual — ver `./mcp-guide.md`.

> Com `mcp: on`, **toda** transição desta tabela também chama `sdd_sync_change` com o `state` novo, na mesma resposta. Ver o mapa passo → tool em `./mcp-guide.md`.

## Transição "feature concluída"

Quando todos os chunks de `current_feature` estão `[~]` ou `[x]`:
1. Marca a feature como `done` no `.sdd.yaml`.
1-bis. Se `tests: on`, roda o passo **f-bis**: subagente tester gera os testes da feature inteira, roda e reporta (ver `./tester-guide.md`). Com `tests: off`/ausente, pula em silêncio.
2. Limpa `current_feature` e `current_chunk`.
2-bis. Com `mcp: on`, chama `sdd_sync_change` (feature `done` + novo `state`) e, se o f-bis rodou, `sdd_record_tests`. Com `state_storage: mcp`, os passos 1 e 2 acontecem numa única chamada `sdd_write_state` (feature `done`, `current_feature: null`, `current_chunk: null`) em vez de escrita no arquivo. Com `off`/ausente, pula em silêncio.
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

## Ao gerar um artefato, diga no chat o que ele traz de novo

Vale para `plan.md`, `spec.md`, `tasks.md`, `diagnosis.md` e `solutions.md` — todo arquivo
que você escreve depois de uma conversa com o usuário.

Boa parte do que entra nesses arquivos já foi combinada no grill. Mas parte **não**: é o que
você preencheu sozinho — um default assumido, uma decisão de granularidade, um caso de borda
que você notou, uma ordem que você escolheu. Essa parte só existe dentro do arquivo, e é
justamente a que o usuário precisa aprovar.

Então, ao anunciar o artefato, imprima o **delta**: o que está no arquivo e ainda **não** foi
dito, perguntado ou respondido nesta conversa.

```
No arquivo, e que ainda não conversamos:
- <decisão que você tomou sozinho> — <por quê>
- <default assumido> — <o valor, e o que muda se estiver errado>
- <caso de borda que você acrescentou>
```

Regras:

- **É delta, não resumo.** O que já foi combinado no grill fica de fora — repetir o que o
  usuário acabou de dizer é ruído, e afoga o que importa.
- **Cada linha diz a decisão E o porquê.** *"Assumi paginação por offset"* não dá o que
  discordar; *"assumi paginação por offset, porque a ordenação é por status e o total precisa
  ser exato na tela"* dá.
- **Nada a declarar é uma resposta válida.** Se o grill cobriu tudo e você não decidiu nada
  por conta, diga isso em uma linha e siga. Não invente item para preencher o bloco.
- **Não substitui a leitura do arquivo** — encurta. O usuário continua podendo abrir; o bloco
  existe para ele não *precisar* abrir só para descobrir o que mudou desde a conversa.
- **Teto de ~5 itens.** Se passou disso, você decidiu demais sozinho: o grill parou cedo, e o
  caminho é perguntar em vez de listar.

## Plano de revisão (após cada chunk)

**UMA lista só**: todos os arquivos tocados, já na ordem de revisão (não duas listas separadas). A lista é completa — serve de manifesto pra revert também. Arquivos de baixo valor de revisão (tipos gerados, config trivial, stubs) vão para o FIM, marcados "pode pular".

Cada arquivo que vale revisão leva **3 linhas, na ordem `Faz` → `Conecta` → `Revisar`** — pra o revisor entender o papel do arquivo e como ele se encaixa no fluxo sem ter que abrir o código pra descobrir. O `Revisar` **fecha** o bloco: é a ação que o revisor vai executar, então vem depois do contexto que a torna compreensível. Triviais ficam em uma linha.

**Profundidade**: **1-2 frases por linha (~15-35 palavras)**. Uma linha que só repete o nome do que foi criado (*"campo `x`"*, *"mapeia A → B"*) está rasa — falta o *como* ou o *porquê*. Mais de 2 frases já é spec, não plano de revisão.

**Espaçamento (legibilidade)**: cada arquivo é um **bloco separado por uma linha em branco** — não uma lista numerada colada. O caminho vai num cabeçalho em **negrito** e `Faz`/`Conecta`/`Revisar` viram **bullets** (quebram em linhas separadas de forma confiável no terminal). Uma linha em branco entre um arquivo e o próximo.

Formato obrigatório:

```
## Chunk F<n>.C<m> — <título> (em revisão)

Feature: <slug> (<i>/<total>)
Estado da feature: <X de Y chunks concluídos>

Revisão (na ordem — comece pelo topo):

**1. caminho/arquivo1.ts** (criado, +N)
- Faz: <o que este arquivo passou a fazer, e como — 1-2 frases>.
- Conecta: <quem chama/usa, pra onde aponta, qual peça do fluxo>.
- Revisar: <no que prestar atenção / o que validar aqui>.

**2. caminho/arquivo2.ts** (editado, +N -M)
- Faz: <...>.
- Conecta: <...>.
- Revisar: <...>.

**3. caminho/tipos.d.ts** (criado) — tipos gerados, pode pular.

Validação:
- eslint --fix: ok
- test: N passing

Próximo: /lp-continue (chunk F<n>.C<m+1>) ou — se foi o último da feature — inicia a próxima feature.
Reverter: peça "reverte o chunk F<n>.C<m>".
```

Se `auto_commit` ≠ `off`, acrescente **como último bloco da mensagem** o de commit (comando pronto em `suggest-only`, aviso de commit automático em `full`) — ver `./git-guide.md`. Ele fecha a resposta, sempre.

Regras da lista:
- **Um bloco por arquivo, separado por linha em branco.** Cabeçalho em negrito com número+caminho; `Faz` → `Conecta` → `Revisar` como bullets, **sempre nessa ordem**. Nada de blocos colados.
- **Inclua todos os arquivos mexidos** — não omita nenhum (o usuário precisa saber o que mudou pra reverter).
- **Ordene por prioridade de revisão**: comece pelo núcleo da lógica; termine nos triviais.
- **Faz / Conecta / Revisar**: 1-2 frases concretas cada (~15-35 palavras). `Faz` diz a responsabilidade **e o essencial de como** (não repita o nome do arquivo/campo como explicação); `Conecta` cita nomes reais de arquivos/funções/portas e a direção da chamada; `Revisar` aponta o ponto de atenção real e por que é discutível (não "revise o código").
- Triviais (tipos gerados, config, stub) colapsam para uma linha só (cabeçalho em negrito + "pode pular"), ainda separados por linha em branco.
- Sem segunda lista. Sem repetir arquivos.

## Perguntas/alterações durante a revisão de um chunk

Enquanto um chunk está em revisão (impresso, `[~]`, não aprovado), se o usuário perguntar algo ou pedir ajuste no chunk **sem** rodar `/lp-continue`: atenda, e **re-imprima a lista de revisão atualizada no fim da resposta** para ele continuar de onde parou. Se alterou arquivos, re-rode a validação e reflita novos arquivos/±linhas na lista. Não avance de chunk sem `/lp-continue` explícito.

Com `auto_commit` ≠ `off`, o **bloco de commit vai junto**, depois da lista, fechando a resposta — **mesmo quando os comandos não mudaram**. Reimprimir dois comandos idênticos é barato; deixar o usuário caçar a mensagem antiga no scrollback, não. Ver `./git-guide.md`.
