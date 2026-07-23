"use client";

/**
 * Passport / ID photo maker: frame a photo to an official spec with guides,
 * optionally whiten a plain background, and export at exact pixel dimensions
 * and an exact KB target.
 *
 * Specs are read from the shared exam-preset registry (kind "photo") so photo
 * dimensions live in exactly one place.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ResultCard } from "@/components/ui/ResultCard";
import { baseName, formatBytes } from "@/lib/format";
import { canvasToBlob } from "@/lib/image/canvas";
import { compressImageToTarget } from "@/lib/image/compressImage";
import {
  CropTransform,
  DEFAULT_TRANSFORM,
  drawPhoto,
  whitenBackground,
} from "@/lib/image/photoCrop";
import { EXAM_PRESETS } from "@/lib/presets/examPresets";
import { ProcessedResult, WorkspaceFile } from "@/lib/types";

/** Photo specs with real pixel dimensions, sourced from the shared registry. */
const PHOTO_SPECS = EXAM_PRESETS.filter(
  (preset) => preset.kind === "photo" && preset.width != null && preset.height != null,
);

/** Preview width in CSS pixels; the canvas itself stays at full target size. */
const PREVIEW_WIDTH = 260;

/**
 * Head-position guides as fractions of image height, reflecting the common
 * official guidance (head fills roughly 60% of the frame, eyes above centre).
 */
const GUIDES = { crown: 0.1, eyes: 0.4, chin: 0.72 };

interface PhotoPanelProps {
  files: WorkspaceFile[];
  /** Preset to open with, e.g. from a "US passport photo" landing page. */
  initialPresetId?: string;
}

