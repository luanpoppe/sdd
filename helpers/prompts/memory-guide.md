# Memória do SDD (`lp:*`)

Mecanismo para o agente lembrar preferências e decisões recorrentes do usuário ao longo das mudanças.

## Localização

- Padrão: `.sdd/memory.md` (arquivo único).
- Se exceder ~150 linhas: dividir em `.sdd/memory/<tema>.md` + `.sdd/memory-map.md` (índice com 1 linha por arquivo). O `memory-map.md` é o que sempre carrega — os arquivos específicos só são lidos quando o tema é relevante.

## Estrutura de `memory.md`

```markdown
# Memória do SDD

> Preferências e decisões recorrentes deste projeto. Mantida pelo `lp:continue`. Edite manualmente se quiser.

## Estilo / Processo

<!-- Como o agente deve trabalhar. Carrega SEMPRE (planejamento + implementação). Não pré-supõe nada sobre a feature. -->

- <princípio reutilizável em 1 linha>
  - **Quando**: <contexto/escopo de aplicação (genérico)>
  - **Por quê**: <razão dada pelo usuário, se houver>
  - **Exemplo**: <caso concreto onde apareceu, opcional>
  - **Registrado em**: <YYYY-MM-DD>

## Stack / Domínio

<!-- Decisões sobre tecnologia, arquitetura, domínio. Carrega, mas só serve para CONFIRMAR rápido — nunca para responder no lugar do usuário. -->

- <princípio reutilizável em 1 linha>
  - **Quando**: <contexto genérico>
  - **Exemplo**: <caso concreto, opcional>
  - **Registrado em**: <YYYY-MM-DD>
```

## Regra de generalização (crítica)

**Cada entrada deve ser um princípio reutilizável**, não um fato sobre a implementação atual. O caso específico que disparou a entrada vira **Exemplo** no fim, nunca o conteúdo principal.

Teste rápido antes de gravar: *"Em outra feature/módulo deste projeto, essa entrada me ajudaria?"* Se a resposta é "só ajuda nesse módulo X" → você escreveu específico demais; generalize.

### Como generalizar

1. **Identifique o princípio** por trás do que o usuário falou. Pergunte a si mesmo "qual é a regra geral aplicada aqui?".
2. **Tire nomes específicos do conteúdo principal**: arquivos, funções, classes, módulos só aparecem no **Exemplo**, não na linha do princípio nem no **Quando**.
3. **Faça o "Quando" genérico**: descreva a *situação* em que aplica, não o módulo onde apareceu.
4. Se não conseguir generalizar (a regra realmente só vale para esse caso específico), provavelmente **não deveria virar memória** — é decisão de spec/plan dessa feature, não preferência recorrente.

### Exemplos: específico (ruim) vs generalizado (bom)

| ❌ Específico (não salvar assim) | ✅ Generalizado |
|---|---|
| "Payload de access token validado com Zod em `signAccessToken`/`verifyAccessToken`; schema em `domain/types/`" | "Dados decodificados de fronteiras externas (JWT, body, env) devem ser validados com Zod no ponto de decodificação. Schema + `z.infer` no mesmo arquivo em `domain/types/`. **Exemplo**: payload de access token no módulo auth." |
| "`@CurrentMedico()` sem payload lança `UnauthorizedException('Não autenticado')`" | "Param decorators que leem estado anexado por guards devem falhar com exception coerente (ex: 401) em vez de retornar `undefined`. **Exemplo**: `@CurrentMedico()` no módulo auth." |
| "Constantes do auth ficam em `auth/infrastructure/constants/`" | "Constantes usadas só dentro de UM módulo ficam em `<modulo>/infrastructure/constants/`. `shared/constants/` é só para valores transversais. **Exemplo**: chave de propriedade no request do módulo auth." |

## Regras de uso

### Em qualquer fase

- **Carregar a memória** (ou o `memory-map.md` se existir) ANTES de qualquer grill ou geração de artefato.
- Se relevante, citar inline: *"Vi na memória que você prefere X — vou seguir."* (Estilo) OU *"Vi na memória que neste projeto se usa Y — confirma para esta mudança?"* (Stack/Domínio).

### Em fase de planejamento (`lp:new`, `awaiting-feature-spec`)

- **Estilo / Processo**: aplique direto. Não pergunte sobre algo que já está na memória como estilo.
- **Stack / Domínio**: NÃO assuma. Use sempre como *"vi X na memória, confirma?"*. A memória NÃO substitui o grill — só economiza 1 pergunta convertendo "como vai ser?" em "confirma manter?".

### Em fase de implementação (`implementing`)

