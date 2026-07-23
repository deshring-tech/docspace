/**
 * Page-level PDF operations: merge, split, rotate, delete, reorder.
 * All built on pdf-lib and fully client-side.
 */
import { PDFDocument, degrees } from "pdf-lib";
import { bytesToPdfBlob } from "./blob";

/**
 * Merges multiple PDFs into one, in the order given. Accepts any Blob (a File
 * is a Blob), so it serves both user-dropped files and PDFs produced in memory
 * (e.g. the per-page searchable PDFs from OCR).
 */
export async function mergePdfs(files: Blob[]): Promise<Blob> {
  const merged = await PDFDocument.create();
  for (const file of files) {
    const src = await PDFDocument.load(await file.arrayBuffer(), {
      ignoreEncryption: true,
    });
    const pages = await merged.copyPages(src, src.getPageIndices());
    for (const page of pages) merged.addPage(page);
  }
  return bytesToPdfBlob(await merged.save());
}

/**
 * Rebuilds a PDF keeping only the pages listed in `order` (0-based source
 * indices), in that order, applying any per-page extra rotation in degrees.
 * This one function covers reorder, delete and rotate in a single pass.
 */
export async function rebuildPdf(
  file: File,
  order: { sourceIndex: number; rotation: number }[],
): Promise<Blob> {
  const src = await PDFDocument.load(await file.arrayBuffer(), {
    ignoreEncryption: true,
  });
  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    src,
    order.map((entry) => entry.sourceIndex),
  );
  copied.forEach((page, i) => {
    const extra = order[i].rotation;
    if (extra !== 0) {
      page.setRotation(degrees((page.getRotation().angle + extra) % 360));
    }
    out.addPage(page);
  });
  return bytesToPdfBlob(await out.save());
}

/**
 * Parses a page-range expression like "1-3, 5, 8-10" into 0-based indices.
 * Throws with a friendly message on invalid input.
 */
export function parsePageRanges(expression: string, pageCount: number): number[] {
  const indices: number[] = [];
  for (const part of expression.split(",")) {
    const token = part.trim();
    if (!token) continue;
    const match = token.match(/^(\d+)(?:\s*-\s*(\d+))?$/);
    if (!match) throw new Error(`"${token}" is not a valid page or range.`);
    const start = parseInt(match[1], 10);
    const end = match[2] ? parseInt(match[2], 10) : start;
    if (start < 1 || end > pageCount || start > end) {
      throw new Error(`Range "${token}" is outside pages 1–${pageCount}.`);
    }
    for (let page = start; page <= end; page++) indices.push(page - 1);
  }
  if (indices.length === 0) throw new Error("No pages selected.");
  return indices;
}

/** Extracts the given 0-based page indices into a new PDF. */
export async function extractPages(file: File, indices: number[]): Promise<Blob> {
  return rebuildPdf(
    file,
    indices.map((sourceIndex) => ({ sourceIndex, rotation: 0 })),
  );
}

/** Splits a PDF into one single-page PDF per page. */
export async function splitToSinglePages(file: File): Promise<Blob[]> {
  const src = await PDFDocument.load(await file.arrayBuffer(), {
    ignoreEncryption: true,
  });
  const blobs: Blob[] = [];
  for (const index of src.getPageIndices()) {
    const out = await PDFDocument.create();
    const [page] = await out.copyPages(src, [index]);
    out.addPage(page);
    blobs.push(bytesToPdfBlob(await out.save()));
  }
  return blobs;
}
