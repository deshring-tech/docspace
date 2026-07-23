"use client";

/**
 * Grouped exam/form preset chips.
 *
 * Shared by the empty-state launcher and the compress panel so both always
 * show the same presets and read identically. Purely presentational — the
 * caller owns the selection.
 */
import { EXAM_PRESETS, PRESET_GROUPS } from "@/lib/presets/examPresets";

interface PresetChipsProps {
  selectedId: string | null;
  onSelect: (presetId: string) => void;
  /** Restrict to one kind, e.g. only photo specs. */
  kind?: "photo" | "signature" | "document";
}

export function PresetChips({ selectedId, onSelect, kind }: PresetChipsProps) {
  return (
    <div className="space-y-2">
      {PRESET_GROUPS.map((group) => {
        const presets = EXAM_PRESETS.filter(
          (preset) => preset.group === group && (!kind || preset.kind === kind),
        );
        if (presets.length === 0) return null;
        return (
          <div key={group} className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-muted w-24 shrink-0">{group}</span>
            {presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => onSelect(preset.id)}
                title={preset.spec}
                className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-colors cursor-pointer
                  ${
                    selectedId === preset.id
                      ? "border-accent bg-accent-soft text-bright"
                      : "border-edge text-body hover:border-accent/50"
                  }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
