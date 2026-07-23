"use client";

/**
 * OCR panel: turn a scanned image or PDF into editable text or a searchable
 * PDF, entirely in the browser. Language multi-select, live progress, and two
 * output modes.
 */
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ResultCard } from "@/components/ui/ResultCard";
import { downloadBlob } from "@/lib/download";
import { baseName } from "@/lib/format";
import {
  DEFAULT_OCR_LANGUAGE,
  OCR_LANGUAGES,
} from "@/lib/ocr/languages";
import {
  OcrMode,
  OcrProgress,
  ocrToSearchablePdf,
  ocrToText,
} from "@/lib/ocr/ocr";
import { ProcessedResult, WorkspaceFile } from "@/lib/types";

export function OcrPanel({ files }: { files: WorkspaceFile[] }) {
  const eligible = useMemo(
    () => files.filter((f) => f.kind === "pdf" || f.kind === "image"),
    [files],
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [langs, setLangs] = useState<string[]>([DEFAULT_OCR_LANGUAGE]);
  const [mode, setMode] = useState<OcrMode>("text");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<OcrProgress | null>(null);
  const [text, setText] = useState<string | null>(null);
  const [pdfResult, setPdfResult] = useState<ProcessedResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const active = eligible.find((f) => f.id === selectedId) ?? eligible[0] ?? null;

  function toggleLang(code: string) {
    setLangs((prev) =>
      prev.includes(code)
        ? prev.filter((c) => c !== code) // keep at least one below
        : [...prev, code],
    );
  }

  async function run() {
    if (!active || langs.length === 0) return;
    setBusy(true);
    setError(null);
    setText(null);
    setPdfResult(null);
    setCopied(false);
    try {
      if (mode === "text") {
        const result = await ocrToText(active.file, active.kind, langs, setProgress);
        setText(result || "(No text was detected.)");
      } else {
        const blob = await ocrToSearchablePdf(active.file, active.kind, langs, setProgress);
        setPdfResult({
          blob,
          filename: `${baseName(active.file.name)}-searchable.pdf`,
          note: "invisible text layer added",
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "OCR failed");
    }
    setProgress(null);
    setBusy(false);
  }

  if (!active) {
    return <p className="text-sm text-muted">Add a scanned image or PDF to run OCR.</p>;
  }

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted">
        Reads text from scans and photos, in your browser. Runs locally and can
        take a few seconds per page — your file is never uploaded.
      </p>

      {eligible.length > 1 && (
        <label className="flex items-center gap-2 text-xs text-muted">
          Working on
          <select
            value={active.id}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-md border border-edge bg-panel-2 px-2 py-1.5 text-bright outline-none focus:border-accent"
          >
            {eligible.map((f) => (
              <option key={f.id} value={f.id}>
                {f.file.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Output mode */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Output</span>
        {(
          [
            ["text", "Extract text"],
            ["pdf", "Searchable PDF"],
          ] as [OcrMode, string][]
        ).map(([value, label]) => (
          <button
            key={value}
            onClick={() => setMode(value)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer
              ${mode === value ? "border-accent bg-accent-soft text-bright" : "border-edge text-body hover:border-accent/50"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Language multi-select */}
      <div className="space-y-1.5">
        <span className="text-xs text-muted">Language(s)</span>
        <div className="flex flex-wrap gap-1.5">
          {OCR_LANGUAGES.map((lang) => {
            const on = langs.includes(lang.code);
            return (
              <button
                key={lang.code}
                onClick={() => toggleLang(lang.code)}
                className={`rounded-full px-2.5 py-1 text-xs border transition-colors cursor-pointer
                  ${on ? "border-accent bg-accent-soft text-bright" : "border-edge text-body hover:border-accent/50"}`}
              >
                {lang.label}
              </button>
            );
          })}
        </div>
        {langs.length === 0 && (
          <p className="text-xs text-warn">Pick at least one language.</p>
        )}
      </div>

      <Button onClick={run} disabled={busy || langs.length === 0}>
        {busy ? "Reading…" : mode === "text" ? "Extract text" : "Create searchable PDF"}
      </Button>

      {/* Progress */}
      {progress && (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted">
            <span>
              {progress.status}
              {progress.page ? ` — page ${progress.page}/${progress.totalPages}` : ""}
            </span>
            <span>{Math.round(progress.progress * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-panel-2 overflow-hidden">
            <div
              className="h-full bg-accent transition-all"
              style={{ width: `${Math.round(progress.progress * 100)}%` }}
            />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-bad">{error}</p>}

      {/* Text result */}
      {text !== null && (
        <div className="space-y-2">
          <textarea
            readOnly
            value={text}
            className="w-full min-h-48 rounded-xl border border-edge bg-panel-2 px-4 py-3 text-sm text-bright outline-none resize-y font-mono"
          />
          <div className="flex flex-wrap gap-2">
            <Button
              onClick={async () => {
                await navigator.clipboard.writeText(text);
                setCopied(true);
                setTimeout(() => setCopied(false), 1500);
              }}
            >
              {copied ? "Copied ✓" : "Copy text"}
            </Button>
            <Button
              variant="ghost"
              onClick={() =>
                downloadBlob(
                  new Blob([text], { type: "text/plain" }),
                  `${baseName(active.file.name)}.txt`,
                )
              }
            >
              Download .txt
            </Button>
          </div>
        </div>
      )}

      {/* Searchable PDF result */}
      {pdfResult && <ResultCard result={pdfResult} />}
    </div>
  );
}
