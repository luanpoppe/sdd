# Tester guide — subagente de geração de testes

Objetivo: gerar testes automatizados para a funcionalidade **depois que ela está pronta e revisada**, num subagente dedicado. Separado do implementer de propósito: quem escreveu o código tende a testar o que escreveu (viés de confirmação) — cobre o caminho feliz e passa batido nas bordas. Um agente novo, com escopo só de teste, ataca falha e borda.

## Toggle

- Campo `tests` no `.sdd/config.yaml`: `off` (padrão) ou `on`. **Ausente = `off`.**
- `tests: off` → esta etapa **não existe**: não gere testes, não mencione testes, não comente que a etapa está desligada.
- `tests: on` → rode a etapa **uma única vez por feature**, no momento definido abaixo.
- **Modelo/thinking**: papel `tester` em `subagents` (ver `./subagents-guide.md`). Sem entrada = herda o modelo do principal.

## Quando roda

Passo **f-bis** do motor `implementing` (`../../skills/continue/SKILL.md`), entre a transição "feature concluída" (f) e o plano de revisão (g). Só dispara quando as **duas** condições valem:

1. `tests: on`; **e**
2. o passo f acabou de concluir a **feature inteira** (ou, no bug-fix, foi o **último chunk** da correção).

Em qualquer chunk que não fecha a feature, f-bis não faz nada. No modo paralelo, vale igual: dispara quando a última onda fecha a feature.

> **Nunca por chunk.** Chunk é micro — testar peça isolada produz teste que se reescreve no chunk seguinte, quando a superfície muda. O ganho de testar a funcionalidade integrada é justamente ver o fluxo real ponta a ponta.

## O que o principal passa ao tester

- **Arquivos de código da feature**: junte os campos `Arquivos` de **todos** os chunks da feature no `tasks.md` (no bug-fix, do `tasks.md` na raiz da mudança). Não é só o último chunk.
- **A `spec.md` da feature** — em especial os **cenários BDD** (`Dado que / Quando / Então`) e a seção **Edge cases**: são insumo direto de casos de teste, cada cenário deve virar pelo menos um teste.
- **No bug-fix**: o `diagnosis.md` (causa raiz) e a `chosen_solution` do `solutions.md`. A causa raiz **obriga** um teste de regressão — o teste que teria pegado o bug.
- Convenções de código do projeto (CLAUDE.md/regras) e o comando de validação usado nos chunks.

## Regras de escrita

**Organização**
- **Um arquivo de teste por arquivo-fonte.** Não junte vários fontes num arquivo só.
- Pasta convencional da linguagem/framework do projeto — `test/`, `tests/` (Python), `*_test.go` ao lado do fonte (Go), `spec/` (Ruby). **Olhe onde o projeto já põe teste antes de decidir**; convenção existente vence.
- Reuse mocks, factories e utilitários que já existem (`test-utils/`, `conftest.py`, `testutil/`, `spec/support/`). Criou utilitário que serve pra mais de um teste? Promova pra essa pasta em vez de deixar local.

**Cobertura de cenários — o ponto desta etapa**
- Caminho feliz é o **piso**, não o objetivo. Para cada arquivo, ataque deliberadamente:
  - **Borda**: vazio, zero, um elemento, limite superior/inferior, coleção grande, string com unicode/espaço, data no limite do intervalo.
  - **Falha**: entrada inválida, dependência que lança, timeout, resposta malformada, permissão negada.
  - **Nulos** (`null`/`undefined`/`None`/`nil`) — **só quando o tipo realmente permite**. Não force caso impossível só pra ter mais um teste.
- Cada cenário BDD da spec e cada item de "Edge cases" precisa ter teste correspondente. Se algum não for testável em unitário, diga no relatório em vez de fingir cobertura.

