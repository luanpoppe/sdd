---
name: bug-fix
description: Fluxo enxuto do SDD `lp:*` para corrigir um bug, mais curto e direto que o `lp:new`. Cria uma mudança `kind: bugfix` em `.sdd/changes/<id>/`, foca em achar a CAUSA RAIZ (gera `diagnosis`), depois em opções de correção (`solutions`), e só então implementa (reusando o motor de chunks/paralelo do `lp:continue`). Use quando o usuário pedir "lp:bug-fix", "corrigir um bug", "resolver esse erro", "tem um bug em X".
---

Você está iniciando um **bug-fix** no SDD `lp:*` — o fluxo enxuto para corrigir um bug (não uma implementação do zero). Siga `../../helpers/prompts/bugfix-machine.md` (máquina de estados) e o estilo de grilling em `../../helpers/prompts/grill-snippet.md`.

## 1. Pré-checagem

- Se `.sdd/config.yaml` não existir → "Rode `/lp-init` primeiro." Pare.
- Leia `.sdd/config.yaml` (`format`, `lang`, `chunk_size`, `implementer`, `parallel`, `flowchart`).
- **Carregue a memória**: `.sdd/memory.md` (ou `memory-map.md` + temas relevantes). Siga `../../helpers/prompts/memory-guide.md`. Itens de Estilo/Processo aplicam direto; Stack/Domínio só viram confirmação rápida.
- Defina o **id** (kebab-case curto, ex: `fix-login-500`). Se o usuário passou só a descrição do bug, proponha um id e confirme. Valide unicidade contra `.sdd/changes/` e `.sdd/archive/`.

## 2. Criar estrutura

```
.sdd/changes/<id>/
  .sdd.yaml     # kind: bugfix, state: bug-diagnosing
```

`.sdd.yaml` (ver `bugfix-machine.md` para o schema completo):

```yaml
id: <id>
title: <título curto do bug — definido após o grill>
created: <YYYY-MM-DD>
updated: <YYYY-MM-DD>
kind: bugfix
state: bug-diagnosing
format: <copiado do config>
lang: <copiado>
chunk_size: <copiado>
chosen_solution: null
current_chunk: null
in_review: null
```

## 3. Diagnóstico (grill curto + investigação → causa raiz)

> Objetivo desta skill: **entender o bug e achar a causa raiz**. NÃO proponha correção ainda (isso é o próximo passo, via `/lp-continue` → `solutions`).

1. **Grill curto** em batches de até 4 perguntas independentes (`AskUserQuestion`, ver `grill-snippet.md`). Cubra só o que não dá pra inferir do código:
   - Sintoma exato (o que acontece de errado) e o que era **esperado**.
   - Como **reproduzir** (passos, dados, ambiente prod/local). Se não reproduz sempre, o que se sabe.
   - Escopo/impacto (desde quando, quem é afetado, gravidade).
2. **Investigue o código** (Read/Grep/Glob/Agent Explore) para rastrear do sintoma até a **causa raiz**. Cite arquivos/funções reais (`arquivo:linha`). Distinga causa de sintoma — não pare no primeiro `catch`.
   - Se a causa não ficar clara, diga o que ainda falta investigar em vez de inventar. Pode fazer mais um batch de perguntas.
3. Gere `diagnosis.md` usando `../../helpers/templates/diagnosis.md.tpl`. **Objetivo e sem repetição** (cabe em 1-2 telas, ~40 linhas). Cada seção tem UM trabalho: **Investigação** = a trilha/evidência (bullets "olhei X → constatei Y", arquivo:linha uma vez cada); **Causa raiz** = a conclusão em 1-3 frases, referenciando os arquivos já citados pelo nome curto — **não re-narre a trilha** nem repita o sintoma. **Nada de propor correção** aqui (fix vai pro `solutions.md`). Se `format` ∈ {html, both}: gere também `diagnosis.html` (`../../helpers/templates/diagnosis.html.tpl`) e garanta `.sdd/assets/styles.css` (copie de `../../helpers/templates/styles.css` se faltar).
4. Atualize `.sdd.yaml`: `title`, `state: bug-proposing`, `updated`.
5. Imprima plano de revisão:

   ```
   Diagnóstico do bug `<id>` criado (em revisão).
   Arquivo: .sdd/changes/<id>/diagnosis.md

   Ordem de revisão:
   1. Resumo (entendimento do bug)
   2. Sintomas e reprodução
   3. Investigação
   4. Causa raiz  ← o coração do diagnóstico
   5. Impacto

   Quando aprovar a causa raiz, rode /lp-continue para gerar as OPÇÕES de correção (solutions.md).
   ```

## Princípios

- **Enxuto.** Bug-fix é o caminho curto: sem `plan.md`, sem specs BDD por feature. Diagnóstico direto ao ponto.
- **Causa raiz antes de tudo.** Esta skill entrega entendimento + causa; a solução é o passo seguinte. Não misture.
- **Um passo por invocação.** `lp:bug-fix` faz só o diagnóstico. `/lp-continue` avança para `solutions` e depois para a implementação (ver `bugfix-machine.md`). Se o usuário pedir "resolve logo tudo", explique que cada etapa é um `/lp-continue` para ele revisar a causa e escolher a correção.
- **Memória**: antes de fechar o turno, varra a conversa por preferências e salve conforme `../../helpers/prompts/memory-guide.md` (igual às outras skills).
