import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { track } from "@/lib/analytics/analytics";

/** Lowercased file extension, or "unknown". Used only for aggregate metrics. */
function extensionOf(filename: string): string {
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot + 1).toLowerCase() : "unknown";
}

/**
 * Triggers a browser download for a Blob. This is the single choke point every
 * produced file passes through, so it's also where we record the "download"
 * conversion event (aggregate: file type only, never contents).
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Delay revocation so the download has time to start.
  setTimeout(() => URL.revokeObjectURL(url), 10_000);

  track(ANALYTICS_EVENTS.download, { type: extensionOf(filename) });
}
