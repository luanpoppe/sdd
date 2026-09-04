'use strict';

const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const { Log } = require('./log');

const WINDOWS_SEPARATOR = /\\/g;
const DRIVE_LETTER = /^([A-Za-z]):/;
const TRAILING_SLASHES = /(.)\/+$/;

/**
 * Descobre e normaliza a raiz do projeto que a sessão MCP está servindo.
 *
 * O harness lança um MCP de escopo de projeto com o cwd na raiz do projeto, então
 * `process.cwd()` é a fonte primária. `SDD_PROJECT_ROOT` existe para o caso em que
 * isso não vale (execução manual, teste, harness que lança de outro diretório).
 */
class ProjectResolver {
  /**
   * Forma canônica de um caminho para gravar e comparar: barras pra frente e letra
   * de drive em minúsculo. Sem isso, `C:\repos\x` e `c:/repos/x` viram dois
   * projetos diferentes no banco — e o casamento com o workspace do SDD Viewer falha.
   */
  static normalize(rawPath) {
    const absolute = path.resolve(rawPath);
    const forwardSlashes = absolute.replace(WINDOWS_SEPARATOR, '/');
    const loweredDrive = forwardSlashes.replace(DRIVE_LETTER, (_match, drive) => `${drive.toLowerCase()}:`);
    return loweredDrive.replace(TRAILING_SLASHES, '$1');
  }

  static root() {
    const fromEnv = process.env.SDD_PROJECT_ROOT;
    const raw = fromEnv && fromEnv.trim() ? fromEnv : process.cwd();
    const normalized = ProjectResolver.normalize(raw);
    Log.debug('raiz do projeto resolvida', { raw, normalized, fromEnv: Boolean(fromEnv) });
    return normalized;
  }

  static name(projectRoot) {
    const base = path.basename(projectRoot);
    return base || projectRoot;
  }

  /** O projeto tem SDD inicializado? Só informativo — nenhuma tool depende disso. */
  static hasSdd(projectRoot) {
    const sddDir = path.join(projectRoot, '.sdd');
    return fs.existsSync(sddDir);
  }

  static homeDir() {
    return path.join(os.homedir(), '.sdd');
  }
}

module.exports = { ProjectResolver };
