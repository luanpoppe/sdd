# Diagnóstico: {{title}}

> Bug [`{{change_id}}`](.) · gerado por `lp:bug-fix` · atualizado em {{updated}}
> Entendimento e **causa raiz** do bug. As opções de correção ficam em [`solutions.md`](solutions.md).

## Resumo

{{resumo}}   <!-- 1-2 frases: qual é o bug, em linguagem que qualquer um do time entende. NÃO detalhe código aqui. -->

## Sintomas e reprodução

- **Sintoma**: {{sintoma}}   <!-- o que se vê de errado -->
- **Esperado**: {{esperado}}
- **Reprodução**: {{passos_repro}}   <!-- passos mínimos, ou "não determinística" + o que se sabe -->
- **Escopo**: {{escopo}}   <!-- onde acontece: prod/local, desde quando, dado específico -->

## Investigação

<!-- A EVIDÊNCIA: a trilha que levou à causa. Um bullet por passo, formato "olhei X → constatei Y". Cite arquivo:linha uma vez cada. Só o que sustenta a causa — não narre o código inteiro. -->
- {{passo_1}}
- {{passo_2}}

## Causa raiz

{{causa_raiz}}   <!-- A CONCLUSÃO em 1-3 frases: o ponto exato (arquivo:linha) e por que causa o bug. Referencie os arquivos já citados na Investigação pelo nome curto — NÃO re-liste a trilha. Se houver 2+ causas, bullets curtos. Nada de propor correção (isso é solutions.md). -->

## Impacto

- **Afeta**: {{impacto}}   <!-- quem/o quê + gravidade; não repita o sintoma -->
- **Risco de não corrigir**: {{risco}}

<!--
Princípios (objetividade > completude):
- Cada seção tem UM trabalho; não repita o que já foi dito. Investigação = evidência (a trilha); Causa raiz = a conclusão curta. Não re-narre a trilha na causa.
- Causa, NÃO solução. Nenhuma proposta de fix, refactor ou "lacunas a fechar" aqui — isso vive no solutions.md.
- Direto ao ponto. Cabe em 1-2 telas (~40 linhas). Frases curtas; sem parágrafos redundantes.
- Se a causa não está clara, diga o que falta investigar — não encha linguiça nem invente.
-->
