"use client";

/** Split a PDF: extract a page range, or explode into one file per page. */
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ResultCard } from "@/components/ui/ResultCard";
import { extractPages, parsePageRanges, splitToSinglePages } from "@/lib/pdf/pages";
import { zipBlobs } from "@/lib/zip";
import { baseName } from "@/lib/format";
import { ProcessedResult, WorkspaceFile } from "@/lib/types";

export function SplitPanel({ file }: { file: WorkspaceFile }) {
  const [range, setRange] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pageCount = file.pageCount ?? 0;

  async function extract() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const indices = parsePageRanges(range, pageCount);
      const blob = await extractPages(file.file, indices);
      setResult({
        blob,
        filename: `${baseName(file.file.name)}-pages.pdf`,
        note: `${indices.length} page${indices.length === 1 ? "" : "s"} extracted`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Extraction failed");
    }
    setBusy(false);
  }

  async function explode() {
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const blobs = await splitToSinglePages(file.file);
      const name = baseName(file.file.name);
      const zip = await zipBlobs(
        blobs.map((blob, i) => ({ blob, filename: `${name}-page-${i + 1}.pdf` })),
      );
      setResult({
        blob: zip,
        filename: `${name}-pages.zip`,
        note: `${blobs.length} single-page PDFs`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Split failed");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        This PDF has {pageCount || "…"} pages. Extract a selection, or split every
        page into its own file.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <input
          value={range}
          onChange={(e) => setRange(e.target.value)}
          placeholder="e.g. 1-3, 5, 8-10"
          className="w-48 rounded-md border border-edge bg-panel-2 px-3 py-2 text-sm text-bright outline-none focus:border-accent"
        />
        <Button onClick={extract} disabled={busy || !range.trim()}>
          Extract pages
        </Button>
        <Button variant="ghost" onClick={explode} disabled={busy}>
          Split every page (ZIP)
        </Button>
      </div>
      {error && <p className="text-sm text-bad">{error}</p>}
      {result && <ResultCard result={result} />}
    </div>
  );
}
