/**
 * Client-side PDF compression.
 *
 * Strategy: render each page with pdf.js to a canvas, re-encode as JPEG, and
 * rebuild the document with pdf-lib. Quality/DPI are binary-searched to hit a
 * target size. This is how "extreme" compression works in most tools — the
 * trade-off (stated in the UI) is that text becomes an image and is no longer
 * selectable.
 */
import { PDFDocument } from "pdf-lib";
import { canvasToBlob } from "@/lib/image/canvas";
import { bytesToPdfBlob } from "./blob";
import { openPdf, renderPageToCanvas } from "./pdfjs";

export type PdfCompressionLevel = "high" | "balanced" | "extreme";

interface RenderSettings {
  scale: number;
  quality: number;
}

const LEVEL_SETTINGS: Record<PdfCompressionLevel, RenderSettings> = {
  high: { scale: 2.0, quality: 0.8 }, // best quality, mild savings
  balanced: { scale: 1.5, quality: 0.6 },
  extreme: { scale: 1.0, quality: 0.35 }, // smallest files
};

/** Renders every page at the given settings and rebuilds a PDF. */
async function rasterizePdf(
  data: ArrayBuffer,
  settings: RenderSettings,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const doc = await openPdf(data.slice(0)); // pdf.js may transfer the buffer
  const out = await PDFDocument.create();

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const canvas = await renderPageToCanvas(doc, pageNumber, settings.scale);
    const jpeg = await canvasToBlob(canvas, "image/jpeg", settings.quality);
    const embedded = await out.embedJpg(await jpeg.arrayBuffer());

    // Page size in PDF points = canvas pixels / scale (pdf.js viewport math).
    const pageWidth = canvas.width / settings.scale;
    const pageHeight = canvas.height / settings.scale;
    const page = out.addPage([pageWidth, pageHeight]);
    page.drawImage(embedded, { x: 0, y: 0, width: pageWidth, height: pageHeight });

    canvas.width = 0; // release canvas memory eagerly
    onProgress?.(pageNumber, doc.numPages);
  }

  await doc.destroy();
  return bytesToPdfBlob(await out.save());
}

/** Compresses using a named quality level. */
export async function compressPdf(
  file: File,
  level: PdfCompressionLevel,
  onProgress?: (done: number, total: number) => void,
): Promise<Blob> {
  const data = await file.arrayBuffer();
  return rasterizePdf(data, LEVEL_SETTINGS[level], onProgress);
}

/**
 * Compresses to fit under `maxBytes` (e.g. "PDF must be under 300 KB" for a
 * form portal). Tries progressively stronger settings until it fits.
 * Returns the first result that fits, or the smallest achievable one.
 */
export async function compressPdfToTarget(
  file: File,
  maxBytes: number,
  onProgress?: (done: number, total: number) => void,
): Promise<{ blob: Blob; fits: boolean }> {
  // Already under the limit? Never make a file worse — return it untouched.
  if (file.size <= maxBytes) {
    return { blob: new Blob([await file.arrayBuffer()], { type: "application/pdf" }), fits: true };
  }
  const data = await file.arrayBuffer();
  const ladder: RenderSettings[] = [
    { scale: 1.5, quality: 0.7 },
    { scale: 1.5, quality: 0.5 },
    { scale: 1.2, quality: 0.4 },
    { scale: 1.0, quality: 0.3 },
    { scale: 0.8, quality: 0.2 },
    { scale: 0.6, quality: 0.12 },
  ];

  let smallest: Blob | null = null;
  for (const settings of ladder) {
    const blob = await rasterizePdf(data, settings, onProgress);
    if (!smallest || blob.size < smallest.size) smallest = blob;
    if (blob.size <= maxBytes) return { blob, fits: true };
  }
  return { blob: smallest!, fits: smallest!.size <= maxBytes };
}
