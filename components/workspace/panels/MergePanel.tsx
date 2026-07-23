"use client";

/** Merge multiple PDFs into one, with simple reordering. */
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ResultCard } from "@/components/ui/ResultCard";
import { mergePdfs } from "@/lib/pdf/pages";
import { formatBytes } from "@/lib/format";
import { ProcessedResult, WorkspaceFile } from "@/lib/types";

export function MergePanel({ files }: { files: WorkspaceFile[] }) {
  const [order, setOrder] = useState<WorkspaceFile[]>(files);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Keep local order in sync when files are added/removed upstream.
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
      const blob = await mergePdfs(order.map((f) => f.file));
      setResult({
        blob,
        filename: "merged.pdf",
        note: `${order.length} files combined`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Merge failed");
    }
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-muted">Files merge top to bottom — reorder with the arrows.</p>
      <ul className="space-y-2">
        {order.map((item, index) => (
          <li
            key={item.id}
            className="flex items-center gap-3 rounded-lg border border-edge bg-panel-2 px-3 py-2"
          >
            <span className="text-xs text-muted w-5">{index + 1}.</span>
            <span className="text-sm text-bright truncate flex-1">{item.file.name}</span>
            <span className="text-xs text-muted">{formatBytes(item.file.size)}</span>
            <button
              onClick={() => move(index, -1)}
              title="Move up"
              className="px-1.5 py-0.5 rounded hover:bg-edge cursor-pointer text-xs"
            >
              ↑
            </button>
            <button
              onClick={() => move(index, 1)}
              title="Move down"
              className="px-1.5 py-0.5 rounded hover:bg-edge cursor-pointer text-xs"
            >
              ↓
            </button>
          </li>
        ))}
      </ul>
      <Button onClick={run} disabled={busy || order.length < 2}>
        {busy ? "Merging…" : "Merge PDFs"}
      </Button>
      {order.length < 2 && (
        <p className="text-xs text-muted">Add at least two PDFs to merge.</p>
      )}
      {error && <p className="text-sm text-bad">{error}</p>}
      {result && <ResultCard result={result} />}
    </div>
  );
}
