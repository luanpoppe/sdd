# Grill snippet (reuso pelas skills `lp:*`)

> **PRINCÍPIO CENTRAL**: pergunte antes de assumir. Sempre. Não tente "agilizar" decidindo no lugar do usuário.

## Protocolo (não-negociável)

1. **Explique no chat, depois pergunte.** Nenhuma chamada de `AskUserQuestion` sai sem o bloco de explicação do batch logo acima dela (formato na seção "Explique antes de perguntar"). A caixa de opções é curta por natureza; o entendimento mora no texto.
2. **Pergunte em batches** via `AskUserQuestion`, agrupando perguntas **independentes entre si** (a resposta de uma não muda o enunciado nem as opções de outra). Até **4 por batch** (mire em 3-4). Cada pergunta com 2-4 opções concretas + trade-offs explícitos + sua recomendação.
3. **Independência é o critério do batch.** Perguntas **dependentes** NÃO entram no mesmo batch: vão num batch posterior, depois que a bloqueadora for resolvida. O teste está na seção "Como montar os batches" e é obrigatório declarar o resultado dele antes de perguntar.
4. **Não invente "default razoável"**. Se há ambiguidade real, pergunte. "Vou assumir X" é red flag — pare e converta em pergunta.
5. **Tente inferir do código primeiro** (Read/Grep/Glob/Explore) antes de perguntar. Mas se inferiu, **confirme** com o usuário em 1 frase ("Vi que você usa NestJS + Prisma — confirma manter esse stack para esta feature?"). Isso pode virar uma das perguntas do batch.
6. **Resolva todos os ramos pendentes antes de gerar o artefato.** Se ainda há decisão aberta, NÃO escreva nada. Continue grilling (nos próximos batches).
7. **Recomende uma resposta** em cada pergunta (estilo grill-me), mas deixe o usuário escolher.

## Explique antes de perguntar

O usuário responde melhor quando entende o que está sendo decidido. As opções do `AskUserQuestion` cabem em 1-5 palavras, e isso não é espaço para explicar nada. Então, **antes** de chamar a ferramenta, escreva no chat um bloco por pergunta do batch:

- **O que está sendo decidido e por que importa aqui** — 1-2 linhas, concretas a este projeto, não teoria genérica.
- **Cada opção** — como funciona na prática, o que custa (trabalho, manutenção, retrabalho depois) e o que ela fecha lá na frente. 1-3 linhas por opção.
- **Sua recomendação e o motivo** — e o que faria você mudar de ideia.
- **O que você está supondo**, quando a recomendação depende de algo que você não confirmou (volume, prazo, quem mantém).

Na chamada de `AskUserQuestion`, os rótulos ficam **curtos** (1-5 palavras) e o campo `description` é um lembrete de uma linha — nunca a explicação repetida. Marque a recomendada com "(Recomendado)" e coloque-a primeiro.

Proporção: o bloco existe para dar entendimento, não para virar ensaio. Pergunta simples merece 3 linhas; decisão que muda a arquitetura merece mais. Se a explicação de uma opção não cabe em 3 linhas, provavelmente são duas decisões disfarçadas de uma — separe.

## Como montar os batches

- **Rodada de descoberta primeiro**: liste todas as decisões que você já enxerga em aberto, antes de perguntar qualquer coisa.
- **Teste de independência, opção por opção**: para cada opção possível da pergunta A, verifique se o enunciado e a lista de opções de B continuam **idênticos**. Basta *uma* opção de A mudar B para as duas serem dependentes. Perguntar "a resposta muda a outra?" no geral é frouxo demais — quem faz o teste no plural acerta, quem faz no singular batcha errado.
- **Declare o resultado do teste antes de perguntar**, em uma linha visível no chat:
  `Batch 2 — independentes: formato do artefato, idioma. Depois: tamanho do chunk (depende do formato).`
  Escrever isso é o que faz a checagem realmente acontecer; sem a linha, o teste vira intenção.
