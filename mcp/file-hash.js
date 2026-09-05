'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const HASH_LENGTH = 16;

/**
 * Hash do conteúdo de um arquivo do projeto, gravado junto da explicação.
 *
 * Serve para o SDD Viewer detectar depois que a explicação foi escrita contra outra
 * versão do código — explicação errada com cara de confiável é pior que explicação
 * nenhuma.
 *
 * É calculado AQUI, no servidor, e não pedido ao agente de propósito: o viewer
 * precisa recalcular o mesmo hash para comparar, e qualquer divergência de método
 * (quebra de linha, encoding, algoritmo) marcaria todo arquivo como desatualizado.
 * Com os dois lados lendo os bytes crus do disco, a comparação é confiável.
 *
 * O SDD Viewer replica esta função em `src/main/fileHash.ts` — mudar uma exige mudar
 * a outra.
 */
class FileHash {
  static of(projectRoot, relativePath) {
    try {
      const absolute = path.resolve(projectRoot, relativePath);
      const bytes = fs.readFileSync(absolute);
      return crypto.createHash('sha256').update(bytes).digest('hex').slice(0, HASH_LENGTH);
    } catch {
      // Arquivo apagado, fora do projeto ou sem permissão: sem hash, sem alarme falso.
      return null;
    }
  }
}

module.exports = { FileHash, HASH_LENGTH };
