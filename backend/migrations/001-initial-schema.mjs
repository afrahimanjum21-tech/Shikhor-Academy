import models from '../models/index.js';

/**
 * Initial schema migration.
 *
 * Safety properties:
 *  - NEVER drops a table, column, or data. Every table is created with
 *    `CREATE TABLE IF NOT EXISTS` semantics (we check `tableExists` first).
 *  - Idempotent: safe to re-run; missing tables are created, existing ones
 *    are left untouched.
 *  - Tables are created in foreign-key dependency order (computed from the
 *    model definitions), so a fresh database builds cleanly without
 *    "referenced table does not exist" errors.
 *  - Column definitions are derived directly from `model.rawAttributes`,
 *    i.e. the single source of truth (the Sequelize models), so the DDL here
 *    cannot drift from the runtime models.
 */

// Resolve the actual table name for a model instance.
function tableNameFor(model) {
  if (model?.getTableName) return model.getTableName();
  if (model?.name) return model.name;
  return null;
}

// Topological sort of models so that a table's referenced tables are created first.
function computeCreationOrder(modelsMap) {
  const byName = {};
  for (const [name, model] of Object.entries(modelsMap)) {
    byName[name] = tableNameFor(model);
  }

  const tableOf = {};
  const nameByTable = {};
  for (const [name, model] of Object.entries(modelsMap)) {
    const t = tableNameFor(model);
    if (t) {
      tableOf[name] = t;
      nameByTable[t] = name;
    }
  }

  const deps = Object.create(null);
  const names = Object.keys(modelsMap);
  for (const name of names) {
    const Model = modelsMap[name];
    const refs = new Set();
    const attrs = Model.rawAttributes || {};
    for (const attr of Object.values(attrs)) {
      const r = attr && attr.references;
      if (!r) continue;
      let refName = r.model;
      if (typeof refName === 'string') {
        refs.add(refName); // could be a table name or a model name
      } else if (refName && typeof refName === 'object') {
        if (refName.name) refs.add(tableOf[refName.name] || refName.name);
        if (typeof refName.getTableName === 'function') refs.add(refName.getTableName());
        if (refName.toString) {
          const s = refName.toString();
          if (tableOf[s]) refs.add(tableOf[s]);
        }
      }
    }
    deps[tableNameFor(Model)] = [...refs];
  }

  const visited = new Set();
  const order = [];

  function visit(table) {
    if (!table || visited.has(table)) return;
    visited.add(table);
    for (const dep of deps[table] || []) {
      if (nameByTable[dep]) visit(dep); // only order within our own model set
    }
    order.push(table);
  }

  // Visit every model table; referenced tables get added first.
  for (const name of names) {
    const t = tableNameFor(modelsMap[name]);
    if (t) visit(t);
  }

  return order;
}

// Strip foreign-key `references` so we control ordering (we re-assert them after
// all tables exist is NOT done here; createTable honours references, and because
// we order correctly the referenced tables already exist. This is the standard
// Sequelize createTable path — equivalent to what `sync()` does internally,
// but gated behind `tableExists` so it never touches existing tables.)
function forCreateAttributes(model) {
  return model.rawAttributes || {};
}

export const creationOrderFor = computeCreationOrder;

export async function up(queryInterface, Sequelize) {
  const ordered = computeCreationOrder(models);
  // One round-trip to learn which tables already exist (avoids 38 separate
  // tableExists queries against a cold/suspended database).
  const existing = new Set(await queryInterface.showAllTables());
  const tx = await queryInterface.sequelize.transaction();
  try {
    for (const table of ordered) {
      // Find the model that maps to this table.
      const Model = Object.values(models).find(
        (m) => tableNameFor(m) === table
      );
      if (!Model) continue;

      if (existing.has(table)) {
        console.log(`  = ${table} (exists)`);
        continue; // never touch existing tables / columns / data
      }

      const attributes = forCreateAttributes(Model);
      await queryInterface.createTable(table, attributes, { transaction: tx });

      // Best-effort: recreate array-style indexes declared on the model so a
      // fresh database matches the runtime schema exactly. Only runs when we
      // actually created the table (existing prod tables/indexes are skipped).
      // Failures here are non-fatal for correctness (they affect only query
      // performance) so we log and continue rather than abort the migration.
      const indexes = (Model.options && Model.options.indexes) || [];
      for (const idx of indexes) {
        try {
          await queryInterface.addIndex(
            table,
            idx.fields || idx.attributes,
            { ...idx, transaction: tx }
          );
        } catch (idxErr) {
          console.warn(`  ! index on ${table} (${idx.name || idx.fields}) skipped: ${idxErr.message}`);
        }
      }

      console.log(`  + ${table}`);
      existing.add(table);
    }
    await tx.commit();
  } catch (err) {
    await tx.rollback();
    throw err;
  }
}

export async function down(queryInterface, Sequelize) {
  // Intentionally NOT implemented: dropping tables is destructive and unsafe
  // for production. This migration is additive-only.
  throw new Error('down() for 001-initial-schema is intentionally disabled to prevent destructive drops.');
}
