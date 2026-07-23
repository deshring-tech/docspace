import { describe, expect, it } from "vitest";
import {
  DEFAULT_TRANSFORM,
  computeDrawRect,
} from "@/lib/image/photoCrop";

describe("computeDrawRect", () => {
  it("covers the frame exactly at zoom 1 for a matching aspect ratio", () => {
    const rect = computeDrawRect(700, 900, 350, 450, DEFAULT_TRANSFORM);
    expect(rect).toEqual({ x: 0, y: 0, width: 350, height: 450 });
  });

  it("overflows on the wider axis for a landscape source (cover, not fit)", () => {
    // 800x400 into a 350x450 portrait frame: height drives the scale.
    const rect = computeDrawRect(800, 400, 350, 450, DEFAULT_TRANSFORM);
    expect(rect.height).toBeCloseTo(450);
    expect(rect.width).toBeCloseTo(900); // wider than the frame
    expect(rect.x).toBeCloseTo((350 - 900) / 2); // centred, so negative
    expect(rect.y).toBeCloseTo(0);
  });

  it("never letterboxes: the frame is always fully covered at zoom >= 1", () => {
    const sizes: [number, number][] = [
      [1000, 200],
      [200, 1000],
      [640, 480],
      [450, 450],
    ];
    for (const [w, h] of sizes) {
      const rect = computeDrawRect(w, h, 350, 450, DEFAULT_TRANSFORM);
      expect(rect.width).toBeGreaterThanOrEqual(350 - 0.001);
      expect(rect.height).toBeGreaterThanOrEqual(450 - 0.001);
      expect(rect.x).toBeLessThanOrEqual(0.001);
      expect(rect.y).toBeLessThanOrEqual(0.001);
    }
  });

  it("scales up with zoom and keeps the frame centred", () => {
    const base = computeDrawRect(700, 900, 350, 450, DEFAULT_TRANSFORM);
    const zoomed = computeDrawRect(700, 900, 350, 450, {
      ...DEFAULT_TRANSFORM,
      zoom: 2,
    });
    expect(zoomed.width).toBeCloseTo(base.width * 2);
    expect(zoomed.height).toBeCloseTo(base.height * 2);
    // Still centred: equal overflow on both sides.
    expect(zoomed.x).toBeCloseTo((350 - zoomed.width) / 2);
    expect(zoomed.y).toBeCloseTo((450 - zoomed.height) / 2);
  });

  it("applies pan offsets", () => {
    const rect = computeDrawRect(700, 900, 350, 450, {
      zoom: 1,
      offsetX: 25,
      offsetY: -40,
    });
    expect(rect.x).toBeCloseTo(25);
    expect(rect.y).toBeCloseTo(-40);
  });

  it("clamps absurdly small zoom so the image never vanishes", () => {
    const rect = computeDrawRect(700, 900, 350, 450, {
      zoom: 0,
      offsetX: 0,
      offsetY: 0,
    });
    expect(rect.width).toBeGreaterThan(0);
    expect(rect.height).toBeGreaterThan(0);
  });
});
