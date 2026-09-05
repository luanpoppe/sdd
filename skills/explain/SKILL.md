---
name: explain
description: Explica um assunto e guarda a explicação num HTML global e acumulativo por tema, em `~/.sdd/explain/<tema>.html` — fora de qualquer repositório, então serve para dúvida sobre o projeto, sobre uma stack ou sobre um conceito qualquer. Cada tema tem estado (`aberto`/`estudado`), formando uma fila do que ficou pela metade. Use quando o usuário pedir "lp:explain <pergunta>", "salva isso no sdd", "minha fila de estudo", "estudei <tema>" — e também, sem ele pedir, quando ele fizer uma pergunta conceitual no meio de um fluxo `lp:*` ativo.
---

Você está respondendo uma dúvida e guardando a explicação na base global do usuário.

> **Global de propósito.** Isto NÃO vive dentro do projeto: mora em `~/.sdd/explain/`, junto do `config.yaml` e do banco. O que ele entendeu sobre JWT trabalhando num repositório continua valendo no próximo, e amarrar o tema a um projeto esconderia justamente o que motivou globalizar. Explicações antigas em `.sdd/changes/<id>/explain/` ficam onde estão — nada se move sozinho.

## 1. Quando esta skill entra

Três gatilhos, e só três:

1. **Chamada explícita** — `/lp-explain <pergunta>`, "salva isso no sdd", "guarda essa explicação".
2. **Pergunta conceitual dentro de um fluxo `lp:*` ativo** — o usuário está numa conversa que já passou por `lp:new-feature`, `lp:continue`, `lp:bug-fix`, `lp:review-walkthrough` ou similar, e faz uma pergunta sobre **como algo funciona** ou **por quê**.
3. **Comandos de fila** — `/lp-explain fila`, `/lp-explain estudei <tema>` (seção 5).

**Fora disso, não entre.** Conversa comum, sem nenhuma relação com o fluxo `lp:*`, não dispara registro automático — mesmo que a pergunta seja conceitual. Registrar ali seria a skill se convidando para uma conversa que não é dela.

### O que conta como pergunta conceitual

| Registra | Não registra |
|---|---|
| "o que é backpressure?" | "roda os testes" |
| "qual a diferença entre isso e aquilo?" | "quais arquivos eu mexi?" |
| "por que isso acontece?" | "já commitou?" |
| "como funciona esse fluxo por dentro?" | "pode seguir" |

O corte é entre **conhecimento** e **operação**. Pergunta de execução é conversa de trabalho: ela não sobrevive ao dia, e gravá-la enche a fila de estudo de ruído até a fila não valer nada.

Na dúvida entre os dois lados, **não registre**. Falso positivo custa mais que falso negativo aqui: um tema a menos você reencontra perguntando de novo; a fila poluída você abandona.

## 2. Responder primeiro, gravar depois

**Responda no chat imediatamente.** A escrita do HTML nunca atrasa a resposta nem o que estava sendo feito antes da pergunta.

Só investigue código antes de responder se a precisão depender disso — e mesmo aí, rápido e direto, sem delegar a formulação da resposta.

Depois de responder, dispare **um** `Agent` com `subagent_type: "fork"` para escrever o HTML e registrar no banco. O fork herda a conversa inteira, então o prompt dele instrui a **ação de arquivo**, não repete a explicação. Não espere o resultado: volte na hora ao que a conversa estava fazendo. Uma menção de uma linha basta ("anotando em `~/.sdd/explain/<tema>.html`").

Se o fork falhar, escreva inline no próximo turno e diga isso em uma linha.

## 3. Identificar o tema

Extraia do assunto **um** substantivo ou expressão curta em kebab-case: `jwt`, `backpressure`, `wal-sqlite`, `injecao-de-dependencia`.

**O tema é do assunto, não do projeto.** `auth` é um arquivo só, e a pergunta que veio do projeto A convive com a que veio do projeto B — cada seção diz de onde veio. Não crie `projeto-auth`.

Antes de criar tema novo, verifique se já existe um que cobre aquilo: com `mcp: on`, `sdd_read_explain` com `status: "todos"`; sem MCP, liste `~/.sdd/explain/`. Tema quase-igual (`jwt` e `json-web-token`) é o começo de uma base inútil.

Ambíguo de verdade → **uma** pergunta via `AskUserQuestion`, com 2-3 sugestões.

## 4. Escrever o HTML (o que o fork faz)

