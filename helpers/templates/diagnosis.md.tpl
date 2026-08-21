# Diagnóstico: {{title}}

> Bug [`{{change_id}}`](.) · gerado por `lp:bug-fix` · atualizado em {{updated}}
> Entendimento e **causa raiz** do bug. As opções de correção ficam em [`solutions.md`](solutions.md).

## Resumo

{{resumo}}   <!-- 1 frase de NEGÓCIO: qual é o bug + por que importa. SEM números específicos, SEM mecanismo/causa (isso é Sintoma e Causa raiz). NÃO detalhe código. -->

## Sintomas e reprodução

- **Sintoma**: {{sintoma}}   <!-- EVIDÊNCIA BRUTA concreta: números exatos, print, mensagem literal (ex: `chat: "entre 20 membros" · painel TIME: 19 nomes`). NÃO reformule o Resumo em prosa — se só repetiria, corte esta linha. -->
- **Esperado**: {{esperado}}
- **Reprodução**: {{passos_repro}}   <!-- 1 linha: passos mínimos, ou "não determinística" + o que se sabe -->
- **Escopo**: {{escopo}}   <!-- 1 linha: onde acontece (prod/local, desde quando, dado específico) -->

## Investigação

<!-- A EVIDÊNCIA. UMA LINHA por passo, formato "arquivo:linha — fato" (~12-15 palavras). SEM prefixo "olhei/constatei" (é filler). NÃO reconte o código do ponto — só o fato que sustenta a causa. Só os passos que sustentam a causa (inclui achado negativo relevante). -->
- {{passo_1}}   <!-- ex: `Agent.java:42-60` — serializa lista inteira pro LLM, sem count pré-calculado. -->
- {{passo_2}}

## Causa raiz

{{causa_raiz}}   <!-- SÍNTESE pura, 1-3 frases: por que o bug acontece, amarrando a evidência. PROIBIDO repetir fato ou arquivo:linha já dito na Investigação — se a frase reexplica um bullet, corte. Nada de propor correção (isso é solutions.md). 2+ causas → bullets curtos. -->

## Impacto

- **Afeta**: {{impacto}}   <!-- quem/o quê + gravidade; não repita o sintoma -->
- **Risco de não corrigir**: {{risco}}

<!--
Princípios (objetividade > completude):
- Cada seção tem UM trabalho; não repita o que já foi dito. Investigação = evidência (uma linha/passo); Causa raiz = a síntese curta. Não re-narre a trilha na causa.
- Auto-check antes de gravar: releia — qualquer frase que repete outra seção, corte.
- Causa, NÃO solução. Nenhuma proposta de fix, refactor ou "lacunas a fechar" aqui — isso vive no solutions.md.
- Direto ao ponto. Cabe em 1 tela (~25-30 linhas). Frases curtas; sem parágrafos redundantes.
- Se a causa não está clara, diga o que falta investigar — não encha linguiça nem invente.
-->
