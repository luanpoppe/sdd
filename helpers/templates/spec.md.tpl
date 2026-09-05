# Spec: {{feature_name}}

> Parte de [`{{change_id}}`](../../plan.md)

## Resumo

<!--
1-2 frases. O que esta feature faz, do ponto de vista do usuário/sistema.
-->

{{summary}}

## Requirements

<!--
DOIS FORMATOS, escolhidos POR REQUISITO — não por feature. A mesma spec normalmente
tem os dois: o fluxo que o usuário aciona em BDD, o cálculo que sustenta esse fluxo em
Entrada/Saída.

LINHA DE CORTE — dá para escrever o "Dado que" com um ator de FORA do sistema
(usuário, cliente da API, job agendado, sistema parceiro)?
- Sim  → formato BDD (comportamento).
- Não, o "Dado que" só consegue falar de estado interno → formato Entrada/Saída.

PISO: se a feature tem ator externo, pelo menos UM requisito em BDD. Feature 100%
interna (parser, cálculo, mapeamento) pode não ter nenhum, e está certo assim.

Numeração CONTÍNUA entre os dois formatos — `REQ-1` BDD e `REQ-2` técnico convivem.
É o que mantém `scenario_keys`, chunk e teste amarrados sem regra nova.

NÃO repita contexto do plan.md — só o comportamento esperado.

PALAVRAS-CHAVE POR IDIOMA (use o `lang` do .sdd/config.yaml):
- pt-BR → "Dado que" / "Quando" / "Então"   ·   "Entrada" / "Saída" / "Erro"
- en    → "Given" / "When" / "Then"         ·   "Input" / "Output" / "Error"
-->

### REQ-1: {{req_1_title}}

<!-- Formato BDD: há ator externo acionando. -->

- **Dado que** {{given}}        <!-- ou "Given" se lang == en -->
- **Quando** {{when}}            <!-- ou "When" -->
- **Então** {{then}}             <!-- ou "Then" -->

### REQ-2: {{req_2_title}}

<!--
Formato Entrada/Saída: comportamento interno, sem ator externo.

VALOR LITERAL E PLAUSÍVEL DO DOMÍNIO, não descrição e nunca `foo`/`bar` — é o que
permite virar caso de teste sem tradução, e é a mesma exigência dos `examples` que o
MCP grava em `symbols`. Payload grande ou binário: uma linha descrevendo, em vez de
colar 40 linhas de JSON aqui.

`Erro` é a BORDA DESTE REQUISITO, e mora aqui, não na seção Edge cases. Omita a linha
quando o requisito não tem caso de erro.
-->

- **Entrada** `"123.456.789-09"`
- **Saída** `true`
- **Erro** entrada com dígito verificador inválido → `false` (não lança)

## Edge cases

<!--
Só o que é TRANSVERSAL — não pertence a nenhum requisito específico: concorrência,
limite de volume, timeout, indisponibilidade de dependência externa.

Borda de um requisito vai na linha `Erro` dele (formato técnico) ou como sub-cenário
dele (formato BDD). Repetir aqui é duplicar o que o tester já vai cobrir.

Lista enxuta. Cada item: condição → comportamento esperado.
-->

- {{edge_case_1}}

## Contratos expostos

<!--
SEÇÃO CONDICIONAL — só existe quando esta feature cruza uma borda externa.

Como decidir, sem perguntar ao usuário: releia os requisitos que você acabou de
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
