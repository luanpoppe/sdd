# Global config guide — preferências do usuário para projetos novos

Objetivo: parar de repetir as mesmas escolhas em todo projeto. Um `~/.sdd/config.yaml` opcional guarda **as preferências do usuário**, e todo projeto novo já nasce com elas em vez dos defaults embutidos no plugin.

## Onde fica

**`~/.sdd/config.yaml`** (home do usuário + `.sdd/`). Vale para Windows (`%USERPROFILE%\.sdd\config.yaml`), macOS e Linux.

Não é em `~/.claude/skills/lp-*` de propósito, por duas razões:

1. O installer (`bin/install.js`) **apaga tudo que começa com `lp-`** em `~/.claude/skills/` antes de recopiar, e deleta `~/.cursor/lp-helpers` inteiro. Config guardado ali sumiria a cada `lp:auto-update`.
2. O plugin roda em harnesses diferentes (Claude Code, Cursor, Codex) e o installer escreve em pastas diferentes conforme detecta. `~/.sdd/` é neutro: sobrevive a trocar de ferramenta e serve os três.

## O que pode ir no global: tudo

O global aceita **exatamente o mesmo esquema** do `.sdd/config.yaml` do projeto — não é um subconjunto. Qualquer campo configurável num projeto é configurável globalmente:

`format` · `lang` · `chunk_size` · `context_watch` · `flowchart` · `context` · `implementer` · `scribe` · `tasks_format` · `tasks_autocontinue` · `parallel` · `chunk_order` · `tests` · `auto_commit` · `subagents` (o bloco aninhado inteiro).

> **Regra permanente, não lista fixa**: qualquer campo novo que for adicionado ao `.sdd/config.yaml` no futuro é **automaticamente** válido no global. Não existe lista paralela pra manter em sincronia — se vale no projeto, vale aqui.

**Exceção — metadados**, que são por projeto e não fazem sentido herdar: `version` (esquema do arquivo) e `created` (data daquele projeto). Nunca grave esses dois no global.

**O arquivo é esparso**: só existe o que o usuário pôs. Campo ausente = default do plugin. Não materialize todos os campos "pra ficar completo" — isso transformaria cada default do plugin num valor congelado, e o usuário deixaria de receber mudança de default em versão nova.

Exemplo de global típico:

```yaml
# ~/.sdd/config.yaml — preferências do usuário. Esparso: só o que você quer diferente do default.
lang: pt-BR
format: both
implementer: main
tests: on
subagents:
  scribe:
    claude-code: { model: haiku }
```

## Modelo: semente, não camada viva

O global é lido em **exatamente dois momentos**:

1. **`lp:init`** — para semear o `.sdd/config.yaml` do projeto novo.
2. **`lp:settings`** — para ler ou escrever o próprio global (com a palavra-chave `global`).

**Mais nada.** Nenhuma outra skill lê o global. O `lp:init` **materializa** os valores resolvidos dentro do `.sdd/config.yaml`, então `lp:continue`, `lp:bug-fix`, `lp:review` e todas as outras continuam lendo só o config do projeto, sem saber que global existe.

**Precedência ao semear**: config do projeto (se já existir) > global > default embutido.

### Consequência: mudar o global NÃO afeta projeto já criado

Isso é intencional, não limitação. Cada projeto tem sua cópia materializada e versionada no repo — é a verdade daquele projeto, e não muda porque alguém mexeu na home. Time inteiro lê o mesmo `.sdd/config.yaml`.

Para mudar um projeto existente: `lp:settings` normal (sem `global`). Se o usuário reclamar que "mudei o global e o projeto X não mudou", explique isso — não é bug.

## Uso no `lp:init`

1. Leia `~/.sdd/config.yaml` se existir. **Ausente → comportamento de hoje, sem mencionar global em lugar nenhum.**
2. **Campos do grill** (`format`, `lang`, `chunk_size`, `context_watch`, `flowchart`): continue perguntando, mas ponha o valor do global como a opção **recomendada e primeira**, sinalizando a origem (ex: *"HTML e Markdown (seu padrão global)"*). O usuário confirma ou muda só naquele projeto.
3. **Campos não perguntados**: se o global define, grave o valor do global no lugar do default embutido.
4. **Bloco `subagents`**: se o global tiver, **copie para o config do projeto**. É a exceção deliberada à regra "o init não escreve `subagents`" — se o usuário configurou globalmente, ele quer aquilo valendo.
5. Ao final, uma linha do que foi herdado: *"Herdado do global (~/.sdd/config.yaml): implementer=main · tests=on · subagents.scribe"*.

## Uso no `lp:settings`

- Palavra-chave **`global`** no pedido → alvo é `~/.sdd/config.yaml`. Sem ela → projeto, como sempre.
- `/lp-settings global` sem campo → lista o global (mostrando "não configurado" para o que não está lá).
- Arquivo não existe e o usuário pediu escrita global → **crie com só o campo pedido**.
- **Sempre diga em qual arquivo escreveu.** Sem isso o usuário não sabe se pegou o projeto ou a máquina inteira.
- Mesmas regras de validação do projeto (valores canônicos, bloco aninhado do `subagents`, preservar comentários e ordem).

## Princípios

- **Opcional.** Global ausente = tudo exatamente como antes. Nunca sugira criar por conta própria.
- **Esparso.** Só o que o usuário escolheu; nunca despeje defaults.
- **Mesmo esquema do projeto, sempre.** Campo novo no `.sdd/config.yaml` já nasce válido no global.
- **Semente, não herança dinâmica.** Materializa no init; projeto existente não muda sozinho.
- **Alvo explícito.** Toda escrita informa se foi global ou projeto.
- **Anti-padrão**: fazer outras skills lerem o global em runtime. Isso espalharia lógica de merge por todo o plugin e tornaria o `.sdd/config.yaml` do repo uma meia-verdade.
