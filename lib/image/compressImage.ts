/**
 * Exact-KB image compression — the hero feature.
 *
 * Given a target size window (e.g. SSC signature: 10–20 KB) and optional
 * exact pixel dimensions, this produces a JPEG that fits the window:
 *
 *   1. Draw the image onto a canvas at the requested dimensions.
 *   2. Binary-search JPEG quality for the largest output ≤ maxBytes.
 *   3. If even minimum quality is too large (and dimensions are flexible),
 *      progressively scale down and repeat.
 *
 * Everything runs in the browser; the file never leaves the device.
 */

import { canvasToBlob } from "./canvas";

export interface CompressImageOptions {
  /** Hard upper bound in bytes (the "must be under X KB" requirement). */
  maxBytes: number;
  /** Optional lower bound in bytes (many exam portals enforce a minimum). */
  minBytes?: number;
  /** Exact output width/height in px. When set, dimensions are never changed. */
  width?: number;
  height?: number;
  /** Output mime type. Exam portals almost always want JPEG. */
  mimeType?: "image/jpeg" | "image/png" | "image/webp";
}

export interface CompressImageResult {
  blob: Blob;
  width: number;
  height: number;
  /** Quality that was finally used (0–1); undefined for PNG. */
  quality?: number;
  /** True if we could not reach the minimum size (output is below minBytes). */
  belowMinimum: boolean;
}

const MIN_QUALITY = 0.02;
const MAX_QUALITY = 0.98;
const QUALITY_SEARCH_STEPS = 8;

/** Loads a File into an ImageBitmap (handles JPEG/PNG/WebP inputs). */
async function loadImage(file: File | Blob): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

function drawToCanvas(
  image: ImageBitmap,
  width: number,
  height: number,
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not create canvas context");
  // White background: JPEG has no alpha, and exam photos expect white.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, width, height);
  return canvas;
}

/**
 * Binary-searches JPEG quality for the largest blob ≤ maxBytes.
 * Returns null if even MIN_QUALITY overshoots.
 */
async function searchQuality(
  canvas: HTMLCanvasElement,
  mimeType: string,
  maxBytes: number,
): Promise<{ blob: Blob; quality: number } | null> {
  let low = MIN_QUALITY;
  let high = MAX_QUALITY;
  let best: { blob: Blob; quality: number } | null = null;

  // Quick check: does the floor even fit?
  const floor = await canvasToBlob(canvas, mimeType, MIN_QUALITY);
  if (floor.size > maxBytes) return null;
  best = { blob: floor, quality: MIN_QUALITY };

  for (let step = 0; step < QUALITY_SEARCH_STEPS; step++) {
    const mid = (low + high) / 2;
    const blob = await canvasToBlob(canvas, mimeType, mid);
    if (blob.size <= maxBytes) {
      best = { blob, quality: mid };
      low = mid;
    } else {
      high = mid;
    }
  }
  return best;
}

export async function compressImageToTarget(
  file: File | Blob,
  options: CompressImageOptions,
): Promise<CompressImageResult> {
  const mimeType = options.mimeType ?? "image/jpeg";
  const image = await loadImage(file);

  const fixedDimensions = options.width != null && options.height != null;
  let width = options.width ?? image.width;
  let height = options.height ?? image.height;

  // PNG has no quality knob — only dimensions can reduce size.
  if (mimeType === "image/png") {
    let canvas = drawToCanvas(image, width, height);
    let blob = await canvasToBlob(canvas, mimeType, 1);
    while (blob.size > options.maxBytes && !fixedDimensions && width > 16) {
      width = Math.floor(width * 0.85);
      height = Math.floor(height * 0.85);
      canvas = drawToCanvas(image, width, height);
      blob = await canvasToBlob(canvas, mimeType, 1);
    }
    image.close();
    return {
      blob,
      width,
      height,
      belowMinimum: options.minBytes != null && blob.size < options.minBytes,
    };
  }

  // JPEG/WebP: search quality, scaling down only if allowed and needed.
  for (;;) {
    const canvas = drawToCanvas(image, width, height);
    const found = await searchQuality(canvas, mimeType, options.maxBytes);
    if (found) {
      // If there's a minimum and we're under it, nudge quality up as far as
      // the max allows (searchQuality already found the largest fit, so if
      // we're still below minBytes the window is simply unreachable — flag it).
      image.close();
      return {
        blob: found.blob,
        width,
        height,
        quality: found.quality,
        belowMinimum:
          options.minBytes != null && found.blob.size < options.minBytes,
      };
    }
    if (fixedDimensions || width <= 16 || height <= 16) {
      // Cannot shrink further — return the smallest thing we can make.
      const blob = await canvasToBlob(canvas, mimeType, MIN_QUALITY);
      image.close();
      return { blob, width, height, quality: MIN_QUALITY, belowMinimum: false };
    }
    width = Math.floor(width * 0.8);
    height = Math.floor(height * 0.8);
  }
}
