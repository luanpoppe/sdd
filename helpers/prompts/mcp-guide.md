# MCP guide — persistir cada etapa do SDD no banco

O SDD produz muita informação estruturada que hoje **morre no chat**: o relatório `Faz`/`Conecta`/`Revisar` por arquivo, a decisão sequencial-vs-paralelo do passo b0, a composição das ondas do paralelo, as divergências do auto-sync, o relatório do tester. Nada disso sobrevive a fechar a conversa. E o `.sdd.yaml` só guarda data (`updated: YYYY-MM-DD`), sem hora — então não existe noção de duração.

O MCP `sdd` é um servidor local, **opcional**, que recebe essas etapas e grava num SQLite. Dois ganhos independentes:

1. **Visualização** — o SDD Viewer passa a mostrar timeline de chunks e o que revisar por arquivo, coisas que ele não tem como extrair do markdown.
2. **Memória** — as tools de leitura (`sdd_query_history`, `sdd_recall`) respondem *"o que já mexemos no `AuthService`?"* e *"onde paramos?"* sem reler nada, inclusive de outro projeto e de conversa já compactada.

## Toggle

- Campo `mcp` no `.sdd/config.yaml`: `off` (padrão) | `on`.
- **`off` ou ausente = o passo não existe.** Não chame tool, não mencione MCP, não sugira ligar. O fluxo é exatamente o de hoje.
- `on` → chame as tools nos pontos do mapa abaixo.

### Granularidade: `mcp_record`

Bloco **opcional**, ausente por padrão. Ausência = **tudo ligado** — ele existe só para desligar partes do registro sem desligar o MCP inteiro.

```yaml
mcp_record:
  symbols: false     # para de gravar métodos com exemplos de entrada/saída
  diff: false        # para de gravar o diff por arquivo
  context: true      # .sdd/context/ no banco
  explain: true      # temas do lp:explain no banco
  scenarios: true    # cenários da spec e o vínculo com os chunks
```

Chave `false` → **omita aquele campo/chamada**, sem comentar. Chave ausente ou `true` → grave normalmente. Não trate desligado como erro nem sugira religar.

## O banco

`~/.sdd/sdd.db`. Único para todos os projetos, com a tabela `projects` separando os repositórios — o que permite consulta cruzada (*"o que fiz esta semana em todos os repos"*) e faz o histórico sobreviver a apagar o `.sdd/` de um projeto.

Não fica em `~/.claude/skills/` nem em `~/.cursor/lp-helpers/` porque o installer apaga esses dois a cada atualização (mesmo motivo do `~/.sdd/config.yaml` — ver `./global-config-guide.md`).

> **O banco é índice e log derivado, nunca fonte de verdade.** O markdown e o YAML em `.sdd/` continuam a verdade. Apagar o `sdd.db` degrada a visualização e não corrompe projeto nenhum. Corolário prático: **nunca leia estado de fluxo do banco para decidir um passo** — o próximo chunk sai do `tasks.md`, o estado sai do `.sdd.yaml`. As tools de leitura servem para dar contexto ao usuário e a você, não para substituir o `.sdd/`.

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
| passo **b0**, decisão de modo | `sdd_record_event` | `kind: mode_decision` — **fecha um buraco real**: hoje essa decisão é perguntada 1× por feature e não é persistida em lugar nenhum |
| onda do paralelo, ao anunciar | `sdd_record_event` | `kind: wave_planned`, quais chunks entraram e por que os outros ficaram fora (ver `./parallel-guide.md`) |
| passo **f-bis**, tester rodou | `sdd_record_tests` | runner, passou/falhou, cobertura, o relatório e os arquivos criados |
| passo **g-bis** | `sdd_record_chunk` | **a chamada principal** — o chunk e um item por arquivo, com `does`/`connects`/`review_note` mais `detail`, `highlights`, `symbols` e `diff` (ver abaixo) |
| commit efetivado no `auto_commit: full` | `sdd_record_chunk` | rechame com o `commit` preenchido (`mode: full`, `branch`, `sha`) |
| `lp:review`, step fechado | `sdd_record_review` | o step com arquivos, `detail`, `highlights` e `symbols` — **a mesma profundidade de um chunk** |
| geração da spec de uma feature | `sdd_sync_change` | `features[].scenarios[]` — os cenários BDD e edge cases, com `key` estável (`mcp_record.scenarios`) |
| `lp:context`, ao criar/atualizar uma área | `sdd_record_knowledge` | `kind: context`, o que é a área e como funciona (`mcp_record.context`) |
| `lp:explain`, ao gerar/atualizar um tema | `sdd_record_knowledge` | `kind: explain`, o tema e o essencial do que foi explicado (`mcp_record.explain`) |
| `lp:archive` | `sdd_sync_change` | `archived` + `state: archived` |
| banco perdido, ou período trabalhado com `mcp: off` | `sdd_reindex` | reconstrói o esqueleto a partir do `.sdd/` |

