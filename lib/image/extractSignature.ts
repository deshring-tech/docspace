/**
 * Signature extraction: turn a photo/scan of a pen-on-paper signature into a
 * clean cutout with a transparent background.
 *
 * Pipeline (all in-browser):
 *   1. Downscale huge photos for speed.
 *   2. Convert to grayscale.
 *   3. Auto-pick an ink/paper threshold (Otsu's method) — user can nudge it.
 *   4. Paper pixels → transparent; ink pixels → chosen color, with alpha
 *      proportional to darkness so edges stay smooth.
 *   5. Crop to the ink bounding box with a small margin.
 */

export type InkColor = "black" | "blue" | "original";

import { canvasToBlob } from "./canvas";

export interface ExtractOptions {
  /**
   * Threshold adjustment from -100 to +100. 0 = automatic (Otsu).
   * Positive keeps more (fainter) ink, negative keeps less (removes shadows).
   */
  bias?: number;
  ink?: InkColor;
}

export interface ExtractResult {
  blob: Blob; // transparent PNG
  dataUrl: string;
  width: number;
  height: number;
}

const MAX_DIMENSION = 1600;
const CROP_MARGIN = 12;

/** Otsu's method: picks the threshold separating ink from paper. */
function otsuThreshold(histogram: Uint32Array, totalPixels: number): number {
  let sum = 0;
  for (let i = 0; i < 256; i++) sum += i * histogram[i];

  let sumBackground = 0;
  let weightBackground = 0;
  let maxVariance = 0;
  let threshold = 127;

  for (let t = 0; t < 256; t++) {
    weightBackground += histogram[t];
    if (weightBackground === 0) continue;
    const weightForeground = totalPixels - weightBackground;
    if (weightForeground === 0) break;

    sumBackground += t * histogram[t];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance =
      weightBackground * weightForeground * (meanBackground - meanForeground) ** 2;
    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }
  return threshold;
}

export async function extractSignature(
  file: File | Blob,
  options: ExtractOptions = {},
): Promise<ExtractResult> {
  const bitmap = await createImageBitmap(file);

  // Downscale for speed and consistent thresholds.
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create canvas context");
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const image = ctx.getImageData(0, 0, width, height);
  const pixels = image.data;

  // Grayscale + histogram.
  const gray = new Uint8Array(width * height);
  const histogram = new Uint32Array(256);
  for (let i = 0; i < gray.length; i++) {
    const offset = i * 4;
    const value = Math.round(
      0.299 * pixels[offset] + 0.587 * pixels[offset + 1] + 0.114 * pixels[offset + 2],
    );
    gray[i] = value;
    histogram[value]++;
  }

  const bias = options.bias ?? 0;
  const threshold = Math.max(
    5,
    Math.min(250, otsuThreshold(histogram, gray.length) + bias * 0.6),
  );
  // Alpha ramps from 0 at the threshold to 255 at (threshold - SOFTNESS),
  // keeping stroke edges smooth instead of jagged.
  const SOFTNESS = 40;

  const ink = options.ink ?? "black";
  let minX = width, minY = height, maxX = -1, maxY = -1;

  for (let i = 0; i < gray.length; i++) {
    const offset = i * 4;
    const darkness = threshold - gray[i];
    if (darkness <= 0) {
      pixels[offset + 3] = 0; // paper → transparent
      continue;
    }
    const alpha = Math.min(255, Math.round((darkness / SOFTNESS) * 255));
    pixels[offset + 3] = alpha;
    if (ink === "black") {
      pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = 10;
    } else if (ink === "blue") {
      pixels[offset] = 16;
      pixels[offset + 1] = 38;
      pixels[offset + 2] = 140;
    } // "original" keeps the photographed ink color

    const x = i % width;
    const y = (i / width) | 0;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  if (maxX < 0) throw new Error("No signature found — try increasing the threshold.");

  ctx.putImageData(image, 0, 0);

  // Crop to ink bounds + margin.
  const cropX = Math.max(0, minX - CROP_MARGIN);
  const cropY = Math.max(0, minY - CROP_MARGIN);
  const cropWidth = Math.min(width - cropX, maxX - minX + CROP_MARGIN * 2);
  const cropHeight = Math.min(height - cropY, maxY - minY + CROP_MARGIN * 2);

  const output = document.createElement("canvas");
  output.width = cropWidth;
  output.height = cropHeight;
  output
    .getContext("2d")!
    .drawImage(canvas, cropX, cropY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

  const blob = await canvasToBlob(output, "image/png");
  return {
    blob,
    dataUrl: output.toDataURL("image/png"),
    width: cropWidth,
    height: cropHeight,
  };
}

/** Flattens the transparent PNG onto white and encodes as JPEG (for portals). */
export async function signatureToJpeg(result: ExtractResult): Promise<Blob> {
  const bitmap = await createImageBitmap(result.blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvasToBlob(canvas, "image/jpeg", 0.92);
}
