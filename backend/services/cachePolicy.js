// Which `/api/public/*` endpoints return PER-VIEWER content and therefore must
// never be stored in a shared (CDN/edge) cache. These read the optional auth
// token and tailor the response (is_unlocked flags, nulled locked URLs), so a
// cached copy of one student's response could otherwise be served to another.
//
// `subPath` is req.path INSIDE the `/api/public` mount (e.g. "/materials").
const PERSONALIZED = ['/materials', '/e-learning'];

export function isPersonalizedPublicPath(subPath) {
  const p = String(subPath || '').replace(/\/+$/, '') || '/';
  return PERSONALIZED.some((base) => p === base || p.startsWith(`${base}/`));
}
