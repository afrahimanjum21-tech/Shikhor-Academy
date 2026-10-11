// Pure SMS text helpers (D8). Bangla/Unicode SMS uses UCS-2 (70 chars/segment),
// GSM-7 uses 160; truncating by UTF-16 code units can split a surrogate pair or
// a Bangla grapheme cluster mid-character. These helpers pick the right limit
// and truncate on grapheme boundaries. No DB/network.

// Any non-ASCII char (Bangla included) forces UCS-2 on SSL Wireless, so treat
// it as Unicode conservatively.
export function isUnicodeSms(text) {
  return /[^\u0000-\u007F]/.test(String(text == null ? '' : text));
}

// Single-segment character limit for the detected encoding.
export function smsSegmentLimit(text) {
  return isUnicodeSms(text) ? 70 : 160;
}

// Split into grapheme clusters (Bangla consonant+vowel-sign stays together).
function graphemes(text) {
  const s = String(text == null ? '' : text);
  if (typeof Intl !== 'undefined' && Intl.Segmenter) {
    try {
      return Array.from(new Intl.Segmenter('bn', { granularity: 'grapheme' }).segment(s), (seg) => seg.segment);
    } catch { /* fall through */ }
  }
  return Array.from(s); // code-point split (never breaks a surrogate pair)
}

// Removes emoji / pictographs / variation selectors WITHOUT touching Bangla
// (U+0980–U+09FF is outside every stripped range).
export function stripEmojis(text) {
  return String(text == null ? '' : text)
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, '')
    .trim();
}

// Grapheme-safe, encoding-aware truncation to `maxSegments` worth of chars.
export function truncateSms(text, { maxSegments = 1 } = {}) {
  const s = String(text == null ? '' : text);
  const limit = smsSegmentLimit(s) * Math.max(1, maxSegments);
  const g = graphemes(s);
  return g.length <= limit ? s : g.slice(0, limit).join('');
}
