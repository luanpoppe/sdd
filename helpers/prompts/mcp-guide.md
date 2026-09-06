# MCP guide — o que chamar, quando, com o quê

Guia **operacional**, lido no meio do fluxo. O porquê de tudo isso existir, as consequências de cada modo, o registro no `.mcp.json` e os anti-padrões completos estão em `./mcp-rationale.md`, que só o `lp:init` e o `lp:settings` precisam abrir.

## Toggle

- Campo `mcp` no `.sdd/config.yaml`: `off` (padrão) | `on`.
- **`off` ou ausente = o passo não existe.** Não chame tool, não mencione MCP, não sugira ligar.
- `on` → chame as tools nos pontos dos dois mapas abaixo.

### Granularidade: `mcp_record`

Bloco **opcional**, ausente por padrão. Ausência = **tudo ligado** — ele existe só para desligar partes do registro sem desligar o MCP inteiro.

```yaml
mcp_record:
  symbols: false     # para de gravar métodos com exemplos de entrada/saída
  diff: false        # para de gravar o diff por arquivo (já é o comportamento quando auto_commit: full)
  context: true      # .sdd/context/ no banco
  explain: true      # temas globais do lp:explain no banco
  scenarios: true    # cenários da spec e o vínculo com os chunks
  code_review: true  # achados do code review, amarrados ao chunk
  data_model: true   # entidades modeladas no b-ter, com as decisões e o que foi descartado
```

Chave `false` → **omita aquele campo/chamada**, sem comentar. Chave ausente ou `true` → grave normalmente. Não trate desligado como erro nem sugira religar.

## Mapa passo → tool

Chame a tool **junto** do passo, não num turno separado.

| Onde | Tool | O que mandar |
|---|---|---|
| `lp:new-feature` — criação e fim do grill macro | `sdd_sync_change` | espelho do `.sdd.yaml`: `change_id`, `kind: feature`, `title`, `state`, e `features[]` completo quando o `plan.md` fecha |
| `lp:bug-fix` — criação e fim do diagnóstico | `sdd_sync_change` | `kind: bugfix`, `title`, `state`. Sem `features[]` |
| bug-fix, ao escolher a solução | `sdd_sync_change` | `chosen_solution` + `state: bug-fixing` |
| `lp:continue` — transição de `state` (spec, tasks, feature concluída) | `sdd_sync_change` | o `state` novo e o `features[].status` que mudou |
| fim de um **grill** (macro do `lp:new-feature`, diagnóstico do `lp:bug-fix`, spec de uma feature) | `sdd_record_event` | `kind: note` — as decisões que o grill resolveu e os achados que mudaram o entendimento, em `detail` |
| passo **a**, divergência encontrada | `sdd_record_event` | `kind: deviation`, o que divergiu e o que foi decidido |
| passo **b0**, decisão de modo | `sdd_record_event` | `kind: mode_decision` — o modo e o porquê |
| onda do paralelo, ao anunciar | `sdd_record_event` | `kind: wave_planned`, quais chunks entraram e por que os outros ficaram fora (ver `./parallel-guide.md`) |
| passo **f-bis**, tester rodou | `sdd_record_tests` | runner, passou/falhou, cobertura, o relatório e os arquivos criados |
| passo **g-bis** | `sdd_record_chunk` | **a chamada principal** — o chunk e um item por arquivo, com `does`/`connects`/`review_note` mais `detail`, `highlights`, `symbols` e `diff` (ver abaixo) |
| commit efetivado no `auto_commit: full` | `sdd_record_chunk` | rechame com o `commit` preenchido (`mode: full`, `branch`, `sha`) |
| **ajuste pedido durante a revisão** do chunk | `sdd_record_chunk` | rechame com os arquivos como ficaram, e `sdd_record_event` (`kind: note`) se o ajuste veio de uma decisão |
| `lp:review-walkthrough`, step fechado | `sdd_record_review` | o step com arquivos, `detail`, `highlights` e `symbols` — **a mesma profundidade de um chunk** |
| geração da spec de uma feature | `sdd_sync_change` | `features[].scenarios[]` — os requisitos (BDD ou entrada/saída) e edge cases, com `key` estável (`mcp_record.scenarios`) |
| `lp:context`, ao criar/atualizar uma área | `sdd_record_knowledge` | `kind: context`, o que é a área e como funciona (`mcp_record.context`) |
| `lp:explain`, ao gerar/atualizar um tema | `sdd_record_explain` | o tema **global** (fora de projeto), com `question`, `origin` e o `detail` que a busca precisa alcançar (`mcp_record.explain`) |
| `lp:explain`, ao dar baixa na fila | `sdd_record_explain` | o mesmo slug com `status: "estudado"` |
| passos **c-bis** / **f-ter**, com `code_review: on` | `sdd_record_chunk` | campo `code_review` — um item por achado, com severidade, arquivo, linha, cenário, causa e sugestão (`mcp_record.code_review`) |
| passo **b-ter**, com `data_model: on` | `sdd_record_chunk` | campo `data_model` — um item por entidade, com `shape`, `decisions`, `rejected`, `index_notes` e `migration` (`mcp_record.data_model`) |
| passo de **tasks**, com `flow_storage: mcp` | `sdd_write_tasks` (`mode: "plan"`) | o esqueleto do fluxo — um item por chunk com `component`, sem apagar o que já foi implementado |
| `lp:archive` | `sdd_sync_change` | `archived` + `state: archived` |
| banco perdido, ou período trabalhado com `mcp: off` | `sdd_reindex` | reconstrói o esqueleto a partir do `.sdd/` **e os temas do `lp:explain` a partir de `~/.sdd/explain/`** (globais, varridos mesmo fora de projeto); não recupera explicação por arquivo, exemplo nem decisão |

