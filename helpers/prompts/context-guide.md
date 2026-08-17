# Context guide — base de conhecimento do projeto (`.sdd/context/`)

Objetivo: manter uma **base de conhecimento viva** de COMO o projeto funciona — por funcionalidade/área — com decisões e seus porquês. Assim, qualquer fluxo `lp:*` consulta o contexto antes de mexer, e cada implementação/revisão/correção **deixa o projeto mais documentado**.

## Toggle

- Config `context` no `.sdd/config.yaml`: `true` (padrão) ou `false`. **Ausência do campo = `true`.**
- `context: false` → não crie/atualize nada em `.sdd/context/` e não leia o índice. Silencioso.
- Não é perguntado no grill do `lp:init`; muda-se manualmente ou via `lp:settings`.

## Layout

```
.sdd/context/
  index.md                 # índice MESTRE: aponta para todo arquivo de contexto, 1 frase cada
  <area>.md                # um arquivo por funcionalidade/área
  <tema>/                  # subpasta opcional, agrupa arquivos de um tema
    index.md               # sub-índice (só quando a subpasta cresce)
    <area>.md
```

- **Formato: sempre markdown** (independe do `format` global — igual à memória).
- O agente **decide** quando agrupar em subpasta (quando um tema junta ≥ ~3 arquivos relacionados). Ao mover um arquivo para subpasta, **atualize o índice** (mestre e/ou o sub-índice) na mesma tacada.
- **Índice grande**: se o `index.md` mestre passar de ~150 linhas, quebre por tema em `<tema>/index.md` e faça o mestre apontar para os sub-índices (não liste cada arquivo no mestre nesse caso — liste os sub-índices).

## Formato do índice (`index.md`)

```markdown
# Contexto do projeto — <nome>

> Como as funcionalidades do projeto funcionam (macro + decisões). Mantido pelos fluxos lp:* e por lp:context. LIDO no início de todo fluxo.

## Áreas / funcionalidades
- [Autenticação](auth.md) — login JWT, refresh token, guard de rotas.
- [Distribuição de processos](distribuicao/index.md) — subpasta: chat, agentes, orquestração.
```

Cada linha: link relativo + **1 frase** do que aquele arquivo cobre. Sub-índices seguem o mesmo formato, relativos à subpasta.

## Formato de um arquivo de contexto

```markdown
# <Funcionalidade / área>

> Atualizado em <YYYY-MM-DD> · fontes: <arquivos/módulos principais reais do projeto>

## O que é
<2-5 frases macro: o que essa funcionalidade faz e para quê.>

## Como funciona
<fluxo macro: componentes principais e como se ligam; aponte arquivos/classes reais. Nível de contexto, não linha a linha.>

## Decisões e porquês
- <decisão tomada> — porque <motivo>. (origem: <mudança/bug-fix/review + data>)

## Notas
<contratos, integrações, gotchas, limites conhecidos.>
```

Mantenha **macro e curto**. É contexto, não spec nem walkthrough linha a linha. Cite arquivos reais para quem quiser descer o detalhe.

## Quando criar / atualizar

- **`lp:init` (projeto pré-existente, `context: true`)**: um subagente analisa o **macro** do projeto (principais módulos/funcionalidades) e semeia o `index.md` + arquivos de contexto de topo. Projeto novo/vazio: só cria o `index.md` esqueleto; o resto cresce com os fluxos.
- **`lp:continue` — ao CONCLUIR uma feature**: crie/atualize o arquivo de contexto daquela feature (o que é, como funciona, decisões da spec/plan/auto-sync). Entra no pacote do escriba do passo.
- **`lp:bug-fix` — ao concluir a correção**: atualize o contexto da área afetada com a causa raiz e a decisão de correção (ou crie o arquivo se a área ainda não existir).
- **`lp:review` — conforme a revisão avança**: registre no contexto a área revisada (review = entendimento → fonte ideal de contexto).
- Sempre que criar/mover/renomear um arquivo → **atualize o(s) índice(s)** no mesmo passo.

## Obrigação de leitura

No início de QUALQUER fluxo `lp:*` que raciocina sobre o projeto (`lp:new`, `lp:continue`, `lp:bug-fix`, `lp:review`, `lp:ask`, `lp:audit`), com `context: true`: **leia o `.sdd/context/index.md`**. Se a tarefa toca uma área listada, leia também o arquivo de contexto dela antes de decidir/implementar. É a primeira parada para "como isso funciona hoje?".

## context vs memória (não confundir)

- **`.sdd/context/`** = como as **funcionalidades do projeto** funcionam (por área; o que é, como funciona, decisões daquela feature). Documentação viva do produto.
- **`.sdd/memory.md`** = **preferências de processo/estilo** e decisões **globais** de stack/domínio que guiam COMO o agente trabalha. Ver `./memory-guide.md`.
- Regra: "como a feature X funciona" → context. "sempre use Y / o time prefere Z" → memória.

## Escrita via escriba

Com `scribe: subagent` (incl. campo ausente), as escritas em `.sdd/context/` (arquivos + índices) entram no **pacote único do escriba** do passo — nunca inline. Ver `./scribe-guide.md`.
