# HTML render guide — o espelho `.html` sai de código, não do agente

Com `format: html` ou `format: both`, todo artefato espelho tem uma versão `.html`. Ela **não é escrita por você**: um conversor determinístico lê o `.md` e gera o HTML.

O motivo é custo. Escrever o mesmo documento duas vezes gastava tokens sem nenhuma decisão nova na segunda — só reformatação do que já estava decidido. Pior: o HTML escrito à mão saía **resumido**, e o espelho passava a dizer menos que a fonte.

## O comando

```
node <HOME>/.sdd/render/html.js <caminho do .md>
```

- Um ou mais caminhos por chamada. Escreve o `.html` ao lado do `.md`.
- `--all [raiz]` regenera **todos** os espelhos abaixo da raiz (padrão: diretório atual).
- Sai com código diferente de zero se algum arquivo falhar.

Resolva `<HOME>` para caminho absoluto. O conversor é instalado sempre, junto do plugin.

## Os cinco espelhos

| Artefato | Gerado por código | Observação |
|---|---|---|
| `plan.md` | sim | |
| `spec.md` | sim | seção condicional entra sozinha, porque ela existe (ou não) no `.md` |
| `tasks.md` | sim | cada `###` de chunk vira bloco com `data-chunk` e `data-status` |
| `diagnosis.md` | sim | |
| `solutions.md` | sim | |
| `flow.html` | **não** | não tem `.md` de origem — é diagrama, e segue o `./flowchart-guide.md` |
| `explain.html` | **não** | o HTML **é** a fonte: o `data-status` da fila mora nele |
| `walkthrough.html` | **não** | montado pelo `lp:review-walkthrough` |

## Quando rodar

**No mesmo passo em que o `.md` é gravado**, logo depois da escrita. O `.html` nasce junto, como sempre nasceu — nada muda para quem revisa.

Vale em todo ponto que gera espelho: `lp:new-feature` (plan), `lp:continue` (spec, tasks), `lp:bug-fix` (diagnosis, solutions) e o `g-ter`, quando a spec é editada.

> **A chamada é do agente principal, não do escriba.** Rodar um comando não é escrita de arquivo em `.sdd/`, então não passa pelo pacote do escriba — mesma regra das tools MCP. Ver `./scribe-guide.md`.

## Fallback: você escreve, como antes

Se o comando falhar — node ausente, script não instalado, erro de execução —, **escreva o HTML à mão** a partir do `.tpl` correspondente em `../templates/`, exatamente como era feito antes, e diga em **uma linha**:

```
Nota: spec.html escrito à mão — o conversor não rodou (node não encontrado).
```

Uma linha, uma vez por turno. Nunca trave o passo, nunca peça para o usuário instalar nada, nunca deixe o artefato pela metade. `format: both` continua entregando os dois arquivos em qualquer máquina.

## O que o conversor entende

Cabeçalho, lista (aninhada, com checkbox), bloco de código, tabela, citação, régua, ênfase, `código` e link. Linha que ele não reconhece vira parágrafo escapado — perde formatação, nunca some.

Duas consequências que valem saber:

- **Comentário HTML é descartado.** Nos templates ele é instrução para você, não conteúdo para o leitor.
- **Link para artefato irmão vira `.html`.** No `.md` o alvo é `plan.md`, e está certo lá; no espelho, seguir para o markdown tiraria o leitor da versão que ele escolheu ler.

Isso muda o que você escreve no `.md`: nada. O markdown continua sendo o de sempre — só não invente sintaxe exótica esperando que o espelho a reproduza.

## Regenerar em lote

`--all` serve para quando o **template** muda e os HTML já gerados ficam para trás. É a resposta para o problema antigo de "copie o CSS se faltar, nunca atualize".

- Rode com o usuário sabendo: ele reescreve arquivos versionados, e o diff aparece no `git status` do projeto.
- **Não toca no `styles.css`.** As cores podem ter sido customizadas no `lp:init`, e sobrescrever destruiria isso.
- O `.md` manda: o que estiver desatualizado no `.md` continua desatualizado no espelho.

## Anti-padrões

- ❌ **Escrever o HTML à mão com o conversor disponível.** É o custo que este guia existe para eliminar.
- ❌ **Resumir o conteúdo no espelho.** Não se aplica mais — mas era o sintoma antigo, e é o que o conversor conserta.
- ❌ **Rodar `--all` por conta própria em projeto do usuário.** Regeneração em massa é decisão dele; um arquivo por vez é rotina.
- ❌ **Delegar a chamada ao escriba.** Comando não é escrita de arquivo.
- ❌ **Bloquear o passo porque o conversor falhou.** Escreva à mão e siga.
