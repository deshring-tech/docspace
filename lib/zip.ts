/** Bundles multiple blobs into a single ZIP for download. */
import JSZip from "jszip";

export async function zipBlobs(
  entries: { blob: Blob; filename: string }[],
): Promise<Blob> {
  const zip = new JSZip();
  for (const entry of entries) zip.file(entry.filename, entry.blob);
  return zip.generateAsync({ type: "blob" });
}