- **A grosseira vem antes da fina**: decisão que *cria ou elimina* outras (usa fila? separa em serviço? tem multi-tenant?) vai sempre num batch anterior ao das decisões que ela condiciona.
- **Deixe o batch respirar**: 3-4 perguntas é o teto confortável. Se sobrarem só 1-2 independentes, mande as 1-2 — não force encher até 4 com perguntas fracas ou dependentes.
- **Ramifica conforme responde**: a resposta de um batch costuma abrir novas perguntas. Monte o próximo batch com o que ficou desbloqueado. Repita até acabar.
- **Exemplos de independentes** (podem ir no mesmo batch): formato MD/HTML, idioma, chunk size; ou "qual banco?", "auth por sessão ou token?", "precisa de rate limit?" quando uma não condiciona a outra.
- **Exemplos de dependentes** (batches separados): "usa fila?" antes de "qual broker?"; "REST ou gRPC?" antes de perguntar detalhes do contrato; "monolito ou serviço separado?" antes de qualquer pergunta sobre deploy.

## Quando a dependência escapar

Acontece: você batcha duas perguntas achando que eram independentes, e a resposta de uma invalida a outra. Nesse caso:

1. **Diga isso na hora, em uma ou duas frases**, nomeando qual resposta ficou sem sentido e por quê.
2. **Reabra só a pergunta afetada**, já com as opções corrigidas pela resposta nova.
3. **Nunca deixe as duas valendo.** Registrar uma decisão que a outra contradiz é pior do que ter perguntado errado — o artefato sai incoerente e ninguém percebe até a implementação.

## Quando parar de grilling

PARE de perguntar SOMENTE quando todas forem verdade:
- Não há ambiguidade que afete a *forma* do artefato (comportamento/estrutura/contrato). Estilo editorial não conta.
- Cada decisão a registrar pode ser justificada em 1 frase com base em algo que o usuário disse OU que está no código.
- Nenhuma resposta do usuário foi "tanto faz" sem follow-up resolvido.

## Quando o usuário diz "tanto faz" / "decide você"

1. **Re-pergunte uma vez** com 2-3 opções MUITO concretas e o trade-off explícito de cada uma. Inclua sua recomendação.
2. Se ainda assim "tanto faz": escolha, registre como **Decisão assistida** no `plan.md` com justificativa, e siga. Avise o usuário no chat: *"Como você delegou, escolhi X porque Y; está registrado nas Decisões e pode ser revertido."*
3. Nunca decida silenciosamente.

## Anti-padrões (não faça)

- ❌ Chamar `AskUserQuestion` sem o bloco de explicação no chat logo acima.
- ❌ Repetir a explicação inteira dentro do `description` da opção — o campo é lembrete de uma linha, e a caixa fica ilegível.
- ❌ Rótulo de opção longo ("Gerar os dois arquivos, mas com o HTML por código") — o rótulo é curto, o detalhe é do chat.
- ❌ "Vou assumir X por padrão" sem perguntar.
- ❌ Listar 5+ **opções** numa mesma pergunta (isso é sobre opções por pergunta, não perguntas por batch — 2-4 opções sempre).
- ❌ Batchar perguntas **dependentes** juntas — a resposta de uma muda a próxima; essas vão em batches separados.
- ❌ Batchar sem declarar a linha de independência, "porque dá para ver que são independentes".
- ❌ Deixar valendo uma resposta que a resposta seguinte contradisse, em vez de reabrir a pergunta.
- ❌ Estourar 4 perguntas por batch, ou encher o batch com perguntas fracas só para "aproveitar a chamada".
- ❌ Re-perguntar algo já respondido (releia a conversa e o `plan.md`/`.sdd.yaml` antes de perguntar).
- ❌ Grilling sobre detalhes editoriais (nome de variável, ordem de seções, escolha de palavra).
- ❌ Gerar o artefato "rápido" e dizer "depois você ajusta". Isso recria o problema que o SDD quer resolver.
