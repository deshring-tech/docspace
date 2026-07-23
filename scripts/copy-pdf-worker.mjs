/**
 * Copies the pdf.js runtime assets into /public so they are served statically:
 *   - pdf.worker.min.mjs  (the parser/render worker)
 *   - standard_fonts/     (Helvetica etc. for PDFs with non-embedded fonts —
 *                          without these, rendering such PDFs stalls)
 *   - cmaps/              (character maps for CJK/Indic PDFs)
 * Runs automatically after `npm install`.
 */
import { cpSync, copyFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const dist = join(root, "node_modules", "pdfjs-dist");
const publicDir = join(root, "public");

if (!existsSync(dist)) {
  console.warn("[copy-pdf-worker] pdfjs-dist not installed yet, skipping.");
  process.exit(0);
}

mkdirSync(publicDir, { recursive: true });
copyFileSync(join(dist, "build", "pdf.worker.min.mjs"), join(publicDir, "pdf.worker.min.mjs"));
cpSync(join(dist, "standard_fonts"), join(publicDir, "standard_fonts"), { recursive: true });
cpSync(join(dist, "cmaps"), join(publicDir, "cmaps"), { recursive: true });
console.log("[copy-pdf-worker] Copied pdf.js worker, standard fonts and cmaps to /public");
