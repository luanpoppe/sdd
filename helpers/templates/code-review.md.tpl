# Critérios extras de code review

<!--
Este arquivo ACRESCENTA ao checklist padrão do revisor (corretude, borda, contrato
divergente da spec, erro engolido, vazamento, concorrência, segurança). Ele não
substitui o checklist — ver helpers/prompts/code-review-guide.md.

Existe em dois lugares, e os dois são lidos e somados:
- ~/.sdd/code-review.md   → o que VOCÊ sempre quer checado, em qualquer projeto
- .sdd/code-review.md     → o que ESTE repositório exige (versionado, o time herda)

Em conflito direto, o do projeto vence.

Escreva critério verificável, com o cenário de falha que ele previne. "Cuidado com
performance" não é critério: o revisor não consegue transformar isso em achado com
entrada concreta, e vira ruído.
-->

## O que sempre verificar

- <critério em uma linha>
  - **Por quê**: <o que quebra quando ninguém verifica isso>
  - **Exemplo**: <um caso real onde isso mordeu>

## Armadilhas conhecidas desta stack

<!--
Coisas que o revisor não tem como deduzir do código: comportamento surpreendente de
uma lib, limitação da infra, decisão antiga que parece bug e não é.
-->

- <armadilha em uma linha>

## Ignorar

<!--
Uma linha por item do checklist padrão que NÃO se aplica aqui, sempre com o motivo.
O revisor desliga só o que estiver escrito, e avisa em uma linha quando um item
desligado teria produzido achado grave.

Itens desligáveis: corretude · borda · contrato · erro-engolido · recurso ·
concorrência · segurança
-->

- Ignore: <item> — <motivo>
