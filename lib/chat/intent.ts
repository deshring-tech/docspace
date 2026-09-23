/**
 * Chat intent parser — the "brain" of the conversational interface.
 *
 * It turns a free-text message ("make this UPSC photo size", "compress below
 * 200kb", "extract the text") into a single, directly-executable instruction.
 * This is entirely local: no AI, no network, no per-message cost. Genuine
 * natural-language / AI tasks (summarise, translate, "fix everything") are NOT
 * handled here — they return `unknown` and are the future paid AI layer.
 *
 * Rules are checked in a deliberate order (most specific first) so that, e.g.,
 * "extract pages 2-5" routes to split rather than OCR, and "extract text"
 * routes to OCR rather than split.
 */
import { extractKbTarget } from "@/lib/intent/commands";
import { EXAM_PRESETS, ExamPreset } from "@/lib/presets/examPresets";
import { OCR_LANGUAGES } from "@/lib/ocr/languages";

export type ChatIntent =
  | { kind: "compress"; maxKb?: number; preset?: ExamPreset }
  | { kind: "photo"; preset: ExamPreset }
  | { kind: "convert"; format?: "pdf" | "png" | "jpg" | "webp"; unsupported?: string }
  | { kind: "images-to-pdf" }
  | { kind: "merge" }
  | { kind: "split"; range?: string }
  | { kind: "ocr"; mode: "text" | "pdf"; langs: string[] }
  | { kind: "signature" }
  | { kind: "stamp"; watermark?: string; pageNumbers: boolean }
  | { kind: "unknown"; text: string };

/**
 * Whole-word test. Matching on substrings would let "us" fire inside
 * "summarize", so preset detection uses word boundaries and only considers
 * plain alphanumeric tokens (skipping label fragments like "2×2" or "(ds-160)").
 */
function hasWord(text: string, word: string): boolean {
  if (!/^[a-z0-9]+$/.test(word)) return false;
  return new RegExp(`\\b${word}\\b`).test(text);
}

/** Finds the best exam/photo preset named in the text (label or group). */
function matchPreset(text: string): ExamPreset | undefined {
  const scored = EXAM_PRESETS.map((preset) => {
    let score = 0;
    if (hasWord(text, preset.group.toLowerCase())) score += 2;
    if (hasWord(text, preset.kind)) score += 1;
    // "us passport", "schengen", "pan", etc. also live in the label.
    for (const word of preset.label.toLowerCase().split(/\s+/)) {
      if (word.length > 2 && hasWord(text, word)) score += 1;
    }
    return { preset, score };
  })
    .filter((entry) => entry.score >= 2)
    .sort((a, b) => b.score - a.score);
  return scored[0]?.preset;
}

/** Extracts a page range like "2-5", "1,3,7", "pages 2 to 4". */
function extractPageRange(text: string): string | undefined {
  const normalized = text.replace(/\bto\b/g, "-").replace(/\s+/g, "");
  const match = normalized.match(/\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*/);
  return match ? match[0] : undefined;
}

/** Detects a target file format mentioned in the text. */
function detectFormat(
  text: string,
): { format?: "pdf" | "png" | "jpg" | "webp"; unsupported?: string } {
  if (/\b(docx?|word)\b/.test(text)) return { unsupported: "Word" };
  if (/\b(xlsx?|excel|spreadsheet)\b/.test(text)) return { unsupported: "Excel" };
  if (/\b(pptx?|powerpoint|slides?)\b/.test(text)) return { unsupported: "PowerPoint" };
  if (/\bpdf\b/.test(text)) return { format: "pdf" };
  if (/\bpng\b/.test(text)) return { format: "png" };
  if (/\b(jpe?g)\b/.test(text)) return { format: "jpg" };
  if (/\bwebp\b/.test(text)) return { format: "webp" };
  return {};
}

/** Matches OCR language names in the text; defaults to English. */
function matchLanguages(text: string): string[] {
  const found = OCR_LANGUAGES.filter((lang) => text.includes(lang.label.toLowerCase())).map(
    (lang) => lang.code,
  );
  return found.length > 0 ? found : ["eng"];
}

/** Pulls quoted watermark text, e.g. watermark "CONFIDENTIAL". */
function extractQuoted(text: string): string | undefined {
  const match = text.match(/["'“”]([^"'“”]{1,40})["'“”]/);
  return match ? match[1].trim() : undefined;
}

export function parseChatCommand(rawText: string): ChatIntent {
  const text = rawText.toLowerCase().trim();
  const preset = matchPreset(text);
  const kb = extractKbTarget(text);
  const range = extractPageRange(text);

  const resizeContext = kb !== null || /\b(resize|compress|reduce|shrink|smaller|under|size)\b/.test(text);

  // 1. OCR — text extraction or searchable PDF. Covers "ocr", "searchable",
  // "text from…", and read/extract/get + "text" in any order.
  const wantsText = /\btext\b/.test(text) && /\b(read|extract|recogni[sz]e|get|pull|copy|grab|convert)\b/.test(text);
  if (/\bocr\b/.test(text) || /\bsearchable\b/.test(text) || /text from/.test(text) ||
      /scan(ned)?\s*(to)?\s*text/.test(text) || wantsText) {
    return {
      kind: "ocr",
      mode: /searchable|to pdf|as pdf/.test(text) ? "pdf" : "text",
      langs: matchLanguages(text),
    };
  }

  // 2. Signature extraction — but not when the intent is to resize a signature
  // (e.g. "resize my SSC signature"), which is a compress-to-preset task.
  if (!resizeContext &&
      (/\bsignature\b/.test(text) || (/\bsign\b/.test(text) && /(extract|background|transparent|clean|cut)/.test(text)))) {
    return { kind: "signature" };
  }

  // 3. Watermark / page numbers. Watermark text is read from the ORIGINAL text
  // so its capitalisation is preserved.
  if (/\b(watermark|stamp)\b/.test(text) || /page numbers?/.test(text)) {
    return {
      kind: "stamp",
      watermark: /watermark|stamp/.test(text) ? extractQuoted(rawText) ?? "CONFIDENTIAL" : undefined,
      pageNumbers: /page numbers?/.test(text),
    };
  }

  // 4. Merge.
  if (/\b(merge|combine|join)\b/.test(text) && !/images? (in)?to/.test(text)) {
    return { kind: "merge" };
  }

  // 5. Split / extract specific pages (a page range disambiguates from OCR).
  if (range && /\b(split|extract|pages?|page|remove)\b/.test(text)) {
    return { kind: "split", range };
  }
  if (/\bsplit\b/.test(text)) return { kind: "split" };

  // 6. Images → one PDF (explicit).
  if (/images? (in)?to (one |a )?pdf|combine images|photos? (in)?to pdf/.test(text)) {
    return { kind: "images-to-pdf" };
  }

  // 7. Passport/ID photo sizing (a photo preset was named).
  if (preset && preset.kind === "photo") {
    return { kind: "photo", preset };
  }

  // 8. Compress / resize (a size, a preset, or a compress verb).
  if (kb !== null || preset || /\b(compress|resize|reduce|shrink|smaller|under|kb|mb)\b/.test(text)) {
    return { kind: "compress", maxKb: kb ?? undefined, preset };
  }

  // 9. Convert / export to a format.
  if (/\b(convert|export|turn .*into|change .*to|make .*(pdf|png|jpg|image))\b/.test(text) ||
      /\bto (pdf|png|jpe?g|webp|word|docx|excel|xlsx|ppt)\b/.test(text)) {
    const { format, unsupported } = detectFormat(text);
    return { kind: "convert", format, unsupported };
  }

  return { kind: "unknown", text: rawText };
}
