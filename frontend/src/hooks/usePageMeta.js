import { useEffect } from "react";

const SITE_URL = "https://shikhoracademy.vercel.app";

function setMeta(attr, key, content) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  if (content) {
    el.setAttribute("content", content);
  } else {
    el.remove();
  }
}

function resolveImage(image) {
  if (!image) return `${SITE_URL}/og-image.jpg`;
  return /^https?:\/\//.test(image) ? image : `${SITE_URL}${image}`;
}

/**
 * Lightweight per-page SEO: document title, meta description, Open Graph and
 * Twitter card tags. Applies client-side (Google renders JS), complementing the
 * static homepage tags in index.html.
 */
export default function usePageMeta({ title, description, path = "/", image } = {}) {
  useEffect(() => {
    document.title = title;
    setMeta("name", "description", description);
    setMeta("property", "og:title", title);
    setMeta("property", "og:description", description);
    setMeta("property", "og:url", `${SITE_URL}${path}`);
    setMeta("property", "og:image", resolveImage(image));
    setMeta("name", "twitter:title", title);
    setMeta("name", "twitter:description", description);
    setMeta("name", "twitter:image", resolveImage(image));
  }, [title, description, path, image]);
}