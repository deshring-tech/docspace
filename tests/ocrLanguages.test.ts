import { describe, expect, it } from "vitest";
import { DEFAULT_OCR_LANGUAGE, OCR_LANGUAGES } from "@/lib/ocr/languages";

describe("OCR language list", () => {
  it("has unique codes", () => {
    const codes = OCR_LANGUAGES.map((l) => l.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("uses valid Tesseract traineddata codes (3 lowercase letters)", () => {
    for (const lang of OCR_LANGUAGES) {
      expect(lang.code).toMatch(/^[a-z]{3}$/);
      expect(lang.label.length).toBeGreaterThan(0);
    }
  });

  it("includes the default language", () => {
    expect(OCR_LANGUAGES.some((l) => l.code === DEFAULT_OCR_LANGUAGE)).toBe(true);
  });

  it("covers English and the major Indian scripts", () => {
    const codes = OCR_LANGUAGES.map((l) => l.code);
    for (const required of ["eng", "hin", "ben", "tam", "tel"]) {
      expect(codes).toContain(required);
    }
  });
});
