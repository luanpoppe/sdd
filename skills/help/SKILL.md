---
name: help
description: Mostra o estado atual do SDD `lp:*` no projeto e sugere próximos passos. Use quando o usuário pedir "lp:help", "onde estou no lp", "qual o status do SDD", ou estiver confuso sobre o que fazer a seguir.
---

Você está dando ao usuário um status report do SDD. **Apenas LEITURA** — nunca mute arquivos.

## 1. Coleta

- Existe `.sdd/config.yaml`? Se não → "SDD não inicializado. Rode `/lp-init`." Pare.
- Liste pastas em `.sdd/changes/` (mudanças ativas) e conte `.sdd/archive/`.
- Verifique `.sdd/memory.md` (ou `.sdd/memory-map.md`): conte entradas por seção para incluir no resumo.
- Para cada mudança ativa: leia `.sdd.yaml` (id, title, state, current_feature, current_chunk, features[], updated).
- Se há feature em status `implementing` ou anterior: leia `specs/<current_feature>/tasks.md` (se existir) e conte `[ ]`, `[~]`, `[x]`.

## 2. Output

Formato sugerido:

```
SDD: <projeto>
Config: format=<f>, lang=<l>, chunk_size=<c>

Mudança ativa: <id> — <title>
Estado: <state>  ·  atualizado em <updated>

Features (sequenciais):
  ✓ <slug-1>  [done]
  ▶ <slug-2>  [implementing]  (X/Y chunks)
  ◌ <slug-3>  [pending]
  ◌ <slug-4>  [pending]

Feature ativa: <current_feature>  ·  chunk atual: <current_chunk>

Memória: <N entradas em Estilo/Processo · M em Stack/Domínio>  (.sdd/memory.md)

Sugestões:
1. /lp-continue — <descreva a próxima ação concretamente>
2. /lp-audit — checar divergências entre docs e código (da feature ativa)
3. /lp-explain <tema> — registrar explicação persistida (HTML)
4. /lp-ask <pergunta> — dúvida rápida no chat
```

Se nenhuma mudança ativa: sugira `/lp-new <id>`.
Se `state == awaiting-archive`: sugira `/lp-archive`.

## 3. Resumo dos comandos `lp-*` (apenas se invocado SEM argumentos)

Quando o usuário rodou `/lp-help` sem nenhum argumento, complemento o output acima com a seção abaixo. Se passou argumento (ex: `/lp-help auto-sync`), trate como dúvida específica e responda só sobre aquilo, sem listar tudo.

```
Comandos do SDD `lp-*`:

  /lp-init       Setup do SDD no projeto. Cria .sdd/config.yaml (formato, idioma, chunk size).
  /lp-new <id>   Inicia nova mudança. Grill macro + gera plan.md enxuto (lista de features).
  /lp-continue   Avança UM passo: spec da próxima feature → tasks dela → chunks micro de impl.
  /lp-help       Mostra status e (sem args) este resumo.
  /lp-ask <q>    Dúvida rápida no chat sobre a mudança ativa. Não persiste nada.
  /lp-explain <tema>  Cria/atualiza HTML acumulativo por tema em explain/<tema>.html.
  /lp-memory [instrução]  Gerencia .sdd/memory.md (revisar, validar, editar, remover, dividir, mesclar).
  /lp-review [tema]   Revisão guiada de código existente. Tour em chunks pelo fluxo (entrada→processamento→saída). Permite modificações inline.
  /lp-audit      Lista divergências entre docs e código da feature ativa. Não aplica nada sem OK.
  /lp-archive    Finaliza: verifica + move a mudança para .sdd/archive/<id>/.

Fluxo típico:
  /lp-init → /lp-new <id> → revisa plan.md → /lp-continue (spec) → revisa →
  /lp-continue (tasks) → revisa → /lp-continue (chunks, um por vez) → ... → /lp-archive
```

## Princípios

- Nunca modifique nada.
- Sucinto no status: ≤ ~20 linhas. O resumo de comandos é adicional.
- Se faltar info esperada (ex: feature em `implementing` sem `tasks.md`), aponte como inconsistência.
