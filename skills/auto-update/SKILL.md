---
name: auto-update
description: Verifica e atualiza as skills lp:* para a versão mais recente publicada no GitHub público (luanpoppe/sdd). Use quando o usuário pedir "lp:auto-update", "atualizar o lp", "tem versão nova do sdd?", ou periodicamente para garantir que está na última versão.
---

Você está checando/atualizando a instalação do plugin `lp:*` a partir do repositório público `github.com/luanpoppe/sdd`.

## 1. Rode o installer

Execute via Bash (ou PowerShell, conforme o SO):

```
npx -y github:luanpoppe/sdd --tool=all
```

- `npx github:luanpoppe/sdd` sempre clona o HEAD atual do branch padrão do repo público — não há cache de versão antiga para limpar. (Para fixar um branch: `github:luanpoppe/sdd#main`. **Não** use `@latest` — não é sintaxe válida de spec `github:`.)
- `--tool=all` detecta `~/.claude` e `~/.cursor` e atualiza os que existirem. Se o usuário só usa uma ferramenta, use `--tool=claude` ou `--tool=cursor`.
- Se quiser só checar sem escrever nada, rode primeiro com `--dry-run`.

## 2. Leia a saída e reporte

O installer já compara a versão instalada (lida do marcador `.lp-version.json` em `lp-shared/` ou `lp-helpers/`) com a versão do pacote que acabou de baixar, e imprime uma das três:

- `(nenhuma instalação anterior encontrada — instalando do zero)`
- `já está na versão mais recente (vX)`
- `atualizando: vX → vY`

Reporte ao usuário exatamente qual dessas ocorreu, por alvo (Claude/Cursor podem estar em versões diferentes se um não foi atualizado há mais tempo).

## 3. Se der erro

- **Sem internet / GitHub inacessível**: informe o usuário e não prossiga.
- **`npx` não encontrado**: Node.js não está instalado — avise e pare (não instale Node automaticamente).
- **Permissão negada ao escrever em `~/.claude` ou `~/.cursor`**: reporte o path exato que falhou.

## Princípios

- **Nunca edite manualmente** os arquivos instalados (`~/.claude/skills/lp-*`, `~/.cursor/commands/lp-*.md`) para "consertar" algo — a fonte da verdade é sempre o repositório GitHub. Qualquer correção deve ser feita lá (ou reportada como issue), nunca localmente, senão o próximo `lp:auto-update` sobrescreve a mudança.
- **Idempotente**: rodar de novo quando já está atualizado não quebra nada, só reimprime "já está na versão mais recente".
