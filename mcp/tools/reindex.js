'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { SddDb } = require('../db');
const { SddRepo } = require('../repo');
const { Log } = require('../log');

const CHUNK_HEADING = /^###\s+((?:F\d+\.)?C\d+)\s*(?:—|-)?\s*(.*)$/;
const CHECKBOX = /^\s*-\s*\[([ ~x])\]\s*(.+)$/i;
const YAML_SCALAR = /^([a-z_]+):\s*(.*)$/;

/**
 * Reconstrói o esqueleto do histórico lendo o `.sdd/` do projeto.
 *
 * Existe porque a promessa "o banco é índice derivado" só se sustenta se houver como
 * re-derivá-lo. Mudanças, features, chunks e estados vêm do YAML e do `tasks.md`;
 * explicações, exemplos, destaques e decisões **não têm origem fora do banco** e
 * portanto não voltam — a tool diz isso em vez de fingir que reconstruiu tudo.
 *
 * Também serve para quem trabalhou um tempo com `mcp: off` e quer o histórico
 * estrutural daquele período.
 */
class ReindexTool {
  static get definition() {
    return {
      name: 'sdd_reindex',
      description:
        'Reconstrói no banco o esqueleto do histórico a partir dos arquivos em .sdd/ ' +
        '(mudanças, features, chunks e status). Use quando o banco foi perdido, quando se ' +
        'trabalhou com o MCP desligado, ou para conferir divergência entre banco e arquivos. ' +
        'Não recupera explicações, exemplos nem decisões — essas só existem no banco.',
      inputSchema: {
        type: 'object',
        properties: {
          dry_run: {
            type: 'boolean',
            description: 'true = só relata o que faria, sem escrever nada no banco'
          }
        }
      }
    };
  }

  static run(ctx, args) {
    const sddDir = path.join(ctx.projectRoot, '.sdd');
    if (!fs.existsSync(sddDir)) {
      return { indexed: false, reason: 'projeto sem .sdd/ — nada a reconstruir' };
    }

    const dryRun = args.dry_run === true;
    const found = ReindexTool.scanChanges(sddDir);

    if (!dryRun) {
      const projectId = SddRepo.ensureProject(ctx.db, ctx.projectRoot);
      for (const change of found) ReindexTool.persist(ctx.db, projectId, change);
    }

    const summary = {
      dry_run: dryRun,
      changes: found.length,
      features: found.reduce((total, change) => total + change.features.length, 0),
      chunks: found.reduce((total, change) => total + change.chunks.length, 0),
      detail: found.map((change) => ({
        change_id: change.change_id,
        kind: change.kind,
        state: change.state,
        features: change.features.length,
        chunks: change.chunks.length
      })),
      nao_recuperado: [
        'explicações por arquivo (does/connects/review_note/detail)',
        'trechos de código destacados e símbolos com exemplos',
        'decisões e desvios (events), testes e commits',
        'steps de lp:review e conhecimento de context/explain',
        'achados de code review e entidades modeladas no b-ter — só existem no banco',
        'com tasks_storage: mcp ou state_storage: mcp, o plano e o bloco volátil não têm ' +
          'origem em arquivo — o que já está no banco é preservado, mas nada é reconstruído'
      ]
    };

    Log.info('reindex concluído', { dryRun, changes: summary.changes, chunks: summary.chunks });
    return summary;
  }

  /** Varre `changes/` e `archive/`, cada subpasta com um `.sdd.yaml`. */
  static scanChanges(sddDir) {
    const found = [];

    for (const bucket of ['changes', 'archive']) {
      const dir = path.join(sddDir, bucket);
      if (!fs.existsSync(dir)) continue;

      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;

        const changeDir = path.join(dir, entry.name);
        const parsed = ReindexTool.readChange(changeDir, entry.name);
        if (parsed) found.push(parsed);
      }
    }

