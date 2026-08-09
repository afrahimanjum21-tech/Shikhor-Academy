import { Op } from 'sequelize';

// Parses since_<page> timestamps from a query string into a { page: Date } map.
export function parseSince(query) {
  const since = {};
  Object.entries(query || {}).forEach(([key, value]) => {
    if (key.startsWith('since_') && value) {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) {
        since[key.slice(6)] = date;
      }
    }
  });
  return since;
}

// Returns a where-filter for items newer than the most recent view of any of
// the given page keys (or an empty filter if never viewed).
export function makeAfter(since) {
  return (field, ...pageKeys) => {
    const dates = pageKeys.map((k) => since[k]).filter(Boolean);
    if (dates.length === 0) return {};
    return { [field]: { [Op.gt]: new Date(Math.max(...dates.map((d) => d.getTime()))) } };
  };
}
