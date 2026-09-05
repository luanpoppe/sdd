---
name: ask
description: Q&A rápido e efêmero sobre a mudança ativa do SDD `lp:*`. Responde no chat usando `plan.md`, specs e tasks como contexto, **sem gravar nada em lugar nenhum** — é como pedir resposta sem rastro, já que o `lp:explain` registra sozinho pergunta conceitual feita dentro de um fluxo ativo. Use quando o usuário pedir "lp:ask <pergunta>", "só me responde, não salva", ou tiver dúvida rápida de execução durante a implementação.
---

Responda à pergunta do usuário usando como contexto a mudança ativa do SDD. **Não crie nem edite arquivos.**

## 1. Coleta de contexto

- Leia `.sdd/config.yaml`.
- Identifique a mudança ativa (state ≠ archived). Se houver mais de uma, pergunte qual.
- Leia o que for relevante: `plan.md`, specs aplicáveis, `tasks.md`. Não leia tudo se não precisar.
- **Contexto do projeto** (se `context: true`/ausente): consulte `.sdd/context/index.md` e o arquivo da área da pergunta — costuma responder "como X funciona" direto. Ver `../../helpers/prompts/context-guide.md`.
- Se necessário para responder, leia código do projeto referenciado nas docs.

## 2. Resposta

- Direto e objetivo. ≤ 200 palavras na maioria dos casos.
- Cite caminhos de arquivo e linhas quando aplicável (`src/foo.ts:42`).
- Se a resposta merece persistência (ex: vai ser referenciada várias vezes, é um conceito complexo), termine com: *"Se quiser registrar isso de forma persistente, rode `/lp-explain <tema>`."*
- **Invocar `lp:ask` é pedir para não gravar.** Mesmo que a pergunta seja conceitual e a conversa esteja num fluxo `lp:*` ativo — situação em que o `lp:explain` registraria sozinho — aqui não registre. Foi essa a escolha do usuário ao chamar esta skill.

## Histórico (só com `mcp: on`)

Se a pergunta é sobre **trabalho anterior** — *"o que já mexemos aqui?"*, *"onde paramos?"*, *"por que decidimos assim?"* — consulte o banco antes de responder: `sdd_query_history` para a linha do tempo, `sdd_recall` para um termo específico. É mais rápido e mais completo que reler `.sdd/`, e alcança conversas já compactadas. Com `mcp: off`/ausente, responda como sempre, sem mencionar. Ver `../../helpers/prompts/mcp-guide.md`.

## Princípios

- Zero efeitos colaterais no filesystem.
- Não confunda com `lp:explain` (esse persiste, no global do usuário, e dispara sozinho). `lp:ask` é chat-only, sempre.
- Se a pergunta exige um grill (várias rodadas), considere sugerir `/lp-continue` ou abrir um tema dedicado via `/lp-explain`.
