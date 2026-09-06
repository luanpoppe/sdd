---
name: help
description: Mostra o estado atual do SDD `lp:*` no projeto e sugere próximos passos. Use quando o usuário pedir "lp:help", "onde estou no lp", "qual o status do SDD", ou estiver confuso sobre o que fazer a seguir.
---

Você está dando ao usuário um status report do SDD. **Apenas LEITURA** — nunca mute arquivos.

## 1. Coleta

- Existe `.sdd/config.yaml`? Se não → "SDD não inicializado. Rode `/lp-init`." Pare.
- Leia TODOS os campos do config: `format`, `lang`, `chunk_size`, `context_watch`, `flowchart`, `implementer`, `scribe`, `tasks_format`, `tasks_autocontinue`, `context`, `parallel`, `chunk_order`, `auto_commit`, `mcp`, `tasks_storage`, `state_storage` (trate ausentes com o default: `flowchart: on`, `implementer: subagent`, `scribe: subagent`, `tasks_format: md`, `tasks_autocontinue: on`, `context: true`, `parallel: off`, `chunk_order: inside-out`, `auto_commit: suggest-only`, `tests: off`, `mcp: off`, `tasks_storage: file`, `state_storage: file`). Cheque também se existe a **config global** `~/.sdd/config.yaml` (preferências do usuário que semeiam projetos novos) — se existir, **leia os campos** e calcule a deriva (seção "Deriva da config global" abaixo); se não, ignore em silêncio. Leia também o bloco **opcional** `subagents` (modelo por papel de subagente) — se ausente, não é default nenhum: simplesmente não mencione.
- Se `context: true`/ausente e `.sdd/context/index.md` existir: conte quantas áreas estão documentadas (linhas do índice) — reporte no status.
- Liste pastas em `.sdd/changes/` (mudanças ativas) e conte `.sdd/archive/`.
- Liste reviews ativos em `.sdd/reviews/` (criados por `lp:review-walkthrough`), se houver, com o `state`.
- Verifique `.sdd/memory.md` (ou `.sdd/memory-map.md`): conte entradas por seção.
- Para cada mudança ativa: leia `.sdd.yaml` (id, title, state, current_feature, current_chunk, features[], updated). **Com `state_storage: mcp`** esses campos não estão no arquivo: leia-os com `sdd_read_state`. Se as tools não estiverem disponíveis, diga que o estado está no banco e não pôde ser lido — não reporte a mudança como parada nem chute o passo. **Cheque `kind`**: se `kind: bugfix`, é um bug-fix (estados `bug-diagnosing`/`bug-proposing`/`bug-fixing`) — não tem `features[]`; os chunks vivem em `tasks.md` na raiz da mudança. Veja `../../helpers/prompts/bugfix-machine.md`.
- Se há feature em `implementing` ou anterior: leia `specs/<current_feature>/tasks.md` (se existir).
  - **Com `tasks_storage: mcp`** não existe `tasks.md`: leia o plano com `sdd_read_tasks` e conte a partir dele. Se as tools não estiverem disponíveis, diga que o plano está no banco e não pôde ser lido — não invente contagem nem sugira que a feature está vazia.
  - **Conte por CHUNK, não por checkbox**: cada chunk é um bloco `### F<n>.C<m>`. Um chunk está **concluído** quando todos os seus checkboxes estão `[~]`/`[x]`; **pendente** se ainda tem `[ ]`. Reporte "X/Y chunks" = chunks concluídos / total de blocos `### F<n>.C<m>`. (NÃO conte checkboxes crus — cada chunk tem vários.)

## 2. Output

Formato sugerido:

