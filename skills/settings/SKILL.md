---
name: settings
description: Lista e altera as configurações do SDD `lp:*` no `.sdd/config.yaml` do projeto. Sem argumentos, mostra todas as configs personalizáveis (valor atual, opções, default). Com argumentos, aplica a mudança pedida (ex: "lp:settings chunk_size small", "muda o formato pra html", "liga o paralelo"). Use quando o usuário pedir "lp:settings", "ver/mudar configurações do lp", "trocar chunk size", "desligar o flowchart", etc.
---

Você gerencia as configurações do SDD da mudança/projeto atual. Edita **apenas** o `.sdd/config.yaml`. Nunca toca em specs, tasks, código, `.sdd.yaml` de mudanças ou memória.

## 0. Pré-checagem

- Se `.sdd/config.yaml` não existir → "SDD não inicializado. Rode `/lp-init`." Pare.
- Leia o `.sdd/config.yaml` atual (todos os campos + comentários).

## Configurações personalizáveis

| Campo | Valores | Default | O que faz |
|---|---|---|---|
| `format` | `md` / `html` / `both` | (grill) | Formato das docs de conteúdo (`plan`, `spec`). `html`/`both` gera o par `.html`. |
| `lang` | `pt-BR` / `en` | (grill) | Idioma das docs e do grilling. |
| `chunk_size` | `micro` / `small` / `medium` / `large` / `xlarge` | `micro` | Tamanho de cada chunk de implementação. |
| `context_watch` | `suggest` / `auto` / `off` | (grill) | Watch anti-degradação de contexto longo. |
| `flowchart` | `on` / `off` | `on` | Gera/atualiza o `flow.html` (diagrama macro). |
| `implementer` | `subagent` / `main` | `subagent` | Quem implementa o **código** do chunk: subagente ou a conversa principal. |
| `scribe` | `subagent` / `main` | `subagent` | Quem **escreve os artefatos** (docs, `flow.html`, `.sdd.yaml`): subagente escriba ou inline. |
| `context` | `true` / `false` | `true` | Mantém `.sdd/context/` (base de conhecimento do projeto) e lê o índice no início dos fluxos. `false` desliga tudo de contexto. |
| `tasks_format` | `md` / `follow` | `md` | Formato do `tasks`. `md`: só markdown. `follow`: acompanha o `format` global. |
| `tasks_autocontinue` | `on` / `off` | `on` | Após gerar o `tasks.md`, seguir direto pro 1º chunk (`on`) ou pausar pra revisão (`off`). |
| `parallel` | `on` / `off` | `off` | Chunks independentes em paralelo (um subagente cada). Também alternável por `lp:parallel`. |

> `created` e `version` são metadados — não são configuráveis por aqui.

## 1. Sem argumentos → listar

Imprima o estado atual, valor a valor, e as opções. Formato sugerido:

```
Configurações do SDD (.sdd/config.yaml):

  format=<v>              (md | html | both)
  lang=<v>                (pt-BR | en)
  chunk_size=<v>          (micro | small | medium | large | xlarge)
  context_watch=<v>       (suggest | auto | off)
  flowchart=<v>           (on | off)
  implementer=<v>         (subagent | main)
  scribe=<v>              (subagent | main)
  context=<v>             (true | false)
  tasks_format=<v>        (md | follow)
  tasks_autocontinue=<v>  (on | off)
  parallel=<v>            (on | off)

Pra mudar: /lp-settings <campo> <valor>  (ex: /lp-settings chunk_size small)
ou descreva em linguagem natural (ex: "muda o formato pra html", "desliga o flowchart").
```

Marque com o default entre parênteses quando o valor atual estiver ausente (assumido).

## 2. Com argumentos → aplicar

O argumento pode ser `campo valor` (ex: `chunk_size small`) ou linguagem natural (ex: "liga o paralelo", "docs em inglês", "não pausa no tasks"). Interprete para um ou mais pares campo/valor.

1. **Mapeie** cada pedido a um campo da tabela e ao valor canônico. Ex: "inglês" → `lang: en`; "liga paralelo" → `parallel: on`; "não pausa no tasks" → `tasks_autocontinue: on`; "tasks em html" → `tasks_format: follow`.
2. **Valide** o valor contra a coluna "Valores". Se inválido ou ambíguo, **não edite** — liste as opções válidas daquele campo e pergunte (`AskUserQuestion`).
3. **Edite o `.sdd/config.yaml`**: altere só a(s) linha(s) do(s) campo(s) pedido(s). **Preserve o comentário inline** de cada campo e o resto do arquivo (não reordene, não remova comentários, não reescreva o arquivo inteiro). Se o campo não existir ainda no arquivo (config antigo), **adicione a linha** com o comentário padrão (veja `lp:init`).
4. Atualize a data `updated` se o arquivo tiver esse campo (config não tem por padrão — pule se ausente).
5. **Confirme** mostrando o diff conceitual:

   ```
   Config atualizado (.sdd/config.yaml):
     <campo>: <antigo> → <novo>

   Efeito: <1 frase do que muda no fluxo daqui pra frente>.
   ```

## Princípios

- **Só o `.sdd/config.yaml`.** Nada de mudar docs, código ou estado de mudança.
- **Escopo do projeto**: a config vale pro projeto todo; muda o comportamento das próximas execuções (`lp:new`, `lp:continue`, `lp:bug-fix`). Não reprocessa o que já foi gerado.
- **Valores canônicos e validados.** Nunca grave um valor fora da tabela. Na dúvida, pergunte com `AskUserQuestion`.
- **Preserve o arquivo**: edição cirúrgica linha a linha, mantendo comentários e ordem. Não regenere o `config.yaml` do zero.
- Para `parallel`, mencione que `lp:parallel` faz o mesmo toggle de forma rápida.
