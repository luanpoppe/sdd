# Scribe guide — escrita de artefatos por subagente

Objetivo: **manter o contexto do agente principal limpo**. As escritas dos próprios artefatos do SDD (docs, `flow.html`, `.sdd.yaml`, `memory.md`) despejam arquivos inteiros no histórico da conversa principal. Delegando-as a um **subagente escriba**, o principal só decide e reporta; o barulho de `Write`/`Update` fica no subagente.

## Toggle

- Config `scribe` no `.sdd/config.yaml`: `subagent` (padrão) ou `main`.
- `scribe: subagent` (padrão) → delega as escritas ao subagente escriba.
- `scribe: main` → o agente principal escreve inline (comportamento clássico).
- **Fallback**: se o ambiente não suporta lançar subagente, caia para inline e avise no plano de revisão (*"artefatos escritos no agente principal — subagente indisponível"*).

## Divisão de responsabilidade (não-negociável)

O escriba **renderiza e escreve** — nunca **decide**.

- **Principal (fica no contexto)**: todo o raciocínio — grill, causa raiz, solução escolhida, quebra em chunks, auto-sync, o *conteúdo* das docs. O principal **autora** o conteúdo.
- **Escriba (subagente)**: pega o conteúdo já autorado + as instruções e faz as escritas mecânicas: preencher templates, gerar o par `.md`+`.html`, (re)gerar `flow.html`, aplicar updates no `.sdd.yaml`, gravar `memory.md`. Zero decisão de produto.

## Uma chamada por passo

Agrupe **todas as escritas de um passo** do fluxo (`lp:new`, cada `lp:continue`, cada etapa do bug-fix) numa **única** invocação do escriba — não um subagente por arquivo. Ex.: no passo de tasks, uma chamada escreve `tasks.md` + `tasks.html` + regenera `flow.html` + atualiza `.sdd.yaml`.

## O que o principal passa ao escriba

- Caminho da mudança (`.sdd/changes/<id>/`), `format`, `lang`.
- Para cada doc: o **conteúdo autorado** (texto/decisões) e qual template usar (`../templates/<x>.tpl`). Regra do `.html`: com `format` ∈ {html, both}, gerar o par e garantir `.sdd/assets/styles.css` (copiar de `../templates/styles.css` se faltar).
- Updates do `.sdd.yaml`: os campos exatos (ex.: `state: implementing`, `current_chunk: "C2"`, `in_review: {...}`, marcar checkboxes do chunk).
- Para `flow.html` (se `flowchart: on`): seguir `./flowchart-guide.md`; para o detalhe walkthrough do nó recém-implementado, o principal repassa o **relatório/diff do implementer** (código real) — o escriba não relê o projeto do zero.
- Instruções de `memory.md`, quando houver.

## O que o escriba retorna (compacto)

- Lista dos arquivos escritos: `caminho — criado|editado — ±linhas`. **Sem** colar o corpo dos arquivos.
- Confirmação de que o `.sdd.yaml` foi atualizado com os campos pedidos.
- Nada além disso. O principal já tem o conteúdo — usa a lista pra montar o plano de revisão limpo.

## Depois do escriba (principal)

- Imprime o **plano de revisão** normalmente (formato da `state-machine.md`), usando a lista de arquivos retornada. O plano em si NÃO é delegado — é a comunicação com o usuário.
- Se o escriba reportar que algo saiu diferente do pedido, trata como divergência antes de seguir.

## Princípios

- **Só escrita mecânica é delegada.** Decisão, grill e conteúdo continuam no principal.
- **Um subagente por passo**, agrupando as escritas — evita overhead de vários spawns.
- **Fallback inline** sempre disponível (`scribe: main` ou ambiente sem subagente).
- **Leituras de estado** (ler `.sdd.yaml`, specs, memória para decidir) continuam no principal — o escriba é só saída.
