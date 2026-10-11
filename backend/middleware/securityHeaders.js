// Baseline security headers applied by the Express app itself, so they hold
// regardless of which Vercel project/CDN serves the API (the root vercel.json's
// applicability to production is unverified — see H-cfg1). Helmet is NOT a
// dependency; this is a small explicit middleware (no new package) chosen to
// avoid breaking the existing app:
//   - X-Content-Type-Options: nosniff      — stop MIME sniffing (stored-XSS via uploads)
//   - Referrer-Policy: strict-origin-when-cross-origin
//   - X-Frame-Options: SAMEORIGIN          — clickjacking; SAMEORIGIN (not DENY)
//                                            so the SPA's same-origin PDF/ID-card
//                                            preview iframes keep working
//   - Cross-Origin-Resource-Policy is deliberately NOT set to same-origin,
//     because the frontend may load backend images/files from another origin.
// A strict CSP is applied ONLY to /api JSON responses (no subresources, so it
// cannot break rendering). The browser-facing HTML/asset CSP stays the
// frontend deployment's responsibility (documented in the tracker).
export function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  const url = req.originalUrl || req.url || '';
  if (url.startsWith('/api')) {
    // API returns JSON only — lock everything down.
    res.setHeader('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  } else if (url.startsWith('/uploads') || url.startsWith('/storage')) {
    // Served files: block active content (plugins/embeds) and third-party
    // framing without restricting the image/pdf/media rendering itself.
    res.setHeader('Content-Security-Policy', "default-src 'none'; img-src 'self' data: blob:; media-src 'self' blob:; object-src 'none'; frame-ancestors 'self'");
  }
  next();
}

export default securityHeaders;
