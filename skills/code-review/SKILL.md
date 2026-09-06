---
name: code-review
description: Roda uma auditoria adversarial de código recém-escrito — procura bug, borda não tratada, contrato divergente da spec, erro engolido, vazamento e falha de segurança, e devolve achados com severidade e cenário concreto de falha. Não corrige nada. Use quando o usuário pedir "lp:code-review", "revisa esse código", "procura bug no que acabamos de fazer", "audita a feature X". Não confundir com `lp:review-walkthrough`, que é o tour didático por código existente.
---

Você está auditando código à procura do que está errado. Siga `../../helpers/prompts/code-review-guide.md` — ele define o checklist, o formato do achado e as regras de severidade.

> **Reporta, nunca corrige.** Nenhuma edição de código nesta skill, nem o typo óbvio. O achado pode estar errado, ou apontar algo decidido de propósito no grill.

## 1. Definir o alvo

Do argumento do usuário, ou perguntando **uma vez** se não der para inferir:

| Pedido | Alvo |
|---|---|
| sem argumento, com chunk em `in_review` | os arquivos daquele chunk |
| sem argumento, sem chunk em revisão | os arquivos da `current_feature` (todos os chunks dela) |
| `<slug de feature>` | todos os arquivos daquela feature |
| `<caminho>` | aquele arquivo ou pasta |
| "o diff da branch" | `git diff <base>...HEAD`, com a base perguntada se não for óbvia |

Alvo grande demais (repositório inteiro, centenas de arquivos) → diga o tamanho e proponha recortar antes de gastar a rodada.

## 2. Montar a entrada

1. **Diff** do alvo — `git diff` do que ainda não foi commitado, ou o diff dos commits do chunk.
2. **Arquivos tocados, inteiros.**
3. **A `spec.md`** da feature (ou `diagnosis.md` + `chosen_solution` no bug-fix).
4. **As instruções extras**: `~/.sdd/code-review.md` e `.sdd/code-review.md`, os dois, somados — o do projeto vence em conflito. Ausentes é o caso normal.

Fora de um projeto com `.sdd/`, os itens 3 e 4 do projeto simplesmente não existem: rode com o diff, os arquivos e o global.

## 3. Lançar o subagente

**Um** subagente, papel `code-reviewer` no bloco `subagents` (modelo e effort — ver `../../helpers/prompts/subagents-guide.md`). Ele recebe a entrada do passo 2 e o guia, e devolve a lista de achados.

Orquestração de vários revisores em paralelo **não existe ainda** — é um só, fazendo tudo. Não improvise divisão por dimensão.

## 4. Imprimir o resultado

Ordenado por severidade, graves primeiro, cada achado com **ID curto** para o usuário poder responder *"corrige A1 e A3"*:

```
Code review — <alvo> (<N> achados: <n> graves, <n> médios, <n> menores)

A1 [grave] src/pedidos/calculadora.ts:42 — desconto acumulado aplica duas vezes
   Cenário:  pedido com 2 itens em promoção → total R$ 18,00 em vez de R$ 24,00.
   Causa:    o laço soma `desconto` no acumulador e o subtrai de novo no retorno.
   Correção: subtrair só no retorno, ou zerar o acumulador antes do laço.
   Custo:    1 arquivo, ~3 linhas, sem novo teste.

A2 [médio] src/pedidos/repo.ts:88 — busca sem limite quando o filtro vem vazio
   ...

A4 [menor] src/pedidos/repo.ts:12 — `x` como nome do agregador esconde o que ele acumula.
```

**Todos os achados aparecem** — `menor` em uma linha, nunca só no contador. E o número do cabeçalho é sempre igual à quantidade de fichas abaixo dele.

## 4-bis. Decidir e, se pedirem, corrigir

Com pelo menos um `grave` ou `medio`, pergunte o que fazer (`AskUserQuestion`) — as regras de formato da pergunta, do corte entre corrigir inline e lançar um implementer, e do desfecho de cada achado estão em "A decisão" e "A correção" do `../../helpers/prompts/code-review-guide.md`.

Só `menor`: não pergunte. Os menores ficam abertos.

## 5. Registrar (só com `mcp: on`)

Rodando sobre um chunk conhecido, chame `sdd_record_chunk` com o campo `code_review` preenchido — os achados ficam amarrados ao chunk, entram na busca e voltam pelo `open_findings` do `sdd_query_history` enquanto estiverem abertos. Corrigiu no 4-bis: regrave o achado com `status` e `resolution`.

Sobre alvo que não é um chunk (um caminho, um diff de branch), registre um `sdd_record_event` (`kind: note`) com o resumo: quantos achados, de que severidade, em que arquivos. Ver `../../helpers/prompts/mcp-guide.md`.

## Princípios

- **Achado sem cenário concreto de falha não é achado.** É a regra que separa defeito de opinião de estilo.
- **Um subagente, não vários.** O orquestrador de revisores é trabalho futuro, deliberadamente fora daqui.
- **Não bloqueia nada.** Nem o `/lp-continue`, nem o commit, nem a aprovação do chunk. Perguntar o que fazer com um achado grave não é bloquear — é fechar o assunto.
- **Achado sem desfecho é dívida invisível.** Todo achado termina `corrigido`, `descartado`, `adiado` ou explicitamente `aberto`.
- **Não é o `lp:review-walkthrough`.** Aquele ensina código existente em steps; este procura defeito em código novo.
- Ausência de teste não é achado — isso é o passo f-bis, com `tests: on`.
