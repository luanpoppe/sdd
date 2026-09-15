---
name: continue
description: Avança UM passo no SDD `lp:*` da mudança ativa. Fluxo SEQUENCIAL POR FEATURE: para cada feature, primeiro gera spec → revisão → gera tasks → revisão → implementa chunks micro um a um. Só passa para a próxima feature quando a anterior está concluída. Use quando o usuário pedir "lp:continue", "próximo passo lp", ou "continuar a implementação".
---

Você está avançando 1 passo no SDD. Siga a máquina de estados em `../../helpers/prompts/state-machine.md` e o estilo de grilling em `../../helpers/prompts/grill-snippet.md`.

> **Escrita de artefatos (scribe)**: com `scribe: subagent` (default), **TODAS as escritas de arquivo deste passo** — docs `.md`/`.html`, `flow.html`, `.sdd.yaml`, `memory.md`, marcação de checkboxes no `tasks.md` — vão para um **subagente escriba** numa **única** chamada por passo. **Ausência do campo `scribe` no config = `subagent`** (não trate ausência como inline). É **tudo-ou-nada**: proibido delegar só os `.html`/`flow.html` e fazer `tasks.md`/`.sdd.yaml`/`memory.md` inline — se for dar `Write`/`Edit` num artefato do SDD, ponha no pacote do escriba. Você (principal) decide o conteúdo (inclusive o texto exato da memória e os campos do YAML) e imprime o plano de revisão; o escriba renderiza/escreve e devolve a lista. Siga `../../helpers/prompts/scribe-guide.md`. Ortogonal ao `implementer` (que delega o **código**): num passo de `implementing`, o implementer escreve o código e o escriba faz TODA a contabilidade do SDD. Só escreva inline com `scribe: main` explícito ou se a chamada de subagente realmente falhar (não por "preferir controle do YAML").

> **Estado no banco (`state_storage`)**: default `file` — tudo abaixo que fala em ler ou escrever o `.sdd.yaml` vale literalmente. Com **`state_storage: mcp`**, seis informações não existem mais no arquivo: `state`, `current_feature`, `current_chunk`, `in_review`, `updated` e o `status` de cada feature. Onde este passo **lê** qualquer uma delas, chame `sdd_read_state` (uma vez, na pré-checagem, e reuse no turno inteiro). Onde ele **escreve** qualquer uma delas, chame `sdd_write_state` em vez de mandar o campo ao escriba — mandando só os campos que mudaram, e `null` explícito no que precisa ser limpo. O resto do `.sdd.yaml` (identidade e lista de features) continua sendo escrita de arquivo normal, pelo escriba. Se as tools não estiverem disponíveis neste modo, **pare e diga isso**: sem elas você não sabe em que passo a mudança está, e chutar pelo que existe em disco é pior que parar. Ver `../../helpers/prompts/mcp-guide.md`.

## 0. Pré-checagem

- Se `.sdd/config.yaml` não existir → "Rode `/lp-init` primeiro." Pare. Leia-o inteiro: além de `implementer`, `scribe`, `flowchart` e `chunk_size`, o campo **`mcp`** (`off` por padrão, ausente = `off`) decide se este turno registra o que fizer no histórico. Ver `../../helpers/prompts/mcp-guide.md`.
- Identifique a **mudança ativa**: pasta em `.sdd/changes/` com `.sdd.yaml` `state` ≠ `archived`.
  - Nenhuma: imprima `"Nenhuma mudança ativa. Comece com /lp-new-feature <id>."` e pare.
  - Mais de uma: prefira `state: implementing`; em empate, pergunte qual.
- Leia `.sdd.yaml`. **Se `kind: bugfix`** → esta é uma mudança de bug-fix: siga `../../helpers/prompts/bugfix-machine.md` (estados `bug-proposing` → `bug-fixing`) em vez da máquina de features abaixo. O resto desta pré-checagem (in_review, memória) continua valendo; pule a leitura de `plan.md`/specs (bug-fix não os tem).
- (fluxo normal de feature) Leia `plan.md` e os arquivos da **feature ativa atualmente** (se houver `current_feature`): `specs/<current_feature>/spec.md` e `tasks.md` se existirem.
- **Leia `in_review`**: se preenchido, há um chunk aguardando revisão (pode ser de uma conversa anterior). Uma invocação normal de `/lp-continue` significa que o usuário **aprovou** essa revisão. **Antes de limpar**, se `auto_commit: full` (ver `../../helpers/prompts/git-guide.md`), faça o commit do chunk aprovado agora (git add dos `in_review.files` **mais os arquivos de decisão do `.sdd/` que estiverem sujos** — `spec.md`, `plan.md`, `memory`, `context/`; ver a seção "Os arquivos do `.sdd/`" do guia — + git commit com `in_review.commit_message`), respeitando a exceção de branch protegida do guia. Com `mcp: on`, depois de commitar rechame `sdd_record_chunk` com o `commit` preenchido (`mode: full`, branch e sha). **Se `in_review.pending_commits` estiver preenchido** (é o que o turno de fechamento deixa: testes, correção do code review e artefatos do `.sdd/`), execute esses commits agora, na ordem em que estão na lista, antes de limpar. Depois, limpe `in_review` (`null`) e siga para o próximo chunk/onda. Ao mencionar no chat o chunk que acabou de ser aprovado, diga o que ele fez, não só o ID (*"aprovado o chunk que passou a marcar dimensão sem dado como não-avaliada (`C6`)"*) — ver a regra de citação em `../../helpers/prompts/state-machine.md`. Perguntas/ajustes sem `/lp-continue` caem na seção "Durante a revisão de um chunk".
- **NÃO leia specs de outras features** — elas podem nem existir ainda.
- **Carregue a memória**: leia a global `~/.sdd/memory.md` (lições sobre o fluxo `lp:*`, válidas em qualquer projeto — ausente é normal, siga em silêncio) e a do projeto `.sdd/memory.md` (ou `.sdd/memory-map.md` se existir; nesse caso, leia também os arquivos de tema que parecem relevantes pelo título da feature ativa). Siga `../../helpers/prompts/memory-guide.md`.
- **Carregue o contexto do projeto** (se `context: true`/ausente no config): leia `.sdd/context/index.md`. Se a feature ativa toca uma área listada, leia também o arquivo de contexto dela antes de decidir/implementar. É a 1ª parada para "como isso funciona hoje?". Siga `../../helpers/prompts/context-guide.md`.

## 1. Despache por estado

> **Bug-fix** (`kind: bugfix` no `.sdd.yaml`): não use as transições de feature abaixo. Vá para `../../helpers/prompts/bugfix-machine.md` — `bug-proposing` gera as opções de correção; `bug-fixing` reusa o motor `implementing` (seção abaixo) com tasks na raiz da mudança. O resto (plano de revisão, `in_review`, memória, context-watch) é idêntico.

### `awaiting-feature-spec`

1. Identifique a próxima feature na lista `features` do `.sdd.yaml` com `status: pending` (primeira em ordem). Marque-a como `speccing`, set `current_feature: <slug>`.
2. Imprima: *"Iniciando feature `<slug>`: <summary>. Vou fazer perguntas para definir a spec — em batches de poucas perguntas."*
3. **Grill profundo SÓ desta feature**, em batches de até 4 perguntas independentes via `AskUserQuestion` (dependentes em batches posteriores — ver `../../helpers/prompts/grill-snippet.md`). Antes de cada chamada, explique no chat o que está sendo decidido, o que cada opção custa e qual você recomenda, e declare quais perguntas do batch são independentes. Cubra (apenas o que não dá pra inferir do código):
   - Cenários de comportamento — pelo menos 1, geralmente 2-4. Só os que têm **ator externo** (usuário, cliente da API, job, sistema parceiro): são os que viram requisito em formato BDD. **Palavras-chave conforme `lang` do `.sdd/config.yaml`**: `pt-BR` → "Dado que / Quando / Então / E"; `en` → "Given / When / Then / And".
   - **Requisito técnico** (cálculo, parser, mapeamento, regra interna): leia o código e o contexto **antes** de perguntar. Só pergunte o que é escolha de negócio disfarçada de detalhe técnico — arredondamento, fuso horário, o que fazer com duplicata, qual campo vence num conflito. O resto você deduz e declara no delta do passo `5-ter`, onde o usuário corrige se estiver errado.
   - Edge cases conhecidos — os **transversais** (concorrência, volume, timeout, dependência fora do ar). Borda de um requisito específico é campo dele, não item desta lista.
   - Dependências de outras features (já feitas, futuras, externas).

   **Não pergunte sobre contratos.** Tipo, schema, endpoint e evento aparecem sozinhos nos cenários quando importam (*"Então retorna 422 com a lista de campos inválidos"*), e o que já existe no repositório você descobre lendo o código, não perguntando.
