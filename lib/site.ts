/**
 * Central site configuration — the single source of truth for anything that
 * needs the brand name or canonical URL (metadata, sitemap, robots, JSON-LD,
 * OG images).
 *
 * The URL is environment-driven so deployment never requires a code change:
 * set NEXT_PUBLIC_SITE_URL in the hosting environment. It falls back to the
 * local dev origin so previews and `npm run build` work with zero config.
 */

const RAW_URL = process.env.NEXT_PUBLIC_SITE_URL?.trim() || "http://localhost:4680";

/** Canonical origin with any trailing slash removed. */
export const SITE_URL = RAW_URL.replace(/\/+$/, "");

export const SITE = {
  name: "DocSpace",
  tagline: "Finish any document task. Fast.",
  description:
    "A privacy-first document workspace. Compress to exact KB for exam and form uploads, merge, split, convert and edit PDFs, extract signatures, and write documents that export to PDF or Word — all in your browser, nothing uploaded.",
  url: SITE_URL,
  /** Twitter/X handle, without the @, or empty if none yet. */
  twitter: "",
  locale: "en_IN",
} as const;

/** Builds an absolute URL from a site-relative path. */
export function absoluteUrl(path = "/"): string {
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