export function PhotoPanel({ files, initialPresetId }: PhotoPanelProps) {
  const images = files.filter((f) => f.kind === "image");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [specId, setSpecId] = useState<string>(() =>
    initialPresetId && PHOTO_SPECS.some((preset) => preset.id === initialPresetId)
      ? initialPresetId
      : (PHOTO_SPECS[0]?.id ?? "custom"),
  );
  const [customWidth, setCustomWidth] = useState("350");
  const [customHeight, setCustomHeight] = useState("450");
  const [customMaxKb, setCustomMaxKb] = useState("100");
  const [transform, setTransform] = useState<CropTransform>(DEFAULT_TRANSFORM);
  const [whiten, setWhiten] = useState(false);
  const [tolerance, setTolerance] = useState(25);
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [result, setResult] = useState<ProcessedResult | null>(null);
  const [warning, setWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dragState = useRef<{ x: number; y: number } | null>(null);
  /** Owns the decoded bitmap so it is closed exactly once. */
  const bitmapRef = useRef<ImageBitmap | null>(null);

  const active = images.find((f) => f.id === selectedId) ?? images[0] ?? null;
  /**
   * Depend on the File itself, not the WorkspaceFile wrapper: the workspace
   * attaches image dimensions asynchronously, which replaces the wrapper
   * object. Keying on the stable File avoids reloading (and previously,
   * destroying) a bitmap that is still in use.
   */
  const activeFile = active?.file ?? null;

  const spec = PHOTO_SPECS.find((s) => s.id === specId);
  const targetWidth = spec?.width ?? Math.max(1, Number(customWidth) || 350);
  const targetHeight = spec?.height ?? Math.max(1, Number(customHeight) || 450);
  const maxKb = spec?.maxKB ?? Math.max(1, Number(customMaxKb) || 100);
  const minKb = spec?.minKB;

  // Release the decoded bitmap when the panel goes away.
  useEffect(
    () => () => {
      bitmapRef.current?.close();
      bitmapRef.current = null;
    },
    [],
  );

  // Load the selected image, and reset framing when the source changes.
  useEffect(() => {
    if (!activeFile) {
      bitmapRef.current?.close();
      bitmapRef.current = null;
      setBitmap(null);
      return;
    }
    let cancelled = false;
    createImageBitmap(activeFile)
      .then((loaded) => {
        if (cancelled) {
          loaded.close();
          return;
        }
        // Replace the previous bitmap only once the new one is ready, so the
        // preview never references a closed image.
        bitmapRef.current?.close();
        bitmapRef.current = loaded;
        setBitmap(loaded);
        setTransform(DEFAULT_TRANSFORM);
        setResult(null);
        setWarning(null);
      })
      .catch(() => setError("Could not read this image."));
    return () => {
      cancelled = true;
    };
  }, [activeFile]);

  // Repaint the preview whenever the framing or cleanup settings change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !bitmap) return;
    try {
      const rendered = drawPhoto(bitmap, targetWidth, targetHeight, transform);
      if (whiten) whitenBackground(rendered, tolerance);
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      canvas.getContext("2d")?.drawImage(rendered, 0, 0);
    } catch {
      // A repaint must never take down the workspace; the next render recovers.
    }
  }, [bitmap, targetWidth, targetHeight, transform, whiten, tolerance]);

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLCanvasElement>) => {
    dragState.current = { x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      const start = dragState.current;
      if (!start) return;
      // Convert on-screen movement into target-canvas pixels.
      const displayedWidth = event.currentTarget.getBoundingClientRect().width || 1;
      const ratio = targetWidth / displayedWidth;
      const dx = (event.clientX - start.x) * ratio;
      const dy = (event.clientY - start.y) * ratio;
      dragState.current = { x: event.clientX, y: event.clientY };
      setTransform((prev) => ({
        ...prev,
        offsetX: prev.offsetX + dx,
        offsetY: prev.offsetY + dy,
      }));
    },
    [targetWidth],
  );

  const endDrag = useCallback(() => {
    dragState.current = null;
  }, []);

  async function generate() {
    if (!bitmap) return;
    setBusy(true);
    setError(null);
    setWarning(null);
    try {
      const rendered = drawPhoto(bitmap, targetWidth, targetHeight, transform);
      if (whiten) whitenBackground(rendered, tolerance);
      const source = await canvasToBlob(rendered, "image/jpeg", 0.95);
      const output = await compressImageToTarget(source, {
        maxBytes: maxKb * 1024,
        minBytes: minKb ? minKb * 1024 : undefined,
        width: targetWidth,
        height: targetHeight,
        mimeType: "image/jpeg",
      });
      // Portals reject files under their minimum, so never let this pass
      // silently — the same guarantee the compress panel gives.
      if (output.belowMinimum && minKb) {
        setWarning(
          `Output is ${formatBytes(output.blob.size)}, below the ${minKb} KB minimum this form requires. Use a sharper, higher-resolution photo — a very plain or blurry image cannot fill the size window.`,
        );
      }
      setResult({
        blob: output.blob,
        filename: `${baseName(active!.file.name)}-${spec ? spec.id : "photo"}.jpg`,
        note: `${targetWidth}×${targetHeight}px`,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the photo");
    }
    setBusy(false);
  }

  if (!active) {
    return <p className="text-sm text-muted">Add a photo to make a passport or ID picture.</p>;
  }

  const previewHeight = Math.round((PREVIEW_WIDTH * targetHeight) / targetWidth);

  return (
    <div className="space-y-5">
      <p className="text-xs text-muted">
        Drag the photo to position the face inside the guides, zoom to fit, then
        export at the exact size and KB the portal requires.
      </p>

      {images.length > 1 && (
        <label className="flex items-center gap-2 text-xs text-muted">
          Working on
          <select
            value={active.id}
            onChange={(e) => setSelectedId(e.target.value)}
            className="rounded-md border border-edge bg-panel-2 px-2 py-1.5 text-bright outline-none focus:border-accent"
          >
            {images.map((image) => (
              <option key={image.id} value={image.id}>
                {image.file.name}
              </option>
            ))}
          </select>
        </label>
      )}

      {/* Spec picker */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted w-16 shrink-0">Size</span>
        {PHOTO_SPECS.map((preset) => (
          <button
            key={preset.id}
            title={preset.spec}
            onClick={() => setSpecId(preset.id)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer
              ${specId === preset.id ? "border-accent bg-accent-soft text-bright" : "border-edge text-body hover:border-accent/50"}`}
          >
            {preset.label}
          </button>
        ))}
        <button
          onClick={() => setSpecId("custom")}
          className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer
            ${specId === "custom" ? "border-accent bg-accent-soft text-bright" : "border-edge text-body hover:border-accent/50"}`}
        >
          Custom
        </button>
      </div>

      {specId === "custom" && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
          <input
            type="number"
            min={1}
            value={customWidth}
            onChange={(e) => setCustomWidth(e.target.value)}
            aria-label="Width in pixels"
            className="w-20 rounded-md border border-edge bg-panel-2 px-2 py-1.5 text-bright outline-none focus:border-accent"
          />
          ×
          <input
            type="number"
            min={1}
            value={customHeight}
            onChange={(e) => setCustomHeight(e.target.value)}
            aria-label="Height in pixels"
            className="w-20 rounded-md border border-edge bg-panel-2 px-2 py-1.5 text-bright outline-none focus:border-accent"
          />
          px, under
          <input
            type="number"
            min={1}
            value={customMaxKb}
            onChange={(e) => setCustomMaxKb(e.target.value)}
            aria-label="Maximum size in KB"
            className="w-20 rounded-md border border-edge bg-panel-2 px-2 py-1.5 text-bright outline-none focus:border-accent"
          />
          KB
        </div>
      )}

      {/* Preview with head guides */}
      <div className="flex flex-wrap gap-5 items-start">
        <div
          className="relative shrink-0 rounded-lg overflow-hidden border border-edge"
          style={{ width: PREVIEW_WIDTH, height: previewHeight }}
        >
          <canvas
            ref={canvasRef}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className="cursor-move touch-none block"
            style={{ width: PREVIEW_WIDTH, height: previewHeight }}
          />
          {/* Guides: crown, eye line, chin and centre */}
          <div className="pointer-events-none absolute inset-0">
            {[GUIDES.crown, GUIDES.eyes, GUIDES.chin].map((fraction, index) => (
              <div
                key={fraction}
                className={index === 1 ? "absolute w-full border-t border-dashed border-accent/70" : "absolute w-full border-t border-dashed border-white/60"}
                style={{ top: `${fraction * 100}%` }}
              />
            ))}
            <div className="absolute h-full left-1/2 border-l border-dashed border-white/40" />
          </div>
        </div>

        <div className="space-y-3 min-w-52 flex-1">
          <label className="flex items-center gap-2 text-xs text-muted">
            Zoom
            <input
              type="range"
              min={50}
              max={300}
              value={Math.round(transform.zoom * 100)}
              onChange={(e) =>
                setTransform((prev) => ({ ...prev, zoom: Number(e.target.value) / 100 }))
              }
              className="flex-1 accent-[--color-accent]"
            />
            <span className="w-10 text-right text-bright">
              {Math.round(transform.zoom * 100)}%
            </span>
          </label>

          <button
            onClick={() => setTransform(DEFAULT_TRANSFORM)}
            className="text-xs text-accent hover:underline cursor-pointer"
          >
            Reset framing
          </button>

          <label className="flex items-center gap-2 text-sm text-body">
            <input
              type="checkbox"
              checked={whiten}
              onChange={(e) => setWhiten(e.target.checked)}
              className="accent-[--color-accent]"
            />
            Whiten background
          </label>
          {whiten && (
            <>
              <label className="flex items-center gap-2 text-xs text-muted">
                Strength
                <input
                  type="range"
                  min={5}
                  max={60}
                  value={tolerance}
                  onChange={(e) => setTolerance(Number(e.target.value))}
                  className="flex-1 accent-[--color-accent]"
                />
                <span className="w-8 text-right text-bright">{tolerance}</span>
              </label>
              <p className="text-xs text-warn">
                Works best on a plain wall. On busy backgrounds, retake the photo
                against a blank surface instead.
              </p>
            </>
          )}

          <p className="text-xs text-muted">
            Output: {targetWidth}×{targetHeight}px, {minKb ? `${minKb}–` : "≤ "}
            {maxKb} KB{spec ? ` · ${spec.label}` : ""}
          </p>
        </div>
      </div>

      <Button onClick={generate} disabled={busy || !bitmap}>
        {busy ? "Creating…" : "Create photo"}
      </Button>

      {error && <p className="text-sm text-bad">{error}</p>}
      {warning && <p className="text-xs text-warn">⚠ {warning}</p>}
      {result && <ResultCard result={result} />}
    </div>
  );
}
