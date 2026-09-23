/**
 * Goal-first command engine for the Ctrl+K palette.
 *
 * Turns free text ("compress below 200kb", "ssc photo", "merge") into ranked,
 * executable commands — entirely locally. No AI, no network, no latency:
 * ~a dozen intents cover the overwhelming majority of document tasks, and a
 * keyword matcher with number extraction handles them all.
 */
import { EXAM_PRESETS } from "@/lib/presets/examPresets";
import { ActionId } from "@/lib/types";

/** What a palette entry does when chosen. */
export interface CommandResult {
  /** Workspace action to open (or "write" to go to the pad). */
  action: ActionId | "write";
  /** Optional compress configuration carried with the command. */
  presetId?: string;
  maxKb?: number;
}

export interface Command {
  id: string;
  label: string;
  /** Small grey hint after the label, e.g. the preset spec. */
  hint?: string;
  keywords: string; // lowercase haystack used for matching
  result: CommandResult;
}

/** The static command registry (presets included). */
function buildRegistry(): Command[] {
  const commands: Command[] = [
    {
      id: "compress",
      label: "Compress / resize a file",
      hint: "exact-KB targets, exam presets",
      keywords: "compress resize reduce shrink size smaller kb mb file image pdf photo",
      result: { action: "compress" },
    },
    {
      id: "convert",
      label: "Convert / export as…",
      hint: "PDF, JPG, PNG, WebP",
      keywords: "convert export change format pdf jpg jpeg png webp word docx image to",
      result: { action: "convert" },
    },
    {
      id: "merge",
      label: "Merge PDFs into one",
      keywords: "merge combine join append pdfs together one",
      result: { action: "merge" },
    },
    {
      id: "split",
      label: "Split PDF / extract pages",
      keywords: "split extract pages remove page range separate",
      result: { action: "split" },
    },
    {
      id: "pages",
      label: "Edit pages (rotate, delete, reorder)",
      keywords: "rotate delete remove reorder rearrange pages edit turn fix sideways",
      result: { action: "pages" },
    },
    {
      id: "photo",
      label: "Make a passport / ID photo",
      hint: "crop with guides, exact size and KB",
      keywords:
        "passport photo id visa picture crop face headshot size stamp exam ready portrait",
      result: { action: "photo" },
    },
    {
      id: "signature",
      label: "Extract signature from a photo",
      hint: "background removed automatically",
      keywords: "signature sign extract background remove transparent ink cutout",
      result: { action: "signature" },
    },
    {
      id: "images-to-pdf",
      label: "Combine images into one PDF",
      keywords: "images photos jpg png to pdf combine scan",
      result: { action: "images-to-pdf" },
    },
    {
      id: "stamp",
      label: "Watermark / page numbers",
      keywords: "watermark stamp page numbers number confidential draft label",
      result: { action: "stamp" },
    },
    {
      id: "ocr",
      label: "OCR — extract text from a scan",
      hint: "text or searchable PDF",
      keywords: "ocr scan scanned text extract recognize searchable read image pdf handwriting",
      result: { action: "ocr" },
    },
    {
      id: "write",
      label: "Write a new document",
      hint: "export to PDF, Word, Markdown…",
      keywords: "write new document create letter blog note type text pad",
      result: { action: "write" },
    },
  ];

  for (const preset of EXAM_PRESETS) {
    commands.push({
      id: `preset-${preset.id}`,
      label: `Make it ${preset.label}-ready`,
      hint: preset.spec,
      keywords:
        `${preset.group} ${preset.label} ${preset.kind} ready upload exam form ` +
        `compress resize photo signature document`.toLowerCase(),
      result: { action: "compress", presetId: preset.id },
    });
  }
  return commands;
}

const REGISTRY = buildRegistry();

/** Extracts a KB target from text: "below 200kb", "2 mb", "to 50 KB". */
export function extractKbTarget(query: string): number | null {
  const match = query.match(/(\d+(?:\.\d+)?)\s*(kb|mb)/i);
  if (!match) return null;
  const value = parseFloat(match[1]);
  return match[2].toLowerCase() === "mb" ? Math.round(value * 1024) : Math.round(value);
}

/**
 * Ranks commands against the query. Empty query → a sensible default list.
 * A numeric size in the query turns the compress command into an exact
 * "Compress to ≤ N KB" command.
 */
export function matchCommands(query: string, limit = 8): Command[] {
  const q = query.trim().toLowerCase();
  if (!q) return REGISTRY.slice(0, limit);

  const kb = extractKbTarget(q);
  const words = q.split(/\s+/).filter((w) => !/^\d/.test(w));

  const scored = REGISTRY.map((command) => {
    let score = 0;
    for (const word of words) {
      if (command.label.toLowerCase().includes(word)) score += 3;
      if (command.keywords.includes(word)) score += 2;
    }
    // A size implies compression even without the word "compress".
    if (kb !== null && command.id === "compress") score += 2;
    return { command, score };
  })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((entry) => entry.command);

  // Materialize the exact-KB variant at the top when a size was given.
  if (kb !== null && kb > 0) {
    scored.unshift({
      id: `compress-${kb}`,
      label: `Compress to ≤ ${kb} KB`,
      hint: "works for images and PDFs",
      keywords: "",
      result: { action: "compress", maxKb: kb },
    });
  }
  return scored.slice(0, limit);
}
