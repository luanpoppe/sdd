---
name: continue
description: Avança UM passo no SDD `lp:*` da mudança ativa. Fluxo SEQUENCIAL POR FEATURE: para cada feature, primeiro gera spec → revisão → gera tasks → revisão → implementa chunks micro um a um. Só passa para a próxima feature quando a anterior está concluída. Use quando o usuário pedir "lp:continue", "próximo passo lp", ou "continuar a implementação".
---

Você está avançando 1 passo no SDD. Siga a máquina de estados em `../../helpers/prompts/state-machine.md` e o estilo de grilling em `../../helpers/prompts/grill-snippet.md`.

> **Escrita de artefatos (scribe)**: com `scribe: subagent` (default), **TODAS as escritas de arquivo deste passo** — docs `.md`/`.html`, `flow.html`, `.sdd.yaml`, `memory.md`, marcação de checkboxes no `tasks.md` — vão para um **subagente escriba** numa **única** chamada por passo. **Ausência do campo `scribe` no config = `subagent`** (não trate ausência como inline). É **tudo-ou-nada**: proibido delegar só os `.html`/`flow.html` e fazer `tasks.md`/`.sdd.yaml`/`memory.md` inline — se for dar `Write`/`Edit` num artefato do SDD, ponha no pacote do escriba. Você (principal) decide o conteúdo (inclusive o texto exato da memória e os campos do YAML) e imprime o plano de revisão; o escriba renderiza/escreve e devolve a lista. Siga `../../helpers/prompts/scribe-guide.md`. Ortogonal ao `implementer` (que delega o **código**): num passo de `implementing`, o implementer escreve o código e o escriba faz TODA a contabilidade do SDD. Só escreva inline com `scribe: main` explícito ou se a chamada de subagente realmente falhar (não por "preferir controle do YAML").

## 0. Pré-checagem

- Se `.sdd/config.yaml` não existir → "Rode `/lp-init` primeiro." Pare.
- Identifique a **mudança ativa**: pasta em `.sdd/changes/` com `.sdd.yaml` `state` ≠ `archived`.
  - Nenhuma: imprima `"Nenhuma mudança ativa. Comece com /lp-new <id>."` e pare.
  - Mais de uma: prefira `state: implementing`; em empate, pergunte qual.
- Leia `.sdd.yaml`. **Se `kind: bugfix`** → esta é uma mudança de bug-fix: siga `../../helpers/prompts/bugfix-machine.md` (estados `bug-proposing` → `bug-fixing`) em vez da máquina de features abaixo. O resto desta pré-checagem (in_review, memória) continua valendo; pule a leitura de `plan.md`/specs (bug-fix não os tem).
- (fluxo normal de feature) Leia `plan.md` e os arquivos da **feature ativa atualmente** (se houver `current_feature`): `specs/<current_feature>/spec.md` e `tasks.md` se existirem.
- **Leia `in_review`**: se preenchido, há um chunk aguardando revisão (pode ser de uma conversa anterior). Uma invocação normal de `/lp-continue` significa que o usuário **aprovou** essa revisão. **Antes de limpar**, se `auto_commit: full` (ver `../../helpers/prompts/git-guide.md`), faça o commit do chunk aprovado agora (git add só dos `in_review.files` + git commit com `in_review.commit_message`), respeitando a exceção de branch protegida do guia. Depois, limpe `in_review` (`null`) e siga para o próximo chunk/onda. Ao mencionar no chat o chunk que acabou de ser aprovado, diga o que ele fez, não só o ID (*"aprovado o chunk que passou a marcar dimensão sem dado como não-avaliada (`C6`)"*) — ver a regra de citação em `../../helpers/prompts/state-machine.md`. Perguntas/ajustes sem `/lp-continue` caem na seção "Durante a revisão de um chunk".
- **NÃO leia specs de outras features** — elas podem nem existir ainda.
- **Carregue a memória**: leia `.sdd/memory.md` (ou `.sdd/memory-map.md` se existir; nesse caso, leia também os arquivos de tema que parecem relevantes pelo título da feature ativa). Siga `../../helpers/prompts/memory-guide.md`.
- **Carregue o contexto do projeto** (se `context: true`/ausente no config): leia `.sdd/context/index.md`. Se a feature ativa toca uma área listada, leia também o arquivo de contexto dela antes de decidir/implementar. É a 1ª parada para "como isso funciona hoje?". Siga `../../helpers/prompts/context-guide.md`.

