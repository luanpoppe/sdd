# Data model guide — o subagente que desenha os dados antes de escrever a migração

Um subagente que decide **como os dados vão ficar** — tabela, coluna, tipo, chave, índice, migração — e só depois escreve os arquivos de dados do chunk. Separado do implementer de propósito: quem está fazendo a feature funcionar otimiza para hoje, e o schema é a parte que sobrevive mais tempo e é a mais cara de mudar.

> **Migração aplicada não volta com `git checkout`.** É essa assimetria que justifica um papel próprio, uma aprovação sua antes de escrever e um passo antes — e não uma revisão depois, como o code review.

## Toggle

- Campo `data_model` no `.sdd/config.yaml`: `off` (padrão, ausente = `off`) ou `on`.
- Com `off`, o passo **não existe** — não modele, não comente que está desligado, não sugira ligar. O implementer escreve a migração como sempre escreveu.
- Com `on`, roda no passo **`b-ter`** do motor `implementing`, e só nos chunks que tocam dados.
- Sob demanda, o `lp:data-model` roda independente do toggle: chamar é pedir.

## Modelo e effort

Papel **`data-modeler`** no bloco `subagents` do config, por harness. Ver `./subagents-guide.md`.

## Quando o passo dispara

O principal julga pelos **arquivos do chunk** (campo `Arquivos` do `tasks.md`) e pelo que o chunk faz. Não existe campo novo no `tasks.md` para isso — é o mesmo tipo de julgamento que decide se a spec leva a seção "Contratos expostos".

| Toca dados | Não toca |
|---|---|
| pasta de migração (`migrations/`, `db/migrate/`, `alembic/`) | rota, controller, componente de UI |
| schema de ORM (`schema.prisma`, `*.entity.ts`, `models.py`) | serviço que só **lê** por um repositório que já existe |
| SQL com `CREATE TABLE`, `ALTER TABLE`, `CREATE INDEX` | teste, config, script |
| coleção/documento novo (Mongo, Dynamo, Firestore) | tipo de retorno de API (isso é contrato, não modelo) |

Na dúvida entre os dois lados, **rode**. Um subagente a mais custa uma fração do que custa reverter uma migração já aplicada.

## As duas fases — propor, aprovar, escrever

O passo tem uma **aprovação obrigatória do usuário no meio**. É a única exceção do motor `implementing` a "o passo não bloqueia": aqui bloqueia, porque o custo do erro não é simétrico.

### Fase 1 — propor

Lance o subagente com a tarefa de **desenhar e explicar**, sem escrever arquivo nenhum. Ele recebe:

1. **O chunk** — o que precisa ser guardado, e as consultas que a feature vai fazer.
2. **O schema que já existe** — migrações anteriores, schema do ORM, ou o banco em si se acessível. É o insumo mais importante: **a convenção da casa vence o guia** (plural vs singular, `snake_case`, `id` vs `<tabela>_id`, timestamps padrão).
3. **A `spec.md` da feature** (ou `diagnosis.md` + `chosen_solution`, no bug-fix) — os requisitos dizem o que precisa ser único, obrigatório e consultável.

### Fase 2 — aprovar

O principal imprime a proposta no chat (formato abaixo) e **para**. Onde houver bifurcação legítima com trade-off real, pergunte com `AskUserQuestion` — no máximo **duas** perguntas, as que mais mudam o desenho.

Bifurcação legítima é a que muda o schema e não tem resposta óbvia: chave natural vs surrogate, embutir vs referenciar, enum vs tabela de lookup, soft delete vs hard delete, uma tabela vs herança por tabela.

**Não pergunte o que o checklist já responde.** Dinheiro em `NUMERIC` não é escolha; é o piso.

### Fase 3 — escrever

Aprovado, lance o subagente de novo (papel `data-modeler`) para escrever **apenas os arquivos de dados**: a migração e o schema do ORM. Ele devolve o mesmo relatório por arquivo do implementer — `Faz` / `Conecta` / `Revisar` —, que entra no plano de revisão junto com os do passo `c`.

Cada arquivo do chunk tem **um dono só**. O implementer, no passo `c`, recebe o modelo já aplicado e escreve o código que o usa: repositório, serviço, rota. Ele não mexe na migração.

## Checklist — o piso, sempre

### 1. Tipo, nulidade e constraint

- **Dinheiro em decimal exato** (`NUMERIC(12,2)`, `DECIMAL`), nunca `float`/`double`. É o erro mais comum e o que mais dói: centavo somado em binário não fecha.
- **Timestamp com fuso** (`timestamptz`, `DateTime` com tz), sempre em UTC no banco. Data sem hora só quando for genuinamente uma data (aniversário, competência).
- **Texto com limite pensado**, não `VARCHAR(255)` por hábito nem `TEXT` para tudo.
- **`NOT NULL` é o padrão.** Coluna nulável precisa de um motivo dito em uma linha — e "pode ser preenchido depois" quase sempre significa que falta uma tabela.
- **Constraint é contrato, não enfeite**: `FK` com a ação de delete escolhida (`CASCADE` vs `RESTRICT` é decisão de negócio), `UNIQUE` no que é único de verdade, `CHECK` no que o código validaria sozinho e esqueceria uma vez.

### 2. Normalização e chave

- **3NF é o ponto de partida.** Desnormalizar é decisão deliberada, com o motivo e a consulta que a justifica escritos ao lado — nunca o padrão.
- **Chave natural vs surrogate**: natural quando é estável e realmente identifica (código de país); surrogate quando o "natural" pode mudar (e-mail, CPF digitado errado). Chave composta é legítima em tabela de ligação.
- **Cardinalidade real, não a imaginada**: "um cliente tem um endereço" vira N:1 no primeiro cliente com dois endereços. Pergunte se o "um" é regra ou acaso.
- **Enum vs tabela de lookup**: enum quando o conjunto é fechado e muda com deploy; tabela quando o usuário pode criar valor novo.
- **Nada de coluna repetida numerada** (`telefone1`, `telefone2`) nem lista em campo texto separada por vírgula.