- Aplique tudo da memória como guia padrão. Se o usuário pedir algo diferente, é gatilho de salvamento (ver abaixo).

## Gatilho de salvamento — **autônomo**

> Default: o agente **detecta, classifica e grava sozinho**, sem perguntar. Apenas informa no plano de revisão do turno.

### Varredura proativa no fim de cada turno

Antes de fechar o turno (em qualquer skill `lp-*` que execute trabalho), reveja a conversa do turno e pergunte a si mesmo:
- O usuário corrigiu algo no jeito que fiz?
- O usuário rejeitou um approach e propôs outro?
- O usuário disse "lembra disso", "sempre faça X", "evita Y"?
- O usuário repetiu uma mesma correção que já apareceu antes nesta conversa ou em conversas passadas (visível no histórico de mensagens deste turno)?

Se sim a qualquer um → há entrada potencial.

### Sinais que disparam salvamento automático (sem perguntar)

1. **Correção explícita**: "não faça X assim", "evita Y", "prefere Z aqui", "sempre/nunca faça Z".
2. **Rejeição de approach com alternativa**: usuário desfez algo e indicou o jeito correto.
3. **Marcador explícito**: "lembra disso", "salva isso", "guarda essa preferência".
4. **Padrão repetido**: a mesma correção apareceu 2+ vezes.

### Pipeline (executar sozinho)

1. **Generalize** seguindo a "Regra de generalização" acima. Aplique o teste reutilização: se a entrada como está só serve para o módulo/feature atual, reescreva como princípio + Exemplo. Se não der pra generalizar, NÃO salve.
2. **Classifique**: Estilo/Processo (como trabalhar) ou Stack/Domínio (o que usar)?
3. **Verifique duplicação**: já existe entrada parecida? Se sim → **atualize** a existente (refina texto/contexto, adiciona novo exemplo, ajusta data) em vez de criar nova.
4. **Grave direto** em `.sdd/memory.md` (ou no arquivo de tema correto se já houver `memory-map.md`). Append na seção certa, ordenada por data desc.
4. **Informe no plano de revisão** do turno:
   ```
   Memória: +1 em Estilo/Processo — "<resumo>"
   (ou: atualizei entrada existente "<resumo>")
   ```

### Exceções — só estes casos pedem confirmação

Pergunte ao usuário (1 pergunta curta via `AskUserQuestion`) APENAS quando:
- **Classificação ambígua**: não dá pra decidir se é Estilo/Processo ou Stack/Domínio com clareza.
- **Generalização incerta**: ficou em dúvida se é preferência permanente OU decisão única dessa feature. Ex: usuário disse "aqui usa async/await em vez de .then()" — pode ser específico desse arquivo OU global.
- **Conflito com entrada existente**: a nova preferência contradiz uma já registrada — pergunte qual mantém.

Em todos os outros casos: grave e informe. Não interrompa o fluxo do usuário pedindo confirmação para o óbvio.

## Auto-split (autônomo)

Quando `memory.md` passar de ~150 linhas, **divida sozinho** — sem perguntar:

1. Crie `.sdd/memory/` com arquivos por tema. Agrupe semanticamente (não copie só os H2/H3 cegamente):
   - `estilo.md` — itens de Estilo/Processo.
   - `stack.md` — decisões de tecnologia/arquitetura genéricas.
   - `dominio-<X>.md` — quando houver vários itens sobre um domínio específico (ex: `dominio-auth.md`, `dominio-pagamentos.md`).
2. Crie `.sdd/memory-map.md` com 1 linha por arquivo: `- [tema](memory/<tema>.md) — <1 frase do que está lá>`.
3. Renomeie o antigo `memory.md` para `memory.md.archived` (não deletar).
4. Informe no plano de revisão do turno: *"Memória dividida em N arquivos (`.sdd/memory/`) + índice. Acima de 150 linhas — divisão automática."*

A partir daí: `memory-map.md` sempre carrega; arquivos específicos só quando o tema casa com a mudança/feature atual.

**Pergunte ao usuário ANTES de dividir** apenas se a separação por tema não estiver clara (poucos itens em muitos temas diferentes). Caso contrário, divida.

## Anti-padrões

- ❌ Salvar parágrafos longos. Cada entrada cabe em ~3 linhas.
- ❌ Salvar fatos do código (use `git`/grep). Memória é para PREFERÊNCIAS e DECISÕES recorrentes.
- ❌ Usar Stack/Domínio para pular grill em planejamento.
- ❌ Duplicar entradas. Se já existe, atualize.
- ❌ Salvar sem confirmar com o usuário.
