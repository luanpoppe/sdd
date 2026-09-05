# Spec: {{feature_name}}

> Parte de [`{{change_id}}`](../../plan.md)

## Resumo

<!--
1-2 frases. O que esta feature faz, do ponto de vista do usuário/sistema.
-->

{{summary}}

## Requirements (cenários BDD)

<!--
Cada requirement é um cenário BDD curto.
Use sub-cenários para edge cases.
NÃO repita contexto do plan.md — só o comportamento esperado.

PALAVRAS-CHAVE POR IDIOMA (use o `lang` do .sdd/config.yaml):
- pt-BR → "Dado que" / "Quando" / "Então"
- en    → "Given" / "When" / "Then"
-->

### REQ-1: {{req_1_title}}

- **Dado que** {{given}}        <!-- ou "Given" se lang == en -->
- **Quando** {{when}}            <!-- ou "When" -->
- **Então** {{then}}             <!-- ou "Then" -->

### REQ-2: {{req_2_title}}

- **Dado que** ...
- **Quando** ...
- **Então** ...

## Edge cases

<!-- Lista enxuta. Cada item: condição → comportamento esperado. -->

- {{edge_case_1}}

## Contratos expostos

<!--
SEÇÃO CONDICIONAL — só existe quando esta feature cruza uma borda externa.

Como decidir, sem perguntar ao usuário: releia os cenários BDD que você acabou de
escrever. Se algum deles cita status code, payload, tópico/evento, coluna de tabela
ou assinatura pública de biblioteca, há borda externa e a seção entra. Se nenhum
cita, a feature é interna: APAGUE esta seção inteira do arquivo — não deixe vazia,
não escreva "n/a", e não a inclua na ordem de revisão.

"Exposto" é o que sai da feature para fora dela. Tipo interno, DTO de uso privado e
helper de domínio ficam fora, mesmo que a feature os crie.

CONTEÚDO — referência é a forma padrão, cópia é a exceção:
- Contrato que JÁ existe no repositório → uma linha de referência, nunca o schema.
  Ex: "Body validado por `src/users/dto/create-user.dto.ts:CreateUserDto`".
- Contrato NOVO, sem arquivo a apontar ainda → pode vir escrito aqui, porque não há
  referência possível. Ele é provisório: o chunk que criar o arquivo troca este bloco
  pela referência (passo g-ter do lp:continue).

Colar interface, JSON de exemplo ou schema de contrato que já tem arquivo é
anti-padrão: duplica o que o código diz melhor, e envelhece sozinho.
-->

{{contracts}}