### 3. Migração segura

- **Expand-contract** em vez de mudança destrutiva: cria o novo, backfill, passa a usar, só então remove o velho — em migrações separadas.
- **Backfill antes do `NOT NULL`**, nunca junto: a mesma migração que adiciona a coluna e a marca obrigatória falha com uma linha na tabela.
- **Lock em tabela grande** é o que derruba produção: diga qual operação pega lock e quanto tempo, ou proponha a variante concorrente (`CREATE INDEX CONCURRENTLY`).
- **Reversibilidade dita**: como desfazer, ou a frase explícita de que não dá (drop de coluna com dado). O que não é reversível vira uma pergunta ao usuário na fase 2.
- **Ordem numerada dos passos**, porque a ordem é o conteúdo.

### 4. Índice por consulta real

- **Todo índice vem com a consulta que o justifica escrita ao lado.** Sem consulta, não entra — índice é custo em toda escrita, não seguro grátis.
- **Ordem das colunas** no índice composto segue a consulta: igualdade primeiro, faixa depois.
- **FK sem índice** é a omissão mais comum, e aparece como delete lento meses depois.
- Não indexe "por segurança", não replique índice que o `UNIQUE` já cria.

## Fora do relacional

Mesmas perguntas, respostas frequentemente opostas — diga qual mundo está usando antes de aplicar a regra.

**Documento (Mongo, Firestore, Dynamo)**: embutir quando o filho só é lido junto do pai e o conjunto é limitado; referenciar quando cresce sem teto ou é lido sozinho. Duplicação é ferramenta legítima aqui, desde que fique escrito quem é a fonte de verdade e quando o duplicado é atualizado. Chave de partição escolhida pela consulta principal, não pelo que parece o "id". Vigie o limite de tamanho do documento.

**Entidade de ORM / tipo de domínio**: é onde o modelo vaza para a aplicação. Nulidade do tipo tem que bater com a do banco (tipo que mente sobre `null` produz o bug mais chato de achar); `cascade` do ORM e `ON DELETE` do banco precisam concordar; relação lazy é `N+1` esperando acontecer — diga qual carregamento é o esperado.

## Formato da proposta

```
Modelo — chunk F1.C2 (PostgreSQL)

pedido_item                                     [nova]
  pedido_id    uuid           NOT NULL  FK→pedido ON DELETE CASCADE
  produto_id   uuid           NOT NULL  FK→produto ON DELETE RESTRICT
  quantidade   integer        NOT NULL  CHECK (quantidade > 0)
  valor_unit   NUMERIC(12,2)  NOT NULL
  PK (pedido_id, produto_id)

Índices:
  (pedido_id)  ←  "itens de um pedido", a consulta da tela de detalhe

Decisões:
  NUMERIC(12,2), não float  ||  dinheiro em binário não fecha no somatório
  CASCADE no pedido  ||  item sem pedido não significa nada
  RESTRICT no produto  ||  apagar produto vendido apagaria histórico de venda

Descartado:
  id surrogate + UNIQUE(pedido_id, produto_id)  ||  mesma garantia, uma coluna a mais

Migração:
  1. CREATE TABLE pedido_item
  2. sem backfill — tabela nova
  Reversível: DROP TABLE, sem perda (nada gravado ainda).
```

Regras do bloco: **uma linha por coluna**; toda decisão não-óbvia com o porquê ao lado; alternativa descartada com o motivo de ter sido descartada. Decisão sem porquê é ruído — o usuário não tem como discordar do que não foi justificado.

## Onde entra no plano de revisão

Bloco próprio, **antes** da lista de arquivos (o modelo explica os arquivos que vêm em seguida):

```
Modelo de dados: 1 tabela nova (pedido_item), PK composta, sem backfill.
  Decidido com você: PK composta em vez de id surrogate.
```

Duas linhas no máximo. A proposta inteira já foi mostrada e aprovada neste mesmo turno — repeti-la no plano é ocupar o espaço de quem precisa revisar o código.

## Registro no banco (só com `mcp: on`)

Vai no **`sdd_record_chunk`**, no passo `g-bis`, campo `data_model` — um item por entidade modelada, com o formato, as decisões, o que foi descartado, os índices e as notas de migração.

Amarrado ao chunk, aparece no viewer junto do código e entra na busca. É o que permite responder depois *"por que essa coluna é nulável?"* sem arqueologia de migração.

Com `mcp_record.data_model: false`, pule o campo — o passo continua rodando e aparecendo no chat.

## Anti-padrões

- ❌ **Escrever a migração antes do OK.** A aprovação é o passo, não uma formalidade.
- ❌ **Perguntar o que o checklist já decide.** Tipo de dinheiro, fuso do timestamp e `NOT NULL` por padrão não são escolha do usuário.
- ❌ **Decisão sem porquê.** Uma lista de colunas sem justificativa não é proposta, é o arquivo escrito em outra fonte.
- ❌ **Índice sem consulta.** Se não dá para escrever a consulta, o índice é chute com custo de escrita.
- ❌ **Ignorar a convenção do projeto** porque o guia diz outra coisa. Schema misto é pior que schema imperfeito.
- ❌ **Mexer no código de aplicação.** O modelador escreve migração e schema do ORM; o resto é do implementer, no passo `c`.
- ❌ **Modelar a mudança inteira num chunk.** O escopo é este chunk; tabela que só o chunk 4 precisa é decidida no chunk 4, com mais informação.