O **passo g-bis** é o ponto certo para `sdd_record_chunk` porque é o único momento em que você já tem tudo junto: o relatório do implementer, a ordem de revisão e a `commit_message`. É o mesmo passo em que você já grava `in_review` no `.sdd.yaml` — as duas escritas andam juntas.

### O que preencher em `sdd_record_chunk`

É a tool que carrega o valor todo, então vale detalhar. Um item de `files` por arquivo do plano de revisão, **na mesma ordem**:

- `does` ← a linha `Faz` · `connects` ← a linha `Conecta` · `review_note` ← a linha `Revisar`. Texto igual ao que você imprimiu; não resuma mais, não invente outro.
- `is_test: true` nos arquivos criados no passo f-bis.
- `summary` do chunk = o que ele fez em prosa. `reasoning` = o *por quê* / como conecta com o macro, o mesmo conteúdo do passo b-bis.
- `started_at` / `finished_at` em ISO 8601 **com hora** — é o que o `.sdd.yaml` não tem e o que permite medir duração. Omitidos, o servidor usa a hora da chamada.

#### O banco guarda MAIS do que o chat mostra

Esta é a regra que faz a feature valer a pena. O plano de revisão no chat tem que ser **escaneável** — 1-2 frases por linha, senão ninguém lê. Mas quem abre o histórico depois (no SDD Viewer, ou você mesmo numa conversa nova) quer **profundidade**. Então os dois campos abaixo não têm equivalente no chat e **não devem ser impressos lá**:

- **`detail`** — a explicação longa do arquivo, livre do limite de 1-2 frases: o mecanismo de verdade, o fluxo de dados que passa por ele, o que foi decidido **e o que foi descartado e por quê**, armadilhas de quem for mexer depois. Alvo: 3-8 frases. O teste é o mesmo do plano de revisão, mas mais exigente: o leitor deve entender o arquivo **sem abrir o código**.
- **`highlights`** — os trechos de código que **decidem** o arquivo, na ordem de leitura, cada um com `label`, `snippet` e `explanation` (e `lines`/`language` quando você os tem). O que entra aqui: a regra de negócio, a query, o tratamento de erro, a decisão de concorrência, o ponto onde o dado muda de forma. O que **não** entra: import, boilerplate, getter, o arquivo inteiro colado.

Quantos destaques por arquivo: **0 a 3**. Arquivo trivial (DTO, contrato, barrel) não precisa de nenhum — e `detail` nele pode ser uma frase ou nada. Concentre o esforço nos 1-2 arquivos que realmente carregam o chunk; foi neles que a revisão vai gastar tempo.

Recorte o `snippet`: 5-25 linhas, o suficiente para o trecho se explicar. Se precisa de mais que isso, provavelmente são dois destaques.

#### `symbols` — os métodos, com entrada e saída de verdade

O campo que responde a pergunta que trecho de código não responde: **o que isso faz quando roda**. Um item por método/função/endpoint que carrega comportamento, com `name`, `signature`, `purpose` e os `examples`.

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

- **Dado plausível do domínio.** `"7c1e…a4"`, `"0029876-12.2024"`, `"Maria Andrade"` — nunca `"foo"`, `"bar"`, `"string1"`. O exemplo só convence quem reconhece o dado.
- **Ao menos um caso de borda ou falha** por símbolo que tenha um, marcado com `is_edge: true`: lista vazia, dependência fora do ar, limite estourado, permissão negada. É a mesma exigência que o `./tester-guide.md` faz dos testes, e pelo mesmo motivo — o caminho feliz raramente é onde mora a dúvida.
- **`note` diz o que o caso prova**, não repete o que se vê. *"3 ids viram 1 chamada"* informa; *"retorna os nomes"* não.
- **Pule símbolo trivial**: getter, construtor, DTO, barrel, mapper de uma linha. Um símbolo por arquivo já é bastante; três é quase sempre demais.