O **passo g-bis** é o ponto certo para `sdd_record_chunk` porque é o único momento em que você já tem tudo junto: o relatório do implementer, a ordem de revisão e a `commit_message`. É o mesmo passo em que você já grava `in_review` — as duas escritas andam juntas.

#### Ajuste durante a revisão → regrave o chunk

O chunk registrado no g-bis é o chunk **como ele estava naquele instante**. Se o usuário pedir alteração enquanto ele está em revisão, o código muda e o registro fica descrevendo uma versão que não existe mais — pior que registro nenhum, porque parece atual.

Então, sempre que atender um pedido de alteração num chunk em revisão (ver `./state-machine.md`, "Perguntas/alterações durante a revisão"):

1. **Rechame `sdd_record_chunk`** com **os arquivos que mudaram** — `does`/`connects`/`review_note` iguais à lista que você acabou de reimprimir, mais `detail` e `highlights` refletindo a mudança. A tool faz upsert por caminho: rechamar corrige, não duplica.

   A regravação é **parcial e aditiva**, e isso muda o que você precisa mandar:

   - **Campo ausente preserva.** Mandar só `summary` corrige o resumo e não encosta no relatório por arquivo.
   - **Arquivo não citado fica intacto.** Você não precisa reenviar os três arquivos do chunk para corrigir um.
   - **Sumir da lista não apaga.** Para tirar um arquivo do chunk, mande `{ "path": "...", "drop": true }` — é o único jeito.
   - **Cuidado com o meio-termo:** citar um arquivo e omitir `symbols` preserva os símbolos dele; citar e mandar `"symbols": []` apaga. Lista vazia é um pedido explícito de apagar.
2. **Chame `sdd_record_event` (`kind: note`)** quando o ajuste veio de uma **decisão** — "põe um CHECK no banco", "troca soft delete por hard delete", "esse campo passa a ser nulável". O arquivo mostra o quê; só o evento guarda o porquê e o que foi descartado.
3. **Chame `sdd_sync_change`** se o ajuste mudou um cenário da spec.

Vale o mesmo argumento do bloco de commit reimpresso: rechamar uma tool é barato, e descobrir na próxima conversa que o banco descreve o código errado, não. **Não espere o usuário perguntar "você registrou isso?"** — se ele precisou perguntar, o registro já falhou.

### O que preencher em `sdd_record_chunk`

Um item de `files` por arquivo do plano de revisão, **na mesma ordem**:

- `does` ← a linha `Faz` · `connects` ← a linha `Conecta` · `review_note` ← a linha `Revisar`. Texto igual ao que você imprimiu; não resuma mais, não invente outro.
- `is_test: true` nos arquivos criados no passo f-bis.
- `summary` do chunk = o que ele fez em prosa. `reasoning` = o *por quê* / como conecta com o macro, o mesmo conteúdo do passo b-bis.
- `started_at` / `finished_at` em ISO 8601 **com hora** — é o que permite medir duração. Omitidos, o servidor usa a hora da chamada.

