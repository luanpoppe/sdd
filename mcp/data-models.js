'use strict';

const { SddDb } = require('./db');
const { SddRepo } = require('./repo');

/** As entidades modeladas num chunk (`data_model: on`). */
class DataModelWriter {
  /**
   * Entidades modeladas. Mesma regra de substituição em bloco dos achados: campo ausente
   * não apaga o que já existe, porque a rechamada só para gravar o commit não carrega o
   * modelo junto.
   */
  static replace(db, chunkPk, entities) {
    if (!Array.isArray(entities)) return;

    SddDb.run(db, 'DELETE FROM data_models WHERE chunk_pk = ?', [chunkPk]);

    const at = SddRepo.nowIso();
    entities.forEach((entity, index) => {
      SddDb.run(
        db,
        `INSERT INTO data_models
           (chunk_pk, position, name, kind, operation, engine, shape, decisions, rejected,
            index_notes, migration, at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          chunkPk,
          index,
          entity.name,
          entity.kind,
          entity.operation ?? null,
          entity.engine ?? null,
          entity.shape ?? null,
          entity.decisions ?? null,
          entity.rejected ?? null,
          entity.index_notes ?? null,
          entity.migration ?? null,
          at
        ]
      );
    });
  }

}

module.exports = { DataModelWriter };
