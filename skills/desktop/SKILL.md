---
name: desktop
description: Abre o SDD Viewer — app desktop (Electron) opcional pra visualizar os artefatos .md/.html do lp:* (projetos, mudanças, reviews) com fast refresh, fora do chat. Se não estiver instalado, pergunta antes de instalar; se já estiver, checa atualização em paralelo. Use quando o usuário pedir "lp:desktop", "abre o dashboard", "abre o viewer", "quero ver os artefatos no app".
---

Você está abrindo o **SDD Viewer**, um app desktop separado (repo [`luanpoppe/sdd-viewer`](https://github.com/luanpoppe/sdd-viewer)) que só lê e renderiza os artefatos que o `lp:*` já gera em `.sdd/` — nenhum fluxo `lp:*` depende dele. É 100% opcional.

## 0. Checar sistema operacional

Hoje só existe instalador **Windows** (NSIS) publicado. Se o SO não for Windows, informe: *"O SDD Viewer ainda só tem instalador pra Windows. Repo: https://github.com/luanpoppe/sdd-viewer — dá pra rodar via `npm install && npm run dev` em qualquer SO."* Pare.

## 1. Checar se já está instalado

Caminho fixo (instalação por-usuário, sem admin): `%LOCALAPPDATA%\Programs\sdd-viewer\sdd-viewer.exe`.

- **Existe** → vá para a seção 2 (abrir + checar atualização).
- **Não existe** → vá para a seção 3 (perguntar antes de instalar).

## 2. Já instalado → abrir + checar atualização em paralelo

1. Abra o app **sem esperar** — dispare e já confirme ao usuário, não bloqueie no resultado da checagem de atualização:
   ```powershell
   Start-Process "$env:LOCALAPPDATA\Programs\sdd-viewer\sdd-viewer.exe"
   ```
   Confirme: *"SDD Viewer aberto. Se for a primeira vez, clica no `+` da barra lateral pra adicionar a pasta do projeto."*

2. **Em paralelo**, lance um **subagente** pra checar se há versão nova (não deixe o usuário esperando por isso — é um bônus, não bloqueia o uso do app):
   - Versão instalada: lê o registro `HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*`, acha a entrada cujo `DisplayName` começa com `sdd-viewer`, pega `DisplayVersion`.
     ```powershell
     Get-ItemProperty 'HKCU:\Software\Microsoft\Windows\CurrentVersion\Uninstall\*' -ErrorAction SilentlyContinue |
       Where-Object { $_.DisplayName -like 'sdd-viewer*' } | Select-Object -ExpandProperty DisplayVersion
     ```
   - Versão mais recente: siga "Buscar a última release" (seção 5) — só os passos 1 e 2 (não baixa nada ainda).
   - Compare as duas versões (semver simples: major.minor.patch). O subagente retorna: `instalada`, `mais_recente`, `tem_atualizacao` (bool), e a `browser_download_url` do `.exe` se houver atualização.

3. Quando o subagente retornar:
   - **Sem atualização** → não precisa dizer nada (app já está aberto e é a última versão).
   - **Com atualização** → `AskUserQuestion`:
     > "SDD Viewer tem atualização disponível (`<instalada>` → `<mais_recente>`). Quer instalar agora?"
     > - Instalar agora (Recomendado)
     > - Não, obrigado
     - **Não** → pare.
     - **Sim** → baixe o `.exe` da `browser_download_url` retornada pelo subagente e siga os passos 3-4 de "Instalar silenciosamente" (seção 5). Depois avise: *"Atualizado pra `<mais_recente>`. Fecha e abre o SDD Viewer de novo pra usar a versão nova."* (o Electron não troca o binário em execução sozinho — não precisa fechar a instância aberta por você, só avisar).

## 3. Não instalado → perguntar

Use `AskUserQuestion`:

> "O SDD Viewer (app opcional pra visualizar os artefatos do SDD fora do chat) não está instalado. Quer instalar agora?"
> - Instalar agora (Recomendado)
> - Não, obrigado

- **Não** → pare, sem instalar nada.
- **Sim** → vá para a seção 4.

## 4. Instalar pela primeira vez

1. Busque a última release (seção 5, passos 1-2).
2. Baixe o `.exe` e instale silenciosamente (seção 5, passos 3-4).
3. Confirme que `%LOCALAPPDATA%\Programs\sdd-viewer\sdd-viewer.exe` existe.
4. Abra o app (seção 2, passo 1) e informe: *"SDD Viewer instalado e aberto. Repo: https://github.com/luanpoppe/sdd-viewer"*

## 5. Buscar a última release / instalar silenciosamente (rotina reutilizada acima)

1. `GET https://api.github.com/repos/luanpoppe/sdd-viewer/releases/latest` — API pública, sem auth (repo é público).
2. No JSON: `tag_name` (prefixo `v` removido) é a versão mais recente; ache em `assets` o item cujo nome termina em `.exe` e pegue sua `browser_download_url`.
3. Baixe esse `.exe` pra uma pasta temporária.
4. Rode **em modo silencioso** — `<instalador> /S`. **Nunca rode sem `/S`**: o instalador tem wizard (Next/Instalar) que exige clique, e o agente não consegue interagir com a janela — ficaria travado esperando o usuário clicar em algo que ele nem vê. Instalação por-usuário, não pede elevação/UAC.

## Princípios

- **Nunca instala/atualiza sem perguntar primeiro.**
- **Sempre silencioso (`/S`)** ao instalar/atualizar — o agente não clica em wizards.
- **Checagem de atualização nunca bloqueia o uso do app.** Roda em paralelo (subagente), o app já abriu antes do resultado voltar.
- **100% opcional.** Nenhum fluxo `lp:*` (new/continue/bug-fix/review/context/...) depende do SDD Viewer estar instalado, atualizado ou aberto.
- **Só Windows por enquanto.** Outros SOs: informe e aponte pro repo (rodar via `npm run dev`).
