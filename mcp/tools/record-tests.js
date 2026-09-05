'use strict';

const { SddDb } = require('../db');
const { SddRepo } = require('../repo');
const { Log } = require('../log');

/**
 * Registra o relatório do subagente tester (passo f-bis). Hoje esse relatório só
 * existe no chat e como paths em `in_review.files` — some na próxima compactação.
 */
class RecordTestsTool {
  static get definition() {
    return {
      name: 'sdd_record_tests',
      description:
        'Registra o resultado da geração de testes (passo f-bis).',
      inputSchema: {
        type: 'object',
        required: ['change_id'],
        properties: {
          change_id: { type: 'string' },
          feature_slug: { type: 'string', description: 'Feature testada' },
          chunk_id: { type: 'string', description: 'Chunk que fechou a feature, se houver' },
          runner: { type: 'string', description: 'Ex: "vitest", "pytest"' },
          passed: { type: 'integer' },
          failed: { type: 'integer' },
          coverage_pct: { type: 'number', description: '0-100, linhas da feature' },
          report: { type: 'string', description: 'Resumo do tester, com o que ele apontou' },
          files: {
            type: 'array',
            description: 'Arquivos criados',
            items: { type: 'string' }
          }
        }
      }
    };
  }

  static run(ctx, args) {
    const projectId = SddRepo.ensureProject(ctx.db, ctx.projectRoot);
    const change = SddRepo.requireChange(ctx.db, projectId, args.change_id);
    const feature = SddRepo.findFeature(ctx.db, change.id, args.feature_slug);
    const chunk = SddRepo.findChunk(ctx.db, change.id, args.chunk_id);

    const files = Array.isArray(args.files) ? args.files : [];

    const inserted = SddDb.run(
      ctx.db,
      `INSERT INTO test_runs
         (change_pk, feature_pk, chunk_pk, at, runner, passed, failed, coverage_pct, report, files)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        change.id,
        feature ? feature.id : null,
        chunk ? chunk.id : null,
        SddRepo.nowIso(),
        args.runner ?? null,
        args.passed ?? null,
        args.failed ?? null,
        args.coverage_pct ?? null,
        args.report ?? null,
        JSON.stringify(files)
      ]
    );

    Log.info('testes registrados', {
      change: args.change_id,
      feature: args.feature_slug ?? null,
      passed: args.passed ?? null,
      failed: args.failed ?? null
    });

    return { test_run_id: inserted.lastInsertRowid, files_recorded: files.length };
  }
}

module.exports = { RecordTestsTool };
