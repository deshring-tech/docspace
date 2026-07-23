import { describe, expect, it } from "vitest";
import { buildSuggestions } from "@/lib/suggest/suggestions";
import { FileKind, WorkspaceFile } from "@/lib/types";

/** Builds a minimal WorkspaceFile for the fields the heuristics read. */
function makeFile(
  kind: FileKind,
  opts: {
    name?: string;
    size?: number;
    width?: number;
    height?: number;
    hasText?: boolean;
  } = {},
): WorkspaceFile {
  const size = opts.size ?? 1000;
  const name = opts.name ?? `file.${kind}`;
  return {
    id: Math.random().toString(36).slice(2),
    file: { name, size } as File,
    kind,
    imageWidth: opts.width,
    imageHeight: opts.height,
    hasText: opts.hasText,
  };
}

describe("buildSuggestions", () => {
  it("suggests OCR for a PDF with no text layer", () => {
    const files = [makeFile("pdf", { hasText: false })];
    const suggestion = buildSuggestions(files).find((s) => s.id === "scanned-pdf");
    expect(suggestion?.result.action).toBe("ocr");
  });

  it("does not suggest OCR for a PDF that already has text", () => {
    const files = [makeFile("pdf", { hasText: true })];
    expect(buildSuggestions(files).some((s) => s.id === "scanned-pdf")).toBe(false);
  });

  it("does not suggest OCR before the text layer has been probed", () => {
    const files = [makeFile("pdf")]; // hasText undefined
    expect(buildSuggestions(files).some((s) => s.id === "scanned-pdf")).toBe(false);
  });

  it("suggests compressing a large PDF", () => {
    const files = [makeFile("pdf", { size: 5 * 1024 * 1024 })];
    expect(buildSuggestions(files).some((s) => s.id === "big-pdf")).toBe(true);
  });

  it("does not suggest compressing a small PDF", () => {
    const files = [makeFile("pdf", { size: 100 * 1024 })];
    expect(buildSuggestions(files).some((s) => s.id === "big-pdf")).toBe(false);
  });

  it("suggests merging when two or more PDFs are present", () => {
    const files = [makeFile("pdf"), makeFile("pdf")];
    expect(buildSuggestions(files).some((s) => s.id === "merge-pdfs")).toBe(true);
  });

  it("routes a passport-ratio photo to the photo maker", () => {
    const files = [makeFile("image", { width: 600, height: 800 })]; // 0.75
    const suggestion = buildSuggestions(files).find((s) => s.id === "passport-photo");
    expect(suggestion?.result.action).toBe("photo");
  });

  it("detects a signature-strip image", () => {
    const files = [makeFile("image", { width: 900, height: 300 })]; // 3.0
    expect(buildSuggestions(files).some((s) => s.id === "signature")).toBe(true);
  });

  it("suggests combining multiple images into a PDF", () => {
    const files = [
      makeFile("image", { width: 400, height: 400 }),
      makeFile("image", { width: 400, height: 400 }),
    ];
    expect(buildSuggestions(files).some((s) => s.id === "images-to-pdf")).toBe(true);
  });

  it("returns nothing for a single ordinary image", () => {
    const files = [makeFile("image", { width: 500, height: 500 })]; // ratio 1.0
    expect(buildSuggestions(files)).toHaveLength(0);
  });

  it("never returns more than three suggestions", () => {
    const files = [
      makeFile("pdf", { size: 5 * 1024 * 1024 }),
      makeFile("pdf"),
      makeFile("image", { width: 600, height: 800 }),
      makeFile("image", { width: 900, height: 300 }),
    ];
    expect(buildSuggestions(files).length).toBeLessThanOrEqual(3);
  });
});