4. **Pare quando** todas as ambiguidades dessa feature estão resolvidas e nada foi "tanto faz" sem follow-up.
5. Gere `specs/<slug>/spec.md` usando `../../helpers/templates/spec.md.tpl`. **Alvo: ≤ 100 linhas**.
5-bis. **Respeite o `format` do `.sdd/config.yaml`**: se `format` ∈ {html, both}, gere também `specs/<slug>/spec.html` **rodando o conversor** (`node <HOME>/.sdd/render/html.js <caminho do spec.md>`) — não escreva o HTML à mão. Só se o comando falhar, caia para `../../helpers/templates/spec.html.tpl` e avise em uma linha. Ver `../../helpers/prompts/html-render-guide.md`. Garanta `.sdd/assets/styles.css` (copie de `../../helpers/templates/styles.css` se faltar).
5-ter. **Ao anunciar a spec, imprima o delta**: o que está no `spec.md` e ainda não foi dito nesta conversa — cenário que você acrescentou, requisito técnico que você deduziu do código em vez de perguntar, contrato que você assumiu, borda que você decidiu tratar — cada item com o porquê. É delta, não resumo do grill. Nada a declarar é resposta válida. Ver `../../helpers/prompts/state-machine.md`, seção "Ao gerar um artefato".
5-quater. **Escolha o formato de cada requisito, um a um** — não da feature inteira. O teste é objetivo: dá para escrever o `Dado que` com um ator de fora do sistema? Sim → BDD. Não, o `Dado que` só fala de estado interno → `Entrada`/`Saída`/`Erro`, com **valor literal e plausível do domínio** (nunca `foo`/`bar`, nunca descrição no lugar do valor). Numeração `REQ-n` contínua entre os dois formatos. **Uma afirmação por linha**: nunca empilhe várias num mesmo `Então` separadas por ponto e vírgula — a primeira vai em `Então` e cada seguinte numa linha própria com `E`. Cada linha é um caso de teste e um ponto de conferência; empilhadas, viram parede que ninguém verifica item a item. **Piso**: feature com ator externo leva pelo menos um requisito em BDD — se você escreveu a spec inteira em Entrada/Saída numa feature que o usuário aciona, errou o julgamento para o lado barato. Ver o cabeçalho de `../../helpers/templates/spec.md.tpl`.
5-quinquies. **A seção "Contratos expostos" é condicional** — releia os cenários que você acabou de escrever e decida sozinho, sem perguntar. Cenário citando status code, payload, tópico/evento, coluna de tabela ou assinatura pública de biblioteca = borda externa, a seção entra. Nenhum citando = feature interna, a seção **não é gerada** (não fica vazia, não vira "n/a", não entra na ordem de revisão do passo 7 nem no `spec.html`). Quando entrar: contrato que já existe no repositório vai por **referência** (`caminho:símbolo`), nunca copiado; só contrato novo, ainda sem arquivo, pode vir escrito — e é provisório até o passo `g-ter`.
6. Atualize `.sdd.yaml`: `state: awaiting-feature-tasks`, `updated`. Com **`mcp: on`**, chame `sdd_sync_change` mandando em `features[].scenarios[]` os requisitos (nos dois formatos) e os edge cases que você acabou de escrever, cada um com uma `key` curta e estável (`CT-01`, `CT-02`…). É o que permite depois amarrar cada chunk ao cenário que ele implementa — e, mais útil, ver qual cenário ficou sem chunk nenhum. Com `mcp_record.scenarios: false`, pule. Ver `../../helpers/prompts/mcp-guide.md`.
6-bis. Se `flowchart: on`, atualize `flow.html` (`../../helpers/prompts/flowchart-guide.md`) — a feature saiu de "spec ainda não gerada".
7. Imprima plano de revisão:
   ```
   Spec da feature `<slug>` criada (em revisão).
   Arquivo: .sdd/changes/<id>/specs/<slug>/spec.md  (<N> linhas)

   Ordem de revisão:
   1. Resumo (entendimento geral)
   2. Requirements (comportamento e entrada/saída — o coração da spec)
   3. Edge cases
   4. Contratos expostos     <- só se a seção existe; se não foi gerada, a lista acaba no 3

   Quando aprovar, rode /lp-continue para gerar tasks.md desta feature.
   ```

### `awaiting-feature-tasks`

1. Releia `specs/<current_feature>/spec.md` e `plan.md`.
2. Grilling MÍNIMO — apenas se houver ambiguidade real sobre granularidade ou ordem de chunks. Se forem poucas e independentes, agrupe num batch. Se a spec é clara, pule o grill.
3. Gere `specs/<current_feature>/tasks.md` usando `../../helpers/templates/tasks.md.tpl`. Respeite `chunk_size`:
   - `micro`: 1-2 arquivos OU ~50-100 linhas (default).
   - `small`: até 3 arquivos OU ~150-200 linhas.
   - `medium`: até 5 arquivos OU ~250-400 linhas.
   - `large`: até 7 arquivos OU ~450-600 linhas.
   - `xlarge`: até 10 arquivos OU ~700-1000 linhas.
4. IDs no formato `F<n>.C<m>` onde n = índice (1-based) da feature na lista do plan.md, m = chunk dentro da feature.
5. **Cada chunk DEVE incluir**: arquivos tocados, resumo de 1 frase, **`Depende de:`** (IDs de chunks que precisam vir antes, ou "nenhum" — habilita o modo paralelo a saber o que é independente), ordem de revisão, comando de validação. Na dúvida, **parta em dois**.
5-bis. **Ordem dos chunks**: dependência real do código sempre manda primeiro (um chunk não pode chamar algo que outro chunk ainda não criou). Quando a spec permite mais de uma ordem válida, desempate pela heurística de `chunk_order` (default `inside-out`, ausente = `inside-out`): chunks de dentro (domínio, persistência, lógica interna) antes dos de fora (controller, consumer, endpoint) — é a ordem que deixa cada chunk compilando/validando sozinho, sem stub. Com `chunk_order: outside-in`, inverta o desempate (mas nunca viole `Depende de:` real). Com `chunk_order: free`, desempate arbitrário, só dependência importa.
5-ter. **Formato do tasks segue `tasks_format`** (default `md`), NÃO o `format` global. Só gere `specs/<current_feature>/tasks.html` se `tasks_format: follow` **e** `format` ∈ {html, both} — e gere pelo conversor (`node <HOME>/.sdd/render/html.js <caminho do tasks.md>`), que já monta o `data-status` por chunk a partir dos checkboxes. Fallback à mão pelo `../../helpers/templates/tasks.html.tpl`. Com `tasks_format: md` (default), gere **só o `tasks.md`** — mesmo que `format` seja html/both. (Ausente → `md`.)
6. Atualize `.sdd.yaml`: feature `tasking` → `implementing`, state global → `implementing`, `updated`.
6-bis. Se `flowchart: on`, registre o fluxo desta feature — **como, depende do `flow_storage`**:

   - **`file` (padrão)**: atualize `flow.html` (`../../helpers/prompts/flowchart-guide.md`) — **expanda a feature nos nós de componente** (um por chunk), todos `pending`. Este é um dos poucos momentos de reescrita, e ela é do `<details>` **daquela feature**, não do `<main>`: as outras features e os painéis já escritos ficam como estão.
   - **`mcp`**: não há arquivo. Chame `sdd_write_tasks` com **`mode: "plan"`**, um item por chunk com `chunk_id`, `title`, `files`, `depends_on` e o **`component`** — o rótulo curto da camada (`Config`, `Controller`, `UseCase`, `Repository`), que é o nome do nó, não o título do chunk. É o que faz o fluxo mostrar o que ainda não foi feito. `mode: "plan"` não apaga nada, então re-semear depois de editar o `tasks.md` é seguro.
