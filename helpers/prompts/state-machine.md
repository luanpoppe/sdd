# Máquina de estados do SDD (`lp:*`)

> Fluxo: **sequencial por feature**. Nunca gere todas as specs/tasks de uma vez. Cada feature passa por spec → tasks → implementação → revisão antes da próxima começar.

> **Dois tipos de mudança.** Sem `kind` (ou `kind: feature`) = fluxo completo desta página (`lp:new` → `lp:continue`). Com **`kind: bugfix`** = fluxo enxuto de correção de bug (`lp:bug-fix` → `lp:continue`), documentado em `./bugfix-machine.md` — diagnóstico → opções → correção, sem `plan.md` nem specs por feature. O `kind` vive no `.sdd.yaml` da mudança.

> **Escrita de artefatos (scribe).** Com `scribe: subagent` (default; **campo ausente também conta como `subagent`**), TODAS as escritas de arquivo do SDD do passo (docs, `flow.html`, `.sdd.yaml`, marcação do `tasks.md`, `memory.md`) são delegadas a um subagente escriba numa única chamada — tudo-ou-nada, nunca parcial/inline. Veja `./scribe-guide.md`.

> **Geração de testes (`tests`).** Campo `off` (padrão; **ausente = `off`**) ou `on`. Com `on`, ao concluir uma feature (ou a correção de um bug-fix) roda o passo **f-bis**: um subagente **tester** dedicado escreve os testes da funcionalidade inteira, focando borda e falha além do caminho feliz, roda e **reporta sem corrigir** (nem o teste, nem a implementação — a decisão é do usuário). Nunca roda por chunk. Ver `./tester-guide.md`.

> **Modelo dos subagentes (`subagents`).** Campo **opcional** do `.sdd/config.yaml` (ausente por padrão = tudo como hoje). Quando presente, define em qual modelo/thinking cada papel de subagente roda, por harness: `subagents.<implementer|scribe|explorer>.<claude-code|cursor|codex>: {model, effort}`. Ao lançar um subagente, use a entrada do seu papel + seu harness; se não houver entrada, lance normal **em silêncio**; se houver mas o modelo falhar, relance no default e avise em 1 linha. Ver `./subagents-guide.md`.

> **Como citar chunks, features e qualquer coisa numerada em texto explicativo.** Toda etiqueta do SDD — chunk (`C6`, `F2.C3`), feature/frente (`F3`, slug), onda, opção de solução (`Opção 2`) — é **referência, não descrição**. Ninguém lembra de cabeça o que era `C6` nem qual era a "frente F3". Em toda prosa dirigida ao usuário (explicação do chunk, `Vem de`/`Prepara`, "Conecta com o macro", transições, resumo de onda, resposta a pergunta, plano de revisão, handoff), **nunca use a etiqueta sozinha como se ela explicasse algo**. Sempre acompanhe do que aquilo é/faz:
>
> - Chunk: *"o chunk que renormalizou o prompt (`C7`)"* — não *"o `C7`"*.
> - Feature/frente: *"a frente de transparência do diagnóstico (`F3`)"* — não *"frente F3"*. Puxe o título/`summary` da feature no `plan.md`/`.sdd.yaml`.
> - Opção de solução: *"a opção que recalcula no mapper (Opção 2)"* — não *"a Opção 2"*.
>
> Se a frase continua clara sem a etiqueta, prefira só a descrição; a etiqueta entra entre parênteses quando o usuário pode querer referenciá-la (revert, achar no `tasks.md`/`plan.md`). **Exceções** (etiqueta crua é o certo): cabeçalhos no formato `<ID> — <título>` (o título já vem ao lado), campos do `.sdd.yaml`/`tasks.md`, `data-*` do `flow.html`, e comandos que o usuário vai copiar ("reverte o chunk `F2.C3`").

> **Git (branch + auto-commit).** `lp:new`/`lp:bug-fix` sugerem criar uma branch dedicada no início. No motor `implementing`, `auto_commit` (default `suggest-only`, ausente também conta) decide o que acontece a cada chunk: `suggest-only` mostra o comando de commit pronto pra copiar no plano de revisão; `full` commita de verdade quando o chunk é aprovado (exceto em branch protegida: main/master/develop/dev/staging/stg/prod/prd/production/homolog/hml/qa); `off` não menciona git. Ver `./git-guide.md`.

