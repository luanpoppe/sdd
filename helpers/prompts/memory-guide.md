# Memória do SDD (`lp:*`)

Mecanismo para o agente lembrar preferências e decisões recorrentes do usuário ao longo das mudanças.

## Duas memórias, escopos diferentes

| Arquivo | Guarda | Versionado |
|---|---|---|
| `.sdd/memory.md` (do projeto) | preferências e decisões **deste repositório** | sim, o time herda |
| `~/.sdd/memory.md` (global) | lições sobre **o fluxo `lp:*` e sobre como você trabalha**, que valem em qualquer projeto | não, é sua |

**O teste de escopo**: a lição continuaria verdadeira num repositório completamente diferente?
Sim → global. Não, depende deste código, deste time, desta stack → projeto.

Na prática, vai para o global quase tudo que descreve **falha ou acerto do agente**: subagente
que reportou build limpo sem compilar, escriba que gravou no arquivo errado, chunk emendado com
outro no mesmo turno, briefing de subagente com lista de arquivos incompleta. Nada disso é sobre
o repositório onde aconteceu.

O global é lido junto com o do projeto, nas mesmas skills que já carregam memória
(`lp:new-feature`, `lp:continue`, `lp:bug-fix`), e segue o mesmo formato, o mesmo teto por
entrada e a mesma regra de divisão. Ele mora em `~/.sdd/` pelo mesmo motivo do
`~/.sdd/config.yaml`: o instalador não apaga nada ali (ver `./global-config-guide.md`).

### A terceira recorrência é sinal de defeito do plugin

Se a mesma lição do global já foi registrada e volta a acontecer pela **terceira** vez, o
problema provavelmente não é seu nem do projeto: é um guia do SDD que não está claro o
bastante. Diga isso no plano de revisão do turno, em uma linha, nomeando o guia suspeito:

```
Memória global: esta lição ("subagente reporta build que não rodou") reapareceu pela 3ª vez
— provavelmente falta uma regra em subagents-guide.md, não é caso de memória.
```

Não abra arquivo, não crie tarefa, não altere o plugin por conta própria. Só avise.

## Localização e divisão

- Padrão: arquivo único (`.sdd/memory.md`, `~/.sdd/memory.md`).
- Divide em `<pasta>/memory/<tema>.md` + `memory-map.md` (índice de 1 linha por arquivo) quando passar de **25 entradas OU de 8 KB**, o que vier primeiro. O `memory-map.md` é o que sempre carrega; os arquivos de tema só quando o tema casa com a mudança.

Os dois limites existem porque medem coisas diferentes, e o segundo é o que costuma estourar
primeiro: memória vira relato de incidente muito antes de virar lista longa. Um arquivo com 60
entradas curtas é saudável; um com 15 entradas de 2 KB cada custa 4.000 tokens em **toda**
invocação e não cabe na cabeça de ninguém.

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

### Teto duro — é o que faz a regra pegar

O princípio cabe em **uma linha de até ~200 caracteres**. Cada sub-campo (`Quando`, `Por quê`,
`Exemplo`) cabe em **uma linha**. A entrada inteira, com todos os campos, não passa de 5 linhas.

O teto não é estética: é o detector. Princípio de verdade é curto porque não carrega o caso.
Se você não conseguiu caber, o que está escrevendo é **relato do incidente**, não regra —
e o caminho não é cortar palavras, é extrair a regra e mandar o caso para o `Exemplo`.

O `Exemplo` cita o caso em uma linha: o quê aconteceu e onde. Ele não reconstitui a história,
não lista o que foi corrigido e não explica como não repetir — isso tudo já está no princípio.
Um `Exemplo` que precisa de duas linhas é sinal de que ele está fazendo o trabalho do princípio.

```markdown
❌ Relato (não salvar assim)
- **Briefing de subagente: a lista de arquivos permitidos precisa cobrir o desenho pedido** —
  vale em qualquer modo, não só no paralelo. Aconteceu duas vezes: no chunk do cruzamento de
  tenant (F7.C5 de banco-julgados-upload), onde a lista tinha 2 arquivos mas o desenho exigia
  alterar a porta e o serviço; e de novo no C3 de fix-precedentes, onde [...]

✅ Princípio + exemplo
- Briefing de subagente lista todos os arquivos que o desenho exige tocar, não só os óbvios.
  - **Quando**: qualquer delegação de código, sequencial ou paralela
  - **Por quê**: subagente não pede permissão — ele entrega incompleto
  - **Exemplo**: F7.C5 de `banco-julgados-upload`, lista com 2 de 4 arquivos necessários
  - **Registrado em**: 2026-09-05
```

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

- **Carregar as duas memórias** — a do projeto e a global `~/.sdd/memory.md` (ou o `memory-map.md` de cada uma, se existir) — ANTES de qualquer grill ou geração de artefato. Global ausente é o caso normal no começo: siga em silêncio, não crie o arquivo só para ele existir.
- Se relevante, citar inline: *"Vi na memória que você prefere X — vou seguir."* (Estilo) OU *"Vi na memória que neste projeto se usa Y — confirma para esta mudança?"* (Stack/Domínio).

### Em fase de planejamento (`lp:new-feature`, `awaiting-feature-spec`)

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