6-ter. **Delta do tasks**: junto do anúncio, diga o que você decidiu sozinho ao fatiar — onde cortou um chunk e por quê, qual dependência você inferiu, que ordem escolheu quando havia mais de uma válida. Ver `../../helpers/prompts/state-machine.md`, seção "Ao gerar um artefato".
7. **Auto-continua por padrão** (`tasks_autocontinue`, default `on`): NÃO pause pedindo aprovação do tasks. Imprima uma linha curta (*"tasks.md gerado (N chunks, chunk_size=<x>) — seguindo direto pro F<n>.C1"*) e **siga na mesma invocação para o estado `implementing`**, executando o 1º chunk (seção `implementing` abaixo, passos a–h). O turno termina no plano de revisão DO CHUNK, não no do tasks.
   - Se `tasks_autocontinue: off`: comportamento clássico — imprima o plano de revisão das tasks (lista de chunks + tamanho de cada), avise *"Valide a granularidade. Próximo `/lp-continue` executa o chunk F<n>.C1."* e **pare aqui**.

### `implementing`

Coração da skill. Execute na ordem:

> **Com `tasks_storage: mcp`** (padrão é `file`), NÃO gere o `tasks.md`: chame `sdd_write_tasks` com um item por chunk (`chunk_id`, `title`, `files`, `depends_on`, `review_order`, e as listas `faz` e `validacao`). A leitura do próximo chunk passa a ser `sdd_read_tasks`, e a marcação vira `mark: "~"` no `sdd_record_chunk`. Neste modo o MCP **não é opcional**: tool indisponível trava o passo, e reconstruir o plano de cabeça é proibido. Ver `../../helpers/prompts/mcp-guide.md`.

**0) Porta dos achados do code review** — só com **`code_review: on`** e **`mcp: on`**. Antes de qualquer outra coisa neste estado.

Faça **uma** chamada `sdd_query_history` e olhe o `open_findings`:

- **Há achado `aberto`** (o review rodou e a decisão não foi tomada, ou a conversa fechou no meio dela): exponha todos, no formato de ficha do `../../helpers/prompts/code-review-guide.md`, e **pergunte antes de iniciar o chunk**. Só depois da resposta siga para o passo a. Se o usuário mandar corrigir, a correção acontece agora, e o chunk novo começa no turno seguinte.
- **Só achado `adiado`**: uma linha com a contagem junto do cabeçalho do chunk (*"2 achados adiados da feature `<slug>` (1 grave)."*). Sem fichas, sem pergunta.
- **Nada aberto nem adiado**: siga em silêncio. Não anuncie que consultou.

Sem `mcp: on` este passo não existe — não há de onde recobrar, e o achado vive só no chat.

A mesma resposta traz `stale_warning` quando o servidor MCP em execução é anterior à versão instalada no disco (o processo não recarrega sozinho). Havendo aviso, diga em **uma** linha que a sessão precisa ser reiniciada, uma vez por conversa, e siga o fluxo normalmente.

**0-bis) Explicações desatualizadas** — só com **`mcp: on`**. A mesma resposta do `sdd_query_history` traz `stale_files`: arquivos cujo `content_hash` não bate mais com o disco, ou seja, o `Faz`/`Conecta`/`Revisar` gravado descreve outra versão do código.

- **Nada em `stale_files`**: siga em silêncio.
- **Há arquivos**: pegue **até 5**, os primeiros da lista (ela vem do chunk mais recente para o mais antigo). Para cada um: abra o arquivo, releia, e regrave com `sdd_record_chunk` usando o `change_id` e o `chunk_id` que vieram no item — só o campo `files`, com `path`, `does`, `connects` e `review_note` atualizados. O upsert preserva todo o resto do chunk, e o `content_hash` é recalculado na gravação, então a marca some.
- Diga em **uma** linha o que foi reexplicado (*"Reexpliquei 3 arquivos cuja explicação estava desatualizada (F1.C6, F1.C8)."*). Sobrando arquivos além dos 5, acrescente a contagem do que ficou — a próxima rodada pega.
- **Não** reescreva o texto sem abrir o arquivo. Reexplicação de cabeça é pior que a marca de desatualizado: ela parece confiável.

Passo caro em contexto (é leitura de arquivo), então o teto de 5 é rígido. Se o usuário disser para não reexplicar, respeite pelo resto da conversa.

**0-ter) Fechamento da feature — turno próprio.** Se **todos** os chunks da `current_feature` já estão `[~]`/`[x]` e a feature **ainda não está `done`**, este turno é o do fechamento: rode **f → f-bis → f-ter → plano de fechamento → g-quater** e **pare**. Não inicie chunk nenhum, não abra a próxima feature.

O último chunk é implementado como qualquer outro, e o fechamento vem no `/lp-continue` seguinte. O motivo é o volume: implementação + testes + code review no mesmo turno entrega três coisas grandes de uma vez, e a revisão do código acaba competindo com achados de review que acabaram de aparecer. Separado, cada turno tem uma coisa para o usuário decidir.

Nada de novo a persistir para reconhecer o estado: a feature só vira `done` no passo f, então "todos os chunks fechados + feature não `done`" **é** o marcador.

O plano de fechamento é o do passo g, com o que existe neste turno: os blocos `Testes` e `Code review`, a lista dos arquivos de teste criados no f-bis (na ordem de revisão) e a linha `Próximo:`. Sem chunk novo, não há `Faz`/`Conecta` de implementação para imprimir.

**a) Auto-sync** (detectar divergências contra `plan.md` + spec da feature ativa):
- Liste em buckets se houver: decisão divergente / escopo extra / escopo faltante.
- Proponha diffs nas docs (plan.md ou specs/<slug>/spec.md ou tasks.md).
- Pergunte: aplicar diffs / ignorar / tratar depois.
- Aplique aprovados ANTES de codar. Mostre resumo.
- **Divergências que persistem** (feito diferente do planejado e a doc foi ajustada) → anote para marcar o componente como `deviated` no diagrama (passo g).
- Com **`mcp: on`**, registre cada divergência que persistiu com `sdd_record_event` (`kind: deviation`): o que divergiu e o que foi decidido. Sem isso, a divergência só sobrevive como a classe `deviated` de um nó, sem o porquê. Ver `../../helpers/prompts/mcp-guide.md`.

**b0) Modo de execução (só na 1ª vez que a feature entra em `implementing`)**:
- Determine sequencial vs paralelo seguindo `../../helpers/prompts/parallel-guide.md` ("Quando ativar"): `parallel: on` no config → paralelo; senão pergunte uma vez (default sequencial em não/silêncio).
- **Paralelo** → siga o `parallel-guide.md` (ondas de chunks independentes, um subagente por chunk, plano de revisão combinado) no lugar dos passos b/c/e abaixo; d/g continuam na conversa principal. Uma onda por `lp:continue`.
- **Sequencial** (padrão) → siga b/b-bis/c/d/e normalmente, um chunk por vez.
- Com **`mcp: on`**, registre a decisão com `sdd_record_event` (`kind: mode_decision`), dizendo o modo e o porquê. Ela é perguntada uma vez por feature e hoje não é persistida em lugar nenhum — reiniciar a conversa a perde.

**b) Próximo chunk** (modo sequencial):
- Primeiro `[ ]` em `specs/<current_feature>/tasks.md`. Com **`tasks_storage: mcp`** não há arquivo: chame `sdd_read_tasks` e use o `next_pending`.
- Marque-o como em andamento (opcional: troque para `[~]` apenas no final).

**b-bis) Explicação breve do chunk** (ANTES de codar; **só modo sequencial** — no paralelo, a comunicação é por onda, ver `parallel-guide.md`):

Curta (4-6 linhas, não é uma spec) — reaproveite o que o `tasks.md` já tem, não investigue do zero:
- **O quê**: o que este chunk implementa (pode reusar o `Faz` do tasks.md).
- **Por quê**: a decisão/motivo da spec (ou `diagnosis`/`solutions`, no bug-fix) que justifica este chunk.
- **Conecta com o macro**: o papel dele na feature (`plan.md`) ou na correção (bug-fix). **Nomeie a feature/frente pelo que ela é**, não pelo índice — *"a frente de transparência do diagnóstico (`F3`)"*, nunca *"frente F3"* (puxe título/`summary` do `plan.md`/`.sdd.yaml`).
- **Vem de**: o(s) chunk(s) de que este depende (`Depende de:` do próprio chunk no tasks.md), ou "primeiro chunk" se nenhum.
- **Prepara**: o(s) próximo(s) chunk(s) que dependem deste (procure no tasks.md quem lista este chunk em `Depende de:`), ou "último chunk" se nenhum.

