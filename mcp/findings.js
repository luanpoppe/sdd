'use strict';

const { SddDb } = require('./db');
const { SddRepo } = require('./repo');

/**
 * Os achados do code review de um chunk.
 *
 * Fica fora da tool porque achado tem ciclo de vida proprio — nasce aberto e fecha
 * corrigido, descartado ou adiado —, e essa regra nao pertence a quem grava o chunk.
 */
class FindingsWriter {
  /**
   * Achados do code review, com upsert por `path` + `title`.
   *
   * A identidade não é a linha: corrigir o arquivo move as linhas, e um achado que
   * mudou de linha é o MESMO achado — chaveá-lo por linha criaria uma duplicata a cada
   * correção e o `status` do original nunca seria fechado.
   *
   * Campo ausente preserva, `drop: true` remove, e o campo ausente mais importante é o
   * `status`: regravar o chunk depois de um ajuste não pode reabrir um achado que você
   * já tinha marcado como descartado.
   */
  static merge(db, chunkPk, findings) {
    if (!Array.isArray(findings)) return;

    findings.forEach((finding, index) => {
      const chave = [chunkPk, finding.path ?? '', finding.title];
      const anterior = SddDb.one(
        db,
        `SELECT * FROM review_findings
          WHERE chunk_pk = ? AND COALESCE(path, '') = ? AND title = ?`,
        chave
      );

      if (finding.drop === true) {
        if (anterior) SddDb.run(db, 'DELETE FROM review_findings WHERE id = ?', [anterior.id]);
        return;
      }

      FindingsWriter.writeFinding(db, chunkPk, finding, index, anterior);
    });
  }

  static writeFinding(db, chunkPk, finding, index, anterior) {
    const mantem = (recebido, coluna) => {
      if (recebido === undefined || recebido === null) return anterior ? anterior[coluna] : null;
      return recebido;
    };

    const status = finding.status ?? (anterior ? anterior.status : 'aberto');
    // A data do desfecho é gravada no momento em que ele chega, e nunca reescrita depois:
    // saber QUANDO um achado foi fechado é metade do valor de saber que foi.
    const mudouDeStatus = anterior ? anterior.status !== status : status !== 'aberto';
    const resolvedAt =
      status === 'aberto' ? null : mudouDeStatus ? SddRepo.nowIso() : anterior.resolved_at;

    const valores = [
      finding.severity,
      finding.path ?? (anterior ? anterior.path : null),
      Number.isInteger(finding.line) ? finding.line : anterior ? anterior.line : null,
      mantem(finding.scenario, 'scenario'),
      mantem(finding.cause, 'cause'),
      mantem(finding.suggestion, 'suggestion'),
      finding.scope ?? (anterior ? anterior.scope : 'chunk'),
      status,
      mantem(finding.resolution, 'resolution'),
      resolvedAt
    ];

    if (anterior) {
      SddDb.run(
        db,
        `UPDATE review_findings
            SET severity = ?, path = ?, line = ?, scenario = ?, cause = ?, suggestion = ?,
                scope = ?, status = ?, resolution = ?, resolved_at = ?
          WHERE id = ?`,
        [...valores, anterior.id]
      );
      return;
    }

    SddDb.run(
      db,
      `INSERT INTO review_findings
         (chunk_pk, position, title, at, severity, path, line, scenario, cause, suggestion,
          scope, status, resolution, resolved_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [chunkPk, index, finding.title, SddRepo.nowIso(), ...valores]
    );
  }

}

module.exports = { FindingsWriter };
