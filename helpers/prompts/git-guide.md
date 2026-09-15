# Guia de git (branch + auto-commit)

> Compartilhado por `lp:new-feature`, `lp:bug-fix` (sugestão de branch) e o motor `implementing` de `lp:continue`/bug-fix (auto-commit por chunk). Tudo aqui é **opcional e best-effort**: se o projeto não é um repo git (`git rev-parse --is-inside-work-tree` falha), pule esta seção inteira em silêncio — não mencione git nenhuma vez.

## Branches protegidas

Nomes (case-insensitive, comparação exata, não prefixo): `main`, `master`, `develop`, `dev`, `staging`, `stg`, `prod`, `prd`, `production`, `homolog`, `hml`, `qa`.

Rode `git branch --show-current` sempre que precisar decidir algo abaixo.

## 1. Sugestão de branch (início de `lp:new-feature` / `lp:bug-fix`)

Depois que o **id** da mudança está definido (fim da pré-checagem, antes de criar `.sdd/changes/<id>/`):

1. Se não é repo git → pule.
2. Pegue a branch atual. Se o nome dela já contém o `<id>` da mudança, **não pergunte** — já parece dedicada, siga.
3. Senão, sugira um nome: `feature/<id>` para mudanças normais (`lp:new-feature`), `fix/<id>` para bug-fix (`lp:bug-fix`). Pergunte via `AskUserQuestion`:
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

### Os arquivos do `.sdd/` — decisão junto, progresso agrupado

O `.sdd/` muda junto com o chunk, e antes ficava sempre de fora do `git add`: no fim da feature sobrava uma pilha de arquivos por commitar. Incluir tudo também não serve — os arquivos do `.sdd/` não são todos da mesma natureza.

**Classe 1 — decisão. Vai no commit do chunk**, junto com o código:

`plan.md` · `specs/<slug>/spec.md` · `diagnosis.md` · `solutions.md` · `memory.md` (ou `memory/*.md` + `memory-map.md`) · `context/**` · os espelhos `.html` desses

Eles descrevem o mesmo que o código do chunk faz. Separá-los quebra o par: daqui a seis meses, o commit mostra a implementação e a spec que a justifica no mesmo ponto.

**Classe 2 — progresso. Acumula e sai num commit só ao fechar a feature**:

`tasks.md` (raiz e por feature) · `flow.html` · `.sdd.yaml`

Esses mudam a **cada** chunk, e o diff é quase sempre um checkbox virando `[~]` ou uma classe CSS virando `done`. Em seis commits sucessivos não informam nada; em um, ao fechar a feature, viram um marco legível.

Regras de execução:

1. **Só o que está sujo.** Rode `git status --porcelain .sdd` e cruze com as listas acima. Nunca `git add .sdd/` inteiro — arquivo que o usuário deixou de fora fica de fora.
2. **A classe 1 entra na mesma linha de `git add`** do chunk, depois dos arquivos de código, e no mesmo commit. A mensagem não muda por causa disso.
3. **Ao fechar a feature, o commit varre o `.sdd/` inteiro** (transição para a próxima feature ou para `awaiting-archive`), com mensagem `chore(sdd): fecha <slug-da-feature>`. Em bug-fix, o ponto é o fim da correção, com `chore(sdd): fecha <id>`. Rode `git status --porcelain .sdd` e leve **tudo que estiver sujo ali**, seja da classe 1 ou da 2 — este commit é a rede de segurança do `.sdd/`, e não uma lista fixa de nomes.
4. **Nada sujo em `.sdd/` → nenhum commit**, e nenhuma menção. Com `tasks_storage`/`flow_storage`/`state_storage: mcp`, a classe 2 some do disco — mas `plan.md`, `spec.md`, `context/**`, os espelhos `.html` e o `.sdd.yaml` de identidade continuam existindo, e são exatamente os que ficavam para trás quando esta regra olhava só três nomes. A pergunta é sempre "o que está sujo em `.sdd/`?", nunca "quais arquivos da classe 2 existem?".
5. **`suggest-only` mostra os dois** do mesmo jeito que mostra o do chunk — o do fechamento aparece no fim da mensagem que fecha a feature.
6. **Branch protegida e falha de commit**: mesmo comportamento do chunk (cai para sugerir, avisa em 1 linha, nunca trava).
7. Se o `.sdd/` está no `.gitignore` do projeto, o `git add` falha — avise em 1 linha na primeira vez e pare de tentar nos chunks seguintes desta conversa.
8. **O `plan.md`/`plan.html` recém-criado entra no commit do primeiro chunk da mudança.** Ele nasce no `lp:new-feature`, antes de existir chunk nenhum, e é o arquivo que mais tempo passa sem ser versionado se ninguém o pegar ali.