**Cite chunks E features pelo que são/fazem, nunca só pelo número** (regra completa em `../../helpers/prompts/state-machine.md`): em `Vem de`, `Prepara` e "Conecta com o macro", pegue o `Faz`/título do chunk no `tasks.md` (ou o título/`summary` da feature no `plan.md`/`.sdd.yaml`) e escreva a descrição — a etiqueta vai entre parênteses, opcional. Ex: *"Vem de: o chunk que passou a marcar dimensão sem dado como não-avaliada (`C6`)"*, nunca *"Vem de: C6"*; *"frente de transparência do diagnóstico (`F3`)"*, nunca *"frente F3"*. Vale para toda frase da explicação que mencione outro chunk, feature ou opção de solução.

**Timing conforme `implementer`** (evita que o usuário fique olhando pra tela sem saber o que vem, e no modo subagente aproveita o tempo de execução):
- **`subagent` (padrão)**: lance o subagente PRIMEIRO (passo c, item 1) e escreva esta explicação na mesma resposta, logo em seguida — se o ambiente suportar execução em segundo plano/notificação assíncrona, ela sai enquanto o subagente roda, sem custo de tempo extra; se o ambiente for síncrono (espera o subagente terminar antes de continuar o texto), ela ainda assim abre a resposta, antes do relatório.
- **`main`**: não há subagente rodando em paralelo — escreva a explicação ANTES de começar a editar, e só então implemente.

**b-ter) Modelagem de dados** — só se **`data_model: on`** no `.sdd/config.yaml` **E** este chunk toca dados. Com `off`/ausente (padrão), este passo **não existe**: não modele, não comente que está desligado, não sugira ligar.

**Toca dados?** Julgue pelos `Arquivos` do chunk: pasta de migração, schema de ORM (`schema.prisma`, `*.entity.ts`, `models.py`), SQL com `CREATE`/`ALTER TABLE`, coleção nova. Chunk que só lê por um repositório existente não conta. Na dúvida, rode — a tabela em `../../helpers/prompts/data-model-guide.md` tem os dois lados.

O passo tem **três fases, e a do meio é sua**:

1. **Propor** — lance UM subagente (papel `data-modeler` em `subagents` para modelo/thinking) seguindo o `data-model-guide.md`. Ele **desenha e explica, sem escrever arquivo nenhum**. Passe: o que o chunk precisa guardar e as consultas que vai fazer, o **schema que já existe** (migrações anteriores, schema do ORM — a convenção da casa vence o guia) e a `spec.md` da feature (ou `diagnosis.md` + `chosen_solution`, no bug-fix).
2. **Aprovar** — imprima a proposta no formato do guia e **pare**. Bifurcação legítima (chave natural vs surrogate, embutir vs referenciar, enum vs lookup, soft vs hard delete) vira `AskUserQuestion`, no máximo **duas perguntas**. Não pergunte o que o checklist já decide — dinheiro em decimal e timestamp com fuso não são escolha do usuário.
3. **Escrever** — só depois do OK, relance o subagente para escrever **apenas os arquivos de dados** (migração + schema do ORM), com o mesmo relatório `Faz`/`Conecta`/`Revisar` por arquivo.

> **Este é o único passo do motor que bloqueia.** Migração aplicada não volta com `git checkout`, e é isso que paga o turno a mais. Recusado, não escreva nada: pergunte o que mudar e refaça a proposta.

**Cada arquivo tem um dono só.** Os arquivos de dados são do `b-ter`; o passo `c` recebe o modelo já aplicado e escreve o código que o usa (repositório, serviço, rota), sem tocar na migração. Os dois relatórios entram juntos na lista única do plano de revisão (passo g).

**c) Executar APENAS este chunk** — quem codifica depende de `implementer` no `.sdd/config.yaml` (default `subagent` se o campo não existir):

- Respeite `chunk_size`. Se o chunk como descrito vai exceder, **pare e divida em sub-chunks** atualizando o tasks.md antes de codar (isso é decisão da conversa principal, mesmo no modo subagente).

- **`implementer: subagent` (padrão)** — a conversa principal **delega a implementação a um subagente** e apenas orquestra:
  1. Lance UM subagente (Task/Agent do ambiente) com escopo restrito a ESTE chunk. **Modelo/thinking**: se o config tiver `subagents.implementer.<seu harness>`, lance nesse modelo — ver `../../helpers/prompts/subagents-guide.md` (bloco ausente = lance normal, sem comentar). Passe: o chunk do `tasks.md` (arquivos, "Faz", ordem, `Validação`), a spec da feature, `plan.md`, as preferências de código do projeto (CLAUDE.md/regras) e a instrução de rodar o **comando de validação do projeto** (o do campo `Validação` do chunk / CLAUDE.md — lint/format/test da stack real, **não assuma eslint**) nos arquivos editados + testes se o projeto exigir. **Ordem com a explicação breve (b-bis)**: lance o subagente primeiro, escreva a explicação logo em seguida na mesma resposta.
  2. Instrua o subagente a **retornar um relatório estruturado** (não prosa longa): para cada arquivo — caminho, criado/editado, ±linhas, e nesta ordem `Faz` (responsabilidade + o essencial de como), `Conecta` (ligações reais, com nomes e direção), `Revisar` (ponto de atenção / decisão discutível); **1-2 frases por item, ~15-35 palavras** — nem one-liner que só repete o nome do que criou, nem parágrafo. Mais o resultado da validação. É esse relatório que alimenta o plano de revisão (passo g).
  3. A conversa principal **não reimplementa** — confere o relatório, e se algo veio fora do escopo do chunk ou contra as docs, trata como divergência (auto-sync) antes de seguir.
  4. **Fallback**: se o ambiente não suporta lançar subagente, caia para o modo `main` e avise no plano de revisão (*"implementado no agente principal — subagente indisponível neste ambiente"*).

- **`implementer: main`** — a conversa principal faz as edições diretamente (comportamento clássico):
  - Faça as edições.
  - Rode o **comando de validação do projeto** (campo `Validação` do chunk / CLAUDE.md — lint/format da stack real, **não assuma eslint**) apenas nos arquivos editados.
  - Se o projeto exige (ver CLAUDE.md do projeto), rode os testes.

> Em ambos os modos, o principal **decide** a/b-ter/d/e/f/f-bis/f-ter/g/g-quater/h (o subagente implementer só codifica o chunk e reporta). Execute d→e→f→f-bis→f-ter→g→g-quater→h **nesta ordem**, e só então "Pare aqui".
>
> **Atenção (scribe):** "ser do principal" = o principal DECIDE o quê escrever, **não** que ele dá `Write`/`Edit` inline. Com `scribe: subagent` (incl. campo ausente), as **escritas** de d) (`tasks.md`, `.sdd.yaml`), e) (`flow.html`), g-bis) (`in_review`) e g-ter) (troca de contrato provisório na `spec.md`, quando houver) + a de memória vão **todas juntas numa única chamada do escriba**, montada ao final (antes de imprimir o plano g). Não escreva nenhum desses inline. Ver a nota "Escrita de artefatos (scribe)" no topo e `../../helpers/prompts/scribe-guide.md`.

**d) Marcar + registrar** — com **`tasks_storage: mcp`** não há checkbox em arquivo para trocar; a marcação vai como `mark: "~"` no `sdd_record_chunk` do passo g-bis.

**d) Marcar + registrar**:
- tasks.md: marque os checkboxes do chunk (`Faz` e `Validação`) de `[ ]` → `[~]`. Os demais itens do chunk (`Arquivos`, `Depende de`, `Ordem de revisão`) são metadados em bullet simples, não checkboxes — não precisa marcar. Se o chunk tiver outros checkboxes, marque todos.
- `.sdd.yaml`: `current_chunk: "F<n>.C<m>"`, `updated`.
- Com **`mcp: on`**, agora que você sabe quais arquivos o chunk toca (campo `Arquivos`), faça **uma** chamada `sdd_recall` com esses caminhos ou com o nome da classe/módulo. Serve para descobrir se aquele código já foi tocado antes, com que decisão e com quais exemplos de entrada e saída — inclusive em conversa que você não viu. Não achou nada: siga em silêncio. Achou algo que muda a decisão: diga em 1 linha o que achou e o que muda. Ver `../../helpers/prompts/mcp-guide.md`.

