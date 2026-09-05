# node-sqlite3-wasm — cópia vendorizada

Versão **0.8.60**, licença MIT (`./LICENSE`), zero dependências transitivas.
Origem: <https://www.npmjs.com/package/node-sqlite3-wasm>

## Por que está aqui em vez de em `dependencies`

O `bin/install.js` instala o SDD **copiando arquivos** para `~/.sdd/mcp/`. Ele não roda
`npm install` na máquina de quem instala, e o `package.json` do plugin tem
`dependencies: {}` justamente para isso. Uma dependência normal não chegaria ao servidor
instalado — só existiria no repositório.

Vendorizar é o que mantém o instalador como é. São dois arquivos, 1,2 MB, sem cadeia de
dependências para auditar.

## Como atualizar

```
npm pack node-sqlite3-wasm@<versão>
```

Copie `dist/node-sqlite3-wasm.js`, `dist/node-sqlite3-wasm.wasm` e `LICENSE` para cá,
atualize a versão no topo deste arquivo e rode `mcp/` contra os smokes antes de commitar.
Os dois arquivos de `dist/` andam juntos: o `.js` procura o `.wasm` ao lado dele.

## O que ele NÃO faz

**WAL.** O build WASM não tem VFS de memória compartilhada, então `PRAGMA journal_mode = WAL`
é aceito em silêncio e não muda nada — o banco fica em `delete` (rollback journal). Pior:
ele **não consegue abrir** um arquivo que já esteja marcado como WAL, e falha com
`unable to open database file`.

É por isso que existe o `../../journal.js`, que detecta o modo pelo cabeçalho do arquivo e
converte bancos antigos. Ver `../../db.js` para o resto das consequências.
