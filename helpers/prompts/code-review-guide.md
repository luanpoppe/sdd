# Code review guide — o revisor adversarial do `lp:*`

Um subagente que audita **código recém-escrito** procurando o que está errado. Não é o `lp:review-walkthrough`, que ensina código existente em steps didáticos: aqui ninguém está aprendendo nada, e o produto do trabalho é uma lista de defeitos com severidade.

## Toggle

- Campo `code_review` no `.sdd/config.yaml`: `off` (padrão, ausente = `off`) ou `on`.
- Com `off`, o passo **não existe** — não revise, não comente que está desligado, não sugira ligar.
- Com `on`, roda **uma vez por feature**, no passo `f-ter`, quando o último chunk dela fecha. Não roda por chunk.
- Sob demanda, o `lp:code-review` roda independente do toggle: chamar é pedir.

### Por que uma vez por feature, e não a cada chunk

Rodar por chunk custava caro e entregava pouco: um subagente por chunk, achados chegando de três em três, e a mesma decisão sendo pedida cinco vezes numa feature de cinco chunks. Pior, achado de chunk isolado erra mais — metade do que parece borda não tratada num chunk é tratada no chunk seguinte, que ainda não existia quando a revisão rodou.

Com a feature inteira na mão, o revisor vê o contrato completo, a incoerência entre chunks e o que de fato ficou sem tratamento. E a decisão acontece uma vez, com tudo junto.

O preço, dito claramente: **um achado grave nasce mais tarde**, já com chunks depois dele. É o custo aceito, e é o motivo de a decisão ser uma porta antes da próxima feature em vez de uma sugestão no meio do texto.

## Modelo e effort

Papel **`code-reviewer`** no bloco `subagents` do config, por harness, como qualquer outro. Ver `./subagents-guide.md`.

É o papel em que subir o modelo mais se paga: revisor fraco produz achado genérico, e achado genérico treina o usuário a ignorar a seção inteira.

## O que o revisor recebe

Sempre os três, e nesta ordem de importância:

1. **O diff da feature** — tudo o que os chunks dela mudaram.
2. **Os arquivos tocados, inteiros** — o contexto ao redor. Sem isso ele não vê a função completa nem o contrato, e perde justamente o bug que só aparece na interação com o código que já estava lá.
3. **A `spec.md` da feature** (ou, no bug-fix, o `diagnosis.md` + a `chosen_solution`) — o que era para acontecer. É o que permite o achado *"implementou diferente do combinado"*, que nenhum linter dá.

O alvo é a feature, não o último chunk. Boa parte do valor está exatamente no que não cabe num chunk isolado: contrato que mudou no meio do caminho, duplicação que só aparece com o conjunto na mão, borda que cada chunk achou que o outro tratava.

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

Cada achado tem **um identificador curto** (`A1`, `A2`, …) na ordem em que sai. Ele não é enfeite: é o que permite ao usuário responder *"corrige A1 e A3"* sem redescrever o problema.

Grave e médio saem com a ficha completa:

```
A1 [grave] src/pedidos/calculadora.ts:42 — desconto acumulado aplica duas vezes
   Cenário:  pedido com 2 itens em promoção → total R$ 18,00 em vez de R$ 24,00.
   Causa:    o laço soma `desconto` no acumulador e o subtrai de novo no retorno.
   Correção: subtrair só no retorno, ou zerar o acumulador antes do laço.
   Custo:    1 arquivo, ~3 linhas, sem novo teste.
```

Campos obrigatórios:

- **Severidade** — `grave` (bug que chega no usuário, perda de dado, falha de segurança), `medio` (borda não tratada, contrato divergente, erro engolido) ou `menor` (legibilidade que atrapalha manutenção, duplicação real). Sempre estes três nomes; nunca "baixo", "alto", "crítico".
- **Local** — arquivo e linha. Achado sem endereço não é acionável.
- **Cenário concreto de falha** — entrada específica e o resultado errado que ela produz. **Não conseguiu escrever o cenário? Não é achado.** É a regra que separa defeito de opinião.
- **Causa** — o mecanismo do erro, não a repetição do título.
- **Correção** — o caminho, em uma frase. Sugestão não é ordem, e não é patch.
- **Custo** — quantos arquivos, quantas linhas, e se exige teste novo. É o campo que decide: sem ele, "corrigir agora ou depois?" é um chute.

**Menor sai em uma linha**, e sai sempre:

```
A4 [menor] src/pedidos/repo.ts:12 — `x` como nome do agregador esconde o que ele acumula.
```

### Contar sem listar é o pior dos formatos

Se o cabeçalho diz `6 achados`, os seis aparecem. Listar três e esconder os outros três atrás de um número é pior que não ter revisado: o usuário sabe que existe algo e não tem como olhar.

A lista sai **ordenada por severidade**, graves primeiro. Não há teto de quantidade — o cenário obrigatório já é o filtro.

