import { describe, expect, it } from "vitest";
import { EXAM_PRESETS, PRESET_GROUPS, getPreset } from "@/lib/presets/examPresets";

describe("exam presets integrity", () => {
  it("has unique ids", () => {
    const ids = EXAM_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a positive max size, and min below max where present", () => {
    for (const preset of EXAM_PRESETS) {
      expect(preset.maxKB).toBeGreaterThan(0);
      if (preset.minKB != null) {
        expect(preset.minKB).toBeLessThan(preset.maxKB);
      }
    }
  });

  it("has positive dimensions when specified", () => {
    for (const preset of EXAM_PRESETS) {
      if (preset.width != null) expect(preset.width).toBeGreaterThan(0);
      if (preset.height != null) expect(preset.height).toBeGreaterThan(0);
    }
  });

  it("only uses declared groups", () => {
    for (const preset of EXAM_PRESETS) {
      expect(PRESET_GROUPS).toContain(preset.group);
    }
  });

  it("resolves known ids and rejects unknown ones", () => {
    expect(getPreset("ssc-photo")).toBeDefined();
    expect(getPreset("does-not-exist")).toBeUndefined();
  });
});