#### O banco guarda MAIS do que o chat mostra

O plano de revisão no chat tem que ser **escaneável** (1-2 frases por linha). Os dois campos abaixo não têm equivalente no chat e **não devem ser impressos lá**:

- **`detail`** — a explicação longa do arquivo: o mecanismo, o fluxo de dados, o que foi decidido **e o que foi descartado e por quê**, armadilhas. Alvo 3-8 frases. O leitor deve entender o arquivo **sem abrir o código**.
- **`highlights`** — os trechos que **decidem** o arquivo, na ordem de leitura, cada um com `label`, `snippet` e `explanation` (mais `lines`/`language` quando você os tem). Entra: regra de negócio, query, tratamento de erro, decisão de concorrência, ponto onde o dado muda de forma. Não entra: import, boilerplate, getter, arquivo inteiro colado.

**0 a 3 destaques por arquivo.** Arquivo trivial (DTO, contrato, barrel) não precisa de nenhum, e `detail` nele pode ser uma frase ou nada. Concentre nos 1-2 arquivos que carregam o chunk. `snippet` de 5-25 linhas; se precisa de mais, provavelmente são dois destaques.

##### O piso — e ele é mais importante que o teto

Os limites acima são **teto**, e teto lido sozinho vira licença para gravar nada. O que estraga o registro na prática não é excesso: é o chunk inteiro entrar com `detail` de duas frases, zero destaque e zero símbolo, e ninguém — nem você, na próxima conversa — conseguir dizer o que aquele código faz sem abrir os arquivos.

- **Chunk sem nenhum destaque em nenhum arquivo não deveria existir.** A exceção é o chunk puramente mecânico: rename, mover arquivo, ajuste de config, barrel. Se o chunk implementou comportamento e você não achou um trecho que decide, você não procurou.
- **Arquivo criado do zero nunca é trivial por ser novo.** Um arquivo de 80 linhas com uma classe de validação carrega regra; que ele não existisse ontem não muda isso.
- **Regra vira destaque, sempre.** Validação, cálculo, política de erro, decisão de nulidade, condição que mudou de lugar. O trecho que ninguém reconstrói lendo só o nome do método é exatamente o que precisa estar aqui.
- **Teste do `detail`**: ele responde *o que acontece com uma entrada inválida* e *por que assim e não do outro jeito*? Se não, ele é o `does` esticado. Reescreva ou apague — `detail` que repete o `does` é pior que ausente, porque ocupa o lugar do que faltou.

Antes de mandar o `sdd_record_chunk`, olhe o pacote e responda: *alguém que nunca viu este chunk entende o que ele faz só com o que estou gravando?* Se a resposta é não, falta destaque ou falta símbolo — e você ainda está com os arquivos em mão.

#### `symbols` — os métodos, com entrada e saída de verdade

Responde a pergunta que trecho de código não responde: **o que isso faz quando roda**. Um item por método/função/endpoint que carrega comportamento.

```json
{
  "name": "JulgadoUsuarioResolver.ResolverNomesAsync",
  "kind": "method",
  "signature": "Task<IReadOnlyDictionary<Guid, string>> ResolverNomesAsync(Guid tenantId, IEnumerable<Guid> ids, CancellationToken ct)",
  "purpose": "Traduz ids de usuário em nomes, resolvendo em lote e servindo do cache o que já foi visto.",
  "examples": [
    {
      "label": "página com o mesmo usuário repetido",
      "input":  { "tenantId": "trf-4", "ids": ["7c1e…a4", "7c1e…a4", "b902…10"] },
      "output": { "7c1e…a4": "Maria Andrade", "b902…10": "João Petrucci" },
      "note": "3 ids viram 1 chamada ao Keycloak: o repetido é deduplicado."
    },
    {
      "label": "Keycloak fora do ar",
      "input":  { "tenantId": "trf-4", "ids": ["7c1e…a4"] },
      "output": { "7c1e…a4": "7c1e…a4" },
      "note": "Degrada para o id cru e loga Warning; a listagem continua respondendo.",
      "is_edge": true
    }
  ]
}
```

Regras que fazem o exemplo ensinar em vez de só ilustrar:

