"use client";

/**
 * The workspace — the whole product lives on this one screen.
 *
 * Drop files → the relevant actions appear → act → download. No tool pages,
 * no navigation. SEO landing pages deep-link here with an action/preset
 * preselected (see lib/seo/toolPages.ts).
 */
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { CommandPalette } from "./CommandPalette";
import { DropZone } from "./DropZone";
import { PresetChips } from "./PresetChips";
import { CompressPanel } from "./panels/CompressPanel";
import { ConvertPanel } from "./panels/ConvertPanel";
import { ImagesToPdfPanel } from "./panels/ImagesToPdfPanel";
import { MergePanel } from "./panels/MergePanel";
import { PagesPanel } from "./panels/PagesPanel";
import { OcrPanel } from "./panels/OcrPanel";
import { PhotoPanel } from "./panels/PhotoPanel";
import { SignaturePanel } from "./panels/SignaturePanel";
import { SplitPanel } from "./panels/SplitPanel";
import { StampPanel } from "./panels/StampPanel";
import { getPageCount, hasTextLayer } from "@/lib/pdf/pdfjs";
import { formatBytes } from "@/lib/format";
import { track } from "@/lib/analytics/analytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { CommandResult } from "@/lib/intent/commands";
import { getPreset } from "@/lib/presets/examPresets";
import { buildSuggestions } from "@/lib/suggest/suggestions";
import { ActionId, FileKind, WorkspaceFile } from "@/lib/types";

interface WorkspaceProps {
  initialAction?: ActionId;
  initialPresetId?: string;
  initialMaxKb?: number;
}

function detectKind(file: File): FileKind {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md"))
    return "text";
  return "other";
}

const KIND_ICONS: Record<FileKind, string> = {
  pdf: "📕",
  image: "🖼️",
  text: "📝",
  other: "📎",
};

interface ActionDef {
  id: ActionId;
  label: string;
  /** Whether the action makes sense for the current file mix. */
  available: (counts: Record<FileKind, number>) => boolean;
}

const ACTIONS: ActionDef[] = [
  { id: "compress", label: "Compress / Resize", available: (c) => c.pdf + c.image > 0 },
  { id: "convert", label: "Convert", available: (c) => c.pdf + c.image > 0 },
  { id: "pages", label: "Edit pages", available: (c) => c.pdf > 0 },
  { id: "merge", label: "Merge", available: (c) => c.pdf > 0 },
  { id: "split", label: "Split", available: (c) => c.pdf > 0 },
  { id: "photo", label: "Passport photo", available: (c) => c.image > 0 },
  { id: "signature", label: "Extract signature", available: (c) => c.image > 0 },
  { id: "stamp", label: "Watermark / numbers", available: (c) => c.pdf > 0 },
  { id: "ocr", label: "OCR (scan → text)", available: (c) => c.pdf + c.image > 0 },
  { id: "images-to-pdf", label: "Images → one PDF", available: (c) => c.image > 0 },
];

let nextId = 1;