### O turno de fechamento não commita — ele deixa commits pendentes

`auto_commit: full` tem uma regra só, e ela não admite exceção: **commit acontece na aprovação, nunca antes dela.** O chunk é commitado no `/lp-continue` em que o usuário aprova, não no turno em que foi escrito.

O turno de fechamento produz três coisas commitáveis — os testes do tester, a correção do code review e os artefatos do `.sdd/` —, e todas são código e documento que o usuário ainda não viu. Rodar `git commit` ali contraria a regra tanto quanto commitar o chunk na hora em que ele é escrito.

Por isso o fechamento **monta** os commits e **não executa** nenhum:

```yaml
in_review:
  pending_commits:
    - message: "test(<slug>): testes da feature"
      files: ["packages/.../foo.spec.ts"]
    - message: "fix(<slug>): code review A1, A2"
      files: ["packages/.../bar.provider.ts"]
    - message: "chore(sdd): fecha <slug>"
      files: [".sdd/changes/<id>/plan.md", ".sdd/context/<area>/<slug>.md"]
```

A ordem importa: código primeiro (testes, depois correção), artefatos por último. A mensagem da correção cita os IDs dos achados aplicados — é o que liga o commit à ficha que o motivou.

O bloco também é impresso no fim da mensagem, como em `suggest-only`: quem quiser rodar antes de aprovar, roda. E o `/lp-continue` seguinte — que **é** a aprovação — executa a lista na ordem e limpa o `in_review`.

### Mensagem de commit sugerida

Decidida pelo principal ao montar o plano de revisão do chunk (passo g), guardada em `in_review.commit_message` (mesmo pacote do escriba que grava o resto de `in_review` no passo g-bis). Curta, no imperativo, no padrão do projeto se ele já usa um (ex: Conventional Commits — `feat(<slug>): <resumo>` / `fix(<id>): <resumo>`); sem padrão detectado, `<tipo>: <resumo de 1 frase do chunk>` (tipo = `feat`/`fix`/`refactor` conforme o chunk).

### Onde o bloco aparece — sempre no fim da ÚLTIMA mensagem

Duas regras, e as duas existem porque o bloco serve para ser **copiado**:

1. **Sempre por último.** O bloco fecha a resposta, depois do plano de revisão e de qualquer
   observação. Bloco no meio do texto obriga o usuário a rolar para trás e procurar.
2. **Reemita a cada resposta enquanto o chunk estiver em revisão.** Se o usuário pediu um
   ajuste, tirou uma dúvida ou você mexeu em qualquer coisa do chunk, o bloco vai de novo no
   fim da resposta nova — **mesmo que os comandos não tenham mudado**. Repetir dois comandos
   idênticos custa nada; procurar a mensagem certa no histórico custa toda vez.

Se o ajuste tocou arquivos novos, o `git add` reflete a lista atualizada, e a
`in_review.commit_message` é reescrita junto se o resumo do chunk deixou de valer.

O bloco só some quando o chunk é aprovado (o `/lp-continue` seguinte) ou quando
`auto_commit: off`.

### Formato do bloco (suggest-only, ou full em branch protegida)

```
Commit sugerido deste chunk:
  git add caminho/arquivo1.ts caminho/arquivo2.ts .sdd/changes/<id>/specs/<slug>/spec.md
  git commit -m "feat(<slug>): <resumo>"
```

E, na mensagem que fecha a feature, quando houver qualquer coisa suja em `.sdd/` (a lista sai do `git status --porcelain .sdd`, não de nomes fixos):

```
Commit dos artefatos do SDD (feature fechada):
  git add .sdd/changes/<id>/plan.md .sdd/changes/<id>/plan.html .sdd/changes/<id>/.sdd.yaml .sdd/context/<area>/<slug>.md .sdd/context/index.md
  git commit -m "chore(sdd): fecha <slug>"
```

Só liste os arquivos deste chunk (não a mudança inteira). Não inclua triviais gerados automaticamente se não fizer sentido versionar (raro — normalmente inclua tudo do chunk).