- **Dado plausível do domínio.** `"0029876-12.2024"`, `"Maria Andrade"` — nunca `"foo"`, `"bar"`, `"string1"`.
- **Ao menos um caso de borda ou falha** por símbolo que tenha um, com `is_edge: true`: lista vazia, dependência fora do ar, limite estourado, permissão negada. Mesma exigência que o `./tester-guide.md` faz dos testes, e pelo mesmo motivo.
- **`note` diz o que o caso prova**, não repete o que se vê. *"3 ids viram 1 chamada"* informa; *"retorna os nomes"* não.
- **Pule símbolo trivial**: getter, construtor, DTO, barrel, mapper de uma linha — o que não tem lógica nenhuma.
- **Todo o resto é obrigatório: um símbolo por método novo ou alterado do arquivo**, não só o principal. Método que valida, calcula, filtra, escolhe entre dois caminhos ou lança erro precisa do seu próprio item, com exemplos. O nome diz que valida; só o exemplo diz que `rating` nulo passa e `0` não.
- **Um exemplo por caminho que o método decide**, não um por método: o que passa, o que é rejeitado (com a mensagem de erro real) e a saída antecipada (o `if` que retorna sem fazer nada). São esses três que a pessoa precisa e que o código esconde.

##### `calls` — a cadeia dentro do arquivo

Quando um método chama outro **do mesmo arquivo**, liste os nomes em `calls`, na ordem em que ele chama. É o que transforma uma lista de métodos soltos numa cadeia legível, e é a primeira coisa que se perde quando alguém lê o arquivo por cima.

```json
{
  "name": "UserMovieEntryValidationUtils.assertValidUpsertInput",
  "kind": "method",
  "signature": "static assertValidUpsertInput(tmdbId: number, patch: UserMovieEntryPatch): void",
  "purpose": "Porta de entrada da validação do upsert: valida o identificador do filme e, só então, o patch.",
  "calls": ["assertValidTmdbId", "assertValidPatch"],
  "examples": [
    {
      "label": "patch parcial sem rating",
      "input": { "tmdbId": 27205, "patch": { "watched": true } },
      "output": "void (nada lançado)",
      "note": "assertValidPatch sai cedo pelo Object.hasOwn: rating ausente não é rating inválido."
    },
    {
      "label": "rating fora da faixa",
      "input": { "tmdbId": 27205, "patch": { "rating": 0 } },
      "output": "UserMovieEntryValidationException: rating must be an integer between 1 and 10, received 0",
      "note": "A faixa é 1-10, então 0 é rejeitado no domínio antes de chegar no CHECK do Postgres.",
      "is_edge": true
    },
    {
      "label": "tmdbId inválido",
      "input": { "tmdbId": 0, "patch": { "watched": true } },
      "output": "UserMovieEntryValidationException: tmdbId must be a positive integer, received 0",
      "note": "Falha no primeiro elo da cadeia — o patch nem chega a ser olhado.",
      "is_edge": true
    }
  ]
}
```

Três coisas que só esse pacote conta, e que nenhum `does` de uma linha contaria: a ordem da validação, o motivo de `rating` ausente ser diferente de `rating` nulo, e qual erro concreto cada entrada produz.

#### `scenario_keys` — qual cenário este chunk implementa

Se a spec foi registrada com `scenarios[]`, mande as `key` dos cenários que este chunk implementa. É o que responde *"quais cenários ficaram sem chunk nenhum?"*.

Chave que não existe é ignorada em silêncio — a spec pode ter sido escrita com o MCP desligado, e travar o registro por uma referência solta seria pior que perder o vínculo.

#### `diff` — o que mudou, literalmente

> **Não mande `diff` quando `auto_commit: full`.** Nesse modo o chunk vira commit e o git já guarda o mesmo diff, completo e sem corte. Regravá-lo é pagar duas vezes pelo mesmo conteúdo, e o `diff` é o único campo do registro que escala com o tamanho do chunk em vez de ser curadoria.
>
> Com `suggest-only` (padrão) ou `off`, mande normalmente: aí não há garantia de commit, e o banco é o único lugar onde o diff sobrevive. `mcp_record.diff: false` explícito desliga sempre.

Só de arquivo **modificado**: em arquivo criado o diff seria o arquivo inteiro, e os destaques já cumprem o papel. Diff unificado, cortado em ~200 linhas. Se o arquivo mudou mais que isso, o chunk provavelmente devia ter sido dividido.

