# Guia de git (branch + auto-commit)

> Compartilhado por `lp:new`, `lp:bug-fix` (sugestão de branch) e o motor `implementing` de `lp:continue`/bug-fix (auto-commit por chunk). Tudo aqui é **opcional e best-effort**: se o projeto não é um repo git (`git rev-parse --is-inside-work-tree` falha), pule esta seção inteira em silêncio — não mencione git nenhuma vez.

## Branches protegidas

Nomes (case-insensitive, comparação exata, não prefixo): `main`, `master`, `develop`, `dev`, `staging`, `stg`, `prod`, `prd`, `production`, `homolog`, `hml`, `qa`.

Rode `git branch --show-current` sempre que precisar decidir algo abaixo.

## 1. Sugestão de branch (início de `lp:new` / `lp:bug-fix`)

Depois que o **id** da mudança está definido (fim da pré-checagem, antes de criar `.sdd/changes/<id>/`):

1. Se não é repo git → pule.
2. Pegue a branch atual. Se o nome dela já contém o `<id>` da mudança, **não pergunte** — já parece dedicada, siga.
3. Senão, sugira um nome: `feature/<id>` para mudanças normais (`lp:new`), `fix/<id>` para bug-fix (`lp:bug-fix`). Pergunte via `AskUserQuestion`:
   - **Criar a branch sugerida** (Recomendado) — roda `git checkout -b <nome>`.
   - **Vou criar manualmente** — não roda nada; só informe o nome sugerido pro usuário criar quando quiser.
   - **Continuar na branch atual** (`<branch-atual>`) — não roda nada.
4. Não bloqueie o fluxo por isso — se o comando falhar (ex: branch já existe, working tree sujo), avise em 1 linha e continue perguntando/seguindo pelo caminho "vou criar manualmente".

## 2. Auto-commit por chunk (motor `implementing`, `lp:continue`)

Campo `auto_commit` do `.sdd/config.yaml`: `full` / `suggest-only` (default; ausente = `suggest-only`) / `off`.

- **`off`**: nada de git nesta seção. Não sugira, não commite, não mencione.
- **`suggest-only`** (default): ao fechar o plano de revisão de um chunk (passo g), acrescente um bloco com o comando pronto pra copiar — `git add` só com os arquivos deste chunk (lista de `in_review.files`) + `git commit -m "<mensagem sugerida>"`. Nunca executa nada.
- **`full`**: mesmo bloco é só informativo (*"commit automático ao aprovar este chunk"*) — mas quando o usuário aprova (próximo `/lp-continue`, no passo "Leia `in_review`" da pré-checagem, momento em que `in_review` é limpo porque foi aprovado), **antes de limpar**, rode:
  1. `git branch --show-current` — se é uma branch protegida (lista acima), **não commite**; caia pro comportamento de `suggest-only` neste chunk (mostre o comando pronto) e avise que a branch é protegida (*"branch `<nome>` é protegida — commit automático desativado aqui; peça explicitamente se quiser mesmo assim"*). Se o usuário pedir explicitamente para commitar mesmo em branch protegida, obedeça.
  2. Senão, `git add <arquivos de in_review.files>` (não `git add -A`/`.`; só os arquivos do chunk) e `git commit -m "<in_review.commit_message>"` (a mesma mensagem já sugerida no turno anterior — não invente uma nova).
  3. Se o commit falhar (nada staged, hook, conflito), avise em 1 linha e siga o turno normalmente — nunca trave o fluxo por causa disso.
  4. Com `mcp: on`, rechame `sdd_record_chunk` com o `commit` preenchido (`mode: full`, `branch`, `sha`) — assim o histórico registra o commit que realmente saiu, não só o sugerido. Ver `./mcp-guide.md`.

### Mensagem de commit sugerida

Decidida pelo principal ao montar o plano de revisão do chunk (passo g), guardada em `in_review.commit_message` (mesmo pacote do escriba que grava o resto de `in_review` no passo g-bis). Curta, no imperativo, no padrão do projeto se ele já usa um (ex: Conventional Commits — `feat(<slug>): <resumo>` / `fix(<id>): <resumo>`); sem padrão detectado, `<tipo>: <resumo de 1 frase do chunk>` (tipo = `feat`/`fix`/`refactor` conforme o chunk).

### Formato do bloco (suggest-only, ou full em branch protegida)

```
Commit sugerido deste chunk:
  git add caminho/arquivo1.ts caminho/arquivo2.ts
  git commit -m "feat(<slug>): <resumo>"
```

Só liste os arquivos deste chunk (não a mudança inteira). Não inclua triviais gerados automaticamente se não fizer sentido versionar (raro — normalmente inclua tudo do chunk).