**e) Atualizar diagrama** — se `flowchart: on` no `.sdd/config.yaml` (default). **Com `flow_storage: mcp` não há arquivo**: o fluxo já foi gravado pelo `component` do `sdd_record_chunk` (g-bis) e pelo esqueleto do passo de tasks — pule este passo em silêncio e não mencione `flow.html`. Com `flow_storage: file` (padrão), **edite pontualmente** `.sdd/changes/<id>/flow.html` seguindo `../../helpers/prompts/flowchart-guide.md`, seção "Atualização incremental": três edições com âncora única (o nó anterior vira `done`, o nó deste chunk vira `current` e clicável, o painel deste chunk entra acima do marcador `<!-- /detail-panel: <slug> -->`), mais a linha de progresso do cabeçalho. **Não reescreva o `<main>`** — o painel de cada chunk fechado é imutável, e reescrevê-los custa mais que o resto do passo inteiro. Marque `deviated` os componentes anotados no auto-sync (também por troca de classe). O nó deste chunk vira clicável com um **mini-walkthrough de código real** — **reuse o relatório do subagente / o diff que você já fez neste turno** para montar o detalhe (não releia os arquivos do zero). Cite no plano de revisão: *"Diagrama atualizado: flow.html"*.

**f) Transição "feature concluída"** — só no turno de fechamento (0-ter). No turno em que o último chunk foi implementado, este passo **não roda**: a linha `Próximo:` do plano de revisão diz *"Todos os chunks da feature `<X>` implementados. Próximo `/lp-continue` fecha a feature: testes + code review."* e o turno para ali.
- No turno de fechamento:
  - Marque a feature como `done` no `.sdd.yaml`. Limpe `current_feature` e `current_chunk`.
  - **Contexto do projeto** (se `context: true`/ausente): crie/atualize o arquivo de contexto dessa feature em `.sdd/context/` (o que é / como funciona / decisões e porquês da spec+plan+auto-sync / notas) e atualize o(s) índice(s). Segue `../../helpers/prompts/context-guide.md`. **Entra no pacote do escriba** deste passo (não escreva inline). Cite no plano: *"Contexto: +1 área `<slug>` em .sdd/context/"*.
  - Se há próxima feature `pending`: `state: awaiting-feature-spec`. Imprima: *"Feature `<X>` concluída (em revisão). Próximo `/lp-continue` inicia a feature `<Y>` — <summary dela> (spec)."*
  - Senão: `state: awaiting-archive`. Sugira `/lp-archive`.
  - Com **`mcp: on`**: `sdd_sync_change` com a feature em `done` e o `state` novo.
  - **Commit dos artefatos do SDD**: rode `git status --porcelain .sdd` e monte um commit com **tudo que estiver sujo ali** — `plan.md` e o espelho `.html`, `spec.md`, `context/**`, `.sdd.yaml`, `tasks.md`, `flow.html`, o que houver —, com mensagem `chore(sdd): fecha <slug>`. Não é uma lista fixa de nomes: com os `*_storage: mcp` os arquivos de progresso somem, mas plano, spec e contexto continuam em disco, e eram justamente eles que ficavam para trás. **Este commit não sai agora**: ele entra em `in_review.pending_commits` e roda quando você aprovar o fechamento, no `/lp-continue` seguinte (ver a regra logo abaixo do g-quater). `.sdd/` limpo → nenhum commit e nenhuma menção. Ver `../../helpers/prompts/git-guide.md`.
- O resultado desta transição define a linha "Próximo:" do plano de fechamento.

**f-bis) Geração de testes** — só se **`tests: on`** no `.sdd/config.yaml` **E** este é o turno de fechamento (0-ter). No turno que implementou o último chunk, e em qualquer outro chunk, pule sem mencionar nada. Com `tests: off`/ausente (padrão), este passo **não existe** — não gere testes nem comente que está desligado.

Lance UM **subagente tester** (papel `tester` em `subagents` para modelo/thinking) seguindo `../../helpers/prompts/tester-guide.md`. Passe: os arquivos de código de **todos** os chunks da feature (campos `Arquivos` do `tasks.md`, não só o último chunk), a `spec.md` da feature (Requirements + Edge cases são os casos de teste) — ou, no bug-fix, `diagnosis.md` + `chosen_solution`, com teste de regressão obrigatório para a causa raiz — e as convenções de código do projeto.

O tester **escreve os testes, roda, reporta — e nunca corrige** (nem o teste, nem a implementação). Teste falhando é decisão do usuário: bug real ou teste mal escrito. Leve o retorno dele para o bloco `Testes` do plano de revisão (passo g) e os arquivos criados para `in_review.files` (g-bis). Com **`mcp: on`**, registre o relatório com `sdd_record_tests` (runner, passou/falhou, cobertura, arquivos criados) — hoje ele só existe no chat.

**O relatório tem duas partes, e a segunda é a que some.** Além dos números, o tester devolve a nota de cobertura e a lista do que ele **deixou sem teste de propósito** (aparece como `recommendation`, "lacunas intencionalmente não testadas" ou "não unit-testável"). As duas vão para o bloco `Testes` em uma linha `Sem teste automatizado (N): …`, uma lacuna por item com o motivo, e para o campo `report` do `sdd_record_tests`. Repassar só `573 passing` é entregar metade do que foi apurado: os números dizem o que está coberto, a lista diz o que **não** está — e é essa que vira dívida esquecida se ninguém escrever.

**f-bis-2) Cobertura fraca e triagem das lacunas** — só quando o `f-bis` rodou.

- **Cobertura não medida, ou claramente baixa** nos arquivos da feature: lance **um** segundo tester, sem perguntar, com escopo só no que ficou descoberto. Uma linha dizendo que vai rodar e por quê. **No máximo uma** segunda passada por feature — cobertura ainda baixa depois dela vira linha no relatório, nunca uma terceira rodada.
- **Classifique cada lacuna** do tester em **cobrível** (dá para testar em unitário agora, com o que o projeto já tem: requisito da spec sem teste, ramo de erro não exercitado) ou **estrutural** (exige banco real, HTTP de verdade, fila; ou é garantia de terceiro, como constraint do banco). A classificação é sua, não do tester — ele diz o que não testou, você decide o que disso ainda dá para testar.
- As **estruturais** vão para a linha `Sem teste automatizado` do bloco `Testes`, sem pergunta.
- As **cobríveis** viram pergunta no `g-quater`, junto da decisão dos achados — mesma chamada da interface, duas perguntas. Guarde a lista para lá.

Ver `../../helpers/prompts/tester-guide.md`.

**f-ter) Code review da feature** — só com **`code_review: on`** **E** este é o turno de fechamento (0-ter). No turno que implementou o último chunk, e em qualquer outro chunk, pule sem mencionar nada. **É a única passada de review do motor** — não existe review por chunk.

Lance UM subagente (papel `code-reviewer` em `subagents` para modelo/thinking) seguindo `../../helpers/prompts/code-review-guide.md`. Passe: o **diff da feature inteira**, os **arquivos tocados de todos os chunks dela**, a `spec.md` da feature (ou `diagnosis.md` + `chosen_solution` no bug-fix) e as instruções extras de `~/.sdd/code-review.md` e `.sdd/code-review.md`, quando existirem.

As fichas dos achados são impressas **neste passo**, assim que o subagente devolve — não guardadas para dentro da pergunta do g-quater. Ele **reporta e nunca corrige** — nem o typo óbvio. Todo achado vem com **ID curto** (`A1`, `A2`…), severidade, arquivo:linha, **cenário concreto de falha**, causa, correção sugerida e **custo** (arquivos/linhas/teste); sem cenário, não é achado. Grave e médio saem com a ficha completa no chat; `menor` sai em uma linha, e **sai sempre** — contar achados que você não listou é o pior formato possível. Leve o resultado para o bloco `Code review` do plano de revisão (passo g) e para o campo `code_review` do `sdd_record_chunk` (g-bis), amarrado ao chunk onde o achado está.

Boa parte do valor está no que não cabe num chunk isolado: contrato que mudou no meio do caminho, duplicação que só aparece com o conjunto na mão, borda que cada chunk achou que o outro tratava.

> **Separador `  ||  `, nunca `;`** — vale no plano de revisão e em todo artefato. Afirmação independente vira linha própria; duas partes da mesma informação (valor e motivo, resultado e ressalva) se separam com `  ||  `. Regra completa em `../../helpers/prompts/state-machine.md`.

**g) Plano de revisão obrigatório** (formato da state-machine.md):

**UMA lista só** de arquivos, já na ordem de revisão (não separe "Arquivos" de "Ordem de revisão"). Inclua TODOS os arquivos tocados (serve de manifesto pra revert), ordenados por prioridade; triviais (tipos gerados, config, stubs) no FIM marcados "pode pular".