Nada encontrado é resultado legítimo e comum. Diga *"Code review: nada a apontar"* em uma linha e siga — não invente achado menor para justificar a rodada.

## A decisão — uma porta, não uma sugestão

Achado impresso e nunca decidido é o modo mais comum de a revisão falhar: não foi corrigido, não foi descartado, não foi adiado, e ninguém volta nele. Como agora o review roda uma vez por feature, a decisão é um **passo de fluxo**, com lugar fixo:

1. **No mesmo turno em que a feature fecha**, depois de imprimir o plano de revisão, exponha **todos** os achados da feature e pergunte o que fazer.
2. **No `/lp-continue` seguinte**, antes de começar qualquer coisa: se ainda houver achado `aberto` da feature anterior, exponha de novo e pergunte **antes** de iniciar o próximo chunk. Só depois disso o fluxo segue.

O passo 2 é o que faz disto uma porta. Sem ele, fechar a conversa no meio do turno apagaria a decisão, e a dívida voltaria a morrer em silêncio.

O que a porta **não** faz: bloquear indefinidamente. Se você responder "nenhum agora", os achados passam a `adiado` — com uma linha dizendo para quando — e o fluxo segue sem perguntar de novo. `adiado` é decisão; `aberto` é ausência de decisão, e é só isso que reabre a porta.

### O formato da pergunta

Use a interface nativa do harness (`AskUserQuestion` no Claude, equivalente nos outros). O formato depende de quantos achados há:

- **Até 3 achados de grave/médio** → uma pergunta de múltipla escolha, um item por achado (`A1 — <título curto>`), mais a opção de não corrigir nenhum agora.
- **4 ou mais** → uma pergunta agregada: *corrigir todos os graves e médios* · *só os graves* · *nenhum agora, ficam adiados* · *descartar (com motivo)*. Quatro opções é o teto da interface; enfileirar 7 achados numa pergunta não cabe.

**Só `menor` na lista → não pergunte.** Os menores ficam abertos, aparecem no plano e não param nada — interromper o fluxo por legibilidade é o caminho mais rápido para o usuário parar de ler a seção inteira.

O usuário sempre pode responder fora das opções (*"corrige A1 e A3"*, *"descarta A2, foi decidido assim no grill"*). Trate isso como a resposta, não como fuga do formulário.

### Sem MCP, a porta não persiste

O gate do `/lp-continue` seguinte consulta o `open_findings` do `sdd_query_history`. Com `mcp: off`, o achado vive só no chat: a exposição no turno em que a feature fecha continua valendo, a segunda passada não existe. Diga isso **uma vez** na primeira rodada de review da conversa, e não repita.

## A correção — quem aplica

O corte é por tamanho, e é objetivo de propósito:

| Situação | Quem corrige |
|---|---|
| Até 2 achados, no mesmo arquivo | **o principal**, inline |
| 3 ou mais, ou espalhados por arquivos diferentes | **um subagente implementer**, com escopo só dos achados |

Uma rodada de subagente para trocar 4 linhas é desperdício; correção espalhada feita inline come o contexto da conversa principal. Nos dois casos, depois de corrigir:

1. **Rode a validação do projeto** nos arquivos tocados, e o teste que cobre o achado (se existir). Correção sem verificação é troca de um defeito por outro.
2. **Regrave o chunk** — `sdd_record_chunk` com os arquivos que mudaram e o `code_review` dos achados fechados (`status: "corrigido"` + `resolution`). Ver `./mcp-guide.md`: campo ausente preserva, então o payload é pequeno.
3. **Reimprima só o que mudou** do plano de revisão — os arquivos tocados e o bloco de achados atualizado, não o plano inteiro.
4. **Diga o que ficou aberto**, em uma linha, mesmo que seja "nada".

Passar a correção adiante como se fosse um chunk novo é errado: não é chunk novo, é o mesmo chunk numa versão melhor. Ele não ganha ID, não entra no `tasks.md`, não vira commit separado (o commit do chunk sai depois da aprovação, já com a correção dentro).

## Desfecho de cada achado

Todo achado termina em um destes quatro estados, e três deles exigem uma frase de justificativa:

- `aberto` — o padrão de quem nasce. Não precisa de justificativa.
- `corrigido` — `resolution` diz **o que foi feito** ("trocado por `Object.hasOwn` + spec do caso `undefined`").
- `descartado` — `resolution` diz **por que não é problema** ("decidido no grill: `movieId` no patch é intencional para o admin").
- `adiado` — `resolution` diz **para quando e por quê** ("vai junto do DTO no F2.C2, onde a validação já existe").

`descartado` sem motivo escrito é o mesmo que apagar o achado, e apagar é justamente o que o status existe para evitar.

## Dívida aberta não morre calada

A retomada obrigatória é uma só, e é o gate descrito acima: **no início do `/lp-continue`**, com `mcp: on`, uma chamada `sdd_query_history` (campo `open_findings`, já filtrado por `status: aberto`).

