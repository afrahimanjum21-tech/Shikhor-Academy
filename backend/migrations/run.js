/**
 * Explicit, versioned migration runner.
 *
 * IMPORTANT (safety): This replaces the previous `sequelize.sync({ alter: true })`
 * behaviour. `alter:true` silently mutates a production database on every
 * deploy and can drop/rename columns, which is unsafe for live data.
 *
 * This runner instead:
 *   1. Creates a `migrations_meta` table (if absent) to record applied migrations.
 *   2. Executes migration files (named `*.mjs`, sorted ascending) in order.
 *   3. Runs only migrations that are not yet recorded as applied (idempotent).
 *   4. Records a migration as applied ONLY after its `up()` resolves.
 *
 * Every migration is required to be ADDITIVE and idempotent (use CREATE TABLE
 * IF NOT EXISTS / IF NOT EXISTS-style guards). No migration in this project
 * drops tables, columns, or data.
 *
 * Usage:
 *   node migrations/run.js             # apply pending migrations
 *   node migrations/run.js --rollback  # roll back the last batch (optional down)
 */
import path from 'path';
import fs from 'fs';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'url';
import { Sequelize } from 'sequelize';
import sequelize from '../config/database.js';
import models from '../models/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const META_TABLE = 'migrations_meta';

async function ensureMetaTable(queryInterface, Sequelize) {
  const exists = await queryInterface.tableExists(META_TABLE);
  if (!exists) {
    await queryInterface.createTable(META_TABLE, {
      id: { type: Sequelize.INTEGER, primaryKey: true, autoIncrement: true },
      name: { type: Sequelize.STRING, allowNull: false, unique: true },
      // Optional checksum for tamper detection (not used for ordering).
      checksum: { type: Sequelize.STRING, allowNull: true },
      applied_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  }
}

function listMigrationFiles() {
  return fs
    .readdirSync(__dirname)
    .filter((file) => file.endsWith('.mjs'))
    .sort();
}

async function getApplied(queryInterface) {
  const exists = await queryInterface.tableExists(META_TABLE);
  if (!exists) return [];
  const [rows] = await queryInterface.sequelize.query(
    `SELECT name FROM ${META_TABLE} ORDER BY id ASC`
  );
  return (rows || []).map((r) => r.name).filter(Boolean);
}

function checksumFor(name) {
  const file = path.join(__dirname, name);
  if (!fs.existsSync(file)) return null;
  return createHash('sha1').update(fs.readFileSync(file, 'utf8')).digest('hex');
}

async function recordApplied(queryInterface, name) {
  // Set applied_at explicitly: Postgres does not always apply a column-level
  // DEFAULT when the column is omitted from an INSERT against a Sequelize-built
  // meta table, which caused a NOT NULL violation. Passing a concrete value is
  // dialect-portable and avoids the issue entirely.
  await queryInterface.sequelize.query(
    `INSERT INTO ${META_TABLE} (name, checksum, applied_at) VALUES (?, ?, ?)`,
    { replacements: [name, checksumFor(name), new Date().toISOString()] }
  );
}

async function unrecord(queryInterface, name) {
  await queryInterface.sequelize.query(
    `DELETE FROM ${META_TABLE} WHERE name = ?`,
    { replacements: [name] }
  );
}

async function applyMigrations(queryInterface, Sequelize) {
  const applied = await getApplied(queryInterface);
  const files = listMigrationFiles();
  const pending = files.filter((f) => !applied.includes(f));

  if (pending.length === 0) {
    console.log('No pending migrations.');
    return 0;
  }

  let count = 0;
  for (const file of pending) {
    const mod = await import(pathToFileURL(path.join(__dirname, file)).href);
    const name = file;
    process.stdout.write(`Migrating: ${file} ... `);
    try {
      if (typeof mod.up !== 'function') {
        throw new Error(`migration ${file} has no exported up() function`);
      }
      await mod.up(queryInterface, Sequelize);
      await recordApplied(queryInterface, name);
      console.log('OK');
      count += 1;
    } catch (err) {
      console.error('FAILED');
      console.error(`  ${file}: ${err && err.message ? err.message : err}`);
      throw err;
    }
  }
  return count;
}

export async function migrate() {
  // Never silently target the config/database.js localhost fallback: on Vercel
  // builds DATABASE_URL is a Sensitive var and is not injected, and a missing
  // URL here produced a confusing ECONNREFUSED 127.0.0.1:5432. Fail loudly.
  if (!process.env.DATABASE_URL && !process.env.DB_HOST) {
    throw new Error(
      'DATABASE_URL is not set. Refusing to run migrations against the localhost fallback. ' +
      'Run `npm run migrate` locally (backend/.env has the Neon URL) or provide DATABASE_URL.'
    );
  }
  await sequelize.authenticate();
  const queryInterface = sequelize.getQueryInterface();
  await ensureMetaTable(queryInterface, Sequelize);
  const applied = await getApplied(queryInterface);
  const appliedSet = new Set(applied);
  const before = applied.length;
  const count = await applyMigrations(queryInterface, Sequelize);
  const total = listMigrationFiles().length;
  console.log(`Migrations complete: ${appliedSet.size + count}/${total} applied (${count} new).`);
  return count;
}

export async function rollback() {
  const queryInterface = sequelize.getQueryInterface();
  await ensureMetaTable(queryInterface, Sequelize);
  const appliedRaw = await getApplied(queryInterface);
  if (appliedRaw.length === 0) {
    console.log('Nothing to roll back.');
    return;
  }
  // Roll back the most recently applied batch.
  const last = appliedRaw[appliedRaw.length - 1];
  const file = path.join(__dirname, last);
  const mod = await import(pathToFileURL(file).href);
  if (typeof mod.down !== 'function') {
    throw new Error(`migration ${last} has no exported down() function; cannot roll back`);
  }
  console.log(`Rolling back: ${last} ...`);
  await mod.down(queryInterface, Sequelize);
  await unrecord(queryInterface, last);
  console.log('Rolled back OK.');
}

async function finish(run) {
  try {
    await run();
  } catch (err) {
    console.error(err);
    process.exitCode = 1;
  } finally {
    // Close the pool so the process exits; otherwise the open Neon connections
    // keep Node alive and a build/CI step hangs until its timeout.
    await sequelize.close();
  }
}

if (process.argv.includes('--rollback')) {
  finish(rollback);
} else {
  finish(migrate);
}