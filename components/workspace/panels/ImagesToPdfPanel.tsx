"use client";

/** Combine all loaded images into a single A4 PDF, in a chosen order. */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ResultCard } from "@/components/ui/ResultCard";
import { imagesToPdf } from "@/lib/pdf/imagesToPdf";
import { ProcessedResult, WorkspaceFile } from "@/lib/types";

export function ImagesToPdfPanel({ files }: { files: WorkspaceFile[] }) {
  const [order, setOrder] = useState<WorkspaceFile[]>(files);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setOrder(files), [files]);

  function move(index: number, delta: -1 | 1) {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    setOrder(next);
  }

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const blob = await imagesToPdf(order.map((f) => f.file));
      setResult({
        blob,
        filename: "images.pdf",
        note: `${order.length} image${order.length === 1 ? "" : "s"}, one per A4 page`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Conversion failed");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">
        Each image becomes one A4 page (orientation matched automatically).
      </p>
      <ul className="flex flex-wrap gap-3">
        {order.map((item, index) => (
          <li key={item.id} className="w-28 space-y-1">
            <div className="h-28 rounded-lg border border-edge bg-panel-2 overflow-hidden grid place-items-center">
              {item.previewUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.previewUrl}
                  alt={item.file.name}
                  className="object-contain max-h-full"
                />
              )}
            </div>
            <div className="flex items-center justify-between text-xs">
              <button
                onClick={() => move(index, -1)}
                className="px-1 rounded hover:bg-edge cursor-pointer"
              >
                ←
              </button>
              <span className="text-muted">{index + 1}</span>
              <button
                onClick={() => move(index, 1)}
                className="px-1 rounded hover:bg-edge cursor-pointer"
              >
                →
              </button>
            </div>
          </li>
        ))}
      </ul>
      <Button onClick={run} disabled={busy || order.length === 0}>
        {busy ? "Converting…" : "Create PDF"}
      </Button>
      {error && <p className="text-sm text-bad">{error}</p>}
      {result && <ResultCard result={result} />}
    </div>
  );
}
