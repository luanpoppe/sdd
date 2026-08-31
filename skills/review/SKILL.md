---
name: review
description: Conduz uma revisão guiada de código existente — não para implementar, mas para ENTENDER como uma funcionalidade funciona. Apresenta o fluxo em chunks pequenos seguindo a ordem lógica (entrada de dados → processamento → saída). Permite o usuário pedir modificações inline durante a revisão. Use quando o usuário pedir "lp:review", "explica como X funciona", "quero entender o fluxo de Y", "review do módulo Z".
---

Você está conduzindo uma revisão guiada de código existente. **Não é implementação** — é um tour estruturado para o usuário entender como algo já funciona.

## 0. Pré-checagem

- Se `.sdd/config.yaml` não existir → "Rode `/lp-init` primeiro." Pare.
- **Carregue a memória**: `.sdd/memory.md` (ou `memory-map.md` + arquivos relevantes). Aplica em como você EXPLICA, não em como você decide o que revisar.
- Identifique se há review ativo: pasta em `.sdd/reviews/` com `.sdd.yaml` `state` ≠ `done`.

## 1. Despacho

### Sem argumentos + review ativo → **continuar**

Avance 1 chunk do review ativo seguindo a seção 4.

### Sem argumentos + nenhum review ativo → **iniciar (grill inicial)**

Faça grill curto com `AskUserQuestion`. **Q1 vai sozinha primeiro** (tudo depende do tema); depois **Q2 e Q3 juntas num batch** (são independentes entre si). **NÃO assuma um tema, NÃO escolha algo do código sozinho** — sempre pergunte.

**Q1. O que você quer revisar? (OBRIGATÓRIA)**

Pergunta direta ao usuário: *"O que você quer entender? Pode ser um fluxo, funcionalidade, módulo, endpoint, classe — qualquer coisa do código."*

- Se você conseguir inferir 2-3 candidatos prováveis do código (módulos principais, fluxos óbvios), liste-os como opções no `AskUserQuestion`. Sempre inclua "Outro (descrever)" para resposta livre.
- Se não tem candidatos óbvios, faça pergunta totalmente aberta sem opções pré-definidas.
- **Espere a resposta**. Não prossiga para Q2 sem ter o tema definido.

**Q2 + Q3 (mesmo batch — independentes entre si)**

**Q2. Formato do walkthrough**
- HTML acumulativo (Recomendado) — `walkthrough.html` cresce a cada chunk, usa CSS global, com links e blocos de código bem formatados.
- Markdown — `walkthrough.md`. Diff-friendly.
- Ambos — gera os dois.
- Só chat — efêmero, sem arquivo.

**Q3. Tamanho dos chunks**
- micro — 1-2 conceitos/funções por chunk (Recomendado para revisão profunda).
- small — até 3 conceitos.
- medium — até 5 conceitos.
- large — fluxo inteiro de um arquivo por chunk.

> **Não use** o `chunk_size` do `.sdd/config.yaml` — revisar é diferente de implementar.

Após o grill, vá para seção 2.

### Com argumento(s) → interpretar

- Texto descrevendo tema (ex: `/lp-review como funciona o login`) → trate como resposta de Q1, pergunte Q2 e Q3 juntas num batch.
- `pause` / `pausar` → marca review ativo como `state: paused` e termina.
- `end` / `encerrar` / `terminar` → marca como `state: done`. **Contexto** (se `context: true`/ausente): destile o walkthrough num arquivo de contexto macro da área revisada em `.sdd/context/` (o que é / como funciona / decisões / notas) + atualize o índice — via escriba. Review é fonte ideal de contexto. Ver `../../helpers/prompts/context-guide.md`. Sugere o que fazer a seguir (ler walkthrough, abrir `/lp-new` se quiser refatorar).
- `list` / `listar` → mostra reviews em `.sdd/reviews/` com state.

## 2. Exploração + plano do walkthrough

> Esta fase só roda no primeiro `/lp-review` da sessão (após o grill inicial).

0. **Contexto do projeto** (se `context: true`/ausente): leia `.sdd/context/index.md` e o arquivo da área revisada, se existir — pode adiantar boa parte do entendimento. Siga `../../helpers/prompts/context-guide.md`.

1. **Explore o código** relacionado ao tema. Use Glob, Grep, Read agressivamente. Considere lançar agentes Explore em paralelo se o escopo for amplo.

