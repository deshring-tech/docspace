"use client";

/**
 * Extract signature: photo of pen-on-paper → clean cutout. Live preview with
 * a sensitivity slider and ink color choice; download as transparent PNG or
 * white-background JPG (what exam portals want).
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { downloadBlob } from "@/lib/download";
import { baseName, formatBytes } from "@/lib/format";
import {
  ExtractResult,
  InkColor,
  extractSignature,
  signatureToJpeg,
} from "@/lib/image/extractSignature";
import { WorkspaceFile } from "@/lib/types";

export function SignaturePanel({ files }: { files: WorkspaceFile[] }) {
  const images = files.filter((f) => f.kind === "image");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [bias, setBias] = useState(0);
  const [ink, setInk] = useState<InkColor>("black");
  const [result, setResult] = useState<ExtractResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = images.find((f) => f.id === selectedId) ?? images[0] ?? null;

  // Re-extract whenever the source or settings change (debounced for slider).
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    setBusy(true);
    setError(null);
    const timer = setTimeout(async () => {
      try {
        const extracted = await extractSignature(active.file, { bias, ink });
        if (!cancelled) setResult(extracted);
      } catch (err) {
        if (!cancelled) {
          setResult(null);
          setError(err instanceof Error ? err.message : "Extraction failed");
        }
      }
      if (!cancelled) setBusy(false);
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [active, bias, ink]);

  if (!active) {
    return <p className="text-sm text-muted">Add a photo of your signature to begin.</p>;
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Take a photo of your signature on plain paper — the paper background is
        removed automatically. Adjust sensitivity if strokes are missing or
        shadows remain.
      </p>

      {images.length > 1 && (
        <label className="flex items-center gap-2 text-xs text-muted">
          Working on
          <select
            value={active.id}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-md border border-edge bg-panel-2 px-2 py-1.5 text-bright outline-none focus:border-accent"
          >
            {images.map((image) => (
              <option key={image.id} value={image.id}>
                {image.file.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Before / after */}
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-1">
          <p className="text-xs text-muted">Original</p>
          <div className="rounded-xl border border-edge bg-panel-2 p-2 grid place-items-center min-h-36">
            {active.previewUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={active.previewUrl} alt="Original" className="max-h-40 max-w-full" />
            )}
          </div>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted">Extracted (transparent)</p>
          <div
            className="rounded-xl border border-edge p-2 grid place-items-center min-h-36"
            // Checkerboard so transparency is visible.
            style={{
              backgroundImage:
                "linear-gradient(45deg,#3a3f4d 25%,transparent 25%,transparent 75%,#3a3f4d 75%),linear-gradient(45deg,#3a3f4d 25%,#2a2f3a 25%,#2a2f3a 75%,#3a3f4d 75%)",
              backgroundSize: "16px 16px",
              backgroundPosition: "0 0, 8px 8px",
            }}
          >
            {busy ? (
              <Spinner label="Extracting…" />
            ) : result ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result.dataUrl} alt="Extracted signature" className="max-h-40 max-w-full" />
            ) : (
              <p className="text-xs text-bad">{error ?? "No result"}</p>
            )}
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-xs text-muted">
          Sensitivity
          <input
            type="range"
            min={-100}
            max={100}
            value={bias}
            onChange={(e) => setBias(Number(e.target.value))}
            className="w-40 accent-[--color-accent]"
          />
          <span className="w-8 text-right text-bright">{bias}</span>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted">
          Ink
          <select
            value={ink}
            onChange={(e) => setInk(e.target.value as InkColor)}
            className="rounded-md border border-edge bg-panel-2 px-2 py-1.5 text-bright outline-none focus:border-accent"
          >
            <option value="black">Black</option>
            <option value="blue">Blue</option>
            <option value="original">Original</option>
          </select>
        </label>
      </div>

      {/* Downloads */}
      <div className="flex flex-wrap gap-2">
        <Button
          disabled={!result || busy}
          onClick={() =>
            result &&
            downloadBlob(result.blob, `${baseName(active.file.name)}-signature.png`)
          }
        >
          Download PNG (transparent)
        </Button>
        <Button
          variant="ghost"
          disabled={!result || busy}
          onClick={async () => {
            if (!result) return;
            downloadBlob(
              await signatureToJpeg(result),
              `${baseName(active.file.name)}-signature.jpg`,
            );
          }}
        >
          Download JPG (white background)
        </Button>
        {result && (
          <span className="self-center text-xs text-muted">
            {result.width}×{result.height}px · {formatBytes(result.blob.size)} — need an
            exact KB size? Run it through Compress next.
          </span>
        )}
      </div>
      {error && result && <p className="text-xs text-warn">⚠ {error}</p>}
    </div>
  );
}
