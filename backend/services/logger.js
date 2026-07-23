const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const CURRENT_LEVEL = LOG_LEVELS[process.env.LOG_LEVEL] ?? 1;

function formatTimestamp() {
  return new Date().toISOString();
}

function sanitize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const cloned = Array.isArray(obj) ? [...obj] : { ...obj };
  const sensitive = /(secret|key|token|password|authorization)/i;
  for (const key of Object.keys(cloned)) {
    if (sensitive.test(key)) cloned[key] = '[REDACTED]';
  }
  return cloned;
}

function log(level, module, message, meta) {
  if (LOG_LEVELS[level] < CURRENT_LEVEL) return;
  const entry = { timestamp: formatTimestamp(), level, module, message };
  if (meta) entry.meta = sanitize(meta);
  const prefix = `[${entry.timestamp}] [${level.toUpperCase()}] [${module}]`;
  const suffix = meta ? ` ${JSON.stringify(sanitize(meta))}` : '';
  if (level === 'error') {
    console.error(`${prefix} ${message}${suffix}`);
  } else if (level === 'warn') {
    console.warn(`${prefix} ${message}${suffix}`);
  } else {
    console.log(`${prefix} ${message}${suffix}`);
  }
}

export const logger = {
  debug: (module, message, meta) => log('debug', module, message, meta),
  info: (module, message, meta) => log('info', module, message, meta),
  warn: (module, message, meta) => log('warn', module, message, meta),
  error: (module, message, meta) => log('error', module, message, meta),
};

export default logger;
