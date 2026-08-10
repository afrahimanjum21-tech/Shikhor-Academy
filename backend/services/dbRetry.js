// Retry helper for transient database connection failures.
//
// Neon's free tier suspends the database compute after ~5 minutes of
// inactivity. When a suspended compute is woken by a request, the very first
// connection attempt from a (possibly cold) serverless function can fail with
// a transient error (connection refused / terminated / timeout). These are
// retryable: the compute is waking up and the next attempt succeeds.
//
// Only connection-level errors are retried — query errors, constraint
// violations, and other logic errors are NEVER retried (they would just be
// re-thrown and would mask the real bug).

const TRANSIENT_ERROR_NAMES = new Set([
  'SequelizeConnectionError',
  'SequelizeConnectionRefusedError',
  'SequelizeConnectionTimedOutError',
  'SequelizeHostNotReachableError',
  'SequelizeHostNotFoundError',
  'SequelizeConnectionAcquireTimeoutError',
  'SequelizeTimeoutError',
]);

const TRANSIENT_MESSAGE_MARKERS = [
  'Connection terminated unexpectedly',
  'Connection terminated',
  'ECONNRESET',
  'ETIMEDOUT',
  'connect ECONNREFUSED',
  'remaining connection slots',
  'terminating connection due to administrator command',
  'idle session timeout',
  'server closed the connection unexpectedly',
  'socket hang up',
  'Client network socket disconnected',
  'read ECONNRESET',
  'The connection pool is empty',
];

export function isTransientDbError(error) {
  if (!error) return false;
  if (TRANSIENT_ERROR_NAMES.has(error.name)) return true;

  // Sequelize wraps the driver error in `error.parent` / `error.original`;
  // pg sets `error.code` (e.g. '57P01' = admin_shutdown, '08006' =
  // connection_failure). Check the wrapped message as well.
  const messages = [error.message, error.parent?.message, error.original?.message]
    .filter(Boolean)
    .join(' | ');
  return TRANSIENT_MESSAGE_MARKERS.some((marker) => messages.includes(marker));
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Runs `fn`, retrying only when the failure looks like a transient
// connection problem. `retries` is the number of attempts AFTER the first.
export async function withDbRetry(fn, { retries = 3, baseDelayMs = 500 } = {}) {
  let attempt = 0;
  for (;;) {
    try {
      return await fn();
    } catch (error) {
      if (attempt >= retries || !isTransientDbError(error)) {
        throw error;
      }
      attempt += 1;
      console.warn(
        `[db-retry] transient DB error (${error.name}: ${error.message}), retrying ${attempt}/${retries}`
      );
      await sleep(baseDelayMs * attempt);
    }
  }
}