## 1. Despache por estado

> **Bug-fix** (`kind: bugfix` no `.sdd.yaml`): não use as transições de feature abaixo. Vá para `../../helpers/prompts/bugfix-machine.md` — `bug-proposing` gera as opções de correção; `bug-fixing` reusa o motor `implementing` (seção abaixo) com tasks na raiz da mudança. O resto (plano de revisão, `in_review`, memória, context-watch) é idêntico.

### `awaiting-feature-spec`

1. Identifique a próxima feature na lista `features` do `.sdd.yaml` com `status: pending` (primeira em ordem). Marque-a como `speccing`, set `current_feature: <slug>`.
2. Imprima: *"Iniciando feature `<slug>`: <summary>. Vou fazer perguntas para definir a spec — em batches de poucas perguntas."*
3. **Grill profundo SÓ desta feature**, em batches de até 4 perguntas independentes via `AskUserQuestion` (dependentes em batches posteriores — ver `../../helpers/prompts/grill-snippet.md`). Cubra (apenas o que não dá pra inferir do código):
   - Cenários BDD principais — pelo menos 1, geralmente 2-4. **Palavras-chave conforme `lang` do `.sdd/config.yaml`**: `pt-BR` → "Dado que / Quando / Então"; `en` → "Given / When / Then".
   - Edge cases conhecidos.
   - Contratos (tipos, schemas, eventos, endpoints) — referencie arquivos do projeto quando possível.
   - Dependências de outras features (já feitas, futuras, externas).
4. **Pare quando** todas as ambiguidades dessa feature estão resolvidas e nada foi "tanto faz" sem follow-up.
5. Gere `specs/<slug>/spec.md` usando `../../helpers/templates/spec.md.tpl`. **Alvo: ≤ 100 linhas**.
5-bis. **Respeite o `format` do `.sdd/config.yaml`**: se `format` ∈ {html, both}, gere também `specs/<slug>/spec.html` usando `../../helpers/templates/spec.html.tpl` (espelha o `.md`). Garanta `.sdd/assets/styles.css` (copie de `../../helpers/templates/styles.css` se faltar).
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
5-bis. **Formato do tasks segue `tasks_format`** (default `md`), NÃO o `format` global. Só gere `specs/<current_feature>/tasks.html` (`../../helpers/templates/tasks.html.tpl`, espelho com `data-status` por chunk) se `tasks_format: follow` **e** `format` ∈ {html, both}. Com `tasks_format: md` (default), gere **só o `tasks.md`** — mesmo que `format` seja html/both. (Ausente → `md`.)
6. Atualize `.sdd.yaml`: feature `tasking` → `implementing`, state global → `implementing`, `updated`.
6-bis. Se `flowchart: on`, atualize `flow.html` (`../../helpers/prompts/flowchart-guide.md`) — **expanda a feature nos nós de componente** (um por chunk), todos `pending`.
7. **Auto-continua por padrão** (`tasks_autocontinue`, default `on`): NÃO pause pedindo aprovação do tasks. Imprima uma linha curta (*"tasks.md gerado (N chunks, chunk_size=<x>) — seguindo direto pro F<n>.C1"*) e **siga na mesma invocação para o estado `implementing`**, executando o 1º chunk (seção `implementing` abaixo, passos a–h). O turno termina no plano de revisão DO CHUNK, não no do tasks.
   - Se `tasks_autocontinue: off`: comportamento clássico — imprima o plano de revisão das tasks (lista de chunks + tamanho de cada), avise *"Valide a granularidade. Próximo `/lp-continue` executa o chunk F<n>.C1."* e **pare aqui**.

### `implementing`

Coração da skill. Execute na ordem:

**a) Auto-sync** (detectar divergências contra `plan.md` + spec da feature ativa):
- Liste em buckets se houver: decisão divergente / escopo extra / escopo faltante.
- Proponha diffs nas docs (plan.md ou specs/<slug>/spec.md ou tasks.md).
- Pergunte: aplicar diffs / ignorar / tratar depois.
- Aplique aprovados ANTES de codar. Mostre resumo.
- **Divergências que persistem** (feito diferente do planejado e a doc foi ajustada) → anote para marcar o componente como `deviated` no diagrama (passo g).

