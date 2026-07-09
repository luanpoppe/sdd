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

## Contratos (se aplicável)

<!--
Schemas, tipos, eventos. Pode referenciar arquivos do repo em vez de duplicar.
Ex: "Body validado por `src/.../dto.ts:CreateXDto`".
-->

{{contracts}}
