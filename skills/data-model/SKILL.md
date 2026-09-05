---
name: data-model
description: Desenha modelo de dados — tabela, coluna, tipo, chave, índice e a ordem segura da migração — e escreve a migração depois da sua aprovação. Também audita o schema que já existe, apontando FK ausente, tipo errado, coluna nulável que nunca é nula e índice inútil. Use quando o usuário pedir "lp:data-model", "modela essa tabela", "como guardar isso no banco", "revisa meu schema", "lp:data-model auditar".
---

Você está decidindo como os dados vão ficar guardados. Siga `../../helpers/prompts/data-model-guide.md` — ele define o checklist, o formato da proposta e as regras de migração segura.

> **Aprovação antes de escrever.** Nenhum arquivo de migração é criado antes de o usuário ver o modelo e concordar. Migração aplicada não volta com `git checkout`.

## 1. Definir o alvo

Do argumento do usuário, ou perguntando **uma vez** se não der para inferir:

| Pedido | Alvo |
|---|---|
| sem argumento, com chunk em `in_review` ou em andamento | os dados daquele chunk |
| `auditar` (ou "revisa meu schema") | o schema inteiro do projeto — modo do item 5 |
| `<nome de tabela ou entidade>` | aquela tabela e as diretamente ligadas a ela |
| descrição em prosa ("preciso guardar X") | modelagem nova, sem chunk |

Fora de um projeto com `.sdd/`, funciona igual: o que falta é a `spec.md`, não o resto.

## 2. Montar a entrada

1. **O que precisa ser guardado** e as **consultas** que vão bater nele. Sem as consultas não há como decidir índice — se o usuário não disse, pergunte junto do resto.
2. **O schema que já existe** — migrações, schema do ORM, ou o banco se acessível. **A convenção da casa vence o guia.**
3. **A `spec.md`** da feature, quando houver (ou `diagnosis.md` + `chosen_solution` no bug-fix).

## 3. Lançar o subagente — fase de proposta

**Um** subagente, papel `data-modeler` em `subagents` (modelo e effort — ver `../../helpers/prompts/subagents-guide.md`). Ele **desenha e explica, sem escrever arquivo**.

Imprima a proposta no formato do guia: uma linha por coluna, índice com a consulta que o justifica ao lado, decisões com o porquê, alternativa descartada com o motivo, migração numerada e a linha de reversibilidade.

Onde houver bifurcação legítima — chave natural vs surrogate, embutir vs referenciar, enum vs lookup, soft vs hard delete —, pergunte com `AskUserQuestion`, **no máximo duas perguntas**. Não pergunte o que o checklist já decide.

## 4. Escrever — só depois do OK

Aprovado, lance o subagente de novo para escrever **apenas os arquivos de dados**: migração e schema do ORM. Nada de código de aplicação — repositório, serviço e rota são de outro passo (ou de outro pedido).

Ele devolve o relatório por arquivo (`Faz` / `Conecta` / `Revisar`), que você imprime como em qualquer chunk.

Se o usuário recusou, não escreva nada e não insista: pergunte o que mudar e refaça a proposta.

## 5. Modo `auditar`

Lê o schema real e aponta problema, **sem escrever migração**. Corrigir é trabalho de um chunk, e chunk passa pelo fluxo normal — com spec, revisão e commit.

Mesmo formato de achado do code review: severidade, alvo e **cenário concreto**. Sem cenário, não é achado.

```
Schema — 3 achados (1 grave, 1 médio, 1 menor)

[grave] pedido_item — sem FK para pedido
  Cenário: DELETE em pedido deixa itens órfãos, e o relatório de vendas os soma.
  Sugestão: FK com ON DELETE CASCADE, depois de limpar os órfãos existentes.

[médio] usuario.email — nulável, 0 nulos em 40k linhas
  Cenário: código assume e-mail presente em 6 lugares; o primeiro nulo derruba o login.

[menor] idx_pedido_status — nunca usado
  Cenário: custo em toda escrita de pedido, sem consulta que filtre só por status.
```

O que procurar, na ordem: FK ausente entre tabelas que se referenciam · tipo errado para o conteúdo (dinheiro em float, data em texto, booleano em inteiro) · coluna nulável que na prática nunca é nula (e a inversa: `NOT NULL` com valor padrão vazio disfarçado) · falta de `UNIQUE` no que o código trata como único · índice ausente em FK · índice sem consulta que o use · tabela sem chave primária.

Termine com uma linha dizendo o que **não** deu para verificar (ex: *"sem acesso ao banco, não dá para medir uso de índice nem contar nulos"*) — auditoria que finge cobertura é pior que auditoria curta.

## 6. Registrar (só com `mcp: on`)

Rodando sobre um chunk conhecido, chame `sdd_record_chunk` com o campo `data_model` preenchido — as entidades ficam amarradas ao chunk e entram na busca.

Fora de chunk (modelagem avulsa, auditoria), registre um `sdd_record_event` (`kind: note`) com o resumo: quantas entidades, quais decisões, quantos achados. Ver `../../helpers/prompts/mcp-guide.md`.

## Princípios

- **Aprovação antes de escrever, sempre.** Vale na skill e no passo `b-ter`.
- **A convenção do projeto vence o guia.** Schema misto é pior que schema imperfeito.
- **Índice sem consulta não existe.**
- **Auditar aponta, não corrige** — a correção vira chunk, com revisão.
- Não confunda com `lp:code-review`, que audita código recém-escrito, nem com a seção "Contratos expostos" da spec, que trata do payload que sai da feature.