export function Workspace({ initialAction, initialPresetId, initialMaxKb }: WorkspaceProps) {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [action, setAction] = useState<ActionId | null>(initialAction ?? null);
  /** For single-PDF actions (pages/split) when several PDFs are loaded. */
  const [selectedPdfId, setSelectedPdfId] = useState<string | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  /** Compress config chosen via palette/suggestions (overrides URL params). */
  const [compressConfig, setCompressConfig] = useState<{
    presetId?: string;
    maxKb?: number;
  } | null>(null);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(
    () => new Set(),
  );
  /** Empty-state preset launcher visibility. */
  const [showPresets, setShowPresets] = useState(false);

  // Ctrl+K / Cmd+K opens the command palette anywhere in the workspace.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setPaletteOpen((open) => !open);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  /** Executes a palette command or suggestion. */
  const runCommand = useCallback((result: CommandResult) => {
    track(ANALYTICS_EVENTS.commandRun, {
      action: result.action,
      preset: result.presetId,
      target: result.maxKb,
    });
    if (result.action === "write") {
      window.location.href = "/write";
      return;
    }
    if (result.presetId || result.maxKb) {
      setCompressConfig({ presetId: result.presetId, maxKb: result.maxKb });
    }
    setAction(result.action);
  }, []);

  const addFiles = useCallback(
    (incoming: File[]) => {
      const entries: WorkspaceFile[] = incoming.map((file) => {
        const kind = detectKind(file);
        return {
          id: `f${nextId++}`,
          file,
          kind,
          previewUrl: kind === "image" ? URL.createObjectURL(file) : undefined,
        };
      });
      setFiles((prev) => [...prev, ...entries]);
      track(ANALYTICS_EVENTS.fileAdded, { count: entries.length });

      // Lazily resolve PDF page counts (split/pages panels) and image
      // dimensions (smart suggestions).
      for (const entry of entries) {
        if (entry.kind === "pdf") {
          getPageCount(entry.file)
            .then((pageCount) =>
              setFiles((prev) =>
                prev.map((f) => (f.id === entry.id ? { ...f, pageCount } : f)),
              ),
            )
            .catch(() => {}); // count stays undefined; panels handle it
          hasTextLayer(entry.file)
            .then((hasText) =>
              setFiles((prev) =>
                prev.map((f) => (f.id === entry.id ? { ...f, hasText } : f)),
              ),
            )
            .catch(() => {}); // undefined ⇒ no OCR suggestion, harmless
        } else if (entry.kind === "image") {
          createImageBitmap(entry.file)
            .then((bitmap) => {
              const { width, height } = bitmap;
              bitmap.close();
              setFiles((prev) =>
                prev.map((f) =>
                  f.id === entry.id ? { ...f, imageWidth: width, imageHeight: height } : f,
                ),
              );
            })
            .catch(() => {});
        }
      }

      // Auto-open the most likely action so the user never hunts for a tool.
      if (!action) {
        setAction(initialAction ?? "compress");
      }
    },
    [action, initialAction],
  );

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const counts = useMemo(() => {
    const c: Record<FileKind, number> = { pdf: 0, image: 0, text: 0, other: 0 };
    for (const f of files) c[f.kind]++;
    return c;
  }, [files]);

  const pdfs = useMemo(() => files.filter((f) => f.kind === "pdf"), [files]);
  const images = useMemo(() => files.filter((f) => f.kind === "image"), [files]);
  const activePdf =
    pdfs.find((f) => f.id === selectedPdfId) ?? (pdfs.length > 0 ? pdfs[0] : null);

  /** Sends a dropped text file straight to the writing pad. */
  const openInPad = useCallback(async (entry: WorkspaceFile) => {
    const text = await entry.file.text();
    sessionStorage.setItem("docspace-pad-import", text);
    window.location.href = "/write";
  }, []);

  const selectedPreset = compressConfig?.presetId
    ? getPreset(compressConfig.presetId)
    : undefined;

  const palette = (
    <CommandPalette
      open={paletteOpen}
      onClose={() => setPaletteOpen(false)}
      onRun={runCommand}
    />
  );

  const paletteTrigger = (
    <button
      onClick={() => setPaletteOpen(true)}
      className="w-full flex items-center gap-3 rounded-xl border border-edge bg-panel px-4 py-3 text-sm text-muted hover:border-accent/50 transition-colors cursor-pointer"
    >
      <span className="text-accent">⌘</span>
      What would you like to do?
      <kbd className="ml-auto rounded border border-edge px-1.5 py-0.5 text-[10px]">
        Ctrl K
      </kbd>
    </button>
  );

  // ——— Empty state: the whole pitch on one screen ———
  if (files.length === 0) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 space-y-8">
        {palette}
        <div className="text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-bold text-bright tracking-tight">
            Finish any document task. Fast.
          </h1>
          <p className="text-muted max-w-xl mx-auto">
            Compress to exam-portal limits, merge, split, convert and edit —
            in one workspace, entirely in your browser. No uploads. No accounts.
            No limits.
          </p>
        </div>

        {paletteTrigger}

        <DropZone hero onFiles={addFiles} />

        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            href="/write"
            className="rounded-2xl border border-edge bg-panel p-5 hover:border-accent/50 transition-colors block"
          >
            <p className="font-medium text-bright">✍️ Create a new document</p>
            <p className="text-sm text-muted mt-1">
              Write in the pad, export as PDF, Word, Markdown, HTML or TXT.
            </p>
          </Link>
          <button
            onClick={() => setShowPresets((open) => !open)}
            aria-expanded={showPresets}
            className={`rounded-2xl border bg-panel p-5 transition-colors text-left cursor-pointer
              ${showPresets ? "border-accent" : "border-edge hover:border-accent/50"}`}
          >
            <p className="font-medium text-bright">
              🎯 Exam &amp; form presets {showPresets ? "▴" : "▾"}
            </p>
            <p className="text-sm text-muted mt-1">
              SSC · UPSC · NEET · JEE · PAN · Passport · US · Schengen — photo,
              signature and document sizes, one click.
            </p>
          </button>
        </div>

        {/* Pick the target first, then drop the file — genuinely goal-first. */}
        {showPresets && (
          <div className="rounded-2xl border border-edge bg-panel p-5 space-y-4">
            <PresetChips
              selectedId={compressConfig?.presetId ?? null}
              onSelect={(presetId) => {
                setCompressConfig({ presetId });
                setAction("compress");
              }}
            />
            {selectedPreset ? (
              <div className="rounded-lg border border-good/40 bg-good/5 px-3 py-2 text-xs">
                <span className="text-bright">{selectedPreset.label} selected</span>
                <span className="text-muted"> — {selectedPreset.spec}. </span>
                <span className="text-good">
                  Now drop your file above and it will be prepared automatically.
                </span>
              </div>
            ) : (
              <p className="text-xs text-muted">
                Choose the size your form requires, then drop your file above.
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // ——— Working state: files on the left, actions on the right ———
  const availableActions = ACTIONS.filter((a) => a.available(counts));
  const active = action && availableActions.some((a) => a.id === action) ? action : null;
  const suggestions = buildSuggestions(files).filter(
    (s) => !dismissedSuggestions.has(s.id),
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 grid md:grid-cols-[280px_1fr] gap-6 items-start">
      {palette}
      {/* File rail */}
      <aside className="space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted">
          Files ({files.length})
        </h2>
        <ul className="space-y-2">
          {files.map((entry) => (
            <li
              key={entry.id}
              className="rounded-xl border border-edge bg-panel px-3 py-2.5 flex items-center gap-3"
            >
              <span className="text-lg">{KIND_ICONS[entry.kind]}</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-bright truncate">{entry.file.name}</p>
                <p className="text-xs text-muted">
                  {formatBytes(entry.file.size)}
                  {entry.pageCount ? ` · ${entry.pageCount} pages` : ""}
                </p>
              </div>
              {entry.kind === "text" && (
                <button
                  onClick={() => openInPad(entry)}
                  className="text-xs text-accent hover:underline cursor-pointer shrink-0"
                >
                  Open in pad
                </button>
              )}
              <button
                onClick={() => removeFile(entry.id)}
                title="Remove"
                className="text-muted hover:text-bad cursor-pointer shrink-0"
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
        <DropZone onFiles={addFiles} />
      </aside>

      {/* Action area */}
      <section className="space-y-4 min-w-0">
        {paletteTrigger}

        {/* Smart suggestions — local heuristics, dismissable */}
        {suggestions.length > 0 && (
          <div className="space-y-1.5">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.id}
                className="flex items-center gap-2 rounded-lg border border-accent/30 bg-accent-soft/40 px-3 py-2 text-xs"
              >
                <span className="text-accent">💡</span>
                <button
                  onClick={() => runCommand(suggestion.result)}
                  className="text-left text-bright hover:underline cursor-pointer flex-1"
                >
                  {suggestion.label}
                </button>
                <button
                  onClick={() =>
                    setDismissedSuggestions((prev) => new Set(prev).add(suggestion.id))
                  }
                  title="Dismiss"
                  className="text-muted hover:text-bright cursor-pointer px-1"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {availableActions.map((def) => (
            <button
              key={def.id}
              onClick={() => setAction(def.id)}
              className={`rounded-lg px-3.5 py-2 text-sm font-medium border transition-colors cursor-pointer
                ${active === def.id ? "border-accent bg-accent-soft text-bright" : "border-edge text-body hover:border-accent/50"}`}
            >
              {def.label}
            </button>
          ))}
        </div>

        {/* Single-PDF selector for pages/split when several PDFs are loaded */}
        {(active === "pages" || active === "split") && pdfs.length > 1 && (
          <label className="flex items-center gap-2 text-xs text-muted">
            Working on
            <select
              value={activePdf?.id ?? ""}
              onChange={(e) => setSelectedPdfId(e.target.value)}
              className="rounded-md border border-edge bg-panel-2 px-2 py-1.5 text-bright outline-none focus:border-accent"
            >
              {pdfs.map((pdf) => (
                <option key={pdf.id} value={pdf.id}>
                  {pdf.file.name}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="rounded-2xl border border-edge bg-panel p-5">
          {active === "compress" && (
            <CompressPanel
              // Remount when the palette/suggestions pick a new target.
              key={compressConfig ? `${compressConfig.presetId}-${compressConfig.maxKb}` : "url"}
              files={files}
              initialPresetId={compressConfig?.presetId ?? initialPresetId}
              initialMaxKb={compressConfig?.maxKb ?? initialMaxKb}
            />
          )}
          {active === "convert" && <ConvertPanel files={files} />}
          {active === "pages" && activePdf && (
            <PagesPanel key={activePdf.id} file={activePdf} />
          )}
          {active === "merge" && <MergePanel files={pdfs} />}
          {active === "split" && activePdf && (
            <SplitPanel key={activePdf.id} file={activePdf} />
          )}
          {active === "signature" && <SignaturePanel files={files} />}
          {active === "stamp" && <StampPanel files={files} />}
          {active === "ocr" && <OcrPanel files={files} />}
          {active === "photo" && (
            <PhotoPanel
              // Remount so a newly chosen preset becomes the starting spec.
              key={compressConfig?.presetId ?? initialPresetId ?? "default"}
              files={files}
              initialPresetId={compressConfig?.presetId ?? initialPresetId}
            />
          )}
          {active === "images-to-pdf" && <ImagesToPdfPanel files={images} />}
          {!active && (
            <p className="text-sm text-muted">Pick an action above to begin.</p>
          )}
        </div>
      </section>
    </div>
  );
}
