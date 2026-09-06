'use strict';

const fs = require('node:fs');
const path = require('node:path');

const MARKER = path.join(__dirname, '.lp-version.json');

/**
 * A versão do servidor que está em memória, contra a que está no disco.
 *
 * Por que isto existe: o servidor MCP é um processo longo, iniciado junto com a sessão,
 * e o Node cacheia módulo em `require`. Um `lp:auto-update` troca os arquivos de
 * `~/.sdd/mcp/` e **não** recarrega o processo — então uma sessão aberta continua
 * rodando o código antigo por horas, sem nenhum sinal.
 *
 * Isso já custou dado real: uma correção de perda de relatório por arquivo foi publicada
 * e as sessões abertas seguiram apagando, porque o servidor delas era anterior ao
 * conserto. O aviso não conserta nada sozinho — mas transforma "de vez em quando perco
 * informação" em "reinicie a sessão".
 */
class ServerVersion {
  /** Lido uma vez, na carga do módulo: é a versão que este processo está executando. */
  static loaded = ServerVersion.read();

  static read() {
    try {
      const raw = fs.readFileSync(MARKER, 'utf-8');
      const parsed = JSON.parse(raw);
      return typeof parsed.version === 'string' ? parsed.version : null;
    } catch {
      return null;
    }
  }

  /** `true` quando o disco já tem uma versão diferente da que este processo carregou. */
  static isStale() {
    const onDisk = ServerVersion.read();
    if (!onDisk || !ServerVersion.loaded) return false;
    return onDisk !== ServerVersion.loaded;
  }

  /**
   * O par para devolver em resposta de tool. `null` em `stale_warning` é o caso normal,
   * e a ausência de aviso é o que mantém a resposta curta quando não há nada a dizer.
   */
  static status() {
    if (!ServerVersion.isStale()) {
      return { server_version: ServerVersion.loaded, stale_warning: null };
    }

    return {
      server_version: ServerVersion.loaded,
      stale_warning:
        `O servidor MCP em execução é a versão ${ServerVersion.loaded}, e o disco já está ` +
        `na ${ServerVersion.read()}. Ele não recarrega sozinho: reinicie a sessão para o ` +
        `SDD passar a usar a versão nova. Avise isto ao usuário em UMA linha, uma vez.`
    };
  }
}

module.exports = { ServerVersion };
