/**
 * Image → PDF conversion. Each image becomes one A4 page (portrait or
 * landscape, matching the image orientation) with the image fitted inside.
 */
import { PDFDocument } from "pdf-lib";
import { canvasToBlob } from "@/lib/image/canvas";
import { bytesToPdfBlob } from "./blob";

const A4 = { width: 595.28, height: 841.89 }; // points
const MARGIN = 24;

/** Re-encodes any browser-decodable image to JPEG so pdf-lib can embed it. */
async function toJpegBytes(file: File): Promise<ArrayBuffer> {
  if (file.type === "image/jpeg") return file.arrayBuffer();
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  const blob = await canvasToBlob(canvas, "image/jpeg", 0.92);
  return blob.arrayBuffer();
}

export async function imagesToPdf(files: File[]): Promise<Blob> {
  const doc = await PDFDocument.create();

  for (const file of files) {
    const image = await doc.embedJpg(await toJpegBytes(file));
    const landscape = image.width > image.height;
    const pageWidth = landscape ? A4.height : A4.width;
    const pageHeight = landscape ? A4.width : A4.height;

    // Fit the image inside the page margins, preserving aspect ratio.
    const maxWidth = pageWidth - MARGIN * 2;
    const maxHeight = pageHeight - MARGIN * 2;
    const ratio = Math.min(maxWidth / image.width, maxHeight / image.height, 1);
    const drawWidth = image.width * ratio;
    const drawHeight = image.height * ratio;

    const page = doc.addPage([pageWidth, pageHeight]);
    page.drawImage(image, {
      x: (pageWidth - drawWidth) / 2,
      y: (pageHeight - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    });
  }

  return bytesToPdfBlob(await doc.save());
}