O `content_hash` **não é seu problema** — o servidor calcula sozinho lendo o arquivo do disco.

## Mapa: quando LER do banco

Sem os pontos abaixo, o SDD grava uma memória que nunca consulta.

| Onde | Tool | Por quê |
|---|---|---|
| `lp:continue`, **antes de implementar um chunk** (passo b, depois de saber quais arquivos ele toca) | `sdd_recall` com os caminhos ou o nome da classe/módulo | Descobre que aqueles arquivos já foram tocados, com que decisão e com quais exemplos. Evita refazer escolha já feita ou contradizê-la sem perceber. |
| `lp:bug-fix`, na investigação da causa raiz | `sdd_recall` com o sintoma, o arquivo suspeito ou a área | Um bug na mesma área pode já ter sido diagnosticado — inclusive em conversa que você não viu. |
| `lp:new-feature`, durante o grill macro | `sdd_recall` com o tema da mudança | Mostra o que já existe antes de você perguntar ao usuário coisas que o histórico responde. |
| `lp:review-walkthrough`, ao montar o plano de steps | `sdd_recall` com o tema do review | Reaproveita explicação e exemplos já escritos em vez de reconstruí-los do zero. |
| `lp:ask` / `lp:status`, pergunta sobre trabalho anterior | `sdd_query_history` | Responde "onde paramos" e "o que foi feito" sem reler `.sdd/`. |
| `lp:explain`, antes de criar tema novo | `sdd_read_explain` com `status: "todos"` | Evita `jwt` e `json-web-token` como dois temas. |
| o usuário pergunta o que tem para estudar | `sdd_read_explain` | A fila do que ficou `aberto`, do mais antigo. |

Regras para não virar ruído:

- **Uma chamada, não um laço.** Uma busca por passo basta; não achou nada, siga.
- **Não anuncie a busca.** Se não achou nada, fique quieto. Se achou algo que muda a decisão, diga o que achou e o que muda.
- **Achado é contexto, não ordem.** Nos modos `file`, o próximo chunk continua saindo do `tasks.md` e o estado do `.sdd.yaml`.
- **Considere `all_projects: true`** quando a dúvida é de biblioteca, padrão ou stack, e não do projeto em si.
- **Os temas do `lp:explain` sempre entram no `sdd_recall`**, com ou sem `all_projects`: a tabela não tem projeto. Uma explicação escrita noutro repositório é resposta legítima aqui.

### O `detail` dos eventos é onde a decisão fica legível

O `summary` é a linha da timeline — uma frase. O **`detail`** é um objeto livre, e é ele que faz o evento valer meses depois. Agrupe por conceito:

```json
{
  "grill": { "profundidade": "...", "fronteira": "..." },
  "achados": { "sintoma_reenquadrado": "...", "causa_raiz": "...", "evidencia": "..." },
  "clickup": { "subtask": "86e34gwq7", "status": "em andamento" }
}
```

Chaves livres, em `snake_case`, nomeadas pelo conceito (`causa_raiz`, `motivo`) e não por abreviação — o SDD Viewer as exibe como rótulo, e objeto aninhado vira seção na tela.

Vale registrar: o que foi decidido e o que ficou de fora, o achado que reenquadrou o problema (o mais valioso), a evidência que sustenta a conclusão, e ponteiros externos (card, ticket, PR). Não vale repetir o que já está no `diagnosis.md`/`plan.md`.

## `tasks_storage: mcp` — o plano de chunks no banco

Campo `tasks_storage`: `file` (padrão) | `mcp`. Com `file`, nada muda e as tools `sdd_write_tasks`/`sdd_read_tasks` não são usadas.

Com **`mcp`**:

- Ao gerar o plano de uma feature (ou da correção, no bug-fix), **não escreva `tasks.md`**. Chame `sdd_write_tasks` com um item por chunk: `chunk_id`, `title`, `files`, `depends_on`, `review_order`, e as listas `faz` e `validacao` (um item por checkbox).
- Para saber o próximo chunk, **não leia arquivo**: `sdd_read_tasks` devolve os chunks na ordem, os checkboxes e o `next_pending`.
- Para marcar o chunk como feito, mande `mark: "~"` no `sdd_record_chunk`. O status é derivado dos checkboxes, nunca gravado à parte.
- Divisão de chunk em sub-chunks: rechame `sdd_write_tasks` com o plano inteiro corrigido. A escrita é sempre substituição total.