    return found;
  }

  static readChange(changeDir, changeId) {
    const yamlPath = path.join(changeDir, '.sdd.yaml');
    if (!fs.existsSync(yamlPath)) return null;

    const raw = fs.readFileSync(yamlPath, 'utf-8');
    const meta = ReindexTool.readScalars(raw);
    const features = ReindexTool.readFeatures(raw);

    return {
      change_id: meta.id || changeId,
      kind: meta.kind === 'bugfix' ? 'bugfix' : 'feature',
      title: meta.title,
      state: meta.state,
      created: meta.created,
      updated: meta.updated,
      archived: meta.archived,
      chosen_solution: meta.chosen_solution,
      features,
      chunks: ReindexTool.readChunks(changeDir, features)
    };
  }

  /**
   * Leitor de YAML deliberadamente burro: só escalares de primeiro nível e a lista de
   * features. O servidor é zero-dep, e um parser completo de YAML seria muito mais
   * código do que a reconstrução precisa — o que não casar aqui simplesmente fica de
   * fora, e a mudança entra com menos campos em vez de falhar.
   */
  static readScalars(raw) {
    const meta = {};

    for (const line of raw.split('\n')) {
      if (line.startsWith(' ') || line.startsWith('-')) continue;

      const match = line.match(YAML_SCALAR);
      if (!match) continue;

      const value = ReindexTool.clean(match[2]);
      if (value) meta[match[1]] = value;
    }

    return meta;
  }

  static readFeatures(raw) {
    const features = [];
    let current = null;

    for (const line of raw.split('\n')) {
      const slug = line.match(/^\s*-\s+slug:\s*(.+)$/);
      if (slug) {
        current = { slug: ReindexTool.clean(slug[1]) };
        features.push(current);
        continue;
      }

      if (!current) continue;

      const field = line.match(/^\s+(title|summary|status):\s*(.+)$/);
      if (field) current[field[1]] = ReindexTool.clean(field[2]);
      else if (!line.startsWith(' ')) current = null;
    }

    return features;
  }

  /**
   * Chunk é o bloco `### F<n>.C<m>`, e está concluído quando TODOS os seus checkboxes
   * estão `[~]`/`[x]` — contar checkbox cru é o bug clássico aqui, porque cada chunk
   * tem vários.
   */
  static readChunks(changeDir, features) {
    const files = [];

    const rootTasks = path.join(changeDir, 'tasks.md');
    if (fs.existsSync(rootTasks)) files.push({ path: rootTasks, feature: null });

    const specsDir = path.join(changeDir, 'specs');
    if (fs.existsSync(specsDir)) {
      for (const feature of features) {
        const featureTasks = path.join(specsDir, feature.slug, 'tasks.md');
        if (fs.existsSync(featureTasks)) files.push({ path: featureTasks, feature: feature.slug });
      }
    }

    const chunks = [];
    for (const file of files) {
      const raw = fs.readFileSync(file.path, 'utf-8');
      chunks.push(...ReindexTool.parseTasks(raw, file.feature));
    }
    return chunks;
  }

  static parseTasks(raw, featureSlug) {
    const chunks = [];
    let current = null;

    for (const line of raw.split('\n')) {
      const heading = line.match(CHUNK_HEADING);
      if (heading) {
        current = {
          chunk_id: heading[1],
          title: heading[2] ? heading[2].trim() : null,
          feature_slug: featureSlug,
          marks: []
        };
        chunks.push(current);
        continue;
      }

      if (!current) continue;

      const checkbox = line.match(CHECKBOX);
      if (checkbox) current.marks.push(checkbox[1].toLowerCase());
    }

    for (const chunk of chunks) {
      const pendente = chunk.marks.some((mark) => mark === ' ');
      chunk.status = chunk.marks.length === 0 ? 'pending' : pendente ? 'in_progress' : 'done';
    }

    return chunks;
  }

  static clean(value) {
    return value.trim().replace(/^["']|["']$/g, '').trim();
  }

  /** Upsert conservador: não sobrescreve explicação já gravada, só preenche o esqueleto. */
  static persist(db, projectId, change) {
    const stored = SddRepo.upsertChange(db, projectId, change);

    change.features.forEach((feature, index) => {
      SddDb.run(
        db,
        `INSERT INTO features (change_pk, slug, title, summary, position, status)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT (change_pk, slug) DO UPDATE SET
           title    = COALESCE(features.title, excluded.title),
           summary  = COALESCE(features.summary, excluded.summary),
           position = excluded.position,
           status   = COALESCE(excluded.status, features.status)`,
        [stored.id, feature.slug, feature.title ?? null, feature.summary ?? null, index + 1, feature.status ?? null]
      );
    });

    for (const chunk of change.chunks) {
      const feature = SddRepo.findFeature(db, stored.id, chunk.feature_slug);
      SddDb.run(
        db,
        `INSERT INTO chunks (change_pk, feature_pk, chunk_id, title, status)
         VALUES (?, ?, ?, ?, ?)
         ON CONFLICT (change_pk, chunk_id) DO UPDATE SET
           feature_pk = COALESCE(chunks.feature_pk, excluded.feature_pk),
           title      = COALESCE(chunks.title, excluded.title),
           status     = excluded.status`,
        [stored.id, feature ? feature.id : null, chunk.chunk_id, chunk.title, chunk.status]
      );
    }
  }
}

module.exports = { ReindexTool };