**b0) Modo de execução (só na 1ª vez que a feature entra em `implementing`)**:
- Determine sequencial vs paralelo seguindo `../../helpers/prompts/parallel-guide.md` ("Quando ativar"): `parallel: on` no config → paralelo; senão pergunte uma vez (default sequencial em não/silêncio).
- **Paralelo** → siga o `parallel-guide.md` (ondas de chunks independentes, um subagente por chunk, plano de revisão combinado) no lugar dos passos b/c/e abaixo; d/g continuam na conversa principal. Uma onda por `lp:continue`.
- **Sequencial** (padrão) → siga b/b-bis/c/d/e normalmente, um chunk por vez.

**b) Próximo chunk** (modo sequencial):
- Primeiro `[ ]` em `specs/<current_feature>/tasks.md`.
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

**c) Executar APENAS este chunk** — quem codifica depende de `implementer` no `.sdd/config.yaml` (default `subagent` se o campo não existir):

- Respeite `chunk_size`. Se o chunk como descrito vai exceder, **pare e divida em sub-chunks** atualizando o tasks.md antes de codar (isso é decisão da conversa principal, mesmo no modo subagente).

- **`implementer: subagent` (padrão)** — a conversa principal **delega a implementação a um subagente** e apenas orquestra:
  1. Lance UM subagente (Task/Agent do ambiente) com escopo restrito a ESTE chunk. Passe: o chunk do `tasks.md` (arquivos, "Faz", ordem, `Validação`), a spec da feature, `plan.md`, as preferências de código do projeto (CLAUDE.md/regras) e a instrução de rodar o **comando de validação do projeto** (o do campo `Validação` do chunk / CLAUDE.md — lint/format/test da stack real, **não assuma eslint**) nos arquivos editados + testes se o projeto exigir. **Ordem com a explicação breve (b-bis)**: lance o subagente primeiro, escreva a explicação logo em seguida na mesma resposta.
  2. Instrua o subagente a **retornar um relatório estruturado** (não prosa longa): para cada arquivo — caminho, criado/editado, ±linhas, `Faz` (papel), `Revisar` (ponto de atenção), `Conecta` (ligações reais); mais o resultado da validação. É esse relatório que alimenta o plano de revisão (passo g).
  3. A conversa principal **não reimplementa** — confere o relatório, e se algo veio fora do escopo do chunk ou contra as docs, trata como divergência (auto-sync) antes de seguir.
  4. **Fallback**: se o ambiente não suporta lançar subagente, caia para o modo `main` e avise no plano de revisão (*"implementado no agente principal — subagente indisponível neste ambiente"*).

- **`implementer: main`** — a conversa principal faz as edições diretamente (comportamento clássico):
  - Faça as edições.
  - Rode o **comando de validação do projeto** (campo `Validação` do chunk / CLAUDE.md — lint/format da stack real, **não assuma eslint**) apenas nos arquivos editados.
  - Se o projeto exige (ver CLAUDE.md do projeto), rode os testes.

> Em ambos os modos, o principal **decide** a/d/e/f/g/h (o subagente implementer só codifica o chunk e reporta). Execute d→e→f→g→h **nesta ordem**, e só então "Pare aqui".
>
> **Atenção (scribe):** "ser do principal" = o principal DECIDE o quê escrever, **não** que ele dá `Write`/`Edit` inline. Com `scribe: subagent` (incl. campo ausente), as **escritas** de d) (`tasks.md`, `.sdd.yaml`), e) (`flow.html`) e g-bis) (`in_review`) + a de memória vão **todas juntas numa única chamada do escriba**, montada ao final (antes de imprimir o plano g). Não escreva nenhum desses inline. Ver a nota "Escrita de artefatos (scribe)" no topo e `../../helpers/prompts/scribe-guide.md`.

**d) Marcar + registrar**:
- tasks.md: marque os checkboxes do chunk (`Faz` e `Validação`) de `[ ]` → `[~]`. Os demais itens do chunk (`Arquivos`, `Depende de`, `Ordem de revisão`) são metadados em bullet simples, não checkboxes — não precisa marcar. Se o chunk tiver outros checkboxes, marque todos.
- `.sdd.yaml`: `current_chunk: "F<n>.C<m>"`, `updated`.

**e) Atualizar diagrama** — se `flowchart: on` no `.sdd/config.yaml` (default), regenere `.sdd/changes/<id>/flow.html` seguindo `../../helpers/prompts/flowchart-guide.md`: marque este chunk como concluído, mova o `current` para o próximo, marque `deviated` os componentes anotados no auto-sync. O nó deste chunk vira clicável com um **mini-walkthrough de código real** — **reuse o relatório do subagente / o diff que você já fez neste turno** para montar o detalhe (não releia os arquivos do zero). Cite no plano de revisão: *"Diagrama atualizado: flow.html"*.

