---
name: archive
description: Finaliza e arquiva uma mudança do SDD `lp:*`. Roda verificação rigorosa contra plan/specs e, se passar, move a mudança para `.sdd/archive/<id>/`. Use quando o usuário pedir "lp:archive", "finalizar mudança lp", ou após todos os chunks estarem aprovados.
---

Você está fechando uma mudança do SDD.

## 1. Pré-checagem

- Identifique a mudança ativa. Se não houver: "Sem mudança ativa para arquivar." Pare.
- Estado deve ser `awaiting-archive`, OU todas as features com `status: done` no `.sdd.yaml`.
- Se há chunks `[ ]` em algum `specs/<slug>/tasks.md`, ou features ainda `pending`: avise quais e pergunte se deve arquivar mesmo assim ou voltar com `/lp-continue`.
- **Se `kind: bugfix`** (ver `../../helpers/prompts/bugfix-machine.md`): não há features/specs. Verifique contra `diagnosis.md` + `solutions.md` + `tasks.md` (raiz da mudança); "concluído" = todos os chunks `C<m>` do `tasks.md` estão `[~]`/`[x]`. Se ainda há `[ ]`, avise e pergunte igual.

## 2. Verificação rigorosa (delegue para `lp-audit` se quiser)

Rode a mesma análise do `lp-audit`, mas com critério mais estrito:
- Toda spec deve ter pelo menos 1 task `[x]`/`[~]` que a cumpre.
- Nenhuma divergência aberta entre código e `plan.md`.
- `tasks.md` sem chunks pendentes (a menos que o usuário tenha aceito explicitamente).

Se falhar:
- Imprima os problemas em formato similar ao `lp:audit`.
- **Não arquive.** Sugira `/lp-audit` para resolver.

## 3. Confirmar com o usuário

Pergunte explicitamente: "Confirma arquivar `<id>`?" (`AskUserQuestion` com Sim / Não / Revisar antes).

Só siga adiante com `Sim`.

## 4. Arquivamento

- Mover `.sdd/changes/<id>/` → `.sdd/archive/<id>/`.
- Editar `.sdd.yaml` movido: `state: archived`, `archived: <YYYY-MM-DD>`.
- Marcar todos os `[~]` restantes como `[x]` no `tasks.md` arquivado.
- Com **`mcp: on`** no `.sdd/config.yaml`: chame `sdd_sync_change` com `archived: <YYYY-MM-DD>` e `state: archived`. Ver `../../helpers/prompts/mcp-guide.md`. Com `off`/ausente, não mencione MCP.

## 5. Mensagem final

```
Mudança <id> arquivada em .sdd/archive/<id>/.

Sumário:
- N chunks implementados
- M specs cumpridas
- Duração: <created → archived>

Considere criar um commit cobrindo a mudança (não fiz isso automaticamente).
```

## Princípios

- Nunca arquive sem confirmação.
- Não deletar nada — apenas mover.
- Não criar commit automaticamente; isso é decisão do usuário.