2. **Encontre o(s) entry point(s) externos — OBRIGATÓRIO antes de montar o plano.**

   Entry point é onde o mundo externo aciona o fluxo: um `@RestController`, um `@KafkaListener`, um `@Scheduled`, um event listener, etc. Sempre parta daqui — nunca de uma classe interna.

   - Busque agressivamente: grep por `@GetMapping`, `@PostMapping`, `@KafkaListener`, `@EventListener`, `@Scheduled`, `@MessageMapping` etc. relacionados ao tema.
   - Se o usuário pediu um escopo interno (ex: "quero entender o `RJService.salvar()`"), localize quem chama esse método externamente e **sugira subir**:
     > "Encontrei que esse método é chamado pelo `RJController.criar()` (HTTP POST /v1/rjs) e pelo `RJConsumer` (Kafka). Quer começar de lá para ver o fluxo completo, ou prefere focar só no Service?"
     Espere a resposta antes de montar o plano.
   - **Se houver múltiplos entry points** (ex: HTTP + Kafka acionam a mesma lógica), cubra os dois em paralelo no walkthrough: o plano começa com um step de "entry points" que mostra ambos os caminhos de entrada, e a partir daí os steps convergem quando o código é compartilhado, ou usam sub-steps (N.1, N.2) quando divergem.

3. **Monte o plano na ordem do fluxo real — de fora para dentro. Nunca siga a ordem dos arquivos fornecidos pelo usuário.**

   A ordem dos steps deve seguir a cadeia de chamadas real do sistema, não a organização por camada, não a lista de arquivos que o usuário eventualmente mencionar, não a hierarquia de pastas. Se o usuário disser "os arquivos relevantes são domínio → parser → segmentador → service → API", ignore essa sequência para fins de ordenação: descubra quem chama quem no código e ordene assim.

   **Ordem padrão (de fora para dentro):** entry point externo → orquestradores/services → componentes internos → persistência/saída → retorno ao mundo externo.

   O **primeiro step de todo walkthrough é sempre o Step 0: Vocabulário**. Obrigatório. Não é parte do fluxo — é um glossário vivo dos termos de domínio e negócio que aparecerão ao longo da revisão. O usuário não precisa consultar documentação externa para entender os steps seguintes.

   O Step 0 deve conter:
   - Os principais **conceitos de domínio** que o fluxo manipula (entidades, value objects, enums de estado, termos de negócio). Ex: o que é um `RaciocinioJuridico`, o que é um `PedidoImediato`, o que significa `StatusProcessingEnum.DONE`.
   - **Acrônimos e abreviações** usados no código que não são autoexplicativos (ex: `rj`, `mni`, `spi`).
   - Qualquer **convenção de nomenclatura** específica do domínio que aparecerá nos steps (ex: "stages do pipeline", "nós do raciocínio").
   - **Não** inclua detalhes de implementação — é vocabulário, não arquitetura. Frases curtas, máximo 2 linhas por termo.

   Ao explorar o código, colete os termos ativamente: leia os modelos de domínio, enums, constantes e comentários Javadoc relevantes para extrair definições reais — não invente.

   O **último step do plano** deve sempre ser o retorno ao mundo externo: o `ResponseEntity` devolvido, o ack do Kafka, o evento publicado, a escrita final no banco que encerra o processamento. Nunca termine o plano numa classe interna.

4. Crie `.sdd/reviews/<topic-slug>/` com:
   - `.sdd.yaml`:
     ```yaml
     topic: <topic>
     slug: <topic-slug>
     created: <YYYY-MM-DD>
     updated: <YYYY-MM-DD>  # SÓ a data — nunca anexe nota/texto aqui (ex: "2026-08-24 (Step 1 esclarecido)"). String com `:` sem aspas quebra o parser YAML. Nota sobre o que mudou vai no walkthrough (seção 4-bis), não aqui.
     state: walking  # planning | walking | paused | done
     format: <html|md|both|chat>
     chunk_size: <micro|small|medium|large>
     entry_points:
       - type: http  # http | kafka | scheduled | event | other
         label: "POST /v1/rjs → RJController.criar()"
         file: "adapter/input/restapi/RJController.java:34"
       - type: kafka
         label: "topic: shield-rj → RJConsumer.consume()"
         file: "adapter/input/consumer/RJConsumer.java:28"
     plan:
       - step: "Vocabulário"
         id: "0"          # Step 0 sempre presente — glossário de termos de domínio
         files: []        # preenchido com os arquivos de domínio consultados
         caller: null     # não tem caller — não é parte do fluxo
         done: false
       - step: <título curto>
         id: "1"          # suporta "5.1", "5.2" para sub-steps
         files: [<arquivos referenciados>]
         caller: null     # "NomeClasse.método() em arquivo:linha" — preenchido pelo agente
         done: false
       - step: ...
     current_step: 0
     ```
   - `walkthrough.<ext>` (html/md/ambos, conforme escolha) com cabeçalho do tema e estrutura vazia preparada para os steps.

