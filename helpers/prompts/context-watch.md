# Context watch — anti-degradação de conversas longas

Conversas longas degradam qualidade (perda de fidelidade), aumentam custo (mais tokens lidos a cada turn) e atrasam respostas. Esta instrução é referenciada por `lp-continue` para decidir quando sugerir/executar compactação.

## Heurística de detecção (subjetiva)

Ao final do plano de revisão de cada chunk implementado, **faça uma autoavaliação subjetiva** combinando estes sinais:

- **Quantos chunks já foram implementados nesta MESMA conversa?** (não a vida toda da mudança — só desde o último handoff/compact)
- **Quantas mensagens já trocamos no histórico?**
- **Quanto contexto foi lido nesta conversa?** (specs grandes, vários arquivos do código, vários explain HTMLs)
- **A conversa está ficando lenta ou repetitiva?**

Regra de bolso: **entre 5 e 10 chunks implementados** é a faixa onde geralmente vale começar a observar. Não é gatilho fixo — use julgamento. Pode ser antes (se cada chunk leu muito código) ou depois (se foram chunks leves e isolados).

Quando seu julgamento disser *"esta conversa está pesada"* → dispare o protocolo abaixo.

## Protocolo (depende de `context_watch` no `.sdd/config.yaml`)

### `context_watch: off`
Não faça nada. O usuário gerencia.

### `context_watch: suggest` (default)
1. Verifique se o ambiente tem comando nativo de compactação. Sinais:
   - Existe skill/command visível chamado `compact`, `summarize`, `condense`, `/compact`, ou similar?
2. Se SIM: ao final do plano de revisão, adicione uma linha:
   > ⚠ Conversa longa (~N chunks). Considere `/<comando-de-compact-detectado>` para liberar contexto.
3. Se NÃO: ao final do plano de revisão, adicione:
   > ⚠ Conversa longa (~N chunks). Nenhum comando de compactação detectado. Posso gerar um **resumo de handoff** para você começar uma conversa nova — peça "gera o handoff" se quiser.

**Não compacte nem gere handoff sem o usuário pedir.** Só sugira.

### `context_watch: auto`
1. Verifique comando nativo (mesma busca acima).
2. Se SIM: invoque o comando de compactação direto após o plano de revisão. Informe: *"Conversa longa — executei `/<comando>` para liberar contexto."*
3. Se NÃO: gere automaticamente o **resumo de handoff** (formato abaixo), avise o usuário, e termine o turno. O usuário usa esse resumo para começar uma conversa nova.

## Formato do resumo de handoff (quando precisar gerar manualmente)

Imprima entre delimitadores claros para o usuário copiar:

```
=== HANDOFF — copie e cole no início da próxima conversa ===

## Contexto da mudança
- Mudança ativa: <id> (<title>)
- Estado: <state>  ·  Feature ativa: <slug> (<i>/<total>)
- Localização: <projeto>/.sdd/changes/<id>/

## O que já foi feito nesta conversa
- Chunks concluídos: F<n>.C<m>, F<n>.C<m+1>, ... (resumo de 1 linha de cada)
- Decisões importantes tomadas no caminho (não óbvias do plan.md/specs)

## Memória relevante
- (cite as 2-4 entradas mais relevantes de .sdd/memory.md para o trabalho atual)

## Próximo passo concreto
- Rode `/lp-continue` para o chunk F<n>.C<m+1>.
- Foco: <1 frase do que falta>.

## Como retomar
1. Comece nova conversa.
2. Cole este bloco como primeira mensagem para que eu tenha o contexto.
3. Em seguida, rode `/lp-continue`.

=== FIM DO HANDOFF ===
```

O resumo deve ser **direto e enxuto** — não duplique conteúdo que está em `plan.md`/`specs/`/`memory.md` (esses arquivos serão lidos automaticamente pela próxima conversa). Foque no que aconteceu NESTE turno/conversa que não está documentado.

## Anti-padrões

- ❌ Disparar com 2 chunks. Muito cedo, vira ruído.
- ❌ Disparar a cada chunk depois do limite. Uma vez por conversa basta — se o usuário ignorou, ele tem motivo.
- ❌ Gerar resumo gigante. Se passar de ~30 linhas, está duplicando algo que já está em arquivo.
- ❌ Em `auto`, compactar sem avisar. Sempre informe que foi compactado.
