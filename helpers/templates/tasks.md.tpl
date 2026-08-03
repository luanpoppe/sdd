# Tasks: {{feature_slug}}

> Parte de [`{{change_id}}`](../../plan.md) · spec: [`spec.md`](spec.md)
> `lp:continue` executa UM chunk por vez (respeitando `chunk_size` do `.sdd/config.yaml`) e termina com plano de revisão.

## Convenções

- `[ ]` pendente · `[x]` concluído · `[~]` em revisão pelo usuário
- IDs: `F<n>.C<m>` (n = índice da feature na lista do `plan.md`; m = chunk dentro da feature).

## Chunks

### F<n>.C1 — {{chunk_1_title}}

Metadados (bullets, não checkboxes):
- **Arquivos**: `{{file_1}}`, `{{file_2}}`
- **Depende de**: nenhum   <!-- IDs de chunks que precisam vir antes (ex: F1.C1) ou "nenhum". Usado pelo modo paralelo. -->
- **Ordem de revisão**: 1) `{{file_1}}` (define o contrato) → 2) `{{file_2}}` (consome)

Passos (checkboxes — marcados `[~]` ao implementar):
- [ ] **Faz**: {{chunk_1_summary}}
- [ ] **Validação**: `{{validation_cmd}}`   <!-- comando de lint/format/test do PROJETO (ver CLAUDE.md/config); ex JS: `npx eslint --fix ...` · Java: `mvn -q compile` · Python: `ruff check --fix ...`. Não assuma eslint. -->

<!-- Chunk = este bloco ### F<n>.C<m>. Está "concluído" quando os checkboxes Faz+Validação estão [~]/[x]. -->


### F<n>.C2 — ...

<!--
Princípios:
- Na dúvida, parte um chunk em dois.
- Cada chunk DEVE ser revisável em < 5 minutos.
- Não agrupar arquivos não relacionados só para "fechar" um chunk.
- O conjunto de chunks aqui cobre APENAS esta feature. Outras features têm seus próprios tasks.md em specs/<outra>/tasks.md (criados sob demanda).
-->