**f) Transição "feature concluída"**:
- Se todos os chunks da `current_feature` estão `[~]`/`[x]`:
  - Marque a feature como `done` no `.sdd.yaml`. Limpe `current_feature` e `current_chunk`.
  - **Contexto do projeto** (se `context: true`/ausente): crie/atualize o arquivo de contexto dessa feature em `.sdd/context/` (o que é / como funciona / decisões e porquês da spec+plan+auto-sync / notas) e atualize o(s) índice(s). Segue `../../helpers/prompts/context-guide.md`. **Entra no pacote do escriba** deste passo (não escreva inline). Cite no plano: *"Contexto: +1 área `<slug>` em .sdd/context/"*.
  - Se há próxima feature `pending`: `state: awaiting-feature-spec`. Imprima: *"Feature `<X>` concluída (em revisão). Próximo `/lp-continue` inicia a feature `<Y>` — <summary dela> (spec)."*
  - Senão: `state: awaiting-archive`. Sugira `/lp-archive`.
- O resultado desta transição define a linha "Próximo:" do plano de revisão (passo g).

**g) Plano de revisão obrigatório** (formato da state-machine.md):

**UMA lista só** de arquivos, já na ordem de revisão (não separe "Arquivos" de "Ordem de revisão"). Inclua TODOS os arquivos tocados (serve de manifesto pra revert), ordenados por prioridade; triviais (tipos gerados, config, stubs) no FIM marcados "pode pular".

Cada arquivo que vale revisão leva **3 linhas curtas** — `Faz` / `Revisar` / `Conecta` (1 frase cada, concretas, sem encher linguiça). Arquivos triviais ficam em uma linha só com "pode pular".

**Espaçamento**: cada arquivo é um **bloco separado por linha em branco** — cabeçalho em **negrito** (número + caminho) e `Faz`/`Revisar`/`Conecta` como **bullets**. Não use lista numerada colada (fica ilegível no terminal).

```
## Chunk F<n>.C<m> — <título> (em revisão)

Feature: <slug> (<i>/<total>)
Estado da feature: <X de Y chunks concluídos>

Revisão (na ordem — comece pelo topo):

**1. caminho/arquivo1.ts** (criado, +N)
- Faz: <o que este arquivo passou a fazer>.
- Revisar: <no que prestar atenção / o que validar aqui>.
- Conecta: <quem chama/usa, pra onde aponta, qual peça do fluxo>.

**2. caminho/arquivo2.ts** (editado, +N -M)
- Faz: <...>.
- Revisar: <...>.
- Conecta: <...>.

**3. caminho/tipos.d.ts** (criado) — tipos gerados, pode pular.

Validação:
- eslint --fix: ok
- test: N passing

Próximo: /lp-continue (<descreva o que vem: "implementa <o quê do próximo chunk>" OU "inicia a feature <slug>", se essa foi a última).
Reverter: peça "reverte o chunk F<n>.C<m>".
```

> Na linha "Próximo", diga **o que o próximo chunk faz** (leia o `Faz` dele no `tasks.md`), não só o ID — "próximo chunk `F2.C4`" não informa nada. O ID cru fica só na linha "Reverter" (é comando pra copiar). Ver a regra de citação de chunks em `../../helpers/prompts/state-machine.md`.

**Commit do chunk** (se `auto_commit` ≠ `off`; ver `../../helpers/prompts/git-guide.md`): decida a mensagem sugerida agora e acrescente ao final do bloco acima. Com `suggest-only` (default) mostre o comando pronto pra copiar; com `full`, avise que será commitado automaticamente ao aprovar (ou, se a branch atual é protegida, caia pro comportamento de `suggest-only` com aviso). Com `off`, não mencione git.

Regras das 3 linhas:
- **Um bloco por arquivo, separado por linha em branco.** Cabeçalho em negrito; `Faz`/`Revisar`/`Conecta` em bullets.
- **Faz**: o papel do arquivo neste chunk (não repita o nome dele; diga a responsabilidade).
- **Revisar**: o ponto de atenção real — decisão não-óbvia, borda, contrato a conferir. Não escreva "revise o código"; seja específico.
- **Conecta**: a ligação com outros arquivos deste chunk / feature / fluxo. Aponte nomes reais (ex: "consumido por `AuthController.login()`"; "implementa a porta `UserRepository`"). Se `flowchart: on`, pode citar o nó no `flow.html`.
- Se não há nada relevante em `Revisar` ou `Conecta` (arquivo isolado/trivial), colapse para one-liner "pode pular".

