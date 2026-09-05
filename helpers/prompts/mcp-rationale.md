# MCP — por que existe, o que custa, como registrar

Companheiro do `./mcp-guide.md`. **Este arquivo fica fora do caminho quente**: só o `lp:init` e o `lp:settings` precisam abri-lo, quando alguém está decidindo ligar, desligar ou trocar um modo. Durante um passo de implementação, o guia operacional basta.

## O problema que ele resolve

O SDD produz muita informação estruturada que **morre no chat**: o relatório `Faz`/`Conecta`/`Revisar` por arquivo, a decisão sequencial-vs-paralelo do passo b0, a composição das ondas do paralelo, as divergências do auto-sync, o relatório do tester. Nada disso sobrevive a fechar a conversa.

E o `.sdd.yaml` só guarda data (`updated: YYYY-MM-DD`), sem hora — então não existe noção de duração de chunk.

Dois ganhos independentes:

1. **Visualização** — o SDD Viewer passa a mostrar timeline de chunks e o que revisar por arquivo, coisas que ele não tem como extrair do markdown.
2. **Memória** — as tools de leitura respondem *"o que já mexemos no `AuthService`?"* e *"onde paramos?"* sem reler nada, inclusive de outro projeto e de conversa já compactada.

## O banco

`~/.sdd/sdd.db`. Único para todos os projetos, com a tabela `projects` separando os repositórios — o que permite consulta cruzada (*"o que fiz esta semana em todos os repos"*) e faz o histórico sobreviver a apagar o `.sdd/` de um projeto.

Não fica em `~/.claude/skills/` nem em `~/.cursor/lp-helpers/` porque o installer apaga esses dois a cada atualização (mesmo motivo do `~/.sdd/config.yaml` — ver `./global-config-guide.md`).

> **O banco é índice e log derivado, nunca fonte de verdade.** O markdown e o YAML em `.sdd/` continuam a verdade, e apagar o `sdd.db` degrada a visualização sem corromper projeto nenhum.
>
> As duas exceções são declaradas em config e estão documentadas no guia operacional: `tasks_storage: mcp` e `state_storage: mcp`.

## `sdd_reindex` — o que sustenta a promessa

O banco só pode se dizer derivado porque há como re-derivá-lo. O `sdd_reindex` lê o `.sdd/` do projeto e reconstrói mudanças, features, chunks e status.

Use quando o banco foi apagado, houve um período de trabalho com `mcp: off`, ou você suspeita de divergência. `dry_run: true` primeiro, se quiser só o relatório.

**O que ele NÃO recupera**: explicações por arquivo, destaques, símbolos com exemplos, decisões, testes, commits e steps de review — nada disso tem origem fora do banco. A tool devolve essa lista explicitamente; reporte-a ao usuário em vez de dizer que o histórico foi restaurado.

## Consequências de ligar cada modo

Diga estas na mesma resposta em que aplicar a mudança. Elas não são detalhe de implementação: mudam o que sobra no repositório.

### `mcp: on`

- Grava um `.mcp.json` na raiz do projeto — versionado, o time herda.
- As tools só passam a existir **depois de reiniciar a sessão**. É a confusão mais previsível: ligou, não reiniciou, "não funciona".
- Exige Node 23+.

### `tasks_storage: mcp`

- O `tasks.md` deixa de ser gerado; o plano sai do repositório e some da revisão de PR e do histórico do git.
- **O MCP vira obrigatório**: sem o servidor o fluxo trava, em vez de degradar.
- O `sdd_reindex` não recupera o plano, porque ele só reconstrói o que tem origem em arquivo.
- Voltar para `file` não converte em arquivo o que ficou no banco.

### `state_storage: mcp`

- `state`, `current_feature`, `current_chunk`, `in_review`, `updated` e o `status` das features saem do `.sdd.yaml`.
- O `git log` do arquivo para de mostrar o avanço da mudança e passa a mostrar só mudança de escopo — o que para alguns é justamente o ganho.
- **O MCP vira obrigatório**, pelo mesmo motivo: sem os campos no arquivo, não há de onde re-derivar em que passo a mudança está.
- Voltar para `file` exige reescrever o bloco volátil no arquivo a partir do `sdd_read_state`, senão ele volta vazio.

### `mcp_record.<chave>: false`

Desliga uma parte do registro sem desligar o MCP. O que já foi gravado permanece. Ausência de chave = ligada, **com uma exceção**: `diff` não é gravado quando `auto_commit: full`, porque o git já guarda o mesmo conteúdo.

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
- Ao desligar (`mcp: off`), deixe o `.mcp.json` como está: o registro é inofensivo desligado, e removê-lo mexeria num arquivo versionado do time.

## Princípios

- **Opcional de verdade.** `off` é o padrão e significa silêncio total: nenhuma menção a MCP em nenhuma resposta, em nenhum passo.
- **Nada de fluxo depende do banco**, fora dos dois modos que o dizem explicitamente. Se o MCP sumir no meio de uma feature, a feature termina igual.
- **Todo campo novo de explicação precisa entrar no `sdd_recall`.** Conteúdo que a busca não alcança é conteúdo que ninguém encontra, e o custo de gravá-lo vira desperdício.
- **A descrição de uma tool é paga em toda requisição da sessão; este guia, só quando é lido.** É por isso que os schemas do servidor são curtos e a orientação longa mora aqui. Ao acrescentar campo novo, resista a explicá-lo no schema.

## Anti-padrões de conteúdo

Os anti-padrões de *fluxo* estão no guia operacional. Estes são sobre a **qualidade** do que se grava, e é onde a feature se perde na prática:

- **Colar o arquivo inteiro em `highlights`.** Destaque é curadoria — um trecho que não decide nada só faz o leitor rolar.
- **Exemplo com `"foo"`/`"bar"`.** Dado genérico não ensina nada sobre o domínio e não ajuda ninguém a reconhecer o comportamento.
- **Só exemplo de caminho feliz.** Se o método tem borda e você não a registrou, registrou a parte que ninguém precisava.
- **`detail` que repete o `does` com outras palavras.** Se não acrescenta mecanismo, decisão descartada ou armadilha, deixe vazio — um `detail` vazio é honesto, um `detail` redundante custa leitura e não devolve nada.
- **`note` do exemplo que descreve o que já se vê.** Ele existe para dizer o que o caso *prova*.