- **Achado `aberto`** → exponha e pergunte antes de iniciar o próximo chunk.
- **Achado `adiado`** → uma linha só, com a contagem, junto do cabeçalho do chunk: *"2 achados adiados da feature `<slug>` (1 grave)."* Sem fichas e sem pergunta.
- **Nada aberto nem adiado** → siga em silêncio. Não anuncie que consultou.

## Onde entra no plano de revisão

Bloco próprio, **depois** da lista de arquivos e antes da linha `Próximo:`:

```
Code review (4 achados: 1 grave, 2 médios, 1 menor):

A1 [grave] src/pedidos/calculadora.ts:42 — desconto acumulado aplica duas vezes
   Cenário:  pedido com 2 itens em promoção → total R$ 18,00 em vez de R$ 24,00.
   Causa:    o laço soma `desconto` no acumulador e o subtrai de novo no retorno.
   Correção: subtrair só no retorno, ou zerar o acumulador antes do laço.
   Custo:    1 arquivo, ~3 linhas, sem novo teste.

A2 [médio] src/pedidos/repo.ts:88 — busca sem limite quando o filtro vem vazio
   Cenário:  filtro nulo → carrega a tabela inteira em memória.
   Causa:    o `where` é montado condicionalmente e o `take` só entra com filtro.
   Correção: `take` fixo com o default da paginação, independente do filtro.
   Custo:    1 arquivo, 1 linha, 1 caso de teste.

A3 [médio] ...

A4 [menor] src/pedidos/repo.ts:12 — `x` como nome do agregador esconde o que ele acumula.

Adiados da feature anterior: 1 (A2 de `user-movie-entry` — validação de tmdbId no use case).
```

A ficha completa vai **no chat**, não só no banco. Era o contrário antes, e o resultado era uma lista que ninguém tinha como julgar: sem causa e sem custo, "corrigir agora?" não tem resposta.

Com achado `grave`, a linha `Próximo:` diz que o próximo `/lp-continue` começa decidindo sobre ele.

## Registro no banco (só com `mcp: on`)

Os achados vão no **`sdd_record_chunk`**, no passo `g-bis`, no campo `code_review` — um item por achado, com severidade, arquivo, linha, cenário, causa, sugestão e, quando houver desfecho, `status` + `resolution`.

Três regras que vêm do formato da tool:

- **O upsert é por `path` + `title`**, não por linha. Corrigir o arquivo move as linhas, e um achado que mudou de linha é o mesmo achado — chavear por linha criaria uma duplicata a cada correção.
- **Campo ausente preserva.** Regravar o chunk sem mandar `code_review` não mexe em achado nenhum; regravar mandando só o achado corrigido não reabre os outros.
- **Sumir da lista não apaga.** Para remover um achado que se revelou falso, mande `drop: true` nele.

Ficam amarrados ao chunk que os gerou, aparecem na Timeline junto do arquivo revisado, entram na busca e voltam pelo `open_findings` do `sdd_query_history` enquanto estiverem abertos.

Com `mcp_record.code_review: false`, pule o campo — o review continua rodando e aparecendo no chat, e a retomada de dívida deixa de existir.

## Anti-padrões

- ❌ **Achado sem cenário de falha.** É opinião de estilo com roupa de bug.
- ❌ **Reescrever o código no lugar de apontar o problema.** Sugestão é uma frase, não um patch.
- ❌ **Repetir o `Revisar` do plano com outras palavras.** Se o revisor não achou nada além do que já estava escrito, ele não achou nada.
- ❌ **Marcar tudo como grave.** Severidade que não discrimina não informa, e é o caminho mais rápido para o usuário parar de ler a seção.
- ❌ **Apontar ausência de teste como achado.** Isso é trabalho do `tests: on` e do passo f-bis.
- ❌ **Revisar código que o chunk não tocou.** O escopo é o diff mais o contexto ao redor dele; auditoria geral do repositório é outra tarefa.
- ❌ **Contar mais achados do que os que você listou.** Número sem ficha é dívida que o usuário sabe que existe e não tem como olhar.
- ❌ **Imprimir a lista e seguir para o `Próximo:`** com grave ou médio em aberto, sem perguntar nada.
- ❌ **Iniciar o próximo chunk com achado `aberto` da feature anterior.** A porta existe justamente aí.
- ❌ **Rodar o review a cada chunk.** Custa um subagente por chunk e produz achado que o chunk seguinte já resolveria.
- ❌ **Interromper o fluxo por achado `menor`.** Legibilidade não justifica pergunta.
- ❌ **Fechar achado sem `resolution`.** `descartado` sem motivo escrito é o mesmo que apagar.
- ❌ **Corrigir o código e não regravar o `status`.** O achado fica aberto no banco para sempre e volta a aparecer em toda retomada.
- ❌ **Tratar a correção como chunk novo.** Não ganha ID, não entra no `tasks.md`, não vira commit separado.