> Enquanto o usuário revisa: se ele perguntar algo ou pedir ajuste no chunk (sem rodar `/lp-continue`), atenda e **re-imprima a lista de revisão atualizada no fim da resposta** (ver seção "Durante a revisão de um chunk").

**g-bis) Persistir estado de revisão** (sobrevive à compactação de contexto): grave no `.sdd.yaml` da mudança:
```yaml
in_review:
  chunks: ["F<n>.C<m>"]        # no paralelo, os IDs da onda
  files: ["caminho/arquivo1.ts", ...]   # a lista, na ordem de revisão
  commit_message: "<mensagem sugerida do passo g>"   # null se auto_commit: off
  updated: <YYYY-MM-DD>
```
Assim, mesmo que a conversa reinicie, o próximo turno sabe qual chunk está em revisão e consegue re-imprimir a lista. Ao aprovar (próximo `/lp-continue`) ou reverter, limpe `in_review`.

**h) Context watch** — por último, antes de fechar o turno, siga `../../helpers/prompts/context-watch.md` usando `context_watch` do `.sdd/config.yaml`. Heurística: na faixa de 5-10 chunks implementados nesta MESMA conversa, comece a observar. Se julgar pesada → siga o protocolo (suggest/auto/off).

**Pare aqui.** Não execute o próximo chunk no mesmo turno.

### `awaiting-archive`

Diga ao usuário para rodar `/lp-archive`. Não faça mais nada.

## Durante a revisão de um chunk (perguntas e alterações inline)

Vale enquanto há um chunk **em revisão**. A fonte de verdade é o `in_review` no `.sdd.yaml` (preenchido no passo g-bis) — ele sobrevive a reinício/compactação da conversa. Se `in_review` está preenchido (ou o plano foi recém-impresso neste chat) e o usuário faz **qualquer pergunta ou pede qualquer alteração** — sem rodar `/lp-continue` — vale o passo 3 abaixo.

**Isso vale mesmo que a pergunta seja tangencial/conceitual e respondida via outra skill/comando alheio ao SDD** (ex: "explica o que é X" usando uma skill de tirar dúvida qualquer). O gatilho é `in_review` estar preenchido no `.sdd.yaml`, não qual skill respondeu — não deixe o foco na outra skill fazer você esquecer que há uma revisão pendente nesta mesma conversa.

1. Responda a pergunta / aplique a alteração normalmente e explique o que fez (delegando a outra skill se fizer sentido).
2. Se **alterou arquivos**: rode o comando de validação do projeto (não assuma eslint) nos editados e, se o projeto exigir, os testes. A lista pode ter mudado (novos arquivos, novos ±linhas) — reflita isso e atualize `in_review.files` (e o bloco de commit sugerido/`in_review.commit_message`, se `auto_commit` ≠ `off`).
3. **Sempre, no FIM da resposta — nunca pule este passo, mesmo numa resposta puramente explicativa que não tocou em arquivo nenhum — re-imprima a lista de revisão atualizada** (mesmo formato: bloco por arquivo, cabeçalho em negrito + bullets, separados por linha em branco), para o usuário continuar de onde parou sem precisar perguntar "o que eu tava revisando mesmo?":

   ```
   Revisão (na ordem — continue de onde parou):

   **1. caminho/arquivo1.ts** (criado, +N)
   - Faz: <...>.
   - Revisar: <...>.
   - Conecta: <...>.

   **2. caminho/arquivo2.ts** (editado, +N -M)
   - Faz: <...>.
   - Revisar: <...>.
   - Conecta: <...>.
   ```

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
5. **Plano de revisão sempre.** Sem exceções.
5-bis. **Nada se cita só pelo número.** Chunk (`C6`, `F2.C3`), feature/frente (`F3`), onda, opção de solução — etiqueta é referência, não descrição. Em qualquer explicação, transição ou resposta, acompanhe sempre do que aquilo é/faz. Ver `../../helpers/prompts/state-machine.md`.
6. **Não leia specs de outras features** que ainda não foram processadas — elas não existem.
