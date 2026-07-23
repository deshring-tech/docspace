/**
 * Passport / ID photo geometry and background cleanup.
 *
 * The maths is kept pure and separate from the canvas work so the crop
 * behaviour is unit-testable: `computeDrawRect` decides where the source image
 * lands inside the target frame, and everything else just paints it.
 */

/** User-controlled framing: zoom multiplier plus pan offset in target pixels. */
export interface CropTransform {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export const DEFAULT_TRANSFORM: CropTransform = { zoom: 1, offsetX: 0, offsetY: 0 };

/** Minimum zoom guard — below this the image would not cover the frame. */
const MIN_ZOOM = 0.2;

export interface DrawRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Places the source image inside the target frame.
 *
 * The baseline is "cover": the image is scaled so it always fills the frame at
 * zoom = 1, centred, with no letterboxing. Zoom scales up from there and the
 * offsets pan it, so the frame is never left partially empty at zoom >= 1.
 */
export function computeDrawRect(
  sourceWidth: number,
  sourceHeight: number,
  targetWidth: number,
  targetHeight: number,
  transform: CropTransform,
): DrawRect {
  const cover = Math.max(targetWidth / sourceWidth, targetHeight / sourceHeight);
  const scale = cover * Math.max(MIN_ZOOM, transform.zoom);
  const width = sourceWidth * scale;
  const height = sourceHeight * scale;
  return {
    x: (targetWidth - width) / 2 + transform.offsetX,
    y: (targetHeight - height) / 2 + transform.offsetY,
    width,
    height,
  };
}

/** Renders the framed photo at exact target dimensions onto a new canvas. */
export function drawPhoto(
  source: ImageBitmap,
  targetWidth: number,
  targetHeight: number,
  transform: CropTransform,
  background = "#ffffff",
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Could not create canvas context");

  ctx.fillStyle = background;
  ctx.fillRect(0, 0, targetWidth, targetHeight);
  ctx.imageSmoothingQuality = "high";

  const rect = computeDrawRect(
    source.width,
    source.height,
    targetWidth,
    targetHeight,
    transform,
  );
  ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height);
  return canvas;
}

/** Squared RGB distance — avoids a sqrt in the inner loop. */
function colorDistanceSquared(
  data: Uint8ClampedArray,
  a: number,
  r: number,
  g: number,
  b: number,
): number {
  const dr = data[a] - r;
  const dg = data[a + 1] - g;
  const db = data[a + 2] - b;
  return dr * dr + dg * dg + db * db;
}

/**
 * Replaces a plain background with white.
 *
 * Works by flood-filling inward from the border: only pixels connected to the
 * edge and similar in colour to it are replaced, so the subject is left alone.
 * This is deliberately a simple, predictable algorithm — it handles the common
 * "photo against a plain wall" case and does nothing clever on busy
 * backgrounds (the UI says so rather than pretending otherwise).
 *
 * @param tolerance 0–100, how much colour variation still counts as background.
 */
export function whitenBackground(canvas: HTMLCanvasElement, tolerance: number): void {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;

  const { width, height } = canvas;
  const image = ctx.getImageData(0, 0, width, height);
  const data = image.data;

  // Seed colour = average of the border pixels.
  let sumR = 0;
  let sumG = 0;
  let sumB = 0;
  let samples = 0;
  const sampleBorder = (x: number, y: number) => {
    const index = (y * width + x) * 4;
    sumR += data[index];
    sumG += data[index + 1];
    sumB += data[index + 2];
    samples++;
  };
  for (let x = 0; x < width; x++) {
    sampleBorder(x, 0);
    sampleBorder(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    sampleBorder(0, y);
    sampleBorder(width - 1, y);
  }
  if (samples === 0) return;
  const seedR = sumR / samples;
  const seedG = sumG / samples;
  const seedB = sumB / samples;

  // Tolerance maps to a squared-distance threshold across the RGB cube.
  const limit = ((tolerance / 100) * 160) ** 2;

  const visited = new Uint8Array(width * height);
  const stack: number[] = [];
  const pushIfBackground = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= width || y >= height) return;
    const pixel = y * width + x;
    if (visited[pixel]) return;
    visited[pixel] = 1;
    if (colorDistanceSquared(data, pixel * 4, seedR, seedG, seedB) <= limit) {
      stack.push(pixel);
    }
  };

  for (let x = 0; x < width; x++) {
    pushIfBackground(x, 0);
    pushIfBackground(x, height - 1);
  }
  for (let y = 0; y < height; y++) {
    pushIfBackground(0, y);
    pushIfBackground(width - 1, y);
  }

  while (stack.length > 0) {
    const pixel = stack.pop()!;
    const index = pixel * 4;
    data[index] = 255;
    data[index + 1] = 255;
    data[index + 2] = 255;
    data[index + 3] = 255;

    const x = pixel % width;
    const y = (pixel / width) | 0;
    pushIfBackground(x + 1, y);
    pushIfBackground(x - 1, y);
    pushIfBackground(x, y + 1);
    pushIfBackground(x, y - 1);
  }

  ctx.putImageData(image, 0, 0);
}
