"use client";

import { useCallback, useRef, useState } from "react";

interface DropZoneProps {
  onFiles: (files: File[]) => void;
  /** Large hero variant for the empty workspace vs compact "add more" strip. */
  hero?: boolean;
}

/** Drag-and-drop target + click-to-browse. The single entry point for files. */
export function DropZone({ onFiles, hero = false }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      setDragging(false);
      const files = Array.from(event.dataTransfer.files);
      if (files.length > 0) onFiles(files);
    },
    [onFiles],
  );

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Drop files here or click to browse"
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`cursor-pointer rounded-2xl border-2 border-dashed transition-all grid place-items-center text-center
        ${dragging ? "border-accent bg-accent-soft/60 scale-[1.01]" : "border-edge hover:border-accent/50 bg-panel"}
        ${hero ? "min-h-72 p-10" : "min-h-20 p-4"}`}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length > 0) onFiles(files);
          e.target.value = ""; // allow re-selecting the same file
        }}
      />
      {hero ? (
        <div className="space-y-3">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-accent-soft grid place-items-center text-2xl">
            📄
          </div>
          <p className="text-lg font-medium text-bright">
            Drop any file here
          </p>
          <p className="text-sm text-muted max-w-sm">
            PDF, photo, scan or signature — the right tools appear instantly.
            Everything runs in your browser; nothing is uploaded.
          </p>
          <p className="text-xs text-muted">or click to browse</p>
        </div>
      ) : (
        <p className="text-sm text-muted">+ Add more files</p>
      )}
    </div>
  );
}
