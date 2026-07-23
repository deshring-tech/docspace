"use client";

import { downloadBlob } from "@/lib/download";
import { formatBytes } from "@/lib/format";
import { ProcessedResult } from "@/lib/types";
import { Button } from "./Button";

/** A finished output: filename, size, optional note, and a download button. */
export function ResultCard({ result }: { result: ProcessedResult }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-good/30 bg-good/5 px-4 py-3">
      <div className="min-w-0">
        <p className="text-sm text-bright truncate">{result.filename}</p>
        <p className="text-xs text-muted">
          {formatBytes(result.blob.size)}
          {result.note ? ` · ${result.note}` : ""}
        </p>
      </div>
      <Button onClick={() => downloadBlob(result.blob, result.filename)}>
        Download
      </Button>
    </div>
  );
}
