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
| `chunk_order` | `inside-out` / `outside-in` / `free` | `inside-out` | Desempate de ordem entre features/chunks independentes (dependência real sempre manda primeiro). `inside-out`: domínio/persistência antes de controller/consumer (compila incremental, sem stub). `outside-in`: prioriza mostrar o esqueleto do fluxo primeiro. `free`: só dependência, sem preferência. |
| `tests` | `off` / `on` | `off` | Geração automática de testes. `on`: ao concluir cada feature (ou correção de bug-fix), um subagente tester escreve os testes da funcionalidade (borda e falha, não só caminho feliz), roda e reporta — nunca corrige. Ver `../../helpers/prompts/tester-guide.md`. |
| `subagents` | bloco aninhado (papel → harness → `{model, effort}`) | (ausente) | **Opcional.** Em qual modelo/thinking cada papel de subagente roda: `implementer`, `scribe`, `explorer`; harnesses `claude-code`, `cursor`, `codex`. Ausente = cada subagente herda o modelo do principal. Ver `../../helpers/prompts/subagents-guide.md`. |
| `auto_commit` | `full` / `suggest-only` / `off` | `suggest-only` | Git a cada chunk aprovado. `full`: commita de verdade (git add + commit só dos arquivos do chunk), exceto em branch protegida (main/master/develop/staging/... — aí só sugere, a menos que peça explicitamente). `suggest-only`: só mostra o comando pronto pra copiar. `off`: não menciona git. |

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
  chunk_order=<v>         (inside-out | outside-in | free)
  auto_commit=<v>         (full | suggest-only | off)
  tests=<v>               (off | on)
  subagents=<resumo>      (opcional — modelo por papel de subagente; "não configurado" se ausente)

Pra mudar: /lp-settings <campo> <valor>  (ex: /lp-settings chunk_size small)
ou descreva em linguagem natural (ex: "muda o formato pra html", "desliga o flowchart").
```

Marque com o default entre parênteses quando o valor atual estiver ausente (assumido).

## 2. Com argumentos → aplicar

O argumento pode ser `campo valor` (ex: `chunk_size small`) ou linguagem natural (ex: "liga o paralelo", "docs em inglês", "não pausa no tasks"). Interprete para um ou mais pares campo/valor.

1. **Mapeie** cada pedido a um campo da tabela e ao valor canônico. Ex: "inglês" → `lang: en`; "liga paralelo" → `parallel: on`; "não pausa no tasks" → `tasks_autocontinue: on`; "tasks em html" → `tasks_format: follow`; "implementa de fora pra dentro" → `chunk_order: outside-in`; "comita automático" / "commita sozinho" → `auto_commit: full`; "só sugere o commit" → `auto_commit: suggest-only`; "não mexe com git" → `auto_commit: off`; "gera testes automático" / "quero testes no final" → `tests: on`; "roda o escriba no haiku" → `subagents.scribe.<harness atual>.model: haiku`; "implementer no opus com thinking alto" → `subagents.implementer.<harness atual>: {model: opus, effort: high}`.
2. **Valide** o valor contra a coluna "Valores". Se inválido ou ambíguo, **não edite** — liste as opções válidas daquele campo e pergunte (`AskUserQuestion`).
3. **Edite o `.sdd/config.yaml`**: altere só a(s) linha(s) do(s) campo(s) pedido(s). **Preserve o comentário inline** de cada campo e o resto do arquivo (não reordene, não remova comentários, não reescreva o arquivo inteiro). Se o campo não existir ainda no arquivo (config antigo), **adicione a linha** com o comentário padrão (veja `lp:init`).
3-bis. **`subagents` é aninhado — trate diferente dos campos de linha única.** É o único campo em bloco:
   - Não valide o nome do modelo contra lista fixa (o catálogo de cada harness muda) — grave o que o usuário pediu. Valide só o **papel** (`implementer`/`scribe`/`explorer`) e, se o usuário nomear um, o **harness** (`claude-code`/`cursor`/`codex`).
   - Se o usuário não disser o harness, use **o harness atual** e diga qual assumiu na confirmação.
   - Ao aplicar: crie o bloco `subagents:` no fim do arquivo se não existir; se existir, **acrescente só a sub-chave pedida**, preservando os outros papéis/harnesses e a indentação. Nunca reescreva o bloco inteiro.
   - Pra desligar ("volta o escriba pro padrão"), **remova** a sub-chave (e o papel/bloco, se ficarem vazios) — não grave valor vazio.
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