```
SDD: <projeto>
Config: format=<f> · lang=<l> · chunk_size=<c> · flowchart=<on/off> · implementer=<subagent/main> · scribe=<subagent/main> · tasks_format=<md/follow> · tasks_autocontinue=<on/off> · context=<true/false> · parallel=<on/off> · chunk_order=<inside-out/outside-in/free> · auto_commit=<full/suggest-only/off> · tests=<off/on> · code_review=<off/on> · data_model=<off/on> · mcp=<off/on> · flow_storage=<file/mcp> · tasks_storage=<file/mcp> · state_storage=<file/mcp>
Subagentes: <papel:modelo · papel:modelo>   (só esta linha se o bloco `subagents` existir; omita inteira se não)
Conversor md->html: ~/.sdd/render (só cite a linha se format for html/both)
Config global: ~/.sdd/config.yaml (<N> campos)   (só se o arquivo existir; omita se não — não sugira criar)
Deriva (<N>): campos do seu global que este projeto nunca recebeu   (só se houver deriva; ver seção abaixo)
  <campo>: <valor global>   →  /lp-settings <campo> <valor global>
MCP: tools do SDD <disponíveis / NÃO disponíveis nesta sessão>   (só esta linha se mcp=on; omita inteira se off)
Fila de estudo: <N> tema(s) aberto(s) em ~/.sdd/explain/   (só se houver algum aberto; omita a linha se não houver ou se a pasta não existir)

Mudança ativa: <id> — <title>
Estado: <state>  ·  atualizado em <updated>

Features (sequenciais):
  ✓ <slug-1>  [done]
  ▶ <slug-2>  [implementing]  (X/Y chunks)
  ◌ <slug-3>  [pending]

Feature ativa: <current_feature>  ·  chunk atual: <current_chunk> — <o que ele faz>
Diagrama: .sdd/changes/<id>/flow.html   (se flowchart=on)

Memória: <N em Estilo/Processo · M em Stack/Domínio>  (.sdd/memory.md)
Reviews ativos (lp:review-walkthrough): <slug — state>   (se houver)

Sugestões:
1. /lp-continue — <descreva a próxima ação concretamente>
2. /lp-audit — checar divergências entre docs e código (da feature ativa)
3. /lp-flow — abrir/atualizar o diagrama do fluxo   (se flowchart=on)
4. /lp-ask <pergunta> — dúvida rápida no chat
```

Para uma mudança `kind: bugfix`, adapte o bloco: em vez de "Features (sequenciais)", mostre a etapa do bug (`diagnóstico` / `opções` / `correção — X/Y chunks`), o arquivo relevante (`diagnosis.md` / `solutions.md` / `tasks.md`) e a solução escolhida se houver. Próxima ação: `/lp-continue`.

Se nenhuma mudança ativa: sugira `/lp-new-feature <id>` (implementação do zero) ou `/lp-bug-fix <id>` (corrigir um bug).
Se `state == awaiting-archive`: sugira `/lp-archive`.
Se `parallel=off` e a mudança está em `implementing`: mencione que dá pra acelerar com `/lp-parallel`.

**Sobre a fila de estudo**: conte os temas com `data-status="aberto"` nos HTMLs de `~/.sdd/explain/` — ou, com `mcp: on`, chame `sdd_read_explain`. É lembrete, não cobrança: mostre o número e siga, sem sugerir estudar agora.

### Deriva da config global

O global é **semente**: o `lp:init` copia os valores no dia em que o projeto nasce, e depois o projeto segue sozinho (ver `../../helpers/prompts/global-config-guide.md`). A consequência é silenciosa: campo que passou a existir **depois** daquele dia nunca chega no projeto antigo, e o recurso simplesmente não acontece — sem erro, sem aviso, sem nada no chat.

Foi assim que um projeto criado antes do `data_model` seguiu criando tabela e migração sem nunca lançar o `data-modeler`, com o global do usuário pedindo `data_model: on`.

Então reporte a comparação:

- **Deriva = campo presente no global e AUSENTE no `.sdd/config.yaml`.** Só isso. Liste o valor global e o `/lp-settings <campo> <valor>` pronto.
- **Campo presente nos dois com valores diferentes NÃO é deriva** — é escolha daquele projeto, e o `.sdd/config.yaml` é a verdade dele. Não reporte, não sugira alinhar.
- Compare só o **primeiro nível**. `mcp_record` e `subagents` entram como um item cada, quando o bloco inteiro falta no projeto.
- `version` e `created` nunca entram: são metadados do projeto e não existem no global.
- **Sem global, ou sem nenhum campo faltando → omita a linha inteira.** Não diga "nenhuma deriva".

**Aviso para os campos de armazenamento** (`flow_storage`, `tasks_storage`, `state_storage`): se houver **mudança ativa**, acrescente uma linha dizendo para ligar só depois de arquivá-la. Trocar no meio deixa artefato órfão — o `flow.html` já gerado congela onde parou, e o plano de chunks passa a ser lido de um lugar onde ele não está.

**A skill continua somente leitura**: ela mostra o comando, nunca edita o config. Alinhar é decisão do usuário — o projeto pode ter motivo para estar diferente.

**Sobre a linha do MCP**: `mcp: on` no config e tools realmente utilizáveis são duas coisas diferentes — quem liga a config e não reinicia a sessão fica sem as tools, e é aí que acha que "não funciona". Então reporte o que você **observa**: se as tools `sdd_*` existem nesta sessão, diga "disponíveis"; se não, diga "NÃO disponíveis nesta sessão — reinicie para ativar". Com `mcp: off`, omita a linha inteira e não sugira ligar.