Cada arquivo que vale revisão leva **3 linhas, nesta ordem: `Faz` → `Conecta` → `Revisar`** (o `Revisar` fecha o bloco de propósito — é o que o usuário vai efetivamente fazer com o arquivo aberto; deixá-lo por último evita que ele leia o ponto de atenção e depois tenha que voltar pro contexto).

**Profundidade — 1 a 2 frases por linha** (~15-35 palavras). Nem one-liner raso ("campo `textoAnonimizado`"), nem parágrafo. O teste: o usuário deve entender o arquivo **sem abrir o código**; se a frase só repete o nome do que foi criado, ela está rasa — falta o *como* ou o *porquê*. Arquivos triviais ficam em uma linha só com "pode pular".

**Arquivos de teste** (só no turno de fechamento, quando f-bis rodou): entram na lista, no **fim**, mas **nunca** marcados "pode pular" — um teste falhando é o item mais importante do turno. Se algum falhou, diga isso também na linha `Próximo:` (*"há 1 teste falhando — decida se é bug ou teste antes de seguir"*); isso **não bloqueia** o `/lp-continue`.

**Espaçamento**: cada arquivo é um **bloco separado por linha em branco** — cabeçalho em **negrito** (número + caminho) e `Faz`/`Conecta`/`Revisar` como **bullets**. Não use lista numerada colada (fica ilegível no terminal).

```
## Chunk F<n>.C<m> — <título> (em revisão)

Feature: <slug> (<i>/<total>)
Estado da feature: <X de Y chunks concluídos>

Modelo de dados: <N entidades — o essencial em uma linha>.   <- só com data_model: on e chunk que tocou dados; omita o bloco se não
  Decidido com você: <a bifurcação que você respondeu na fase 2>.

Revisão (na ordem — comece pelo topo):

**1. caminho/arquivo1.ts** (criado, +N)
- Faz: <o que este arquivo passou a fazer, e como — 1-2 frases>.
- Conecta: <quem chama/usa, pra onde aponta, qual peça do fluxo>.
- Revisar: <no que prestar atenção / o que validar aqui>.

**2. caminho/arquivo2.ts** (editado, +N -M)
- Faz: <...>.
- Conecta: <...>.
- Revisar: <...>.

Code review (<N> achados: <n> graves, <n> médios, <n> menores):   <- só com code_review: on; omita o bloco inteiro se off ou se nada foi achado
[grave] caminho/arquivo1.ts:42 — <o que está errado>
  Cenário: <entrada concreta> → <resultado errado>.
[médio] caminho/arquivo2.ts:88 — <o que está errado>
  Cenário: <entrada concreta> → <resultado errado>.

**3. caminho/tipos.d.ts** (criado) — tipos gerados, pode pular.

Validação:
- eslint --fix: ok
- test: N passing

Testes (feature concluída):        <!-- só no turno de fechamento (0-ter), com tests: on -->
- test/foo.spec.ts — 12 casos · 11 passing, 1 failing
  ↳ falhou: "rejeita valor negativo" — esperava erro, recebeu null
- Coverage: 87% nos arquivos da feature.

Próximo: /lp-continue (<descreva o que vem: "implementa <o quê do próximo chunk>" OU "inicia a feature <slug>", se essa foi a última).
Reverter: peça "reverte o chunk F<n>.C<m>".
```

> Na linha "Próximo", diga **o que o próximo chunk faz** (leia o `Faz` dele no `tasks.md`), não só o ID — "próximo chunk `F2.C4`" não informa nada. O ID cru fica só na linha "Reverter" (é comando pra copiar). Ver a regra de citação de chunks em `../../helpers/prompts/state-machine.md`.

**Commit do chunk** (se `auto_commit` ≠ `off`; ver `../../helpers/prompts/git-guide.md`): decida a mensagem sugerida agora e acrescente-a como **último bloco da mensagem**, depois de tudo — é comando para copiar, e comando no meio do texto obriga a rolar para trás. Com `suggest-only` (default) mostre o comando pronto pra copiar; com `full`, avise que será commitado automaticamente ao aprovar (ou, se a branch atual é protegida, caia pro comportamento de `suggest-only` com aviso). Com `off`, não mencione git. O `git add` inclui os arquivos de **decisão** do `.sdd/` tocados neste chunk (spec, plan, memória, contexto) e **não** inclui os de progresso (`tasks.md`, `flow.html`, `.sdd.yaml`) — ver a seção "Os arquivos do `.sdd/`" do guia.

Regras das 3 linhas:
- **Um bloco por arquivo, separado por linha em branco.** Cabeçalho em negrito; `Faz` → `Conecta` → `Revisar` em bullets, **sempre nessa ordem** (`Revisar` é o último).
- **Alvo de tamanho: 1-2 frases por linha (~15-35 palavras).** Substancial o suficiente pra dispensar abrir o arquivo, curto o suficiente pra ler as 3 linhas de um lance. Passar de ~2 frases é sinal de que você está escrevendo a spec de novo — corte.
- **Faz**: a responsabilidade do arquivo neste chunk **e o essencial de como** — o mecanismo, a regra, o valor de default que importa. Não repita o nome do arquivo/campo como se fosse explicação: *"campo `textoAnonimizado`"* é raso; *"guarda o texto já anonimizado, preenchido só ao fim do ciclo — nulo até lá"* informa.
- **Conecta**: a ligação real com outros arquivos deste chunk / feature / fluxo, com **nomes reais** (ex: "consumido por `AuthController.login()`"; "implementa a porta `UserRepository`"). Diga a direção (quem chama quem), não só que existe relação. Se `flowchart: on`, pode citar o nó no `flow.html`.
- **Revisar** (por último): o ponto de atenção real — decisão não-óbvia, borda, contrato a conferir, algo que você fez diferente do que o usuário esperaria. Diga **o que olhar e por que aquilo é a decisão discutível**, não "revise o código". Se você tomou uma decisão que o usuário pode querer reverter, é aqui que ela aparece.
- Se não há nada relevante em `Revisar` ou `Conecta` (arquivo isolado/trivial), colapse para one-liner "pode pular".

> Enquanto o usuário revisa: se ele perguntar algo ou pedir ajuste no chunk (sem rodar `/lp-continue`), atenda e **re-imprima a lista de revisão atualizada no fim da resposta** (ver seção "Durante a revisão de um chunk").

**g-bis) Persistir estado de revisão** (sobrevive à compactação de contexto): grave no `.sdd.yaml` da mudança:
```yaml
in_review:
  chunks: ["F<n>.C<m>"]        # no paralelo, os IDs da onda
  files: ["caminho/arquivo1.ts", ...]   # a lista, na ordem de revisão — INCLUI os arquivos de teste criados no f-bis
  commit_message: "<mensagem sugerida do passo g>"   # null se auto_commit: off
  updated: <YYYY-MM-DD>
```
Assim, mesmo que a conversa reinicie, o próximo turno sabe qual chunk está em revisão e consegue re-imprimir a lista. Ao aprovar (próximo `/lp-continue`) ou reverter, limpe `in_review`.

Com **`mcp: on`**, se algum arquivo deste chunk **já tinha explicação num chunk anterior** desta mudança (você acabou de alterá-lo, então o texto de lá descreve o código de antes), regrave aquele registro também: uma chamada `sdd_record_chunk` com o `chunk_id` antigo e só o `files` do arquivo em questão, com `does`/`connects`/`review_note` atualizados. Você já tem o arquivo em contexto — é o momento mais barato de fazer isso, e é o que evita a marca "arquivo mudou desde então" no viewer. Uma linha no fim do plano de revisão dizendo quais registros antigos foram atualizados.

Com **`mcp: on`**, registre o chunk no banco **no mesmo passo**, com `sdd_record_chunk`: um item de `files` por arquivo desta lista, na mesma ordem, com `does`/`connects`/`review_note` recebendo exatamente as linhas `Faz`/`Conecta`/`Revisar` que você acabou de imprimir (`is_test: true` nos arquivos vindos do f-bis), mais `summary`/`reasoning` do chunk e o `commit` sugerido. Este é o ponto certo porque é aqui que você tem tudo junto. Se a spec tem cenários registrados, mande também `scenario_keys` com os que este chunk implementa. Com **`code_review: on`**, mande também `code_review` — um item por achado do `f-ter`, com severidade, arquivo, linha, cenário, causa e sugestão. O upsert é por `path`+`title` e campo ausente preserva, então regravar depois só com o achado fechado (`status` + `resolution`) não mexe nos outros. Com `mcp_record.code_review: false`, pule o campo. Com **`flow_storage: mcp`**, mande também o `component` — o rótulo curto da camada que este chunk implementa, que é o nome do nó no fluxo. Com **`data_model: on`** e um chunk que passou pelo `b-ter`, mande também `data_model` — um item por entidade modelada, com `shape`, `decisions`, `rejected`, `index_notes` e `migration`. `decisions` e `rejected` são o que não existe em nenhum outro lugar: a migração conta o formato, nunca o porquê. Com `mcp_record.data_model: false`, pule o campo.

