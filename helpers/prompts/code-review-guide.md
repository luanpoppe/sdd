# Code review guide — o revisor adversarial do `lp:*`

Um subagente que audita **código recém-escrito** procurando o que está errado. Não é o `lp:review-walkthrough`, que ensina código existente em steps didáticos: aqui ninguém está aprendendo nada, e o produto do trabalho é uma lista de defeitos com severidade.

## Toggle

- Campo `code_review` no `.sdd/config.yaml`: `off` (padrão, ausente = `off`) ou `on`.
- Com `off`, o passo **não existe** — não revise, não comente que está desligado, não sugira ligar.
- Com `on`, roda por chunk (passo `c-bis`) e mais uma vez ao concluir a feature (passo `f-ter`).
- Sob demanda, o `lp:code-review` roda independente do toggle: chamar é pedir.

## Modelo e effort

Papel **`code-reviewer`** no bloco `subagents` do config, por harness, como qualquer outro. Ver `./subagents-guide.md`.

É o papel em que subir o modelo mais se paga: revisor fraco produz achado genérico, e achado genérico treina o usuário a ignorar a seção inteira.

## O que o revisor recebe

Sempre os três, e nesta ordem de importância:

1. **O diff do chunk** — o que mudou.
2. **Os arquivos tocados, inteiros** — o contexto ao redor. Sem isso ele não vê a função completa nem o contrato, e perde justamente o bug que só aparece na interação com o código que já estava lá.
3. **A `spec.md` da feature** (ou, no bug-fix, o `diagnosis.md` + a `chosen_solution`) — o que era para acontecer. É o que permite o achado *"implementou diferente do combinado"*, que nenhum linter dá.

Na passada de feature (`f-ter`), some a isso os arquivos de **todos** os chunks dela: o alvo ali é a incoerência entre chunks, que por definição não cabe em nenhum deles isolado.

## O que procurar — checklist padrão

Vale sempre, mesmo sem nenhum arquivo de instruções escrito:

1. **Corretude** — o código faz o que a spec diz? Condição invertida, off-by-one, retorno errado num ramo.
2. **Borda não tratada** — vazio, nulo, zero, negativo, coleção de um elemento, string sem o separador esperado.
3. **Contrato divergente da spec** — status, payload, tipo de erro ou nome público diferente do que foi combinado.
4. **Erro engolido** — `catch` que silencia, fallback que esconde falha que deveria propagar, `Promise` sem tratamento.
5. **Recurso vazando** — conexão, arquivo, listener, timer, transação sem fechamento garantido.
6. **Concorrência** — leitura seguida de escrita sem atomicidade, estado compartilhado mutável, corrida entre requisições.
7. **Segurança básica** — entrada externa sem validação, concatenação em query, segredo em log, permissão não checada.

Não faz parte do checklist: preferência de estilo, nome que você escreveria diferente, refactor que "ficaria mais elegante". Isso é ruído, e ruído aqui custa mais que o achado que ele acompanha.

## Instruções extras do usuário

Dois arquivos, **somados**:

| Arquivo | O que guarda | Versionado |
|---|---|---|
| `~/.sdd/code-review.md` | o que **você** sempre quer checado, em qualquer projeto | não |
| `.sdd/code-review.md` | o que **este repositório** exige — convenção do time, armadilha conhecida da stack | sim, o time herda |

Leia os dois e passe os dois ao subagente. Em conflito direto, **o do projeto vence** — ele é a regra da casa onde o código está.

Ausência dos dois é o caso normal: rode com o checklist padrão e não peça para o usuário criar arquivo nenhum.

Quando o usuário **pedir** para criar um deles, use `../templates/code-review.md.tpl`.

### Desligar item do checklist

Os arquivos acrescentam critério, e também podem **remover**: uma linha começando com `Ignore:` desliga um item do checklist padrão.

```markdown
Ignore: concorrência — este serviço roda single-threaded, por design.
```

Desligue apenas o que o arquivo pedir, e nunca por conta própria. Se um item desligado produziria um achado grave, mencione em **uma** linha que ele foi suprimido por configuração — e não descreva o achado.

