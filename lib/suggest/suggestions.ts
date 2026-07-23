/**
 * Proactive suggestions — the "feels like AI, costs nothing" layer.
 * Every rule is a cheap local heuristic over files already in the workspace,
 * and every suggestion maps to an action that actually exists.
 */
import { CommandResult } from "@/lib/intent/commands";
import { WorkspaceFile } from "@/lib/types";
import { formatBytes } from "@/lib/format";

export interface Suggestion {
  id: string;
  label: string;
  result: CommandResult;
}

const BIG_PDF_BYTES = 2 * 1024 * 1024;

/** Portrait ~3.5×4.5 ratio → probably a passport-style photo. */
function looksLikePassportPhoto(file: WorkspaceFile): boolean {
  if (!file.imageWidth || !file.imageHeight) return false;
  const ratio = file.imageWidth / file.imageHeight;
  return ratio > 0.68 && ratio < 0.88;
}

/** Wide and short → probably a signature strip. */
function looksLikeSignature(file: WorkspaceFile): boolean {
  if (!file.imageWidth || !file.imageHeight) return false;
  return file.imageWidth / file.imageHeight >= 1.9;
}

export function buildSuggestions(files: WorkspaceFile[]): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const pdfs = files.filter((f) => f.kind === "pdf");
  const images = files.filter((f) => f.kind === "image");

  // Scanned PDF (no text layer) → OCR. Checked first: it's the most specific,
  // highest-value signal for a document that otherwise looks ordinary.
  const scanned = pdfs.find((f) => f.hasText === false);
  if (scanned) {
    suggestions.push({
      id: "scanned-pdf",
      label: `${scanned.file.name} looks scanned — run OCR to make it searchable?`,
      result: { action: "ocr" },
    });
  }

  const bigPdf = pdfs.find((f) => f.file.size > BIG_PDF_BYTES);
  if (bigPdf) {
    suggestions.push({
      id: "big-pdf",
      label: `${bigPdf.file.name} is ${formatBytes(bigPdf.file.size)} — compress it?`,
      result: { action: "compress" },
    });
  }

  if (pdfs.length >= 2) {
    suggestions.push({
      id: "merge-pdfs",
      label: `${pdfs.length} PDFs loaded — merge them into one?`,
      result: { action: "merge" },
    });
  }

  const passport = images.find(looksLikePassportPhoto);
  if (passport) {
    suggestions.push({
      id: "passport-photo",
      label: `${passport.file.name} looks like a passport-size photo — crop and size it properly?`,
      result: { action: "photo" },
    });
  }

  const signature = images.find(looksLikeSignature);
  if (signature) {
    suggestions.push({
      id: "signature",
      label: `${signature.file.name} looks like a signature — extract it cleanly?`,
      result: { action: "signature" },
    });
  }

  if (images.length >= 2) {
    suggestions.push({
      id: "images-to-pdf",
      label: `${images.length} images loaded — combine into one PDF?`,
      result: { action: "images-to-pdf" },
    });
  }

  return suggestions.slice(0, 3); // never overwhelm
}
