"use client";

/** Watermark & page numbers for PDFs — applied without rasterizing. */
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ResultCard } from "@/components/ui/ResultCard";
import { stampPdf } from "@/lib/pdf/stamp";
import { baseName } from "@/lib/format";
import { ProcessedResult, WorkspaceFile } from "@/lib/types";

export function StampPanel({ files }: { files: WorkspaceFile[] }) {
  const pdfs = files.filter((f) => f.kind === "pdf");
  const [watermark, setWatermark] = useState("CONFIDENTIAL");
  const [useWatermark, setUseWatermark] = useState(true);
  const [opacity, setOpacity] = useState(15);
  const [pageNumbers, setPageNumbers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<ProcessedResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setError(null);
    setResults([]);
    const output: ProcessedResult[] = [];
    try {
      for (const pdf of pdfs) {
        const blob = await stampPdf(pdf.file, {
          watermark: useWatermark ? watermark : undefined,
          opacity: opacity / 100,
          pageNumbers,
        });
        output.push({
          blob,
          filename: `${baseName(pdf.file.name)}-stamped.pdf`,
          note: [useWatermark && watermark ? `"${watermark}"` : null, pageNumbers ? "page numbers" : null]
            .filter(Boolean)
            .join(" + "),
        });
      }
      setResults(output);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Stamping failed");
    }
    setBusy(false);
  }

  if (pdfs.length === 0) {
    return <p className="text-sm text-muted">Add a PDF to watermark or number.</p>;
  }

  const nothingSelected = (!useWatermark || !watermark.trim()) && !pageNumbers;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-body">
          <input
            type="checkbox"
            checked={useWatermark}
            onChange={(e) => setUseWatermark(e.target.checked)}
            className="accent-[--color-accent]"
          />
          Watermark
        </label>
        <input
          value={watermark}
          onChange={(e) => setWatermark(e.target.value)}
          disabled={!useWatermark}
          placeholder="e.g. CONFIDENTIAL, DRAFT, your name"
          className="w-64 rounded-md border border-edge bg-panel-2 px-3 py-2 text-sm text-bright outline-none focus:border-accent disabled:opacity-40"
        />
        <label className="flex items-center gap-2 text-xs text-muted">
          Opacity
          <input
            type="range"
            min={5}
            max={60}
            value={opacity}
            onChange={(e) => setOpacity(Number(e.target.value))}
            disabled={!useWatermark}
            className="w-28 accent-[--color-accent]"
          />
          <span className="w-8 text-bright">{opacity}%</span>
        </label>
      </div>

      <label className="flex items-center gap-2 text-sm text-body">
        <input
          type="checkbox"
          checked={pageNumbers}
          onChange={(e) => setPageNumbers(e.target.checked)}
          className="accent-[--color-accent]"
        />
        Add page numbers (1 / N, bottom center)
      </label>

      <Button onClick={run} disabled={busy || nothingSelected}>
        {busy ? "Stamping…" : `Apply to ${pdfs.length} PDF${pdfs.length === 1 ? "" : "s"}`}
      </Button>
      {nothingSelected && (
        <p className="text-xs text-muted">Enable a watermark or page numbers first.</p>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
      <div className="space-y-2">
        {results.map((result) => (
          <ResultCard key={result.filename} result={result} />
        ))}
      </div>
    </div>
  );
}