## Formato de cada achado

```
[grave] src/pedidos/calculadora.ts:42 — desconto acumulado aplica duas vezes
Cenário: pedido com 2 itens em promoção → total sai R$ 18,00 em vez de R$ 24,00.
Por quê: o laço soma `desconto` no acumulador e o subtrai de novo no retorno.
Sugestão: subtrair só no retorno, ou zerar o acumulador antes do laço.
```

Quatro campos, todos obrigatórios:

- **Severidade** — `grave` (bug que chega no usuário, perda de dado, falha de segurança), `médio` (borda não tratada, contrato divergente, erro engolido) ou `menor` (legibilidade que atrapalha manutenção, duplicação real).
- **Local** — arquivo e linha. Achado sem endereço não é acionável.
- **Cenário concreto de falha** — entrada específica e o resultado errado que ela produz. **Não conseguiu escrever o cenário? Não é achado.** É a regra que separa defeito de opinião, e é o que impede a lista de crescer sem limite.
- **Por quê + sugestão** — o mecanismo do erro e um caminho de correção. Sugestão não é ordem.

A lista sai **ordenada por severidade**, graves primeiro. Não há teto de quantidade: um chunk realmente problemático merece a lista inteira, e o `cenário obrigatório` já é o filtro.

Nada encontrado é resultado legítimo e comum. Diga *"Code review: nada a apontar"* em uma linha e siga — não invente achado menor para justificar a rodada.

## O revisor reporta, nunca corrige

Mesma regra do tester, pelo mesmo motivo: a decisão é do usuário. Um achado pode estar errado, ou apontar algo que foi decidido de propósito no grill.

- **Não edite código.** Nem o "óbvio", nem o typo.
- **Não bloqueie** o `/lp-continue`. Achado grave é destaque no plano de revisão, não trava.
- **Não repita** o que o plano de revisão já diz. O campo `Revisar` conta o que olhar; o achado conta o que **está errado**.

## Onde entra no plano de revisão

Bloco próprio, **depois** da lista de arquivos e antes da linha `Próximo:`:

```
Code review (2 achados — 1 grave, 1 médio):
[grave] src/pedidos/calculadora.ts:42 — desconto acumulado aplica duas vezes
  Cenário: pedido com 2 itens em promoção → total R$ 18,00 em vez de R$ 24,00.
[médio] src/pedidos/repo.ts:88 — busca sem limite quando o filtro vem vazio
  Cenário: filtro nulo → carrega a tabela inteira em memória.
```

No plano, cada achado cabe em duas linhas (severidade + local + o quê, mais o cenário). O `por quê` e a sugestão completos vão para o banco e são ditos no chat só se o usuário perguntar.

Com achado `grave`, acrescente à linha `Próximo:` que há um achado grave a decidir — sem bloquear.

## Registro no banco (só com `mcp: on`)

Os achados vão no **`sdd_record_chunk`**, no mesmo passo `g-bis`, no campo `code_review` — um item por achado, com severidade, arquivo, linha, cenário, causa e sugestão.

Ficam amarrados ao chunk que os gerou, aparecem na Timeline junto do arquivo revisado e entram na busca. É o que permite, depois, perguntar o que já foi apontado e nunca corrigido.

Com `mcp_record.code_review: false`, pule o campo — o review continua rodando e aparecendo no chat.

## Anti-padrões

- ❌ **Achado sem cenário de falha.** É opinião de estilo com roupa de bug.
- ❌ **Reescrever o código no lugar de apontar o problema.** Sugestão é uma frase, não um patch.
- ❌ **Repetir o `Revisar` do plano com outras palavras.** Se o revisor não achou nada além do que já estava escrito, ele não achou nada.
- ❌ **Marcar tudo como grave.** Severidade que não discrimina não informa, e é o caminho mais rápido para o usuário parar de ler a seção.
- ❌ **Apontar ausência de teste como achado.** Isso é trabalho do `tests: on` e do passo f-bis.
- ❌ **Revisar código que o chunk não tocou.** O escopo é o diff mais o contexto ao redor dele; auditoria geral do repositório é outra tarefa.
