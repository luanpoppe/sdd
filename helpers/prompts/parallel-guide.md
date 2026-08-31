# Parallel guide — implementar chunks independentes em paralelo

Regras para o modo paralelo do `lp:continue` (implementação de vários chunks de uma vez, cada um em seu subagente). **Só se aplica quando o modo paralelo está ativo** (ver "Quando ativar"). Paralelo **sempre usa subagentes** — ignora `implementer: main` para os chunks que rodam em paralelo (não dá pra paralelizar na conversa principal).

## Quando ativar (decisão no início da implementação)

Determine o modo UMA vez, **antes de implementar o primeiro chunk** de cada feature que entra em `implementing`:

1. Se `parallel: on` no `.sdd/config.yaml` → **paralelo** (não precisa perguntar; anuncie que vai paralelizar).
2. Senão, **pergunte** (via `AskUserQuestion`): *"Implementar os chunks independentes desta feature em paralelo (mais rápido, revisão em lote) ou um a um (sequencial, revisão chunk a chunk)?"*
   - Resposta "paralelo/sim" → **paralelo** só nesta feature.
   - "sequencial/não", **nenhuma resposta**, ou dúvida → **sequencial** (comportamento padrão de hoje).
3. `lp:parallel` liga/desliga o `parallel` no config a qualquer momento.

## Independência e ondas (waves)

No modo paralelo, NUNCA rode todos os chunks cegamente juntos. Agrupe em **ondas** de chunks mutuamente independentes:

- **Dependência**: use o campo `Depende de:` de cada chunk no `tasks.md`. Um chunk só entra numa onda quando todas as suas dependências já foram concluídas em ondas anteriores.
- **Arquivos disjuntos (OBRIGATÓRIO)**: dois chunks só rodam na MESMA onda se os conjuntos de arquivos que eles tocam **não se sobrepõem**. Se dois chunks tocam o mesmo arquivo (ex: um barrel `index.ts`, `package.json`, um módulo compartilhado), eles NÃO podem ser paralelos — serialize (ondas diferentes). Isso evita dois subagentes editando o mesmo arquivo ao mesmo tempo.
- Onda = maior conjunto de chunks pendentes que (a) têm dependências satisfeitas e (b) têm arquivos 2-a-2 disjuntos. O que sobrar vai para a próxima onda.

## Execução de uma onda

1. Anuncie a onda: quais chunks entram e por quê os outros ficaram de fora (dependência ou arquivo compartilhado). **Cite cada chunk pelo que ele faz**, não só pelo ID (*"o chunk que cria o repositório (`C2`) e o que expõe o endpoint (`C4`)"*, não *"C2 e C4"*) — ver a regra de citação em `./state-machine.md`.
2. Lance **um subagente por chunk da onda, em paralelo** (todas as chamadas no mesmo turno). Cada subagente recebe o mesmo briefing do modo subagente normal (chunk do tasks.md, spec, plan.md, prefs de código, rodar eslint --fix + testes) e retorna o relatório estruturado (`Faz`/`Revisar`/`Conecta` + validação) por arquivo.
3. Espere todos os subagentes da onda terminarem antes de seguir.
4. **Auto-sync + marcação** (conversa principal): confira os relatórios, trate divergências, marque `[~]` os checkboxes de TODOS os chunks da onda no `tasks.md`, atualize `.sdd.yaml` (`current_chunk` pode listar os IDs da onda) e o `flow.html` (todos os nós da onda de uma vez).
5. **Plano de revisão combinado** — ver abaixo. Pare para revisão.

Uma onda por invocação de `lp:continue` (mesmo no paralelo): não dispare a próxima onda no mesmo turno — o usuário revisa a onda atual primeiro.

## Plano de revisão combinado (após uma onda)

Mesmo formato do plano de chunk único, mas agrupado por chunk. Ordene os chunks por prioridade de revisão; dentro de cada um, os arquivos na ordem (`Faz`/`Revisar`/`Conecta`).

```
## Onda F<n>.[C<a>, C<b>, C<c>] — <resumo> (em revisão)

Feature: <slug> (<i>/<total>)
Estado da feature: <X de Y chunks concluídos> · onda com <k> chunks paralelos

Revisão (na ordem — comece pelo topo):

### F<n>.C<a> — <título>

**1. caminho/arquivo1.ts** (criado, +N)
- Faz: <...>.
- Revisar: <...>.
- Conecta: <...>.

### F<n>.C<b> — <título>

**2. caminho/arquivo2.ts** (criado, +N)
- Faz: <...>.
- Revisar: <...>.
- Conecta: <...>.

Validação (por chunk):
- F<n>.C<a>: eslint ok · test N passing
- F<n>.C<b>: eslint ok · test N passing

Próximo: /lp-continue (próxima onda OU início da próxima feature, se essa foi a última).
Reverter: peça "reverte o chunk F<n>.C<x>" (individual) ou "reverte a onda".
```

## Princípios

- **Segurança de arquivo acima de velocidade**: na dúvida se dois chunks compartilham arquivo, serialize. É melhor uma onda menor que um conflito de edição.
- **Chunk se cita pelo que faz**: no anúncio da onda, no resumo e nas respostas, ID sozinho não informa nada — acompanhe da descrição. Ver `./state-machine.md`.
- **Independência real**: paralelo não muda a ordem lógica — chunks dependentes continuam em ondas ordenadas. Paralelo só junta os que genuinamente não se afetam.
- **Revisão continua obrigatória**: paralelo agiliza a implementação, não pula revisão. Cada onda termina com plano de revisão e pausa.
- **Fallback**: se o ambiente não suporta lançar subagentes em paralelo, avise e caia para sequencial.