Mande também, **só para o banco e sem imprimir no chat**: o `detail` (explicação longa de cada arquivo que merece: mecanismo, decisão descartada, armadilha), os `highlights` (0-3 trechos de código decisivos por arquivo), os `symbols` (os métodos que carregam comportamento, cada um com assinatura e **exemplos de entrada e saída com dado plausível do domínio, incluindo ao menos um caso de borda**) e — **só quando `auto_commit` não for `full`** — o `diff` unificado dos arquivos modificados. Com `auto_commit: full` o chunk vira commit e o git já guarda esse diff inteiro; regravá-lo é pagar duas vezes pelo mesmo conteúdo. O resto é o que deixa o plano de revisão curto sem perder profundidade — quem abrir o histórico depois tem o arquivo explicado. Ver `../../helpers/prompts/mcp-guide.md`.

**A tool cobra isso de volta.** A resposta do `sdd_record_chunk` traz `files_without_depth`: os arquivos de código do chunk que ficaram sem `detail`, sem `highlights` e sem `symbols` — nada além das duas frases do plano. Vindo lista não vazia, faça **uma segunda chamada** completando esses arquivos antes de imprimir o plano de revisão, ainda com o código em contexto. Arquivo de teste não entra na conta.

Um chunk sem profundidade não falha nada agora, e é justamente o problema: no viewer ele não tem "Entender melhor" para abrir, e ninguém descobre isso até querer reler o arquivo meses depois — quando o custo de reconstruir a explicação é o de reler o código todo.

**g-ter) Contrato provisório que virou arquivo** — só quando a spec da `current_feature` tem a seção **"Contratos expostos"** com um contrato **escrito** (não referenciado), e um arquivo deste chunk passou a implementá-lo. Nesse caso, troque o bloco escrito pela referência ao arquivo real (`caminho:símbolo`), em uma linha. Nos demais chunks, pule em silêncio.

É a única edição que a spec recebe depois de aprovada, e ela é sempre na mesma direção: cópia vira ponteiro. Se o que foi implementado **divergiu** do que estava escrito, não corrija a spec por conta própria — diga a divergência na linha `Revisar` daquele arquivo (passo g) e deixe a decisão com o usuário. Com `format` ∈ {html, both}, o `spec.html` acompanha — rode o conversor depois que o escriba gravar o `.md`. **A edição do `.md` entra no pacote do escriba** deste passo; a chamada do conversor é sua, como as tools MCP.

**g-quater) Decisões do fechamento** — só no turno de fechamento, e só quando há o que decidir: **pelo menos um achado `grave` ou `medio`** do `f-ter`, ou **pelo menos uma lacuna cobrível** do `f-bis-2`. Nada dos dois: pule em silêncio.

As duas decisões vão na **mesma chamada** da interface de pergunta, como perguntas separadas — fechar uma feature não precisa de dois round-trips. A pergunta das lacunas cobríveis é direta: cobrir agora (lança um tester com escopo só nelas) · cobrir as que você marcar · deixar para depois. Escolhida a cobertura, o tester roda ainda neste turno, e os arquivos novos entram na lista de revisão e no `pending_commits` como o resto.

**Primeiro imprima, depois pergunte.** A ficha completa de cada achado grave e médio — ID, severidade, arquivo:linha, cenário, causa, correção e custo — vai no corpo **desta** mensagem, e os menores em uma linha cada. Só então chame a pergunta. O enunciado dela leva apenas ID e título curto: o detalhe o usuário acabou de ler acima. Resumir os achados dentro da pergunta e pular as fichas é pedir decisão sem cenário nem custo — ver "O enunciado da pergunta não é a ficha" no guia.

Pergunte usando a interface nativa do harness (`AskUserQuestion`), seguindo `../../helpers/prompts/code-review-guide.md`: até 3 achados, um item por achado; 4 ou mais, a pergunta agregada (todos os graves e médios / só os graves / nenhum agora / descartar com motivo).

Se o usuário mandar corrigir: **até 2 achados no mesmo arquivo, corrija inline**; 3 ou mais, ou espalhados, lance **um subagente implementer** com escopo só dos achados. Depois, nos dois casos: rode a validação do projeto nos arquivos tocados + o teste que cobre o achado, reimprima só o que mudou do plano e diga em uma linha o que ficou aberto.

**Grave a correção no banco** (com `mcp: on`), em duas chamadas:

1. `sdd_record_chunk` no chunk **de origem de cada achado**, só com o campo `code_review` dos que fecharam (`status` + `resolution`). É o que faz o desfecho aparecer junto do achado.
2. `sdd_record_chunk` num **chunk de correção**, que é onde o código alterado fica visível:
   - `chunk_id`: o próximo número livre da feature (`F<n>.C<último+1>`) — precisa desse formato, senão a timeline não sabe onde ordená-lo.
   - `title`: `Code review — correções (A1, A3)`, com os IDs que foram aplicados.
   - `summary`: o que mudou no código. `reasoning`: o achado que motivou cada mudança.
   - `files`: um item por arquivo alterado na correção, com `does`/`connects`/`review_note` como em qualquer chunk, mais `detail` e `highlights` quando a mudança tem mecanismo que valha explicar.
   - `component`: `Code review`, com `flow_storage: mcp`.
   - `status: "done"`, e **sem** `mark` — não há item de `tasks.md` para marcar.

O chunk de correção existe porque o código mudou, e mudança de código sem registro é exatamente o que a timeline promete não deixar acontecer: sem ele, o `Faz`/`Conecta` do chunk original passa a descrever um arquivo que não é mais aquele, e quem revisar depois não tem como saber que houve uma segunda passada.

**Se a suíte rodou de novo depois das correções, regrave `sdd_record_tests`** com os números novos. O relatório gravado antes da correção envelhece na hora em que ela é aplicada, e é ele que o viewer mostra.

**A correção tem commit próprio, e ele fica pendente** — `fix(<slug>): code review A1, A2`, citando os IDs aplicados. O commit do último chunk saiu no **começo deste mesmo turno**, quando ele foi aprovado, então não há mais commit à frente para carregar a correção; sem um próprio, ela ficaria suja no repositório indefinidamente.

Correção não entra no `tasks.md`. O chunk de correção é registro de histórico, não item de plano.

### O turno de fechamento não commita nada

Nenhum commit sai neste turno, **nem com `auto_commit: full`**. Testes do tester, correção do code review e artefatos do `.sdd/` são código e documento que você acabou de escrever e o usuário ainda não viu — commitar ali quebraria a única regra que o `auto_commit: full` tem: **commit acontece na aprovação, nunca antes dela**.

O que fazer em vez disso:

1. Grave a lista em `in_review.pending_commits`, na ordem em que devem sair — testes, correção, artefatos:
   ```yaml
   in_review:
     files: [...]                     # testes + arquivos da correção, na ordem de revisão
     pending_commits:
       - message: "test(<slug>): testes da feature"
         files: ["packages/.../foo.spec.ts"]
       - message: "fix(<slug>): code review A1, A2"
         files: ["packages/.../bar.provider.ts"]
       - message: "chore(sdd): fecha <slug>"
         files: [".sdd/changes/<id>/plan.md", ".sdd/context/<area>/<slug>.md"]
   ```
2. Imprima o bloco de commits no fim da mensagem, como em `suggest-only` — assim quem quiser rodar antes, roda.
3. O `/lp-continue` seguinte, que é a aprovação, executa a lista na ordem e limpa o `in_review`.

Com `auto_commit: suggest-only` ou `off`, o comportamento não muda: `suggest-only` já só mostrava, e `off` não menciona git.

Achado que sobrar sem decisão fica `aberto`, e o **próximo `/lp-continue` abre por ele** (ver o passo 0 do `implementing`). Achado que o usuário mandou deixar para depois vira `adiado` **com uma linha dizendo para quando** — `adiado` é decisão e não reabre a porta.

