# Grill snippet (reuso pelas skills `lp:*`)

> **PRINCÍPIO CENTRAL**: pergunte antes de assumir. Sempre. Não tente "agilizar" decidindo no lugar do usuário.

## Protocolo (não-negociável)

1. **Pergunte em batches** via `AskUserQuestion`, agrupando perguntas **independentes entre si** (a resposta de uma não muda o enunciado nem as opções de outra). Até **4 por batch** (mire em 3-4). Cada pergunta com 2-4 opções concretas + trade-offs explícitos + sua recomendação.
2. **Independência é o critério do batch.** Antes de perguntar, levante as decisões em aberto e separe em grupos independentes. Perguntas **dependentes** (a resposta de A muda B — enunciado, opções ou se B faz sentido) NÃO entram no mesmo batch: B vai num batch posterior, depois de A resolvida. Prefira poucos batches bem montados a uma enxurrada solta.
3. **Não invente "default razoável"**. Se há ambiguidade real, pergunte. "Vou assumir X" é red flag — pare e converta em pergunta.
4. **Tente inferir do código primeiro** (Read/Grep/Glob/Explore) antes de perguntar. Mas se inferiu, **confirme** com o usuário em 1 frase ("Vi que você usa NestJS + Prisma — confirma manter esse stack para esta feature?"). Isso pode virar uma das perguntas do batch.
5. **Resolva todos os ramos pendentes antes de gerar o artefato.** Se ainda há decisão aberta, NÃO escreva nada. Continue grilling (nos próximos batches).
6. **Recomende uma resposta** em cada pergunta (estilo grill-me), mas deixe o usuário escolher.

## Como montar os batches

- **Rodada de descoberta primeiro**: liste mentalmente todas as decisões que você já enxerga em aberto. Separe as que são independentes → primeiro(s) batch(es). As dependentes ficam para depois.
- **Teste de independência**: "a resposta desta pergunta muda como eu faria a outra?" Se sim → batches diferentes. Se não → podem ir juntas.
- **Deixe o batch respirar**: 3-4 perguntas é o teto confortável. Se sobrarem só 1-2 independentes, mande as 1-2 — não force encher até 4 com perguntas fracas ou dependentes.
- **Ramifica conforme responde**: a resposta de um batch costuma abrir novas perguntas. Monte o próximo batch com o que ficou desbloqueado. Repita até acabar.
- **Exemplos de independentes** (podem ir no mesmo batch): formato MD/HTML, idioma, chunk size; ou "qual banco?", "auth por sessão ou token?", "precisa de rate limit?" quando uma não condiciona a outra.
- **Exemplos de dependentes** (batches separados): "usa fila?" antes de "qual broker?"; "REST ou gRPC?" antes de perguntar detalhes do contrato.

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

- ❌ "Vou assumir X por padrão" sem perguntar.
- ❌ Listar 5+ **opções** numa mesma pergunta (isso é sobre opções por pergunta, não perguntas por batch — 2-4 opções sempre).
- ❌ Batchar perguntas **dependentes** juntas — a resposta de uma muda a próxima; essas vão em batches separados.
- ❌ Estourar 4 perguntas por batch, ou encher o batch com perguntas fracas só para "aproveitar a chamada".
- ❌ Re-perguntar algo já respondido (releia a conversa e o `plan.md`/`.sdd.yaml` antes de perguntar).
- ❌ Grilling sobre detalhes editoriais (nome de variável, ordem de seções, escolha de palavra).
- ❌ Gerar o artefato "rápido" e dizer "depois você ajusta". Isso recria o problema que o SDD quer resolver.
