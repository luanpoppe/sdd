# MCP guide — persistir cada etapa do SDD no banco

O SDD produz muita informação estruturada que hoje **morre no chat**: o relatório `Faz`/`Conecta`/`Revisar` por arquivo, a decisão sequencial-vs-paralelo do passo b0, a composição das ondas do paralelo, as divergências do auto-sync, o relatório do tester. Nada disso sobrevive a fechar a conversa. E o `.sdd.yaml` só guarda data (`updated: YYYY-MM-DD`), sem hora — então não existe noção de duração.

O MCP `sdd` é um servidor local, **opcional**, que recebe essas etapas e grava num SQLite. Dois ganhos independentes:

1. **Visualização** — o SDD Viewer passa a mostrar timeline de chunks e o que revisar por arquivo, coisas que ele não tem como extrair do markdown.
2. **Memória** — as tools de leitura (`sdd_query_history`, `sdd_recall`) respondem *"o que já mexemos no `AuthService`?"* e *"onde paramos?"* sem reler nada, inclusive de outro projeto e de conversa já compactada.

## Toggle

- Campo `mcp` no `.sdd/config.yaml`: `off` (padrão) | `on`.
- **`off` ou ausente = o passo não existe.** Não chame tool, não mencione MCP, não sugira ligar. O fluxo é exatamente o de hoje.
- `on` → chame as tools nos pontos do mapa abaixo.

## O banco

`~/.sdd/sdd.db`. Único para todos os projetos, com a tabela `projects` separando os repositórios — o que permite consulta cruzada (*"o que fiz esta semana em todos os repos"*) e faz o histórico sobreviver a apagar o `.sdd/` de um projeto.

Não fica em `~/.claude/skills/` nem em `~/.cursor/lp-helpers/` porque o installer apaga esses dois a cada atualização (mesmo motivo do `~/.sdd/config.yaml` — ver `./global-config-guide.md`).

> **O banco é índice e log derivado, nunca fonte de verdade.** O markdown e o YAML em `.sdd/` continuam a verdade. Apagar o `sdd.db` degrada a visualização e não corrompe projeto nenhum. Corolário prático: **nunca leia estado de fluxo do banco para decidir um passo** — o próximo chunk sai do `tasks.md`, o estado sai do `.sdd.yaml`. As tools de leitura servem para dar contexto ao usuário e a você, não para substituir o `.sdd/`.

## Mapa passo → tool

Chame a tool **junto** do passo, não num turno separado.

| Onde | Tool | O que mandar |
|---|---|---|
| `lp:new` — criação e fim do grill macro | `sdd_sync_change` | espelho do `.sdd.yaml`: `change_id`, `kind: feature`, `title`, `state`, e `features[]` completo quando o `plan.md` fecha |
| `lp:bug-fix` — criação e fim do diagnóstico | `sdd_sync_change` | `kind: bugfix`, `title`, `state`. Sem `features[]` |
| bug-fix, ao escolher a solução | `sdd_sync_change` | `chosen_solution` + `state: bug-fixing` |
| `lp:continue` — transição de `state` (spec, tasks, feature concluída) | `sdd_sync_change` | o `state` novo e o `features[].status` que mudou |
| passo **a**, divergência encontrada | `sdd_record_event` | `kind: deviation`, o que divergiu e o que foi decidido |
| passo **b0**, decisão de modo | `sdd_record_event` | `kind: mode_decision` — **fecha um buraco real**: hoje essa decisão é perguntada 1× por feature e não é persistida em lugar nenhum |
| onda do paralelo, ao anunciar | `sdd_record_event` | `kind: wave_planned`, quais chunks entraram e por que os outros ficaram fora (ver `./parallel-guide.md`) |
| passo **f-bis**, tester rodou | `sdd_record_tests` | runner, passou/falhou, cobertura, o relatório e os arquivos criados |
| passo **g-bis** | `sdd_record_chunk` | **a chamada principal** — o chunk e um item por arquivo, com `does`/`connects`/`review_note` **mais `detail` e `highlights`** (ver abaixo) |
| commit efetivado no `auto_commit: full` | `sdd_record_chunk` | rechame com o `commit` preenchido (`mode: full`, `branch`, `sha`) |
| `lp:review`, step fechado | `sdd_record_review` | o review e o step com os arquivos percorridos |
| `lp:archive` | `sdd_sync_change` | `archived` + `state: archived` |

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

## Quem chama

**O agente principal, direto — não o escriba.**

A regra tudo-ou-nada do `./scribe-guide.md` vale para escrita **de arquivo** em `.sdd/`; chamar uma tool MCP não é escrever arquivo, então não a viola. E o principal é quem decide o conteúdo — passar a decisão ao escriba só pra ela voltar seria indireção, além de não haver garantia de que um subagente enxergue as tools MCP da sessão.

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
- **Profundidade vai pro banco, não pro chat.** `detail` e `highlights` existem justamente para o plano de revisão poder continuar curto. Imprimir o conteúdo deles no chat desfaz a feature.
- **Anti-padrão**: parar o passo, perguntar ou re-tentar em laço porque a tool falhou. O trabalho do passo sempre acontece; o registro é o que pode faltar.
- **Anti-padrão**: ler o banco para decidir o próximo chunk ou o estado atual. Isso é papel do `tasks.md` e do `.sdd.yaml` — o banco pode estar desatualizado por ter ficado desligado um tempo.
- **Anti-padrão**: sugerir ligar o MCP quando ele está `off`. Quem quer, liga com `/lp-settings mcp on`.
- **Anti-padrão**: colar o arquivo inteiro em `highlights`. Destaque é curadoria — um trecho que não decide nada só faz o leitor rolar.
- **Anti-padrão**: `detail` que repete o `does` com outras palavras. Se não acrescenta mecanismo, decisão descartada ou armadilha, deixe vazio.
