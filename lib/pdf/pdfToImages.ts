/**
 * PDF → images. Renders each page with pdf.js at a print-friendly resolution
 * and returns one PNG or JPEG blob per page.
 */
import { canvasToBlob } from "@/lib/image/canvas";
import { openPdf, renderPageToCanvas } from "./pdfjs";

const RENDER_SCALE = 2; // ~144 DPI — crisp on screens, reasonable file sizes

export async function pdfToImages(
  file: File,
  format: "image/png" | "image/jpeg",
  onProgress?: (done: number, total: number) => void,
): Promise<Blob[]> {
  const doc = await openPdf(await file.arrayBuffer());
  const blobs: Blob[] = [];

  for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
    const canvas = await renderPageToCanvas(doc, pageNumber, RENDER_SCALE);
    blobs.push(await canvasToBlob(canvas, format, 0.92));
    canvas.width = 0;
    onProgress?.(pageNumber, doc.numPages);
  }

  await doc.destroy();
  return blobs;
}
