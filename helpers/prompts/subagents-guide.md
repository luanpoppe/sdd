# Subagents guide — modelo e thinking por papel de subagente

Objetivo: deixar o usuário escolher **em qual modelo (e com qual nível de thinking) cada tipo de subagente roda**. Sem isso, todo subagente herda o modelo da conversa principal — o escriba, que só preenche template e escreve YAML, gasta o mesmo que o implementer; e o implementer não tem como pedir um modelo mais forte que o do principal.

Como o plugin roda em harnesses diferentes (Claude Code, Cursor, Codex) e cada um tem seu próprio catálogo de modelos, a preferência é declarada **por harness**. O agente principal usa a entrada do harness em que ele mesmo está rodando.

## Toggle

- Campo `subagents` no `.sdd/config.yaml`. **Opcional e ausente por padrão** — o `lp:init` não o escreve.
- **AUSÊNCIA DO BLOCO = comportamento de hoje**: lance os subagentes sem especificar modelo, sem comentar nada. Ausência não é erro nem degradação — é o padrão.
- Presente → resolva conforme o algoritmo abaixo.

## Formato

Papel → harness → `{model, effort}`. **Toda chave é opcional em qualquer nível** — dá pra configurar só um papel, só um harness, só o `model` sem `effort`.

```yaml
subagents:
  implementer:
    claude-code: { model: opus, effort: high }
    cursor:      { model: composer }
    codex:       { model: gpt-5-codex, effort: high }
  scribe:
    claude-code: { model: haiku }
    codex:       { model: gpt-5-mini }
  explorer:
    claude-code: { model: sonnet, effort: medium }
```

- **Papéis válidos** (só estes três): `implementer`, `scribe`, `explorer`.
- **Chaves de harness canônicas**: `claude-code`, `cursor`, `codex`. Chaves desconhecidas são **ignoradas em silêncio** (permite deixar preparada a entrada de um harness que este guia ainda não nomeia).
- `effort` (thinking/reasoning) é opcional e só vale onde o harness suporta configurar isso. Se o harness não suporta, use só o `model` e ignore o `effort`.
- **Valores de modelo NÃO são validados contra uma lista fixa.** O catálogo de cada harness muda com o tempo; quem resolve o nome é o harness em runtime. Não recuse um valor por não reconhecê-lo — tente lançar e trate a falha pelo passo 4.

## Papel de cada ponto de lançamento

Mapa fixo — use-o para saber qual entrada da config se aplica ao subagente que você está prestes a lançar:

| Papel | Onde é lançado |
|---|---|
| `implementer` | `../../skills/continue/SKILL.md` passo **c** (chunk sequencial) · cada subagente de uma onda do `./parallel-guide.md` |
| `scribe` | toda chamada do escriba — `lp:continue`, `lp:new`, `lp:bug-fix`, `lp:flow`, `lp:context` (ver `./scribe-guide.md`) |
| `explorer` | `Agent Explore` de investigação — reúso no `lp:new`, causa raiz no `lp:bug-fix`, escopo amplo no `lp:review` · bootstrap de contexto do `lp:init` (3-bis) · semeadura do `lp:context` |

O checador de atualização do `lp:desktop` fica **fora** deste mapa — roda sempre no default.

## Resolução (ao lançar um subagente)

1. Identifique o **papel** pelo mapa acima.
2. Identifique o **harness** em que você está rodando.
3. Procure `subagents.<papel>.<harness>` no `.sdd/config.yaml`:
   - **Bloco, papel ou harness ausente** → lance **sem especificar modelo** (comportamento de hoje) e **não comente nada**. Não foi configurado; não é falha.
   - **Presente** → lance passando o `model` (e o `effort`, se houver e o harness suportar).
4. **Se a chamada falhar por modelo inválido/indisponível** → **relance imediatamente sem especificar modelo** e **avise em 1 linha**. Nunca trave o fluxo, nunca pergunte ao usuário, nunca deixe o passo sem ser executado por causa disso.

> **A distinção do passo 3 vs 4 é o coração da regra**: *não configurado* é silencioso; *configurado mas indisponível* avisa. Se você silenciar o caso 4, o usuário fica achando que a config dele está valendo quando não está.

### Formato do aviso (passo 4)

Uma linha, junto do plano de revisão do passo (ou inline, se o subagente rodou no meio de um grill/investigação):

```
Nota: implementer rodou no modelo padrão — `opus` indisponível neste harness.
```

Um aviso por papel por turno — se três subagentes da mesma onda caíram no mesmo fallback, agrupe numa linha só (*"os 3 chunks da onda rodaram no modelo padrão — …"*), não repita três vezes.

## Princípios

- **Opcional de verdade.** O bloco ausente é o caso normal. Nenhum fluxo `lp:*` depende de `subagents` existir, e o `lp:init` não escreve o bloco.
- **Nunca bloqueie por causa de modelo.** Modelo é preferência, não requisito: falhou, cai no default e segue. O trabalho do passo sempre acontece.
- **O papel manda, não a skill.** O mesmo escriba lançado pelo `lp:new` ou pelo `lp:flow` usa a entrada `scribe` — não crie entradas por skill.
- **Não valide nomes de modelo.** Tentar adivinhar quais modelos existem envelhece mal; deixe o harness recusar e trate a recusa.
- **Anti-padrão**: perguntar ao usuário qual modelo usar quando o configurado falha. Isso trava o fluxo, e no modo paralelo trava N vezes.
- **Anti-padrão**: avisar "rodando no modelo padrão" quando o usuário simplesmente não configurou nada — é ruído em todo turno de todo projeto.
