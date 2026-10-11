import { sequelize } from '../models/index.js';
import { QueryTypes } from 'sequelize';

/**
 * C24 — shared, Postgres-backed rate-limit store.
 *
 * express-rate-limit's default MemoryStore lives inside a single process. On
 * Vercel each serverless isolate has its own memory, so the counters are
 * per-isolate, NOT global — a brute-force client that lands on fresh isolates
 * sees the limit reset. This store keeps the counters in a shared `rate_limits`
 * table (via the existing Sequelize/Neon connection — NO new dependency and NO
 * new paid infra) so the limit is enforced across every isolate.
 *
 * Opt-in: only used when RATE_LIMIT_STORE=postgres. Unset → the library's
 * default MemoryStore is used (unchanged behaviour for local/dev).
 *
 * Fail-open: if the DB is unreachable the store returns 0 hits so the request
 * is ALLOWED (availability over strict limiting — a DB hiccup must not lock
 * every user out). The condition is logged once. The table + atomic upsert are
 * created by migration 016 (run it before enabling this).
 */

const TABLE = 'rate_limits';

export function rateLimitStoreEnabled() {
  return String(process.env.RATE_LIMIT_STORE || '').toLowerCase() === 'postgres';
}

let warned = false;
function failOpenWarn(err) {
  if (!warned) {
    warned = true;
    console.error('[rate-limit] Postgres store error — failing OPEN (requests allowed) until it recovers:', err.message);
  }
}

class PgRateLimitStore {
  constructor(prefix) {
    this.prefix = prefix || 'rl';
    this.windowMs = 60000;
  }

  // express-rate-limit calls init() with the limiter's resolved options.
  init(options) {
    if (options && Number.isFinite(options.windowMs)) this.windowMs = options.windowMs;
  }

  scopedKey(k) {
    return `${this.prefix}:${k}`;
  }

  // Atomic increment-or-reset. One row per client key; when the window has
  // elapsed (expires_at <= now) the counter resets to 1 and a fresh window
  // starts, otherwise it increments. Returns the library's expected shape.
  async increment(key) {
    const fallbackReset = new Date(Date.now() + this.windowMs);
    try {
      const rows = await sequelize.query(
        `INSERT INTO ${TABLE} (key, hits, expires_at)
         VALUES (:key, 1, now() + (:windowMs || ' milliseconds')::interval)
         ON CONFLICT (key) DO UPDATE SET
           hits = CASE WHEN ${TABLE}.expires_at <= now() THEN 1 ELSE ${TABLE}.hits + 1 END,
           expires_at = CASE WHEN ${TABLE}.expires_at <= now()
                             THEN now() + (:windowMs || ' milliseconds')::interval
                             ELSE ${TABLE}.expires_at END
         RETURNING hits, expires_at`,
        { replacements: { key: this.scopedKey(key), windowMs: String(this.windowMs) }, type: QueryTypes.SELECT }
      );
      const row = rows && rows[0];
      if (row) return { totalHits: Number(row.hits), resetTime: new Date(row.expires_at) };
      return { totalHits: 1, resetTime: fallbackReset };
    } catch (err) {
      failOpenWarn(err);
      return { totalHits: 0, resetTime: fallbackReset };
    }
  }

  async decrement(key) {
    try {
      await sequelize.query(
        `UPDATE ${TABLE} SET hits = GREATEST(hits - 1, 0) WHERE key = :key AND expires_at > now()`,
        { replacements: { key: this.scopedKey(key) }, type: QueryTypes.UPDATE }
      );
    } catch (err) {
      failOpenWarn(err);
    }
  }

  async resetKey(key) {
    try {
      await sequelize.query(
        `DELETE FROM ${TABLE} WHERE key = :key`,
        { replacements: { key: this.scopedKey(key) }, type: QueryTypes.DELETE }
      );
    } catch (err) {
      failOpenWarn(err);
    }
  }
}

// Returns a fresh store instance (unique prefix per limiter so their counters
// never collide), or undefined when the shared store is disabled — in which
// case express-rate-limit falls back to its default MemoryStore.
export function createRateLimitStore(prefix) {
  return rateLimitStoreEnabled() ? new PgRateLimitStore(prefix) : undefined;
}

export { PgRateLimitStore };