1. **Generalize** seguindo a "Regra de generalização" acima. Aplique o teste de reuso e o **teto duro**: princípio em uma linha de até ~200 caracteres, caso concreto só no `Exemplo`. Se não der pra generalizar, NÃO salve.
2. **Escolha o arquivo**: a lição vale em qualquer repositório → `~/.sdd/memory.md`. Depende deste código, time ou stack → `.sdd/memory.md` do projeto.
3. **Classifique**: Estilo/Processo (como trabalhar) ou Stack/Domínio (o que usar)?
4. **Verifique duplicação**: já existe entrada parecida? Se sim → **atualize** a existente (refina texto/contexto, adiciona novo exemplo, ajusta data) em vez de criar nova. No global, entrada que se repete pela 3ª vez leva também a linha de "provável defeito do plugin" (ver acima).
5. **Grave direto**, sem pedir confirmação. Append na seção certa, ordenada por data desc.
6. **Mostre o TEXTO da entrada no plano de revisão** — não só um resumo dela. Você gravou sem perguntar; o mínimo é o usuário conseguir vetar lendo o que ficou escrito, sem abrir o arquivo:
   ```
   Memória (projeto): +1 em Estilo/Processo
   - Briefing de subagente lista todos os arquivos que o desenho exige tocar, não só os óbvios.
     Quando: qualquer delegação de código · Exemplo: F7.C5 de `banco-julgados-upload`
   ```
   Entrada atualizada em vez de criada: mostre o texto novo e diga o que mudou nele.

### Exceções — só estes casos pedem confirmação

Pergunte ao usuário (1 pergunta curta via `AskUserQuestion`) APENAS quando:
- **Classificação ambígua**: não dá pra decidir se é Estilo/Processo ou Stack/Domínio com clareza.
- **Generalização incerta**: ficou em dúvida se é preferência permanente OU decisão única dessa feature. Ex: usuário disse "aqui usa async/await em vez de .then()" — pode ser específico desse arquivo OU global.
- **Conflito com entrada existente**: a nova preferência contradiz uma já registrada — pergunte qual mantém.

Em todos os outros casos: grave e informe. Não interrompa o fluxo do usuário pedindo confirmação para o óbvio.

## Auto-split (autônomo)

Quando o arquivo passar de **25 entradas ou 8 KB**, **divida sozinho** — sem perguntar. Vale para o do projeto e para o global; os caminhos abaixo usam `.sdd/` do projeto, no global troque por `~/.sdd/`:

1. Crie `.sdd/memory/` com arquivos por tema. Agrupe semanticamente (não copie só os H2/H3 cegamente):
   - `estilo.md` — itens de Estilo/Processo.
   - `stack.md` — decisões de tecnologia/arquitetura genéricas.
   - `dominio-<X>.md` — quando houver vários itens sobre um domínio específico (ex: `dominio-auth.md`, `dominio-pagamentos.md`).
2. Crie `.sdd/memory-map.md` com 1 linha por arquivo: `- [tema](memory/<tema>.md) — <1 frase do que está lá>`.
3. Renomeie o antigo `memory.md` para `memory.md.archived` (não deletar).
4. Informe no plano de revisão do turno: *"Memória dividida em N arquivos (`.sdd/memory/`) + índice — passou de <25 entradas | 8 KB>."*

A partir daí: `memory-map.md` sempre carrega; arquivos específicos só quando o tema casa com a mudança/feature atual.

**Pergunte ao usuário ANTES de dividir** apenas se a separação por tema não estiver clara (poucos itens em muitos temas diferentes). Caso contrário, divida.

## Separador dentro da linha

Cada sub-campo cabe em uma linha, e essa linha muitas vezes tem duas partes (o que fazer e o motivo). Separe com **`  ||  `**, nunca com `;` — a entrada é relida rápido, e ponto e vírgula some no meio do texto. Ver `./state-machine.md`.

## Anti-padrões

- ❌ **Relato de incidente no lugar do princípio.** É o mais comum e o que mais estraga a memória: a regra fica na primeira linha e o resto conta a história. Extraia a regra, mande o caso para o `Exemplo`.
- ❌ **Duas ou três ocorrências empilhadas na mesma entrada** ("aconteceu no F7.C5 e de novo no C3…"). Uma entrada guarda um exemplo; recorrência se registra atualizando a data, não acumulando narrativa.
- ❌ **Fato de configuração disfarçado de preferência** (porta, variável de ambiente, versão de pacote, caminho de arquivo). Isso vive no `.sdd/config.yaml`, no `.env` ou no `.sdd/context/` — e envelhece sozinho lá.
- ❌ Salvar fatos do código (use `git`/grep). Memória é para PREFERÊNCIAS e DECISÕES recorrentes.
- ❌ **Lição sobre o fluxo `lp:*` gravada na memória do projeto.** Ela não é sobre aquele repositório e vai ficar invisível em todos os outros — vai no global.
- ❌ Usar Stack/Domínio para pular grill em planejamento.
- ❌ Duplicar entradas. Se já existe, atualize.
- ❌ **Gravar sem mostrar o texto no plano de revisão.** Gravar sozinho é o padrão; esconder o que foi gravado, não.