Símbolo é o que destrava a pergunta *"tudo que já mexemos no `ResolverNomesAsync`"* — histórico em nível de método, não de arquivo.

#### `scenario_keys` — qual cenário este chunk implementa

Se a spec da feature foi registrada com `scenarios[]`, mande em cada chunk as `key` dos cenários que ele implementa. É o que transforma duas listas soltas em rastreabilidade: dá para responder *"o cenário CT-03 está coberto por qual chunk?"* e, o mais útil, *"quais cenários ficaram sem chunk nenhum?"*.

Chave que não existe é ignorada em silêncio — a spec pode ter sido escrita numa conversa com o MCP desligado, e travar o registro do chunk por causa de uma referência solta seria pior que perder o vínculo.

#### `diff` — o que mudou, literalmente

Só de arquivo **modificado**: em arquivo criado o diff seria o arquivo inteiro, e para esse caso os destaques já cumprem o papel. Diff unificado, cortado em ~200 linhas. Se o arquivo mudou mais que isso, o chunk provavelmente devia ter sido dividido.

O `content_hash` **não é seu problema** — o servidor calcula sozinho lendo o arquivo do disco, e é o que permite ao SDD Viewer avisar depois que a explicação foi escrita contra outra versão do código.

## Mapa: quando LER do banco

As tools de escrita alimentam o histórico; as de leitura são o que faz esse histórico
te servir de volta. Sem os pontos abaixo, o SDD grava uma memória que nunca consulta.

| Onde | Tool | Por quê |
|---|---|---|
| `lp:continue`, **antes de implementar um chunk** (passo b, depois de saber quais arquivos ele toca) | `sdd_recall` com os caminhos ou o nome da classe/módulo | Descobre que aqueles arquivos já foram tocados, com que decisão e com quais exemplos de entrada/saída. Evita refazer escolha já feita ou contradizê-la sem perceber. |
| `lp:bug-fix`, na investigação da causa raiz | `sdd_recall` com o sintoma, o arquivo suspeito ou a área | Um bug na mesma área pode já ter sido diagnosticado — inclusive em conversa que você não viu. |
| `lp:new-feature`, durante o grill macro | `sdd_recall` com o tema da mudança | Mostra o que já existe sobre aquilo antes de você perguntar ao usuário coisas que o histórico responde. |
| `lp:review`, ao montar o plano de steps | `sdd_recall` com o tema do review | Reaproveita explicação e exemplos já escritos em vez de reconstruí-los do zero. |
| `lp:ask` / `lp:status`, pergunta sobre trabalho anterior | `sdd_query_history` | Responde "onde paramos" e "o que foi feito" sem reler `.sdd/`. |

Regras para não virar ruído:

- **Uma chamada, não um laço.** Uma busca por passo basta; se não achou nada, siga — ausência de histórico é o caso normal em projeto novo.
- **Não anuncie a busca.** Se não achou nada, fique quieto. Se achou algo que muda a decisão, diga o que achou e o que muda — aí sim vale uma linha.
- **O que o banco diz não manda no fluxo.** Achado é contexto, não ordem: o próximo chunk continua saindo do `tasks.md`, o estado do `.sdd.yaml`.
- **Considere `all_projects: true`** quando a dúvida é de biblioteca, padrão ou stack, e não do projeto em si — foi para isso que o banco é global.

### O `detail` dos eventos é onde a decisão fica legível

O `summary` é a linha da timeline — uma frase. O **`detail`** é um objeto livre, e é ele que faz o evento valer meses depois. Agrupe por conceito em vez de despejar texto corrido:

```json
{
  "grill": { "profundidade": "...", "fronteira": "..." },
  "achados": { "sintoma_reenquadrado": "...", "causa_raiz": "...", "evidencia": "..." },
  "clickup": { "subtask": "86e34gwq7", "status": "em andamento" }
}
```

As chaves são livres e em `snake_case` — quem consome (o SDD Viewer) as exibe como rótulo, então nomeie pelo conceito (`causa_raiz`, `motivo`, `decisao_1`), não com abreviação. Objeto aninhado é bem-vindo: vira seção na tela.

O que vale registrar num grill: **o que foi decidido e o que ficou de fora**, o achado que reenquadrou o problema (o mais valioso — é o que ninguém lembra depois), a evidência que sustenta a conclusão, e ponteiros externos (card, ticket, PR). O que não vale: repetir o que já está no `diagnosis.md`/`plan.md` — o banco é índice, não cópia.

