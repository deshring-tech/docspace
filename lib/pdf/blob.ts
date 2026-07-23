/**
 * Wraps pdf-lib output bytes in a Blob. pdf-lib returns
 * Uint8Array<ArrayBufferLike>, which strict TypeScript DOM types no longer
 * accept as a BlobPart, so we slice out the exact ArrayBuffer range first.
 */
export function bytesToPdfBlob(bytes: Uint8Array): Blob {
  const buffer = bytes.buffer.slice(
    bytes.byteOffset,
    bytes.byteOffset + bytes.byteLength,
  ) as ArrayBuffer;
  return new Blob([buffer], { type: "application/pdf" });
}