5. **Mostre o plano ao usuário** em formato curto (lista numerada de steps + 1 frase cada, com o entry point destacado no topo) e pergunte:
   > "Esse plano segue a ordem de fora para dentro: começa de onde o dado entra no sistema e vai até o retorno final. Se preferir a ordem inversa (de dentro para fora — estruturas de domínio primeiro, entry point por último), é só pedir. Quer ajustar algo, juntar/dividir steps, ou podemos começar?"

6. Aplique ajustes que o usuário pedir e atualize `.sdd.yaml`. Quando aprovar, vá para seção 4.

## 3. Atualizar plano em runtime

Se durante a revisão o usuário pedir mudança no plano ("pula esse step", "explica também X", "junta esses dois"), aplique no `.sdd.yaml` e informe — não precisa pedir confirmação para ajustes pequenos.

## 4. Loop de chunks

Cada `/lp-continue` ou `/lp-review` (sem args) avança 1 chunk:

1. Pegue o `current_step`.
2. **Leia o código** dos arquivos do step. Não suponha — leia.
3. **Explique o step** seguindo a granularidade do `chunk_size`:
   - **Step 0 é especial**: não tem ponte de chamada, não tem exemplos de dado, não tem "pontos não-óbvios". É só o glossário. Estrutura: lista de termos com definição curta (2 linhas max por termo), agrupados se fizer sentido (ex: "Entidades", "Estados", "Acrônimos"). Ao final do Step 0, sempre imprima: *"Vocabulário registrado. Agora vamos ao fluxo — Step 1 é o entry point externo."*
   - **Ponte de chamada (OBRIGATÓRIO do step 1 em diante, exceto step 0)**: abra o step com uma linha **explícita** mostrando quem chama este código — nunca só uma seta solta, que fica ambígua sobre a direção (chama X ou é chamado por X?). Formato: `**Chamado por:** \`NomeClasse.método()\` em \`arquivo:linha\` — Step N: <título curto do step anterior>`.
     - **Nomeie o step anterior por número E título** (não só "Step 2" solto) — o leitor não deve precisar rolar pra cima pra saber do que se trata.
     - **Sempre inclua `arquivo:linha`** do método chamador — sem isso quebra a navegabilidade que o resto do walkthrough exige.
     - **Se há condição/gate pro chamado acontecer** (só roda se aprovado, só nesse estado, só com feature flag), coloque numa **frase própria logo abaixo**, nunca emendada com travessão na mesma linha da ponte — "quem chama" e "quando chama" são duas informações distintas.
     - No **step 1** (entry point externo), troque "Chamado por" por "Disparado por" e aponte o gatilho externo: `**Disparado por:** POST /v1/rjs (HTTP)` ou `**Disparado por:** Kafka topic \`shield-rj\``. Não há step anterior a citar aqui.
   - **No arquivo (chat e walkthrough)**: o que esse pedaço faz, qual sua responsabilidade no fluxo, como conecta com o anterior e prepara o próximo.
   - **Cite arquivos/linhas** no formato `caminho/arquivo.ts:42` para o usuário navegar.
   - **Mostre trechos curtos** de código relevante (≤ ~15 linhas por trecho). Não copie arquivos inteiros.
   - **Destaque o que NÃO é óbvio**: efeitos colaterais, decisões de design, pontos de extensão, armadilhas conhecidas.
   - **Dados reais, inline no fluxo (OBRIGATÓRIO)**: mostre exemplos concretos dos dados **no ponto exato do fluxo onde fazem sentido** — junto ao trecho de código que os produz ou consome, não numa seção separada ao final. Use nomes, IDs, payloads e estados próximos de valores reais do domínio — nunca `"foo"`, `"bar"`, `123`, `"example"`. Objetivo: o usuário acompanha o dado se transformando à medida que lê o código, no contexto em que aquela transformação acontece.
     - Quando um trecho recebe um dado, mostre logo abaixo dele com que valor ele chega.
     - Quando um trecho transforma o dado, mostre o antes/depois **ali mesmo**, colado ao código que fez a transformação.
     - Quando o step apenas repassa o dado sem mudá-lo, um único exemplo representativo basta.
     - Escolha os pontos onde o exemplo mais ajuda a entender — não force um exemplo por trecho se não agregar.
   - **Detecção de ramificação**: se durante a leitura do código deste step você identificar que o fluxo se divide (if/else com caminhos relevantes, chamadas paralelas a múltiplos adapters, múltiplos outcomes possíveis), **não prossiga automaticamente** — informe o usuário e pergunte:
     > "Aqui o fluxo se divide em N caminhos: [lista]. Quer que eu crie sub-steps (N.1, N.2…) para cada um? Se sim, digo quais serão antes de continuar."
     Aguarde confirmação antes de criar os sub-steps no `.sdd.yaml`.
