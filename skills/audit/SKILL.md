---
name: audit
description: Checa manualmente divergências entre as docs (`plan.md`, specs, `tasks.md`) e o estado real do código da mudança ativa do SDD `lp:*`. Lista divergências em 3 buckets (decisão divergente, escopo extra, escopo faltante) e propõe diffs nas docs ou novas tasks. Use quando o usuário pedir "lp:audit", "verificar divergências", ou suspeitar que docs e código saíram de sincronia.
---

Você está auditando a coerência entre docs e código da mudança ativa. **Não aplique nada sem confirmação do usuário.**

## 1. Coleta

- Identifique a mudança ativa.
- Leia `plan.md` e o `.sdd.yaml`.
- Para cada feature com `status != pending`, leia `specs/<slug>/spec.md` e `specs/<slug>/tasks.md` (se existirem).
- Liste os arquivos referenciados nas tasks já marcadas `[x]` ou `[~]`.
- Para cada arquivo referenciado, leia o estado atual no projeto.

## 2. Análise de divergências

Use os critérios da `state-machine.md` (seção "Detecção de divergência"). Classifique cada achado em:

- **Decisão divergente**: o código contradiz uma decisão registrada (`plan.md` diz "usar X", código usa Y).
- **Escopo extra**: arquivos/funções criados sem entrada correspondente em `tasks.md` ou specs.
- **Escopo faltante**: requirements de specs sem código correspondente.

## 3. Para cada divergência

Apresente:

```
### [<bucket>] <título curto>

**Doc atual**: <trecho relevante de plan.md/spec.md/tasks.md>
**Realidade no código**: <arquivo:linhas + resumo>
**Proposta**:
  - opção A: atualizar a doc → <diff resumido>
  - opção B: ajustar o código → adicionar task de correção em tasks.md
```

## 4. Output final

Resumo:

```
Auditoria de <id>:
- Decisões divergentes: N
- Escopo extra: M
- Escopo faltante: K

Próximo passo sugerido: <resolver as N divergentes primeiro via diffs; depois rodar /lp-continue>.
```

Se zero divergências: imprima "Sem divergências detectadas. Docs e código estão alinhados."

## Princípios

- Não aplique mudanças sem `OK` explícito.
- Não sugira refactor de qualidade — foco é alinhamento docs↔código.
- Se algo está ambíguo, registre como "indeterminado" em vez de inventar um veredito.
