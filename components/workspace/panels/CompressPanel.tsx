"use client";

/**
 * The hero feature: compress photos/signatures/PDFs to an exact size window,
 * with one-click presets for Indian exam & form portals.
 */
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ResultCard } from "@/components/ui/ResultCard";
import { Spinner } from "@/components/ui/Spinner";
import { compressImageToTarget } from "@/lib/image/compressImage";
import { compressPdfToTarget } from "@/lib/pdf/compressPdf";
import { PresetChips } from "@/components/workspace/PresetChips";
import { getPreset } from "@/lib/presets/examPresets";
import { baseName, formatBytes } from "@/lib/format";
import { ProcessedResult, WorkspaceFile } from "@/lib/types";

interface CompressPanelProps {
  files: WorkspaceFile[];
  /** Deep-link defaults from SEO landing pages. */
  initialPresetId?: string;
  initialMaxKb?: number;
}

export function CompressPanel({ files, initialPresetId, initialMaxKb }: CompressPanelProps) {
  const [presetId, setPresetId] = useState<string>(
    initialPresetId && getPreset(initialPresetId) ? initialPresetId : "custom",
  );
  const [customMaxKb, setCustomMaxKb] = useState<string>(String(initialMaxKb ?? 200));
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [results, setResults] = useState<ProcessedResult[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  const preset = presetId === "custom" ? undefined : getPreset(presetId);
  const targets = useMemo(
    () => files.filter((f) => f.kind === "image" || f.kind === "pdf"),
    [files],
  );

  const effectiveMaxKb = preset ? preset.maxKB : Math.max(1, Number(customMaxKb) || 200);

  async function run() {
    setBusy(true);
    setResults([]);
    setWarnings([]);
    const nextResults: ProcessedResult[] = [];
    const nextWarnings: string[] = [];

    for (const item of targets) {
      const before = item.file.size;
      const suffix = preset ? preset.id : `${effectiveMaxKb}kb`;
      try {
        if (item.kind === "image") {
          const output = await compressImageToTarget(item.file, {
            maxBytes: effectiveMaxKb * 1024,
            minBytes: preset?.minKB ? preset.minKB * 1024 : undefined,
            width: preset?.width,
            height: preset?.height,
            mimeType: "image/jpeg",
          });
          if (output.belowMinimum && preset?.minKB) {
            nextWarnings.push(
              `${item.file.name}: output is below the ${preset.minKB} KB minimum — the source image may be too small or too plain. Try a higher-resolution original.`,
            );
          }
          nextResults.push({
            blob: output.blob,
            filename: `${baseName(item.file.name)}-${suffix}.jpg`,
            note: `${formatBytes(before)} → ${formatBytes(output.blob.size)} · ${output.width}×${output.height}px`,
          });
        } else {
          setProgress(`Compressing ${item.file.name}…`);
          const output = await compressPdfToTarget(
            item.file,
            effectiveMaxKb * 1024,
            (done, total) =>
              setProgress(`Compressing ${item.file.name} — page ${done}/${total}`),
          );
          if (!output.fits) {
            nextWarnings.push(
              `${item.file.name}: could not reach ${effectiveMaxKb} KB — this is the smallest achievable size. Try splitting the PDF first.`,
            );
          }
          nextResults.push({
            blob: output.blob,
            filename: `${baseName(item.file.name)}-${suffix}.pdf`,
            note: `${formatBytes(before)} → ${formatBytes(output.blob.size)}`,
          });
        }
      } catch (error) {
        nextWarnings.push(
          `${item.file.name}: ${error instanceof Error ? error.message : "processing failed"}`,
        );
      }
    }

    setResults(nextResults);
    setWarnings(nextWarnings);
    setProgress(null);
    setBusy(false);
  }

  return (
    <div className="space-y-5">
      {/* Preset picker */}
      <div className="space-y-3">
        <PresetChips selectedId={presetId} onSelect={setPresetId} />
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted w-24 shrink-0">Custom</span>
          <button
            onClick={() => setPresetId("custom")}
            className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer
              ${presetId === "custom" ? "border-accent bg-accent-soft text-bright" : "border-edge text-body hover:border-accent/50"}`}
          >
            Custom size
          </button>
          {presetId === "custom" && (
            <label className="flex items-center gap-2 text-xs text-muted">
              under
              <input
                type="number"
                min={1}
                value={customMaxKb}
                onChange={(e) => setCustomMaxKb(e.target.value)}
                className="w-20 rounded-md border border-edge bg-panel-2 px-2 py-1.5 text-bright outline-none focus:border-accent"
              />
              KB
            </label>
          )}
        </div>
      </div>

      {/* Selected spec summary */}
      <div className="rounded-lg bg-panel-2 border border-edge px-3 py-2 text-xs text-muted">
        {preset ? (
          <>
            <span className="text-bright">{preset.label}:</span> {preset.spec}
            <span className="ml-2 text-warn">
              Verify against the latest official notification.
            </span>
          </>
        ) : (
          <>
            Target: <span className="text-bright">≤ {effectiveMaxKb} KB</span> — images
            become JPEG; PDFs are recompressed page by page.
          </>
        )}
      </div>

      <Button onClick={run} disabled={busy || targets.length === 0}>
        {busy ? "Working…" : `Compress ${targets.length} file${targets.length === 1 ? "" : "s"}`}
      </Button>
      {progress && <Spinner label={progress} />}

      {warnings.map((warning) => (
        <p key={warning} className="text-xs text-warn">
          ⚠ {warning}
        </p>
      ))}
      <div className="space-y-2">
        {results.map((result) => (
          <ResultCard key={result.filename} result={result} />
        ))}
      </div>
    </div>
  );
}
