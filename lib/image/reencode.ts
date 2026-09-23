/**
 * Re-encodes an image file to another raster format via canvas.
 *
 * Shared by the Convert panel and the chat executor so the conversion logic
 * lives in one place. JPEG has no alpha channel, so a white background is
 * painted first to avoid black fringes.
 */
import { canvasToBlob } from "./canvas";

export async function reencodeImage(file: File | Blob, mimeType: string): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context");
  if (mimeType === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvasToBlob(canvas, mimeType, 0.92);
}