> **Neste modo o MCP deixa de ser opcional.** Sem `tasks.md` não existe arquivo do qual re-derivar o plano, então tool indisponível **trava** o passo. Diga isso ao usuário em vez de reconstruir o plano de cabeça — inventar chunks que não estão no banco é pior que parar. Consequências de ligar: ver `./mcp-rationale.md`.

## `state_storage: mcp` — o bloco volátil do `.sdd.yaml` no banco

Campo `state_storage`: `file` (padrão) | `mcp`. Com `file`, nada muda e as tools `sdd_write_state`/`sdd_read_state` não são usadas.

Com **`mcp`**, o arquivo é dividido por churn.

**Fica no arquivo, versionado** — a identidade da mudança, que muda uma vez ou nunca:

```yaml
id: anonimizar-texto
title: Anonimizar texto de julgados
kind: bugfix            # só em bug-fix
created: 2026-09-04
format: md
lang: pt-BR
chunk_size: medium
features:               # a lista e a ORDEM continuam aqui; só o status sai
  - slug: filtros
    title: Filtros combináveis
    summary: Combina período e usuário na mesma consulta.
```

**Vai para o banco** — o que muda a cada passo: `state`, `current_feature`, `current_chunk`, `in_review`, `updated` e o `status` de cada feature.

Como usar:

- Onde hoje você reescreveria esses campos, chame `sdd_write_state`. **Campo ausente do payload é preservado; campo mandado como `null` é apagado** — é assim que se limpa `current_chunk` ao fechar uma feature.
- Onde hoje você leria esses campos (passo a do `lp:continue`, `lp:help`, retomada após compactação), chame `sdd_read_state`.
- O `sdd_sync_change` continua sendo chamado normalmente: ele espelha a metade que ficou no arquivo. Quem governa o bloco volátil é o `sdd_write_state`, e só ele.

> **Neste modo o MCP deixa de ser opcional**, pelo mesmo motivo. Tool indisponível **trava** o passo. Nunca chute o estado a partir dos artefatos presentes em disco — abrir uma spec porque "parece que falta" é pior que parar. Consequências de ligar: ver `./mcp-rationale.md`.

## Degradação — regra dura

Com `mcp: on`, as tools podem não estar lá: sessão não reiniciada depois de ligar, servidor falhou ao subir, harness sem suporte a MCP.

**Nesse caso: um aviso de uma linha, uma vez por conversa, e siga o fluxo normal.** Nunca bloqueie, nunca insista, nunca pergunte, nunca fique tentando a cada passo.

```
Nota: MCP do SDD não está disponível nesta sessão — o histórico deste chunk não foi gravado. Reinicie a sessão para ativar.
```

Se uma tool específica falhar (erro de validação, mudança não sincronizada), a mensagem do erro já diz o que fazer — corrija a chamada uma vez; se falhar de novo, avise em uma linha e siga.

A exceção são os dois modos `mcp` acima, em que travar é o comportamento correto.

## Quem chama e o que não fazer

**O agente principal, direto — não o escriba.** Chamar tool MCP não é escrever arquivo, então não viola a regra tudo-ou-nada do `./scribe-guide.md`. E não há garantia de que um subagente enxergue as tools da sessão.

- **Uma chamada por ponto do mapa** — mas **regravar o mesmo chunk depois de alterá-lo não é duplicar**, é corrigir (upsert parcial: ausente preserva). O que polui a timeline é gravar o mesmo estado duas vezes, não gravar um estado novo.
- **Nunca imprima `detail`/`highlights` no chat.** Eles existem para o plano de revisão poder continuar curto.
- **Nunca pare o passo por falha de tool** (fora dos dois modos `mcp`). O trabalho acontece; o registro é o que pode faltar.
- **Nunca sugira ligar o MCP quando está `off`.**
- **Nunca peça ao usuário para preencher payload.** Tudo que as tools querem você já tem em mão no passo.
- **Nunca deixe o banco descrevendo código que você acabou de mudar.** Alterou arquivo de um chunk já registrado → rechame `sdd_record_chunk` no mesmo turno.

Os anti-padrões de **qualidade do conteúdo** (destaque sem curadoria, exemplo com `foo`/`bar`, só caminho feliz, `detail` que repete o `does`) estão em `./mcp-rationale.md`.