> **Ordem de construção (`chunk_order`).** Default `inside-out` (ausente também conta como `inside-out`): entre features/chunks independentes (sem dependência real forçando ordem), prioriza construir de dentro pra fora — domínio/persistência/lógica interna antes de controller/consumer/endpoint — porque é a ordem que deixa cada chunk compilando e validando sozinho, sem precisar de stub. `outside-in` inverte esse desempate (útil se o usuário quer ver o esqueleto do fluxo primeiro, aceitando stubs temporários). `free` = só dependência real importa, sem preferência de direção. **Dependência real declarada em `Depende de:` sempre vence a heurística** — `chunk_order` só desempata quando a spec permite mais de uma ordem válida. Usado em `lp:new` (ordem das features) e `lp:continue` (ordem dos chunks ao gerar `tasks.md`).

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
| (sem mudança ativa) | `lp:continue` | Imprime: "Nenhuma mudança ativa. Comece com `/lp-new <id>`." Para. | — |
| `awaiting-plan` | fim de `lp:new` | Gera `plan.md` com contexto + decisões macro + **lista de features** (apenas slug/título/1-frase). Define ordem. | `awaiting-feature-spec` |
| `awaiting-feature-spec` | `lp:continue` | 1) Pega a próxima feature `pending` na ordem da lista. Marca `speccing` e `current_feature`. 2) **Grill profundo SÓ dela** (cenários BDD, edge cases, contratos). Em batches de até 4 perguntas independentes. 3) Gera `specs/<slug>/spec.md`. 4) Imprime plano de revisão da spec. | `awaiting-feature-tasks` |
| `awaiting-feature-tasks` | `lp:continue` (após usuário revisar spec) | 1) Grill curto se necessário. 2) Gera `specs/<slug>/tasks.md` (só `.md` por padrão — ver `tasks_format`) respeitando `chunk_size`. 3) Marca feature `tasking` → `implementing`. 4) **Auto-continua por padrão** (`tasks_autocontinue: on`): segue direto pro 1º chunk na mesma invocação, sem pausar; com `off`, imprime o plano de revisão das tasks e para. | `implementing` |
| `implementing` | `lp:continue` | 1) Auto-sync. 2) Definir modo (paralelo se `parallel: on` ou usuário pediu; senão sequencial). 3a) **Sequencial**: próximo chunk `[ ]`, explicação breve do chunk (o quê/por quê/conecta com macro/anteriores/próximos — timing conforme `implementer`), implementar por subagente (default) ou main. 3b) **Paralelo** (`../parallel-guide.md`): uma onda de chunks independentes, um subagente cada (sem a explicação breve — comunicação é por onda). 4) Marcar `[~]`. 4-bis) Se a feature fechou e `tests: on`, gerar testes via subagente tester (f-bis). 5) Plano de revisão (combinado no paralelo) + commit/sugestão de commit conforme `auto_commit`. | `implementing` (se há mais chunks/ondas) · `awaiting-feature-spec` (se feature done e há próxima) · `awaiting-archive` (se foi a última) |
| `awaiting-archive` | `lp:archive` | Verifica + arquiva. | `archived` |

## Transição "feature concluída"

Quando todos os chunks de `current_feature` estão `[~]` ou `[x]`:
1. Marca a feature como `done` no `.sdd.yaml`.
1-bis. Se `tests: on`, roda o passo **f-bis**: subagente tester gera os testes da feature inteira, roda e reporta (ver `./tester-guide.md`). Com `tests: off`/ausente, pula em silêncio.
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

Se `auto_commit` ≠ `off`, acrescente ao final o bloco de commit (comando pronto em `suggest-only`, aviso de commit automático em `full`) — ver `./git-guide.md`.

Regras da lista:
- **Um bloco por arquivo, separado por linha em branco.** Cabeçalho em negrito com número+caminho; `Faz` → `Conecta` → `Revisar` como bullets, **sempre nessa ordem**. Nada de blocos colados.
- **Inclua todos os arquivos mexidos** — não omita nenhum (o usuário precisa saber o que mudou pra reverter).
- **Ordene por prioridade de revisão**: comece pelo núcleo da lógica; termine nos triviais.
- **Faz / Conecta / Revisar**: 1-2 frases concretas cada (~15-35 palavras). `Faz` diz a responsabilidade **e o essencial de como** (não repita o nome do arquivo/campo como explicação); `Conecta` cita nomes reais de arquivos/funções/portas e a direção da chamada; `Revisar` aponta o ponto de atenção real e por que é discutível (não "revise o código").
- Triviais (tipos gerados, config, stub) colapsam para uma linha só (cabeçalho em negrito + "pode pular"), ainda separados por linha em branco.
- Sem segunda lista. Sem repetir arquivos.

## Perguntas/alterações durante a revisão de um chunk

Enquanto um chunk está em revisão (impresso, `[~]`, não aprovado), se o usuário perguntar algo ou pedir ajuste no chunk **sem** rodar `/lp-continue`: atenda, e **re-imprima a lista de revisão atualizada no fim da resposta** para ele continuar de onde parou. Se alterou arquivos, re-rode a validação e reflita novos arquivos/±linhas na lista. Não avance de chunk sem `/lp-continue` explícito.
