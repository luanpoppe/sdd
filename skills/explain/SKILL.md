---
name: explain
description: Cria ou atualiza um HTML acumulativo de explicação por tema na mudança ativa do SDD `lp:*`. Identifica o tema da pergunta e posiciona a resposta na seção apropriada do `.sdd/changes/<id>/explain/<tema>.html`. Use quando o usuário pedir "lp:explain <pergunta>" ou quiser registrar uma explicação que valha persistir.
---

Você está registrando uma explicação persistente sobre um tema da mudança ativa.

## 1. Coleta

- Identifique a mudança ativa. Se não houver: diga "Sem mudança ativa. Use `/lp-new` primeiro." e pare.
- Leia `.sdd/config.yaml` para idioma e formato. **Observação**: `lp:explain` SEMPRE gera HTML, mesmo se `format == md` — esse é o ponto da skill. Se o CSS global não existir em `.sdd/assets/styles.css`, copie de `../../helpers/templates/styles.css`.

## 2. Identificar o tema

Da pergunta do usuário, extraia 1 substantivo/expressão curta em kebab-case (`auth`, `vector-search`, `rate-limit`, `websocket-flow`).

Se ambíguo, pergunte ao usuário **uma vez** qual tema usar (com 2-3 sugestões via `AskUserQuestion`).

## 3. Criar ou atualizar

Caminho: `.sdd/changes/<id>/explain/<tema>.html`.

### Se não existe

Use `../../helpers/templates/explain.html.tpl`. Preencha:
- `{{change_id}}`, `{{theme}}`, `{{lang}}`, `{{created}}`, `{{updated}}` (hoje em ambos).
- `{{overview}}` com a primeira resposta resumida em 1-2 frases.
- Na seção `data-section="detalhes"`, adicione uma `<h3>` com sub-tópico extraído da pergunta + parágrafo de resposta.
- Em `data-section="perguntas"`, adicione `<li>` com a pergunta original e timestamp ISO.

### Se já existe

1. Leia o HTML.
2. Decida onde a nova info se encaixa: nova `<h3>` em `detalhes`, append em uma `<h3>` existente, ou nova seção `data-section="..."` se for um tópico paralelo grande.
3. **Não duplique** info já presente. Se a pergunta refina algo existente, atualize aquele bloco; se contradiz, adicione com `<blockquote>` "Atualização (<data>):" para preservar histórico.
4. Sempre adicione a pergunta nova ao `<ol class="lp-questions">`.
5. Atualize `{{updated}}` no header.

## 4. Mensagem final

```
Atualizado: .sdd/changes/<id>/explain/<tema>.html
Mudanças: <"criado" | "+1 sub-tópico em detalhes" | "+1 pergunta registrada" | etc>
Abra no navegador para revisar.
```

## Princípios

- Reuse o CSS global. Nunca inline styles.
- Mantenha o HTML escaneável (h2 → seção, h3 → sub-tópico).
- Foque no que o leitor precisa entender, não em narrar o histórico do projeto.
- Se a pergunta é ambígua mesmo após 1 grill, responda no chat E peça refinamento antes de gravar.
