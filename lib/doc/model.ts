/**
 * The rich-document model shared by every exporter.
 *
 * The Tiptap editor's JSON is converted into this small, typed structure
 * (see fromTiptap.ts), and each exporter (PDF, DOCX, HTML, Markdown, text)
 * renders from it. Keeping the model tiny is deliberate: anything added here
 * must be renderable in ALL export formats.
 */

/** A span of text with uniform styling. */
export interface Run {
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
}

export type DocBlock =
  | { type: "heading"; level: 1 | 2 | 3; runs: Run[] }
  | { type: "paragraph"; runs: Run[] }
  | { type: "bullet"; runs: Run[] }
  | { type: "numbered"; runs: Run[] }
  | { type: "image"; dataUrl: string; width: number; height: number };

/** Plain text of a block (used by word count, TXT export). */
export function blockText(block: DocBlock): string {
  return "runs" in block ? block.runs.map((run) => run.text).join("") : "";
}
