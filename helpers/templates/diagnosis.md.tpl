# Diagnóstico: {{title}}

> Bug [`{{change_id}}`](.) · gerado por `lp:bug-fix` · atualizado em {{updated}}
> Entendimento e **causa raiz** do bug. As opções de correção ficam em [`solutions.md`](solutions.md).

## Resumo

{{resumo}}   <!-- 1-3 frases: qual é o bug, em uma linguagem que qualquer um do time entende. -->

## Sintomas e reprodução

- **Sintoma observado**: {{sintoma}}   <!-- o que o usuário/sistema vê de errado -->
- **Esperado**: {{esperado}}
- **Reprodução**: {{passos_repro}}   <!-- passos mínimos, ou "não reproduzível de forma determinística" com o que se sabe -->
- **Ambiente/escopo**: {{escopo}}   <!-- onde acontece: prod/local, versões, dados específicos -->

## Investigação

<!-- Trilha do que foi olhado até achar a causa. Cite arquivos/funções reais do projeto (path:linha). -->
- {{passo_investigacao_1}}
- {{passo_investigacao_2}}

## Causa raiz

{{causa_raiz}}   <!-- A causa REAL, não o sintoma. Aponte o ponto exato no código (arquivo:linha) e por que ele causa o bug. Se houver mais de uma causa contribuindo, liste. -->

## Impacto

- **Afeta**: {{impacto}}   <!-- quem/o quê é afetado, gravidade -->
- **Risco de não corrigir**: {{risco}}

<!--
Princípios:
- Foco em CAUSA, não em solução (solução vive no solutions.md).
- Se a causa não está clara, diga o que falta investigar — não invente.
- Curto e direto: este é o fluxo enxuto de bug-fix, não uma spec completa.
-->
