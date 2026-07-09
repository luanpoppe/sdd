---
name: memory
description: Gerencia a memória do SDD `lp:*` (`.sdd/memory.md` ou `.sdd/memory/` + `memory-map.md`). Sem argumentos, pergunta ao usuário o que quer fazer (revisar, validar, editar, dividir, mesclar). Com argumentos, segue a instrução do usuário. Use quando o usuário pedir "lp:memory", "ver minhas memórias", "limpar memória", "editar memória", "dividir memória", ou similar.
---

Você está gerenciando a memória do SDD. Siga `../../helpers/prompts/memory-guide.md` para regras de estrutura e classificação.

## 1. Pré-checagem

- Se `.sdd/config.yaml` não existir → "SDD não inicializado. Rode `/lp-init` primeiro." Pare.
- Carregue a memória:
  - Se existir `.sdd/memory.md` → leia inteiro.
  - Se existir `.sdd/memory-map.md` → leia o índice e todos os arquivos de tema referenciados.
  - Se nenhum existir → diga "Sem memória registrada ainda. Ela é criada automaticamente pelo `/lp-continue` quando você corrige ou indica preferências." e pare.

## 2. Decidir o modo

### Modo A — invocação SEM argumentos (`/lp-memory`)

Pergunte ao usuário o que ele quer fazer. Use `AskUserQuestion` com opções:

1. **Revisar** — mostra resumo estruturado da memória atual (contagens, últimas entradas, talvez duplicatas suspeitas).
2. **Validar / limpar** — busca duplicatas, entradas vagas ou potencialmente obsoletas, e propõe ações.
3. **Editar** — pergunta qual entrada editar e guia a alteração.
4. **Remover** — pergunta qual entrada remover e confirma.
5. **Dividir** (split) — força criação de `.sdd/memory/<tema>.md` + `memory-map.md` mesmo antes das 150 linhas.
6. **Mesclar** (merge) — junta de volta `.sdd/memory/*` em um único `.sdd/memory.md` (só faz sentido se já estava dividido).

Após resposta, execute o modo correspondente (ver seção 3).

### Modo B — invocação COM argumento (`/lp-memory <instrução>`)

Interprete a instrução em linguagem natural. Exemplos:
- "revisar" / "mostrar" / "listar" → modo Revisar.
- "limpar" / "validar" / "tem duplicata?" → modo Validar/limpar.
- "edita a entrada sobre logs" / "muda X" → modo Editar (localize a entrada referenciada).
- "remove a entrada sobre Y" / "apaga X" → modo Remover.
- "dividir" / "split" → modo Dividir.
- "juntar" / "merge" → modo Mesclar.
- "adiciona: <texto>" → modo Adicionar manual (Estilo/Processo ou Stack/Domínio — pergunte qual se ambíguo).

Se a instrução não casar com nenhum modo, faça uma pergunta curta para esclarecer.

## 3. Execução por modo

### Revisar

Imprima resumo conciso (≤ 30 linhas):

```
Memória do SDD (.sdd/memory.md OU .sdd/memory-map.md + N arquivos)
Total: X entradas em Estilo/Processo · Y entradas em Stack/Domínio

Últimas 5 entradas:
- [Estilo · 2026-06-14] <resumo>
- [Stack  · 2026-06-12] <resumo>
- ...

Possíveis duplicatas detectadas: <N> (rode /lp-memory limpar para revisar)
Tamanho atual: <linhas>/150 (auto-split em <150)
```

NÃO mostre a memória inteira. Quem quer ver o conteúdo bruto abre o arquivo.

### Validar / limpar

1. **Duplicatas**: entradas com texto muito similar (semântica equivalente, mesma categoria). Liste cada grupo e proponha qual manter ou como mesclar.
2. **Vagas**: entradas curtas demais ou sem **Quando**/**Por quê** (quando aplicável). Proponha refinar ou remover.
3. **Possivelmente obsoletas**: entradas com data > 6 meses E sem reforço posterior (não citadas em mudanças recentes). Proponha revisar — não deletar automaticamente.

Para cada proposta, peça `OK` antes de aplicar. Aplique em lote ao final.

### Editar

1. Se a entrada-alvo não está clara, peça ao usuário identificar (1 pergunta com 2-3 opções mais prováveis ou peça keyword).
2. Mostre a entrada atual.
3. Pergunte o que mudar (texto, Quando, Por quê, ou recategorizar Estilo ↔ Stack).
4. Aplique e mostre o diff.

### Remover

1. Identifique a entrada (peça se ambíguo).
2. Mostre entrada + peça confirmação explícita.
3. Após `OK`, remova e mostre o diff.

### Dividir (split forçado)

Executa o procedimento de auto-split de `memory-guide.md`:
1. Crie `.sdd/memory/<tema>.md` agrupando semanticamente.
2. Crie `.sdd/memory-map.md`.
3. Renomeie o antigo `memory.md` para `memory.md.archived`.
4. Mostre resumo dos arquivos criados.

### Mesclar (merge)

1. Combine todos `.sdd/memory/*.md` em um único `.sdd/memory.md` (preserve seções Estilo/Stack, ordene por data desc dentro de cada).
2. Renomeie `.sdd/memory/` para `.sdd/memory.archived/` e `.sdd/memory-map.md` para `.sdd/memory-map.md.archived`.
3. Mostre resumo.

### Adicionar manual

1. Classifique (Estilo/Processo ou Stack/Domínio) — pergunte se ambíguo.
2. Verifique duplicação. Se já existe parecido, sugira atualizar em vez de criar.
3. Append na seção correta. Mostre o diff.

## 4. Plano de revisão final

Sempre termine com:

```
Alterações aplicadas em memória:
- <ação 1>
- <ação 2>
Arquivo(s) tocado(s): <caminho(s)>
```

## Princípios

- Não edite a memória sem confirmação do usuário (exceto split/merge se foi explicitamente pedido).
- Use `AskUserQuestion` para opções; nunca uma rajada de perguntas.
- Trate `memory.md.archived` e `memory.archived/` como histórico — não modifique nem delete.