Caminho: `~/.sdd/explain/<tema>.html`, com `<HOME>` resolvido para caminho absoluto. Garanta o CSS em `~/.sdd/explain/assets/styles.css` (copie de `../../helpers/templates/styles.css` se faltar).

### Se não existe

Use `../../helpers/templates/explain.html.tpl`. Preencha `{{theme}}`, `{{lang}}`, `{{created}}`/`{{updated}}` (hoje), o `{{overview}}` com a resposta resumida em 1-2 frases, a primeira `<h3>` na seção `detalhes`, e a primeira `<li>` em `perguntas` — com a pergunta como o usuário fez, o timestamp e a **origem** (projeto e mudança de onde veio, ou "fora de projeto").

O `<body>` nasce com `data-status="aberto"`. É daí que o estado é lido quando o MCP está desligado: o banco é índice, o arquivo é a verdade.

### Se já existe

1. Leia o HTML.
2. Decida onde a informação nova encaixa: `<h3>` nova em `detalhes`, complemento numa `<h3>` existente, ou seção nova quando for um sub-tópico grande e paralelo.
3. **Não duplique.** Refina algo já escrito → atualize aquele bloco. Contradiz → acrescente com `<blockquote>` "Atualização (data):", preservando o histórico.
4. Acrescente a pergunta ao `<ol class="lp-questions">`, sempre com origem e data.
5. Atualize `{{updated}}`.

### Estilo da explicação

Mesma voz de uma boa aula, no tamanho de uma resposta — não a cadência de um curso:

- **Definição direta primeiro**: todo termo novo ganha "X é: …" antes de qualquer elaboração.
- **Sigla expandida na primeira menção**, entre parênteses.
- **Nada de termo no escuro**: citou algo que não vai aprofundar, dê ao menos uma glosa de uma linha.
- **Contraste quando há vizinho confundível**: o que é / o que não é, lado a lado.
- **Exemplo concreto**, com dado plausível do domínio — nunca `foo`/`bar`.
- **Erro comum associado**, quando couber no tamanho.

Código sempre em `<pre class="code"><code>`, com HTML escapado.

## 5. Fila de estudo

Todo tema nasce **`aberto`**. Só vira **`estudado`** quando o usuário disser — nada dá baixa sozinho, nem o tempo, nem o fato de você ter respondido bem.

- `/lp-explain fila` → lista os temas `aberto`, **do mais antigo para o mais novo**: o esquecido há mais tempo é o que precisa aparecer. Mostre tema, título, quantas perguntas acumulou e o resumo em uma linha.
- `/lp-explain estudei <tema>` → marca `estudado` (`data-status` no HTML e `status` no banco).
- `/lp-explain reabrir <tema>` → volta para `aberto`.

Não pergunte "quer marcar como estudado?" ao fim de cada explicação. A fila é do usuário; ela existe para ser revisitada quando ele quiser, não para ser esvaziada por cortesia.

## 6. Registro no banco (só com `mcp: on`)

Na mesma chamada do fork, `sdd_record_explain` com `slug`, `title`, `path`, `summary`, `detail` (o que a busca precisa alcançar — conceitos, contrastes, armadilhas, **não** o HTML colado), `question` e `origin`.

Marcar estudado é a mesma tool com `status: "estudado"`; ler a fila é `sdd_read_explain`.

Com `mcp: off`/ausente: escreva o HTML e siga em silêncio, sem mencionar MCP. A fila continua funcionando — ela é lida do `data-status` dos arquivos em `~/.sdd/explain/`. Ver `../../helpers/prompts/mcp-guide.md`.

## 7. Mensagem final

Depois de responder e disparar o fork, uma linha:

```
Anotando em ~/.sdd/explain/<tema>.html (tema <novo | +1 pergunta>, status: aberto).
```

E volte ao que a conversa estava fazendo. Esta skill resolve o desvio e sai de cena — ela nunca muda o rumo do trabalho principal.

## Princípios

- **Responder nunca espera a escrita.** O fork é o que garante isso.
- **Registro automático só dentro de fluxo `lp:*` ativo.** Fora dele, só se o usuário pedir.
- **Pergunta de operação não é conhecimento.** Na dúvida, não registre.
- **Um tema por assunto, não por projeto.** A origem é metadado, não parte do nome.
- **O arquivo é a verdade, o banco é índice.** Com o banco apagado, `sdd_reindex` não recupera isto — mas os HTMLs continuam lá, e o estado junto.
- Não confunda com `lp:ask`, que responde sem gravar nada, e é justamente como o usuário pede uma resposta sem rastro.
