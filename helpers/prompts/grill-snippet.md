# Grill snippet (reuso pelas skills `lp:*`)

> **PRINCÍPIO CENTRAL**: pergunte antes de assumir. Sempre. Não tente "agilizar" decidindo no lugar do usuário.

## Protocolo (não-negociável)

1. **Uma pergunta por vez** via `AskUserQuestion` com 2-4 opções concretas + trade-offs explícitos. Sem rajadas de perguntas.
2. **Não invente "default razoável"**. Se há ambiguidade real, pergunte. "Vou assumir X" é red flag — pare e converta em pergunta.
3. **Tente inferir do código primeiro** (Read/Grep/Glob/Explore) antes de perguntar. Mas se inferiu, **confirme** com o usuário em 1 frase ("Vi que você usa NestJS + Prisma — confirma manter esse stack para esta feature?").
4. **Resolva todos os ramos pendentes antes de gerar o artefato.** Se ainda há decisão aberta, NÃO escreva nada. Continue grilling.
5. **Recomende uma resposta** em cada pergunta (estilo grill-me), mas deixe o usuário escolher.

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
- ❌ Listar 5+ opções de uma vez.
- ❌ Re-perguntar algo já respondido (releia a conversa e o `plan.md`/`.sdd.yaml` antes de perguntar).
- ❌ Grilling sobre detalhes editoriais (nome de variável, ordem de seções, escolha de palavra).
- ❌ Despachar 4 perguntas seguidas em uma só chamada se elas são dependentes — a resposta de uma muda a próxima.
- ❌ Gerar o artefato "rápido" e dizer "depois você ajusta". Isso recria o problema que o SDD quer resolver.

## Quando pode (excepcionalmente) usar AskUserQuestion com várias perguntas

Apenas quando as perguntas são **ortogonais** (resposta de uma não muda a outra). Ex: formato MD/HTML, idioma, chunk size no `lp:init`. Para tudo que envolve design de feature, vá uma por vez.