**h) Context watch** — por último, antes de fechar o turno, siga `../../helpers/prompts/context-watch.md` usando `context_watch` do `.sdd/config.yaml`. Heurística: na faixa de 5-10 chunks implementados nesta MESMA conversa, comece a observar. Se julgar pesada → siga o protocolo (suggest/auto/off).

**Pare aqui.** Não execute o próximo chunk no mesmo turno.

### `awaiting-archive`

Diga ao usuário para rodar `/lp-archive`. Não faça mais nada.

## Durante a revisão de um chunk (perguntas e alterações inline)

Vale enquanto há um chunk **em revisão**. A fonte de verdade é o `in_review` no `.sdd.yaml` (preenchido no passo g-bis) — ele sobrevive a reinício/compactação da conversa. Se `in_review` está preenchido (ou o plano foi recém-impresso neste chat) e o usuário faz **qualquer pergunta ou pede qualquer alteração** — sem rodar `/lp-continue` — vale o passo 3 abaixo.

**Isso vale mesmo que a pergunta seja tangencial/conceitual e respondida via outra skill/comando alheio ao SDD** (ex: "explica o que é X" usando uma skill de tirar dúvida qualquer). O gatilho é `in_review` estar preenchido no `.sdd.yaml`, não qual skill respondeu — não deixe o foco na outra skill fazer você esquecer que há uma revisão pendente nesta mesma conversa.

1. Responda a pergunta / aplique a alteração normalmente e explique o que fez (delegando a outra skill se fizer sentido).
2. Se **alterou arquivos**: rode o comando de validação do projeto (não assuma eslint) nos editados e, se o projeto exigir, os testes. A lista pode ter mudado (novos arquivos, novos ±linhas) — reflita isso e atualize `in_review.files` (e o bloco de commit sugerido/`in_review.commit_message`, se `auto_commit` ≠ `off`).
2-bis. Se **alterou arquivos** e `mcp: on`: **regrave o chunk no banco, neste mesmo turno** — `sdd_record_chunk` com os arquivos como ficaram (`does`/`connects`/`review_note` iguais à lista reimpressa, mais `detail`, `highlights` e `symbols` atualizados). A tool faz upsert parcial: rechamar corrige o registro, não duplica, e campo ausente preserva. Pular isso deixa o banco descrevendo a versão anterior do código — ver `../../helpers/prompts/mcp-guide.md`.

O que entra nessa regravação, além dos três resumos:

- **Arquivo que o ajuste criou** — entra como mais um item de `files`, na posição de revisão que faz sentido. Arquivo fora do banco é arquivo que ninguém revisa depois.
- **Arquivo que deixou de fazer parte do chunk** (você reverteu a mudança nele) — sai com `drop: true`. Deixá-lo ali é pior que não tê-lo gravado: o registro afirma uma alteração que não existe mais.
- **`symbols` de método cuja assinatura ou exemplos mudaram** — o exemplo de entrada/saída errado é o campo mais caro de todos, porque quem lê confia nele sem conferir o código.
- **A resposta da tool traz `files_without_depth`**: se algum arquivo ficou sem `detail`, sem `highlights` e sem `symbols`, complete numa segunda chamada aqui mesmo, com o código ainda em contexto.
- **Arquivo de outro chunk que este ajuste tocou** — regrave também o registro daquele chunk, com o `chunk_id` dele. O `Faz`/`Conecta` de lá passou a descrever outra versão do arquivo, e é exatamente isso que faz o "arquivo mudou desde então" aparecer no viewer.

Se o ajuste veio de uma **decisão** do usuário — "põe um CHECK no banco", "troca para hard delete", "esse campo passa a ser nulável" —, some um `sdd_record_event` (`kind: note`) com o porquê, e um `sdd_sync_change` se a decisão mudou um cenário da spec. Se a alteração corrigiu um achado do code review, feche-o no mesmo payload (`code_review` com `status: "corrigido"` + `resolution`).
3. **Sempre, no FIM da resposta — nunca pule este passo, mesmo numa resposta puramente explicativa que não tocou em arquivo nenhum — re-imprima a lista de revisão atualizada** (mesmo formato: bloco por arquivo, cabeçalho em negrito + bullets, separados por linha em branco), para o usuário continuar de onde parou sem precisar perguntar "o que eu tava revisando mesmo?":

   ```
   Revisão (na ordem — continue de onde parou):

   **1. caminho/arquivo1.ts** (criado, +N)
   - Faz: <...>.
   - Conecta: <...>.
   - Revisar: <...>.

   **2. caminho/arquivo2.ts** (editado, +N -M)
   - Faz: <...>.
   - Conecta: <...>.
   - Revisar: <...>.
   ```

4. **Com `auto_commit` ≠ `off`, reimprima o bloco de commit logo depois da lista, fechando a resposta** — **mesmo que os comandos estejam idênticos aos da resposta anterior**. É o mesmo motivo do passo 3: o bloco existe para ser copiado, e obrigar o usuário a caçar a mensagem antiga desfaz o propósito. Se o ajuste tocou arquivos novos, o `git add` reflete a lista nova. Ver `../../helpers/prompts/git-guide.md`.

- Se o usuário já disse quais arquivos revisou, mova o "comece por aqui" para o primeiro ainda **não** revisado (ou marque os revisados com ✓). Não force se não souber.
- **Não avance** para o próximo chunk aqui — isso só acontece com `/lp-continue` explícito.
- Não re-imprima o cabeçalho inteiro do plano (Feature/Estado/Validação) toda vez — só a **lista de revisão** basta, salvo se a alteração invalidou a validação (aí re-rode e mostre).
- Se a pergunta NÃO for sobre o chunk em revisão (dúvida geral, outro assunto) → responda normal, **sem** re-imprimir a lista.

## Memória — varredura e salvamento autônomo (em qualquer fase)

Antes de fechar o turno, **revise a conversa** procurando sinais de preferência (correção, rejeição com alternativa, "lembra disso", "sempre/nunca faça X", padrão repetido). Siga `../../helpers/prompts/memory-guide.md`:

1. **Detectou sinal claro** → classifique (Estilo/Processo ou Stack/Domínio), verifique duplicação, e grave em `.sdd/memory.md` (ou no arquivo de tema se houver `memory-map.md`). Sem perguntar. **A escrita da memória entra no MESMO pacote do escriba** do passo (`scribe: subagent`/ausente) — você decide o texto exato da entrada; o escriba grava. Não edite `memory.md` inline.
2. **Detectou sinal ambíguo** (classificação incerta, generalização duvidosa, ou conflito com entrada existente) → faça UMA pergunta curta.
3. **Sempre** cite no plano de revisão: *"Memória: +1 em Estilo/Processo — `<resumo>`"* (ou "atualizei entrada existente").
4. Se `memory.md` passar de ~150 linhas → **divida sozinho** em `.sdd/memory/<tema>.md` + `memory-map.md` e informe no plano de revisão.

## Princípios não-negociáveis

1. **Uma feature por vez.** NUNCA gere specs ou tasks de duas features no mesmo turno.
2. **Um passo por invocação.** Mesmo que o usuário peça "faz tudo", redirecione: "no SDD, cada passo é um `/lp-continue` para que você possa revisar".
3. **Grilling agressivo na criação da spec**, mínimo na criação das tasks (se a spec resolveu as dúvidas).
4. **Auto-sync antes de implementar.** Nunca codifique sobre docs desatualizadas.
4-bis. **Respeite o `format` nas docs de conteúdo** (`plan`, `spec`): `format: both`/`html` → saem em `.md` E `.html`. **Exceção: `tasks` segue `tasks_format`** (default `md` → só `.md`, mesmo com `format` html/both). Antes de fechar o passo, confira o `format`/`tasks_format` e o padrão das docs anteriores.
4-ter. **Testes (se `tests: on`) só ao concluir a feature**, nunca por chunk, num subagente tester dedicado que **reporta e não corrige**. Ver `../../helpers/prompts/tester-guide.md`.
5. **Plano de revisão sempre.** Sem exceções.
5-bis. **Nada se cita só pelo número.** Chunk (`C6`, `F2.C3`), feature/frente (`F3`), onda, opção de solução — etiqueta é referência, não descrição. Em qualquer explicação, transição ou resposta, acompanhe sempre do que aquilo é/faz. Ver `../../helpers/prompts/state-machine.md`.
6. **Não leia specs de outras features** que ainda não foram processadas — elas não existem.
