'use strict';

const { SddDb } = require('./db');
const { FileHash } = require('./file-hash');

/** Quantos arquivos candidatos sao lidos do disco numa chamada. */
const MAX_CANDIDATOS = 200;

/**
 * Arquivos cuja explicacao foi escrita contra outra versao do codigo.
 *
 * O `content_hash` gravado no `sdd_record_chunk` e o hash dos bytes daquele momento.
 * Aqui ele e recalculado e comparado: divergiu, o `does`/`connects`/`review_note`
 * daquele registro pode nao descrever mais o arquivo.
 *
 * Ate esta versao o sinal existia so na tela do SDD Viewer — um badge que ninguem
 * podia agir sobre. Trazer a lista para o agente e o que fecha o ciclo: quem mexeu no
 * arquivo e quem sabe o que o texto deveria dizer agora.
 *
 * So o projeto atual. O hash depende dos bytes em disco, e o caminho de outro projeto
 * nao existe nesta maquina de trabalho — comparar ali daria "mudou" para tudo.
 */
class StaleFiles {
  static select(db, projectId, limit) {
    const candidatos = SddDb.all(
      db,
      `SELECT c.change_id, k.chunk_id, k.status AS chunk_status, fc.path, fc.operation,
              fc.does, fc.connects, fc.review_note, fc.content_hash
         FROM file_changes fc
         JOIN chunks k ON k.id = fc.chunk_pk
         JOIN changes c ON c.id = k.change_pk
        WHERE c.project_id = ?
          AND c.archived_at IS NULL
          AND fc.content_hash IS NOT NULL
        ORDER BY k.finished_at DESC, k.id DESC, fc.review_order ASC
        LIMIT ?`,
      [projectId, MAX_CANDIDATOS]
    );

    const stale = [];

    for (const candidato of candidatos) {
      if (stale.length >= limit) break;

      const atual = FileHash.of(StaleFiles.rootOf(db, projectId), candidato.path);
      // Sem hash agora = arquivo apagado ou fora de alcance: nada a reexplicar.
      if (atual === null) continue;
      if (atual === candidato.content_hash) continue;

      stale.push({
        change_id: candidato.change_id,
        chunk_id: candidato.chunk_id,
        chunk_status: candidato.chunk_status,
        path: candidato.path,
        operation: candidato.operation,
        does: candidato.does,
        connects: candidato.connects,
        review_note: candidato.review_note
      });
    }

    return stale;
  }

  /** O caminho do projeto vem do banco, e nao do `cwd`: e ele que casa com os paths gravados. */
  static rootOf(db, projectId) {
    if (StaleFiles.rootCache && StaleFiles.rootCache.projectId === projectId) {
      return StaleFiles.rootCache.path;
    }

    const row = SddDb.one(db, 'SELECT path FROM projects WHERE id = ?', [projectId]);
    const path = row ? row.path : null;
    StaleFiles.rootCache = { projectId, path };
    return path;
  }
}

StaleFiles.rootCache = null;

module.exports = { StaleFiles };