4. Anexe o conteúdo do step no `walkthrough.<ext>`:

   **HTML** — estrutura geral do `walkthrough.html` (criada NA PRIMEIRA execução):

   Inclui um **hamburger menu** para abrir o Índice em telas pequenas. O botão é `position: fixed` (fica acessível em qualquer ponto do scroll); em telas largas ele some e a `<aside class="toc">` aparece normalmente. Toggle e responsividade são autônomos (CSS + JS mínimos inline no `<head>`) — não dependem do `styles.css` global, que pode não conhecer esses elementos.
   ```html
   <!DOCTYPE html>
   <html lang="pt-BR">
   <head>
     <link rel="stylesheet" href="../../assets/styles.css">
     <style>
       /* Hamburger: escondido por padrão, visível só em telas pequenas */
       .toc-toggle { display: none; }
       @media (max-width: 860px) {
         .toc-toggle {
           display: flex; position: fixed; top: 1rem; left: 1rem; z-index: 1000;
           width: 44px; height: 44px; align-items: center; justify-content: center;
           border: none; border-radius: 8px; cursor: pointer; font-size: 1.4rem;
           background: #222; color: #fff; box-shadow: 0 2px 8px rgba(0,0,0,.3);
         }
         .toc {
           position: fixed; top: 0; left: 0; height: 100vh; z-index: 999;
           transform: translateX(-100%); transition: transform .2s ease;
           overflow-y: auto; background: #fff; box-shadow: 2px 0 12px rgba(0,0,0,.2);
           padding: 4rem 1.25rem 1.25rem;
         }
         body.toc-open .toc { transform: translateX(0); }
         body.toc-open .toc-backdrop {
           display: block; position: fixed; inset: 0; z-index: 998;
           background: rgba(0,0,0,.4);
         }
         .toc-backdrop { display: none; }
       }
     </style>
   </head>
   <body>
     <button class="toc-toggle" aria-label="Abrir índice" aria-expanded="false"
             onclick="document.body.classList.toggle('toc-open');
                      this.setAttribute('aria-expanded', document.body.classList.contains('toc-open'));">☰</button>
     <div class="toc-backdrop" onclick="document.body.classList.remove('toc-open');"></div>

     <aside class="toc">
       <p class="toc-title">Índice</p>
       <ol>
         <!-- entradas adicionadas conforme novos steps são gerados -->
         <!-- Clicar num link fecha o menu em telas pequenas: -->
         <!-- <li><a href="#step-N" onclick="document.body.classList.remove('toc-open')">Título</a></li> -->
       </ol>
     </aside>

     <header>
       <h1>...</h1>
       <p class="subtitle">...</p>
       <p class="meta">...</p>
     </header>

     <main>
       <!-- steps (<details>) adicionados aqui -->
     </main>

     <!-- Ao navegar via TOC para um step aninhado, abre o <details> alvo e seus ancestrais: -->
     <script>
       function openTarget() {
         var el = document.getElementById(location.hash.slice(1));
         while (el) { if (el.tagName === 'DETAILS') el.open = true; el = el.parentElement; }
       }
       window.addEventListener('hashchange', openTarget);
       window.addEventListener('DOMContentLoaded', openTarget);
     </script>

     <!-- Syntax highlight mínimo, offline e agnóstico de linguagem — mesma lógica do flow.html.tpl.
          Roda no load, coloriza todo <pre><code> do walkthrough (comentários, strings, números,
          anotações, keywords comuns e Tipos capitalizados). Reprocessa a página inteira a cada
          load, então incrementar o walkthrough com novos steps não exige re-rodar nada. -->
     <script>
       (function () {
         function esc(s) {
           return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
         }
         var KW = ['function','fun','fn','func','def','return','if','else','elif','for','while','do',
           'switch','case','break','continue','const','let','var','val','public','private','protected',
           'internal','static','final','abstract','class','interface','enum','struct','record','extends',
           'implements','new','throw','throws','try','catch','finally','import','from','export','package',
           'namespace','void','async','await','yield','this','self','super','null','nil','none','true',
           'false','True','False','None','in','is','not','and','or','as','with','lambda','typeof','instanceof'];
         var re = new RegExp(
           '(\\/\\/[^\\n]*|#[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/)' +
           '|("(?:\\\\.|[^"\\\\])*"|\'(?:\\\\.|[^\'\\\\])*\'|`(?:\\\\.|[^`\\\\])*`)' +
           '|(@[A-Za-z_]\\w*)' +
           '|\\b(' + KW.join('|') + ')\\b' +
           '|\\b([A-Z][A-Za-z0-9_]+)\\b' +
           '|\\b(\\d[\\d_]*(?:\\.\\d+)?)\\b',
           'g');
         function hl(code) {
           var out = '', last = 0, m;
           while ((m = re.exec(code))) {
             out += esc(code.slice(last, m.index));
             var cls = m[1] ? 'tk-com' : m[2] ? 'tk-str' : m[3] ? 'tk-ann' : m[4] ? 'tk-kw' : m[5] ? 'tk-typ' : 'tk-num';
             out += '<span class="' + cls + '">' + esc(m[0]) + '</span>';
             last = re.lastIndex;
           }
           out += esc(code.slice(last));
           return out;
         }
         document.querySelectorAll('main pre code').forEach(function (c) {
           c.innerHTML = hl(c.textContent);
         });
       })();
     </script>
   </body>
   </html>
   ```

   **Colapsável (OBRIGATÓRIO):** todo step é um `<details>` com `<summary>` como cabeçalho. **Colapsado por padrão** — nunca inclua o atributo `open`. O comportamento de expandir/colapsar é nativo do `<details>`, não depende de JS. Sub-steps são `<details>` aninhados dentro do `<details>` do step-pai.

   **HTML** — estrutura do Step 0 (Vocabulário), sempre o primeiro em `<main>`:
   ```html
   <details id="step-0" data-step="0" class="step vocabulary">
     <summary><span class="step-num">0</span> Vocabulário</summary>
     <p class="meta">Termos de domínio e negócio usados ao longo desta revisão.</p>

     <dl>
       <dt>NomeDoConceto</dt>
       <dd>Definição curta — o que é e por que importa neste fluxo.</dd>

       <dt>OutroTermo</dt>
       <dd>...</dd>
     </dl>
     <!-- Agrupe com <h3> se os termos se dividirem em categorias (ex: Entidades, Estados, Acrônimos) -->
   </details>
   ```

   **HTML** — estrutura de cada step (anexada em `<main>` após o Step 0):

   `id` e `data-step` usam o número do step: `"step-1"`, `"step-5"`, `"step-5-1"` para sub-steps. Cada step é um `<details class="step">` **colapsado** (sem `open`), com o cabeçalho em `<summary>`.
   ```html
   <details id="step-N" data-step="N" class="step">
     <summary><span class="step-num">N</span> <título curto do que esse step revela></summary>

     <p class="meta">Arquivo: <code class="file-path">caminho/arquivo.ext</code></p>

     <!-- Ponte de chamada: quem aciona este step + de qual step anterior vem. Rótulo explícito, nunca só seta. -->
     <p class="caller"><strong>Chamado por:</strong> <code>NomeClasse.método()</code> em <code class="file-path">arquivo:linha</code> — Step N: <em>título do step anterior</em></p>
     <!-- Se houver condição/gate pro chamado acontecer, frase PRÓPRIA logo abaixo — nunca emendada na linha da ponte: -->
     <p class="caller-condition">Só executa quando <condição>.</p>
     <!-- Para o step 1 (entry point), troque o rótulo e não cite step anterior: -->
     <!-- <p class="caller entry-point"><strong>Disparado por:</strong> POST /v1/rjs (HTTP) · <code class="file-path">RJController.java:34</code></p> -->

     <h3>Responsabilidade</h3>
     <p>1-3 frases do papel desse pedaço no fluxo.</p>

     <h3>O fluxo, em ordem</h3>
     <pre data-file="caminho/arquivo.ext:linha-início-fim"><code>... trecho ...</code></pre>
     <p>Explicação curta abaixo de cada trecho.</p>
     <!-- Exemplo de dado real COLADO ao trecho que o produz/consome, quando ajuda a entender: -->
     <pre data-label="dado aqui"><code>// com que valor o dado chega/sai NESTE ponto
{ "campo": "valor-real-do-domínio", ... }</code></pre>
     <!-- Quando o trecho TRANSFORMA o dado, mostre antes/depois ali mesmo: -->
     <pre data-label="antes"><code>{ "status": "PROCESSING" }</code></pre>
     <pre data-label="depois"><code>{ "status": "DONE" }</code></pre>
     <!-- Repita o padrão por trecho conforme necessário. NÃO agrupe tudo numa seção ao final. -->

     <h3>Pontos não-óbvios</h3>
     <ul>
       <li><strong>Título do ponto.</strong> Explicação.</li>
     </ul>

     <!-- SUB-STEPS: aninhados AQUI DENTRO, antes de fechar o </details> do pai. -->
     <!-- Cada sub-step é um <details class="step substep"> com id="step-N-M". -->
     <details id="step-N-1" data-step="N.1" class="step substep">
       <summary><span class="step-num">N.1</span> <título do sub-step></summary>
       <!-- mesma estrutura interna de um step normal -->
     </details>
   </details>
   ```

   **Aninhamento de sub-steps:** quando um step tem sub-steps (ramificação N.1, N.2…), os `<details>` dos sub-steps ficam **dentro** do `<details>` do step-pai. Assim, colapsar o pai esconde todos os filhos; expandir o pai revela os sub-steps (que continuam colapsados individualmente até o usuário abrir cada um).

   **Manutenção do índice (TOC) — OBRIGATÓRIA:**
   - Cada `<details data-step="N">` DEVE ter `id="step-N"` correspondente.
   - A cada novo step gerado, **append** uma entrada no `<aside class="toc"> > <ol>` (o `onclick` fecha o menu em telas pequenas):
     ```html
     <li><a href="#step-N" data-step="N" onclick="document.body.classList.remove('toc-open')">Título curto do step</a></li>
     ```
   - Sub-steps ganham sub-entrada aninhada apontando para `#step-N-M`:
     ```html
     <li><a href="#step-N" ...>Título</a>
       <ol><li><a href="#step-N-1" ...>Título do sub-step</a></li></ol>
     </li>
     ```
   - **Nunca deixe o TOC dessincronizado**. Sempre que adicionar/remover/renomear step ou sub-step, atualize a entrada.

   - Use `<code class="file-path">` para caminhos de arquivo (ganha chip visual).
   - Use `pre data-file="..."` para mostrar o arquivo:linha em cima do bloco.
   - Use `<blockquote>` ou `<div class="callout warn|info|success">` para destaques.

   **MD** — cada step é envolto em `<details><summary>` para ser colapsável (colapsado por padrão, sem `open`; renderizadores como GitHub suportam nativamente). Sub-steps ficam dentro do `<details>` do pai. Padrão:
   ```markdown
   <details>
   <summary>Step N: título</summary>

   ... conteúdo do step em markdown normal ...

   <details>
   <summary>Step N.1: título do sub-step</summary>

   ... sub-step ...
   </details>
   </details>
   ```
   Step 0 usa `<summary>Step 0: Vocabulário</summary>` seguido de lista de definições com `**Termo**` + descrição curta, agrupada em sub-seções `###` se necessário. Sem ponte, sem exemplos de dado.

   Steps 1+ espelham a mesma hierarquia: `## Step N: <título>` (sub-steps: `## Step 5.1: <título>`), `**Arquivo**: \`caminho\``, logo abaixo a ponte de chamada: `**Chamado por:** \`NomeClasse.método()\` em \`arquivo:linha\` — Step M: <título do step anterior>` (step 1: `**Disparado por:** <gatilho externo>`, sem step anterior). Se houver condição/gate, frase própria numa linha abaixo, em itálico: `_Só executa quando <condição>._`. Depois, sub-seções com `###`, blocos de código com fences ` ```linguagem `, e **exemplos de dado real colados ao trecho** que os produz/consome (antes/depois quando há transformação) — nunca numa seção separada ao final —, listas de pontos não-óbvios.
5. Marque o step como `done: true`, incremente `current_step`.
6. Imprima no chat um **resumo do step + ponteiro para o próximo**:
   ```
   Step <N>/<total> concluído — <título>
   Chamado por: <chamador imediato> (Step <N-1>: <título do step anterior>)
   Arquivos visitados: <lista>
   Próximo: /lp-review (step <N+1>: <título do próximo>)

   Quer pedir alguma modificação aqui, fazer perguntas, ou seguir?
   ```

Se foi o último step (retorno ao mundo externo) → marque review como `done`, imprima:
```
Fluxo completo revisado. Retorno ao mundo externo: <descrição do response/ack/evento final>.
Walkthrough salvo em .sdd/reviews/<slug>/walkthrough.<ext>
```
Sugira encerramento (`/lp-review end`) ou próximos passos (`/lp-new` se quiser refatorar).

## 4-bis. Perguntas durante o review (integrar no ponto certo, NÃO em bloco no final)

Quando o usuário faz uma pergunta sobre um step **sem pedir modificação**, a resposta deve **melhorar o texto do step no ponto onde a dúvida surge** — não vai para uma seção "Perguntas & respostas" ao final. Objetivo: quem reler o walkthrough do começo entende sem precisar chegar ao fim da section. Sempre atualize o `walkthrough.<ext>`, além de responder no chat. Não pergunte se deve salvar — faça automaticamente.

### Como integrar (escolha o modo que deixa o texto mais claro)

1. Identifique o step e o **trecho específico** a que a pergunta se refere (default: o step recém-visto; se ambíguo, pergunte uma vez qual trecho).
2. Escolha UMA das duas formas:

   **(A) Reescrever o texto original** — preferível quando a dúvida revela que a explicação estava incompleta ou confusa. Edite a frase/parágrafo original do step para já responder a dúvida embutida. Quem ler pela primeira vez nem percebe que houve pergunta — o texto simplesmente ficou mais claro.

   **(B) Adicionar um esclarecimento logo abaixo do contexto** — quando a informação é um aprofundamento que não cabe reescrevendo a frase. Insira um parágrafo/callout **imediatamente após o trecho** (código ou explicação) a que se refere, dentro do `<details>` do step, não no fim da section.

3. Prefira **(A)** quando possível. Use **(B)** quando a resposta é complementar e reescrever prejudicaria a fluidez.

**HTML** — esclarecimento inline via callout, colado ao trecho relevante:
```html
<!-- logo APÓS o <pre>/parágrafo a que a dúvida se refere, dentro do <details> do step -->
<div class="callout info" data-note="YYYY-MM-DD">
  <p>Esclarecimento embutido no fluxo — mesmas regras de citação arquivo:linha + trechos curtos.</p>
