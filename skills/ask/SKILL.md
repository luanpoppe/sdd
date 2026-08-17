---
name: ask
description: Q&A rápido e efêmero sobre a mudança ativa do SDD `lp:*`. Responde no chat usando `plan.md`, specs e tasks como contexto, sem persistir nada. Use quando o usuário pedir "lp:ask <pergunta>" ou tiver dúvida rápida durante a implementação que não precisa virar doc.
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

## Princípios

- Zero efeitos colaterais no filesystem.
- Não confunda com `lp:explain` (esse persiste). `lp:ask` é chat-only.
- Se a pergunta exige um grill (várias rodadas), considere sugerir `/lp-continue` ou abrir um tema dedicado via `/lp-explain`.
