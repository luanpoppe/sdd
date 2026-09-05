'use strict';

const { SddDb } = require('./db');

/**
 * Bloco volátil do `.sdd.yaml` guardado no banco, para `state_storage: mcp`.
 *
 * Junto com o `./tasks-store.js`, este é o único ponto do sistema em que o banco
 * deixa de ser índice derivado e vira fonte de verdade. Aqui isso vale só para os
 * campos que mudam a cada passo — `state`, `current_feature`, `current_chunk`,
 * `in_review`, `updated` e o `status` de cada feature. A identidade da mudança
 * (`id`, `title`, `created`, `format`, `lang`, `chunk_size` e a lista ordenada de
 * features) continua no arquivo, versionada, em qualquer modo.
 *
 * Semântica de escrita: campo presente no payload é gravado, inclusive quando vem
 * `null`; campo ausente é preservado. Sem essa distinção seria impossível limpar o
 * `current_chunk` ao fechar uma feature, porque `null` e "não mandei" se confundiriam.
 */
class StateStore {
  /** Colunas de `changes` que este store governa. Nome no payload = nome na coluna. */
  static get COLUMNS() {
    return ['state', 'current_feature', 'current_chunk', 'in_review'];
  }

  static write(db, changePk, args) {
    const assignments = [];
    const params = [];

    for (const column of StateStore.COLUMNS) {
      if (!(column in args)) continue;
      assignments.push(`${column} = ?`);
      params.push(StateStore.serialize(column, args[column]));
    }

    // `updated` acompanha qualquer escrita: no modo mcp não há mais o campo do
    // arquivo para dizer quando a mudança mexeu pela última vez.
    assignments.push('updated_at = ?');
    params.push(args.updated ?? new Date().toISOString());

    params.push(changePk);
    SddDb.run(db, `UPDATE changes SET ${assignments.join(', ')} WHERE id = ?`, params);

    return StateStore.writeFeatureStatuses(db, changePk, args.features);
  }

  /**
   * Só o `status` — título, resumo e ordem das features continuam vindo do
   * `sdd_sync_change`, que espelha a lista do arquivo.
   */
  static writeFeatureStatuses(db, changePk, features) {
    const list = Array.isArray(features) ? features : [];

    for (const feature of list) {
      if (!feature || !feature.slug) continue;
      SddDb.run(db, 'UPDATE features SET status = ? WHERE change_pk = ? AND slug = ?', [
        feature.status ?? null,
        changePk,
        feature.slug
      ]);
    }

    return list.length;
  }

  static serialize(column, value) {
    if (value === null || value === undefined) return null;
    if (column !== 'in_review') return String(value);
    return typeof value === 'string' ? value : JSON.stringify(value);
  }

  static read(db, changePk) {
    const row = SddDb.one(
      db,
      `SELECT change_id, kind, title, state, current_feature, current_chunk, in_review, updated_at
         FROM changes WHERE id = ?`,
      [changePk]
    );
    if (!row) return null;

    return {
      change_id: row.change_id,
      kind: row.kind,
      title: row.title,
      state: row.state,
      current_feature: row.current_feature,
      current_chunk: row.current_chunk,
      in_review: StateStore.parseInReview(row.in_review),
      updated: row.updated_at,
      features: StateStore.readFeatureStatuses(db, changePk)
    };
  }

  /**
   * Devolve objeto, não a string crua: quem chama precisa da lista de arquivos em
   * ordem, e receber JSON escapado obrigaria o agente a parsear texto na resposta.
   */
  static parseInReview(raw) {
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return raw;
    }
  }

  static readFeatureStatuses(db, changePk) {
    return SddDb.all(
      db,
      'SELECT slug, title, status FROM features WHERE change_pk = ? ORDER BY position, id',
      [changePk]
    );
  }
}

module.exports = { StateStore };
