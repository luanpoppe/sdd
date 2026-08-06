# Opções de correção: {{title}}

> Bug [`{{change_id}}`](.) · gerado por `lp:bug-fix` · atualizado em {{updated}}
> Causa raiz em [`diagnosis.md`](diagnosis.md). Aqui: como corrigir. **Escolha uma opção** antes de implementar.

## Contexto

{{contexto}}   <!-- 1-2 frases ligando à causa raiz do diagnosis.md. -->

## Opções

### Opção 1 — {{opcao_1_titulo}}   {{opcao_1_tag}}   <!-- tag opcional: (recomendada) -->

- **Abordagem**: {{opcao_1_abordagem}}   <!-- o que muda, em qual ponto do código -->
- **Prós**: {{opcao_1_pros}}
- **Contras**: {{opcao_1_contras}}
- **Esforço / risco**: {{opcao_1_esforco}}   <!-- ex: baixo/1 chunk · médio/3 chunks · toca migração (risco) -->

### Opção 2 — {{opcao_2_titulo}}

- **Abordagem**: {{opcao_2_abordagem}}
- **Prós**: {{opcao_2_pros}}
- **Contras**: {{opcao_2_contras}}
- **Esforço / risco**: {{opcao_2_esforco}}

<!-- 2 a 4 opções. Inclua ao menos uma "correção mínima" e, quando fizer sentido, uma "correção de raiz" mais ampla. -->

## Recomendação

{{recomendacao}}   <!-- Qual opção e POR QUÊ, em 1-2 frases. O usuário decide; esta é sua sugestão. -->

<!--
Princípios:
- Cada opção corrige a CAUSA RAIZ do diagnosis, não o sintoma.
- Trade-off explícito por opção (nada de "depende").
- Recomende, mas deixe a escolha com o usuário — a escolha vira o tasks.md.
-->
