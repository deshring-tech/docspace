"use client";

/**
 * Universal "Export as…" surface. One menu instead of a dozen converter
 * pages: pick the output format and every loaded file that can become it,
 * does. Formats we can't yet do faithfully in-browser (PDF→Word) are shown
 * disabled rather than shipped badly.
 */
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { ResultCard } from "@/components/ui/ResultCard";
import { Spinner } from "@/components/ui/Spinner";
import { canvasToBlob } from "@/lib/image/canvas";
import { imagesToPdf } from "@/lib/pdf/imagesToPdf";
import { pdfToImages } from "@/lib/pdf/pdfToImages";
import { zipBlobs } from "@/lib/zip";
import { baseName } from "@/lib/format";
import { ProcessedResult, WorkspaceFile } from "@/lib/types";

type TargetFormat = "pdf" | "jpg" | "png" | "webp";

const FORMATS: { id: TargetFormat; label: string }[] = [
  { id: "pdf", label: "PDF" },
  { id: "jpg", label: "JPG" },
  { id: "png", label: "PNG" },
  { id: "webp", label: "WebP" },
];

const COMING_SOON = ["Word (DOCX)", "Excel", "PowerPoint"];

/** Re-encodes an image file to another raster format via canvas. */
async function reencodeImage(file: File, mime: string): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  const ctx = canvas.getContext("2d")!;
  if (mime === "image/jpeg") {
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
  ctx.drawImage(bitmap, 0, 0);
  bitmap.close();
  return canvasToBlob(canvas, mime, 0.92);
}

export function ConvertPanel({ files }: { files: WorkspaceFile[] }) {
  const [target, setTarget] = useState<TargetFormat>("pdf");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [results, setResults] = useState<ProcessedResult[]>([]);
  const [notes, setNotes] = useState<string[]>([]);

  async function run() {
    setBusy(true);
    setResults([]);
    setNotes([]);
    const out: ProcessedResult[] = [];
    const skipped: string[] = [];

    for (const item of files) {
      const name = baseName(item.file.name);
      try {
        if (target === "pdf") {
          if (item.kind === "image") {
            const blob = await imagesToPdf([item.file]);
            out.push({ blob, filename: `${name}.pdf` });
          } else {
            skipped.push(`${item.file.name} is already a PDF or unsupported.`);
          }
        } else {
          const mime =
            target === "jpg" ? "image/jpeg" : target === "png" ? "image/png" : "image/webp";
          if (item.kind === "image") {
            const blob = await reencodeImage(item.file, mime);
            out.push({ blob, filename: `${name}.${target}` });
          } else if (item.kind === "pdf" && target !== "webp") {
            setProgress(`Rendering ${item.file.name}…`);
            const pages = await pdfToImages(item.file, mime as "image/png" | "image/jpeg", (d, t) =>
              setProgress(`Rendering ${item.file.name} — page ${d}/${t}`),
            );
            if (pages.length === 1) {
              out.push({ blob: pages[0], filename: `${name}.${target}` });
            } else {
              const zip = await zipBlobs(
                pages.map((blob, i) => ({ blob, filename: `${name}-page-${i + 1}.${target}` })),
              );
              out.push({ blob: zip, filename: `${name}-${target}.zip`, note: `${pages.length} pages` });
            }
          } else {
            skipped.push(`${item.file.name}: can't convert to ${target.toUpperCase()}.`);
          }
        }
      } catch (error) {
        skipped.push(
          `${item.file.name}: ${error instanceof Error ? error.message : "conversion failed"}`,
        );
      }
    }

    setResults(out);
    setNotes(skipped);
    setProgress(null);
    setBusy(false);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted">Export as</span>
        {FORMATS.map((format) => (
          <button
            key={format.id}
            onClick={() => setTarget(format.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer
              ${target === format.id ? "border-accent bg-accent-soft text-bright" : "border-edge text-body hover:border-accent/50"}`}
          >
            {format.label}
          </button>
        ))}
        {COMING_SOON.map((label) => (
          <span
            key={label}
            title="High-fidelity conversion is on the roadmap — we won't ship a bad one."
            className="rounded-full px-3 py-1.5 text-xs border border-edge text-muted opacity-50 cursor-not-allowed"
          >
            {label} · soon
          </span>
        ))}
      </div>

      <Button onClick={run} disabled={busy || files.length === 0}>
        {busy ? "Converting…" : "Convert"}
      </Button>
      {progress && <Spinner label={progress} />}

      {notes.map((note) => (
        <p key={note} className="text-xs text-warn">
          ⚠ {note}
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