## 3. Resumo dos comandos `lp-*` (apenas se invocado SEM argumentos)

Quando o usuário rodou `/lp-help` sem nenhum argumento, complemento o output acima com a seção abaixo. Se passou argumento (ex: `/lp-help auto-sync`), trate como dúvida específica e responda só sobre aquilo, sem listar tudo.

```
Comandos do SDD `lp-*` (via marketplace: `lp:init`; via installer/Cursor: `/lp-init` — mesma skill):

  /lp-init       Setup do SDD no projeto. Cria .sdd/config.yaml.
  /lp-new-feature <id>   Inicia nova mudança (do zero). Grill macro + gera plan.md + flow.html.
  /lp-bug-fix <id>  Fluxo enxuto pra corrigir bug: diagnóstico (causa raiz) → opções → correção.
  /lp-continue   Avança UM passo. Feature: spec → tasks → chunks. Bug-fix: opções → tasks → chunks.
  /lp-status     Resumo de handoff sob demanda (estado + próximos passos, pra retomar/nova conversa).
  /lp-help       Mostra status e (sem args) este resumo.
  /lp-ask <q>    Dúvida rápida no chat sobre a mudança ativa. Não grava nada.
  /lp-explain <tema>  Explica e acumula em ~/.sdd/explain/<tema>.html (global, com fila
                      de estudo). Dispara sozinho em pergunta conceitual dentro do fluxo.
  /lp-explain fila    O que está aberto para estudar, do mais antigo.
  /lp-explain estudei <tema>   Dá baixa na fila.
  /lp-flow       Gera/regenera o diagrama macro (flow.html) do fluxo de implementação.
  /lp-parallel [on|off]  Liga/desliga implementação paralela (chunks independentes, um subagente cada).
  /lp-settings [campo valor]  Lista/altera as configs do .sdd/config.yaml (por campo/valor ou linguagem natural).
  /lp-settings global [campo valor]  Mesma coisa, mas na config global (~/.sdd/config.yaml) — padrão dos próximos /lp-init.
  /lp-context [pergunta|ação]  Base de conhecimento do projeto (.sdd/context/): health-check, dúvidas, documentar áreas.
  /lp-memory [instrução]  Gerencia .sdd/memory.md (revisar, validar, editar, remover, dividir, mesclar).
  /lp-code-review [alvo]  Audita código recém-escrito: bug, borda, contrato divergente,
                      erro engolido, vazamento, segurança. Reporta com severidade, não corrige.
  /lp-data-model [alvo|auditar]  Modela dados antes da migração: tabela, tipo, chave, índice,
                      ordem da migração. Espera seu OK pra escrever. 'auditar' revisa o schema atual.
  /lp-review-walkthrough [tema]   Revisão guiada de código existente. Tour em chunks pelo fluxo. Permite modificações inline.
  /lp-audit      Lista divergências entre docs e código da feature ativa. Não aplica nada sem OK.
  /lp-archive    Finaliza: verifica + move a mudança para .sdd/archive/<id>/.
  /lp-auto-update  Atualiza as skills para a versão mais recente do GitHub (luanpoppe/sdd).
  /lp-desktop    Abre o SDD Viewer (app desktop opcional pra ver os artefatos fora do chat). Instala se preciso.

Fluxo típico (feature do zero):
  /lp-init → /lp-new-feature <id> → revisa plan.md → /lp-continue (spec) → revisa →
  /lp-continue (tasks) → revisa → /lp-continue (chunks, um por vez) → ... → /lp-archive

Fluxo típico (bug-fix, enxuto):
  /lp-init → /lp-bug-fix <id> → revisa causa raiz (diagnosis) → /lp-continue (opções, escolhe uma) →
  /lp-continue (tasks + chunks, um por vez) → ... → /lp-archive
```

## Princípios

- Nunca modifique nada.
- Sucinto no status: ≤ ~20 linhas. O resumo de comandos é adicional.
- **Nada se cita só pelo número**: ao mostrar o chunk atual, a feature ou sugerir a próxima ação, acompanhe da descrição (`Faz` do chunk no `tasks.md`; título/`summary` da feature) — etiqueta sozinha não diz nada. Ver `../../helpers/prompts/state-machine.md`.
- Se faltar info esperada (ex: feature em `implementing` sem `tasks.md`), aponte como inconsistência.
