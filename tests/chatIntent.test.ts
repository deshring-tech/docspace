import { describe, expect, it } from "vitest";
import { parseChatCommand } from "@/lib/chat/intent";

describe("parseChatCommand", () => {
  it("routes exact-size requests to compress", () => {
    const intent = parseChatCommand("compress to 200kb");
    expect(intent).toMatchObject({ kind: "compress", maxKb: 200 });
  });

  it("understands MB and bare sizes", () => {
    expect(parseChatCommand("get it under 2 mb")).toMatchObject({ kind: "compress", maxKb: 2048 });
  });

  it("routes exam photo sizing to the photo maker", () => {
    const intent = parseChatCommand("make it UPSC photo size");
    expect(intent.kind).toBe("photo");
    if (intent.kind === "photo") expect(intent.preset.group).toBe("UPSC");
  });

  it("routes signature-strip sizing to compress with the preset", () => {
    const intent = parseChatCommand("resize my SSC signature");
    expect(intent.kind).toBe("compress");
    if (intent.kind === "compress") expect(intent.preset?.id).toBe("ssc-signature");
  });

  it("distinguishes 'extract text' (OCR) from 'extract pages' (split)", () => {
    expect(parseChatCommand("extract the text from this scan")).toMatchObject({
      kind: "ocr",
      mode: "text",
    });
    expect(parseChatCommand("extract pages 2-5")).toMatchObject({ kind: "split", range: "2-5" });
  });

  it("detects searchable-PDF OCR mode", () => {
    expect(parseChatCommand("make this scan searchable")).toMatchObject({ kind: "ocr", mode: "pdf" });
  });

  it("picks OCR languages by name", () => {
    const intent = parseChatCommand("read the hindi text");
    expect(intent.kind).toBe("ocr");
    if (intent.kind === "ocr") expect(intent.langs).toContain("hin");
  });

  it("handles convert with an explicit format", () => {
    expect(parseChatCommand("convert to png")).toMatchObject({ kind: "convert", format: "png" });
    expect(parseChatCommand("turn these into a pdf")).toMatchObject({ kind: "convert", format: "pdf" });
  });

  it("flags unsupported conversions honestly", () => {
    expect(parseChatCommand("convert to word")).toMatchObject({ kind: "convert", unsupported: "Word" });
  });

  it("routes merge and explicit split", () => {
    expect(parseChatCommand("merge these pdfs").kind).toBe("merge");
    expect(parseChatCommand("split this pdf").kind).toBe("split");
  });

  it("parses signature extraction", () => {
    expect(parseChatCommand("extract my signature").kind).toBe("signature");
  });

  it("parses watermark with quoted text and page numbers", () => {
    expect(parseChatCommand('add a "DRAFT" watermark')).toMatchObject({
      kind: "stamp",
      watermark: "DRAFT",
    });
    expect(parseChatCommand("add page numbers")).toMatchObject({ kind: "stamp", pageNumbers: true });
  });

  it("returns unknown for genuine AI tasks", () => {
    expect(parseChatCommand("summarize this contract for me").kind).toBe("unknown");
    expect(parseChatCommand("what does clause 4 mean").kind).toBe("unknown");
  });
});
