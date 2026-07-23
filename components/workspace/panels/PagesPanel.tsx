"use client";

/**
 * Visual page editor for a single PDF: rotate, delete, and reorder pages on
 * a thumbnail grid, then apply everything in one rebuild pass.
 */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ResultCard } from "@/components/ui/ResultCard";
import { Spinner } from "@/components/ui/Spinner";
import { openPdf, renderPageToCanvas } from "@/lib/pdf/pdfjs";
import { rebuildPdf } from "@/lib/pdf/pages";
import { baseName } from "@/lib/format";
import { ProcessedResult, WorkspaceFile } from "@/lib/types";

interface PageState {
  sourceIndex: number;
  thumbnail: string; // data URL
  rotation: number; // extra rotation in degrees (0/90/180/270)
  deleted: boolean;
}

const THUMBNAIL_SCALE = 0.35;

export function PagesPanel({ file }: { file: WorkspaceFile }) {
  const [pages, setPages] = useState<PageState[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Render thumbnails once per file.
  useEffect(() => {
    let cancelled = false;
    setPages(null);
    setResult(null);
    setError(null);

    (async () => {
      try {
        const doc = await openPdf(await file.file.arrayBuffer());
        const loaded: PageState[] = [];
        for (let n = 1; n <= doc.numPages; n++) {
          const canvas = await renderPageToCanvas(doc, n, THUMBNAIL_SCALE);
          loaded.push({
            sourceIndex: n - 1,
            thumbnail: canvas.toDataURL("image/jpeg", 0.7),
            rotation: 0,
            deleted: false,
          });
          canvas.width = 0;
          if (cancelled) break;
        }
        await doc.destroy();
        if (!cancelled) setPages(loaded);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Could not read PDF");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file]);

  function update(index: number, patch: Partial<PageState>) {
    setPages((prev) =>
      prev ? prev.map((p, i) => (i === index ? { ...p, ...patch } : p)) : prev,
    );
  }

  function move(index: number, delta: -1 | 1) {
    setPages((prev) => {
      if (!prev) return prev;
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function apply() {
    if (!pages) return;
    const kept = pages.filter((p) => !p.deleted);
    if (kept.length === 0) {
      setError("All pages are deleted — keep at least one.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const blob = await rebuildPdf(
        file.file,
        kept.map((p) => ({ sourceIndex: p.sourceIndex, rotation: p.rotation })),
      );
      setResult({
        blob,
        filename: `${baseName(file.file.name)}-edited.pdf`,
        note: `${kept.length} page${kept.length === 1 ? "" : "s"}`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Rebuild failed");
    }
    setBusy(false);
  }

  if (error && !pages) return <p className="text-sm text-bad">{error}</p>;
  if (!pages) return <Spinner label="Rendering pages…" />;

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Rotate ⟳, delete ✕, or reorder ←→ pages, then apply. Deleted pages are
        dimmed.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {pages.map((page, index) => (
          <div
            key={`${page.sourceIndex}`}
            className={`rounded-xl border border-edge bg-panel-2 p-2 space-y-2 ${page.deleted ? "opacity-35" : ""}`}
          >
            <div className="relative overflow-hidden rounded-lg bg-white grid place-items-center min-h-24">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.thumbnail}
                alt={`Page ${page.sourceIndex + 1}`}
                className="max-w-full transition-transform"
                style={{ transform: `rotate(${page.rotation}deg)` }}
              />
              <span className="absolute top-1 left-1 rounded bg-ink/80 px-1.5 py-0.5 text-[10px] text-bright">
                {page.sourceIndex + 1}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <button
                title="Move left"
                onClick={() => move(index, -1)}
                className="px-1.5 py-0.5 rounded hover:bg-edge cursor-pointer"
              >
                ←
              </button>
              <button
                title="Rotate 90°"
                onClick={() => update(index, { rotation: (page.rotation + 90) % 360 })}
                className="px-1.5 py-0.5 rounded hover:bg-edge cursor-pointer"
              >
                ⟳
              </button>
              <button
                title={page.deleted ? "Restore page" : "Delete page"}
                onClick={() => update(index, { deleted: !page.deleted })}
                className={`px-1.5 py-0.5 rounded cursor-pointer ${page.deleted ? "text-good hover:bg-good/10" : "text-bad hover:bg-bad/10"}`}
              >
                {page.deleted ? "↺" : "✕"}
              </button>
              <button
                title="Move right"
                onClick={() => move(index, 1)}
                className="px-1.5 py-0.5 rounded hover:bg-edge cursor-pointer"
              >
                →
              </button>
            </div>
          </div>
        ))}
      </div>

      <Button onClick={apply} disabled={busy}>
        {busy ? "Applying…" : "Apply changes"}
      </Button>
      {error && <p className="text-sm text-bad">{error}</p>}
      {result && <ResultCard result={result} />}
    </div>
  );
}
