/**
 * Lazy loader for pdf.js. The library is heavy, so we only import it when a
 * PDF actually needs rendering. The worker is served from /public (copied
 * there by scripts/copy-pdf-worker.mjs on install).
 */
import type { PDFDocumentProxy } from "pdfjs-dist";

let pdfjsPromise: Promise<typeof import("pdfjs-dist")> | null = null;

async function getPdfjs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return pdfjs;
    });
  }
  return pdfjsPromise;
}

/** Opens a PDF file for rendering. Caller must call doc.destroy() when done. */
export async function openPdf(data: ArrayBuffer): Promise<PDFDocumentProxy> {
  const pdfjs = await getPdfjs();
  return pdfjs.getDocument({
    data,
    // Static assets copied to /public by scripts/copy-pdf-worker.mjs.
    // Without standardFontDataUrl, PDFs using non-embedded fonts (Helvetica
    // etc.) fail to render; cmaps are needed for many CJK/Indic documents.
    standardFontDataUrl: "/standard_fonts/",
    cMapUrl: "/cmaps/",
    cMapPacked: true,
  }).promise;
}

/** Returns the number of pages in a PDF file. */
export async function getPageCount(file: File): Promise<number> {
  const doc = await openPdf(await file.arrayBuffer());
  const count = doc.numPages;
  await doc.destroy();
  return count;
}

/**
 * Detects whether a PDF has a real, extractable text layer. Returns false for
 * scanned/image-only PDFs — the signal used to suggest OCR. Only the first
 * page is probed, which is enough to distinguish scans from digital PDFs and
 * keeps the check cheap.
 */
export async function hasTextLayer(file: File): Promise<boolean> {
  const doc = await openPdf(await file.arrayBuffer());
  try {
    const page = await doc.getPage(1);
    const content = await page.getTextContent();
    page.cleanup();
    return content.items.some(
      (item) => "str" in item && item.str.trim().length > 0,
    );
  } finally {
    await doc.destroy();
  }
}

/**
 * Renders a single page to a canvas at the given scale.
 * Returns the canvas (caller extracts an image or draws it elsewhere).
 */
export async function renderPageToCanvas(
  doc: PDFDocumentProxy,
  pageNumber: number,
  scale: number,
): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context");
  // intent: "print" renders without requestAnimationFrame scheduling, so
  // processing keeps going even when the tab is in the background.
  await page.render({ canvasContext: ctx, viewport, intent: "print" }).promise;
  page.cleanup();
  return canvas;
}
