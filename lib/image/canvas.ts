/**
 * Shared canvas helpers.
 *
 * `canvas.toBlob` is callback-based and every encoder in the app needs the
 * same promise wrapper, so it lives here once rather than being re-declared in
 * each module.
 */

/** Promise wrapper around canvas.toBlob. Rejects if encoding fails. */
export function canvasToBlob(
  canvas: HTMLCanvasElement,
  mimeType: string,
  quality?: number,
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Encoding failed"))),
      mimeType,
      quality,
    );
  });
}