</div>
```

**MD** — mesma ideia, blockquote logo abaixo do trecho:
```markdown
> **Nota (YYYY-MM-DD):** esclarecimento embutido no ponto relevante do fluxo.
```

### Regras

- **Nunca crie seção "Perguntas & respostas" no fim da section.** A resposta vive no ponto do fluxo onde faz sentido.
- **Sem duplicação no chat**: a resposta no chat e a que entra no walkthrough têm o MESMO conteúdo principal.
- **Ao reescrever (modo A)**: mantenha o texto coeso — não deixe marcas de "editado aqui" no corpo. Se o trecho de código exibido também mudou de entendimento, ajuste-o.
- **Resposta enxuta**: se longa, divida em sub-tópicos. Mesmo limite de trechos curtos (~15 linhas de código por bloco).
- **Atualize `updated` no `.sdd.yaml` — só a data (`YYYY-MM-DD`)**, nunca anexe nota do que mudou ali (quebra o parser YAML se tiver `:`). A nota de "o que foi esclarecido" já está no walkthrough, no ponto do fluxo — não precisa duplicar no `.sdd.yaml`.
- **Informe no chat ao final** (1 linha): *"📌 Resposta integrada no Step N (`walkthrough.<ext>`) — [reescrevi o parágrafo sobre X | adicionei nota após o trecho Y]."*
- **Não aplica a**: pedidos de modificação de código (vai pra seção 5), comandos de controle (`pause`/`end`), perguntas fora do tema do review (responda só no chat).

## 5. Modificações pedidas durante o review

Padrão: **aplicar inline sem ativar SDD formal**.

1. Faça pequeno grill se houver ambiguidade (estilo `grill-snippet.md`).
2. Aplique a modificação direto. Rode `eslint --fix` nos arquivos editados.
3. **Atualize o walkthrough** se a explicação anterior ficou desatualizada (ajuste o trecho de código mostrado, registre nota "atualizado em <data>: <o que mudou>").
4. **Após a modificação**, sempre retorne ao review: *"Modificação aplicada. Quer continuar a revisão do step <N>?"*

**Sugira `/lp-new`** APENAS se perceber que a modificação:
- Afeta múltiplos módulos não relacionados ao tema do review.
- Implica mudança de arquitetura/contrato externo.
- Exige specs/tasks formais para revisão estruturada.

Sugira como **opção**, nunca exigência: *"Essa mudança parece substancial — vale abrir um `/lp-new` formal? Se preferir seguir aqui mesmo, sigo direto."* Se o usuário escolher continuar inline, **respeite e continue**.

## 6. Memória (gatilho normal)

Aplica `memory-guide.md` igual a outras skills. Se o usuário, durante o review, soltar uma preferência ("nunca faça assim", "prefere X"), capture e salve.

## 7. Context watch

Aplica `context-watch.md`. Reviews podem ser longos (vários steps + várias modificações). Conte cada step explicado + cada modificação como "chunk" para efeito do watch.

## Princípios

- **Não inventar**. Se você não tem certeza do que um pedaço de código faz, leia mais e diga ao usuário que verificou. Nada de chutar.
- **Sempre do entry point externo ao retorno externo — a ordem é do fluxo real, não dos arquivos.** O walkthrough cobre o fluxo de ponta a ponta: do gatilho do mundo externo (HTTP, Kafka, schedule…) até o retorno ao mundo externo (response, ack, evento publicado). Nunca comece numa classe interna sem antes mostrar o que a aciona. Se o usuário fornecer uma lista de arquivos organizada por camada, ignore essa ordem para fins de sequência dos steps — descubra a cadeia de chamadas real e ordene por ela. O usuário pode pedir a ordem inversa (de dentro para fora) — nesse caso respeite, mas o padrão é sempre de fora para dentro.
- **A ponte de chamada é obrigatória e explícita**. Cada step abre com "Chamado por"/"Disparado por" + `arquivo:linha` + o step anterior nomeado por número e título — nunca só uma seta solta (ambígua sobre a direção) nem condição emendada na mesma frase. Sem isso o usuário perde o fio condutor entre as camadas.
- **Nada se cita só pelo número.** Step é etiqueta de referência, não descrição — "Step 4" solto obriga o usuário a rolar pra cima. Sempre número **e** título curto do que aquele step é. Vale também se citar chunk/feature de uma mudança do SDD. Ver `../../helpers/prompts/state-machine.md`.
- **Seguir a ordem do dado**: entrada → processamento → saída. Pular essa ordem confunde.
- **Exemplos de dado inline, não em bloco isolado**. Mostre valores reais do domínio no ponto do fluxo onde a transformação acontece, colados ao trecho de código responsável — nunca agrupados numa seção "dados em transformação" ao final do step.
- **Sub-steps para ramificações, sempre com confirmação**. Nunca escolha silenciosamente um caminho quando o fluxo se divide — pergunte e crie sub-steps.
- **Um chunk por turno**. Mesmo se o usuário disser "explica tudo", redirecione: "vou em chunks pra você acompanhar; pode pedir pra acelerar se sentir lento".
- **Citar arquivo:linha** sempre que possível. O walkthrough vale pouco se o dev não consegue navegar no código real.
- **Trechos curtos**. ≤ 15 linhas por bloco no walkthrough.
- **Não duplicar specs/plans**. Se já existe `.sdd/changes/<id>/plan.md` ou `spec.md` sobre o tema, referencie em vez de copiar.