**Qualidade**
- **DRY por parametrização**: `it.each` (JS/TS), `pytest.mark.parametrize` (Python), table-driven (Go), `[Theory]/[InlineData]` (xUnit). Casos que só variam entrada/saída viram tabela, não N blocos copiados.
- **Arrange-Act-Assert** explícito, nessa ordem, com a separação visível.
- **Nomes descrevem comportamento, não implementação**: `"rejeita valor negativo"`, não `"testa metodoX"`. Quem lê a saída do runner deve entender a regra de negócio sem abrir o teste.
- **Asserts específicos**: compare o valor esperado. Nada de `toBeTruthy()` num objeto, `assert result` solto, ou verificar só que "não lançou".
- **Determinismo**: nada de teste flaky. Data/hora e aleatoriedade fixas (fake timer, seed, injeção); nada de depender de rede real, ordem de execução ou de estado deixado por outro teste.

**O que evitar**
- Testar **implementação interna** em vez de comportamento observável — teste que quebra em todo refactor sem bug é custo, não rede de segurança.
- **Mock demais**: mockar tudo faz o teste provar só que os mocks foram chamados. Mocke a borda (I/O, rede, relógio), não a lógica sob teste.
- Testar **biblioteca de terceiros** — não é seu código.
- Escrever **teste de integração** disfarçado (subir banco, chamar serviço real) quando a etapa é de unitário. Se um caso só faz sentido integrado, aponte no relatório.

**Execução (nesta ordem)**
1. Detecte o runner pelos **scripts que já existem** (`package.json`, `Makefile`, `pyproject.toml`, etc.) antes de inventar comando. Distinga o framework de fato usado (Jest vs Vitest mudam a API de mock: `jest.fn()` vs `vi.fn()`).
2. Rode os testes criados.
3. **Se passarem**, rode coverage **escopado aos arquivos da feature** (não o global do projeto) e tente subir a cobertura com casos que faltam. Sem meta numérica fixa — o critério é qualitativo: o que ficou descoberto merece teste?
4. Rode o linter **apenas nos arquivos criados**. Warning insolúvel → diretiva de ignore no topo do arquivo de teste.

## Regra dura: reportar, nunca corrigir

Se um teste falhar, o tester **não conserta nada** — nem o teste, nem a implementação. Reporta e para.

- **Corrigir o teste** mascara bug real: transforma o teste no que o código faz, não no que deveria fazer.
- **Corrigir a implementação** mexe em código que o usuário já revisou e aprovou, fora do plano de revisão do chunk.

Falha é **informação para o usuário decidir**: bug real ou teste mal escrito? Essa decisão é dele.

## O que o tester retorna (compacto)

- Arquivos criados: `caminho — N casos`. **Sem** colar o corpo dos arquivos.
- Execução: `N passing, M failing`.
- Se houver falha: **uma linha por teste que falhou**, dizendo o que esperava e o que recebeu.
- Coverage dos arquivos da feature (número + o que ficou descoberto, se relevante).
- Cenários da spec que não deram pra cobrir em unitário, se houver.

## Como o principal usa isso (passo g)

Bloco próprio no plano de revisão, junto do bloco `Validação:`:

```
Testes (feature concluída):
- test/foo.spec.ts — 12 casos · 11 passing, 1 failing
  ↳ falhou: "rejeita valor negativo" — esperava erro, recebeu null
- Coverage: 87% nos arquivos da feature.
```

- Os arquivos de teste **entram na lista de revisão e em `in_review.files`** — senão não sobrevivem à compactação nem entram no `git add` do `auto_commit: full`.
- Ficam no **fim** da lista de revisão, mas **nunca** marcados "pode pular": um teste falhando é o item mais importante do turno.
- Se algum falhou, a linha `Próximo:` avisa (*"há 1 teste falhando — decida se é bug ou teste antes de seguir"*). **Não bloqueia** o `/lp-continue`.

## Princípios

- **Opcional e desligado por padrão.** `tests` ausente = `off` = nada muda em relação a hoje.
- **Uma vez por feature**, nunca por chunk.
- **Borda e falha são o produto.** Se o tester só entregou caminho feliz, ele falhou no trabalho dele.
- **Reporta, não corrige.** Sem exceção.
- **Convenção do projeto vence o guia**: se o projeto já tem padrão de teste (pasta, nomeação, helpers), siga o dele.
- **Anti-padrão**: gerar teste pra encher coverage — teste que não afirma comportamento real é dívida, não segurança.
