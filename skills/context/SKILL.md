---
name: context
description: Gerencia a base de conhecimento do projeto em `.sdd/context/` do SDD `lp:*` — arquivos markdown que explicam como as funcionalidades funcionam, com decisões e porquês, e um índice que aponta para todos. Sem argumentos, faz um health-check (índice x arquivos, órfãos, subpastas sem sub-índice) e resume o que está documentado. Com argumentos, responde dúvidas sobre o contexto do projeto ou cria/atualiza arquivos de contexto. Use quando o usuário pedir "lp:context", "verificar o contexto do projeto", "como funciona X no projeto?", "documenta a funcionalidade Y no contexto", "conserta o índice de contexto".
---

Você gerencia a base de conhecimento do projeto em `.sdd/context/`. Siga `../../helpers/prompts/context-guide.md` (layout, formatos, regras de índice/subpasta). Arquivos de contexto são **sempre markdown**.

## 0. Pré-checagem

- Se `.sdd/config.yaml` não existir → "Rode `/lp-init` primeiro." Pare.
- Leia `context` no config (ausente = `true`). Se `context: false` → informe que o contexto está desligado (ligue com `/lp-settings context true`) e pare.
- Leia `.sdd/context/index.md` (mestre) e, conforme necessário, os sub-índices e arquivos de contexto. Se a pasta não existir ainda → informe e ofereça semear (ver seção "Semear").

## 1. Sem argumentos → health-check + resumo

Percorra `.sdd/context/` e reporte:

- **Índice x arquivos**: entradas no índice sem arquivo correspondente (link quebrado); arquivos `.md` que existem mas **não** estão em nenhum índice (órfãos); subpastas com ≥ ~3 arquivos **sem** `index.md` próprio; `index.md` mestre grande (> ~150 linhas) que deveria virar sub-índices.
- **Organização/nomes**: arquivos soltos na raiz (fora de subpasta de domínio) que deveriam estar agrupados; **nomes genéricos ou slug interno do SDD** na raiz (ex: `output-dto.md`, `prompt-agent.md`, `feature-1.md`) — deveriam ser específicos ou morar em `<dominio>/`. Proponha a reorganização (mover pra subpasta do domínio + ajustar índice). Ver `../../helpers/prompts/context-guide.md`.
- **Frescor**: arquivos cuja descrição no índice não bate com o conteúdo; áreas obviamente implementadas (há mudanças arquivadas/features done) mas **sem** arquivo de contexto.
- **Resumo**: liste as áreas documentadas (1 linha cada) — o mapa atual do projeto.

Formato sugerido:

```
Contexto (.sdd/context/): <N> arquivos · <M> áreas · índice(s): <k>

Problemas:
- órfão: <arquivo> (não está no índice)
- link quebrado: índice aponta p/ <arquivo> inexistente
- <subpasta>/ tem <n> arquivos sem sub-índice
(ou: "nenhum problema — índice e arquivos consistentes")

Documentado:
- <área> — <1 frase>
...

Faltando (implementado mas sem contexto): <áreas>, se houver.

Ações: /lp-context <pergunta> · /lp-context documenta <área> · /lp-context conserta índice
```

Não conserte sozinho no modo sem-args: **reporte** e ofereça. Se o usuário mandar consertar, aí aplique (via escriba).

## 2. Com argumentos → interpretar

- **Pergunta** ("como funciona X?", "onde vive a lógica de Y?") → responda usando os arquivos de contexto; se faltar, leia o código real e responda. Ofereça persistir a resposta como contexto se valer.
- **Documentar/atualizar** ("documenta a área Z", "atualiza o contexto de auth") → crie/atualize o arquivo de contexto (formato do guia) + atualize o(s) índice(s). Se o tema justificar, agrupe em subpasta e crie/ajuste o sub-índice.
- **Consertar índice** ("conserta o índice", "reconcilia") → reconcilie índice(s) com os arquivos: adicione órfãos, remova links quebrados, crie sub-índices onde couber, e faça o mestre apontar para os sub-índices quando estiver grande.
- **Remover** ("tira o contexto de W") → remova o arquivo e a entrada no índice.

Toda escrita em `.sdd/context/` segue o `scribe` (com `scribe: subagent`/ausente, delegue ao escriba — ver `../../helpers/prompts/scribe-guide.md`). Você decide o conteúdo; o escriba grava.

## Semear (pasta ainda não existe)

Se `.sdd/context/` não existe e o usuário quer começar: rode uma análise **macro** do projeto (um subagente, se `scribe: subagent`; papel `explorer` para modelo/thinking — ver `../../helpers/prompts/subagents-guide.md`) e semeie o `index.md` + arquivos de contexto de topo das principais funcionalidades — igual ao bootstrap do `lp:init` (ver `context-guide.md`).

## Princípios

- **Só `.sdd/context/`.** Não toca em specs, tasks, código, `.sdd.yaml` de mudanças nem memória.
- **Macro, não linha a linha.** Contexto explica o quê/como/por quê no nível de funcionalidade; cita arquivos reais para o detalhe.
- **Índice sempre coerente.** Nenhuma mudança de arquivo sem refletir no(s) índice(s).
- **context ≠ memória.** "Como a feature funciona" → aqui. "Preferência de processo / stack global" → `lp:memory`. Ver `context-guide.md`.
- **Read-only por padrão no health-check**; só escreve quando o usuário pede.