## `tasks_storage: mcp` — o plano de chunks no banco

Campo `tasks_storage` do `.sdd/config.yaml`: `file` (padrão) | `mcp`.

Com `file`, nada muda: o `tasks.md` é gerado, lido e marcado como sempre, e as tools `sdd_write_tasks`/`sdd_read_tasks` não são usadas.

Com **`mcp`**:

- Ao gerar o plano de uma feature (ou da correção, no bug-fix), **não escreva `tasks.md`**. Chame `sdd_write_tasks` com um item por chunk: `chunk_id`, `title`, `files`, `depends_on`, `review_order`, e as listas `faz` e `validacao` (um item por checkbox).
- Para saber o próximo chunk, **não leia arquivo**: chame `sdd_read_tasks`. Ele devolve os chunks na ordem, os checkboxes de cada um e o `next_pending`.
- Para marcar o chunk como feito (o que seria trocar `[ ]` por `[~]`), mande `mark: "~"` no `sdd_record_chunk`. O status do chunk é derivado dos checkboxes, nunca gravado à parte.
- Divisão de chunk em sub-chunks: rechame `sdd_write_tasks` com o plano inteiro corrigido. A escrita é sempre substituição total, nunca parcial.

> **Neste modo o MCP deixa de ser opcional.** É a única exceção à regra de degradação: sem `tasks.md`, não existe arquivo do qual re-derivar o plano, então tool indisponível **trava** o passo em vez de degradar. Diga isso ao usuário em vez de tentar reconstruir o plano de cabeça — inventar chunks que não estão no banco é pior que parar.
>
> Consequências que valem ser ditas quando o modo é ligado: o plano sai do repositório (some da revisão de PR e do histórico do git), e o `sdd_reindex` não o recupera, porque ele só reconstrói o que tem origem em arquivo.

## `state_storage: mcp` — o bloco volátil do `.sdd.yaml` no banco

Campo `state_storage` do `.sdd/config.yaml`: `file` (padrão) | `mcp`.

Com `file`, nada muda: o `.sdd.yaml` guarda tudo e as tools `sdd_write_state`/`sdd_read_state` não são usadas.

Com **`mcp`**, o arquivo é dividido em duas metades por critério de churn:

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

- Onde hoje você reescreveria esses campos no `.sdd.yaml`, chame `sdd_write_state`. **Campo ausente do payload é preservado; campo mandado como `null` é apagado** — é assim que se limpa `current_chunk` ao fechar uma feature.
- Onde hoje você leria esses campos (passo a do `lp:continue`, `lp:help`, retomada após compactação), chame `sdd_read_state`.
- O `sdd_sync_change` continua sendo chamado normalmente: ele espelha a metade que ficou no arquivo (título, lista e ordem das features, cenários). Quem governa o bloco volátil é o `sdd_write_state`, e só ele.

> **Neste modo o MCP deixa de ser opcional**, pelo mesmo motivo do `tasks_storage: mcp`: sem os campos no arquivo, não há de onde re-derivar em que passo a mudança está. Tool indisponível **trava** o passo. Nunca chute o estado a partir dos artefatos presentes em disco — abrir uma spec porque "parece que falta" é pior que parar.
>
> Consequências que valem ser ditas quando o modo é ligado: o `git log` do `.sdd.yaml` para de mostrar o avanço da mudança (passa a mostrar só mudança de escopo, o que para alguns é justamente o ganho), e o `sdd_reindex` não recupera o bloco volátil.

## Quem chama

**O agente principal, direto — não o escriba.**

A regra tudo-ou-nada do `./scribe-guide.md` vale para escrita **de arquivo** em `.sdd/`; chamar uma tool MCP não é escrever arquivo, então não a viola. E o principal é quem decide o conteúdo — passar a decisão ao escriba só pra ela voltar seria indireção, além de não haver garantia de que um subagente enxergue as tools MCP da sessão.

## `sdd_reindex` — reconstruir o esqueleto

O banco é índice derivado, e essa promessa só se sustenta porque há como re-derivá-lo. O `sdd_reindex` lê o `.sdd/` do projeto e reconstrói mudanças, features, chunks e status.

Use quando: o banco foi apagado, houve um período de trabalho com `mcp: off`, ou você suspeita de divergência entre banco e arquivos. Rode com `dry_run: true` primeiro se quiser só o relatório.

**O que ele NÃO recupera**, e por quê: explicações por arquivo, destaques, símbolos com exemplos, decisões, testes, commits e steps de review **não têm origem fora do banco**. A tool devolve essa lista explicitamente — reporte-a ao usuário em vez de dizer que o histórico foi restaurado.

## Degradação — regra dura

Com `mcp: on`, as tools podem não estar lá: sessão não reiniciada depois de ligar, servidor falhou ao subir, harness sem suporte a MCP.

**Nesse caso: um aviso de uma linha, uma vez por conversa, e siga o fluxo normal.** Nunca bloqueie, nunca insista, nunca pergunte, nunca fique tentando a cada passo.

```
Nota: MCP do SDD não está disponível nesta sessão — o histórico deste chunk não foi gravado. Reinicie a sessão para ativar.
```

Se uma tool específica falhar (erro de validação, mudança não sincronizada), a mensagem do erro já diz o que fazer — corrija a chamada uma vez; se falhar de novo, avise em uma linha e siga.

## Registro no harness

O `lp:init` grava, se o usuário aprovar, o servidor no arquivo do harness detectado — `.mcp.json` na raiz (Claude Code) ou `.cursor/mcp.json` (Cursor). **Merge, nunca sobrescrita**: se o arquivo já existe, acrescente só a chave `sdd` dentro de `mcpServers`.

```json
{
  "mcpServers": {
    "sdd": {
      "command": "node",
      "args": ["<HOME>/.sdd/mcp/server.js"]
    }
  }
}
```

- `<HOME>` resolvido para caminho absoluto na hora de escrever.
- O servidor descobre o projeto pelo diretório de trabalho. `SDD_PROJECT_ROOT` sobrescreve, e `SDD_DB_PATH` aponta para um banco descartável — as duas só para teste; **não escreva nenhuma das duas no `.mcp.json` de um projeto real**.
- Precisa de **Node 23+** (o banco usa `node:sqlite`). Abaixo disso o servidor sai com uma mensagem explicando, e o `lp:init` nem oferece a opção.
- Depois de gravar, diga em uma linha que as tools só aparecem **após reiniciar a sessão**.

## Princípios

- **Opcional de verdade.** `off` é o padrão e significa silêncio total: nenhuma menção a MCP em nenhuma resposta, em nenhum passo.
- **Nada de fluxo depende do banco.** Se o MCP sumir no meio de uma feature, a feature termina igual.
- **Uma chamada por ponto do mapa.** Não grave o mesmo chunk em dois passos diferentes "pra garantir" — as tools fazem upsert, mas registro duplicado polui a timeline com ordem errada.
- **Não peça ao usuário para preencher payload.** Tudo que as tools querem você já tem em mão no passo em que a chamada acontece.
- **Todo campo novo de explicação precisa entrar no `sdd_recall`.** Conteúdo que a busca não alcança é conteúdo que ninguém encontra, e o custo de gravá-lo vira desperdício.
- **Profundidade vai pro banco, não pro chat.** `detail` e `highlights` existem justamente para o plano de revisão poder continuar curto. Imprimir o conteúdo deles no chat desfaz a feature.
- **Anti-padrão**: parar o passo, perguntar ou re-tentar em laço porque a tool falhou. O trabalho do passo sempre acontece; o registro é o que pode faltar.
- **Anti-padrão**: ler o banco para decidir o próximo chunk ou o estado atual **nos modos `file`**. Ali isso é papel do `tasks.md` e do `.sdd.yaml`, e o banco pode estar desatualizado por ter ficado desligado um tempo. Com `tasks_storage: mcp` e `state_storage: mcp` a direção se inverte, e aí o banco é a fonte — mas só para o que aquele modo tirou do arquivo.
- **Anti-padrão**: sugerir ligar o MCP quando ele está `off`. Quem quer, liga com `/lp-settings mcp on`.
- **Anti-padrão**: colar o arquivo inteiro em `highlights`. Destaque é curadoria — um trecho que não decide nada só faz o leitor rolar.
- **Anti-padrão**: exemplo com `"foo"`/`"bar"`. Dado genérico não ensina nada sobre o domínio e não ajuda ninguém a reconhecer o comportamento.
- **Anti-padrão**: só exemplo de caminho feliz. Se o método tem borda e você não a registrou, registrou a parte que ninguém precisava.
- **Anti-padrão**: `detail` que repete o `does` com outras palavras. Se não acrescenta mecanismo, decisão descartada ou armadilha, deixe vazio.
