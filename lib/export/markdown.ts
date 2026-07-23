/**
 * Minimal markdown model shared by the PDF and DOCX exporters.
 * Supports what the writing pad promises: headings (#, ##, ###), bullet
 * lists (- or *), numbered lists, and plain paragraphs. Deliberately small —
 * a full markdown engine is not an MVP requirement.
 */

export type BlockType = "h1" | "h2" | "h3" | "bullet" | "numbered" | "paragraph" | "blank";

export interface Block {
  type: BlockType;
  text: string;
}

export function parseBlocks(source: string): Block[] {
  return source.split(/\r?\n/).map((line): Block => {
    if (/^###\s+/.test(line)) return { type: "h3", text: line.replace(/^###\s+/, "") };
    if (/^##\s+/.test(line)) return { type: "h2", text: line.replace(/^##\s+/, "") };
    if (/^#\s+/.test(line)) return { type: "h1", text: line.replace(/^#\s+/, "") };
    if (/^\s*[-*]\s+/.test(line))
      return { type: "bullet", text: line.replace(/^\s*[-*]\s+/, "") };
    if (/^\s*\d+[.)]\s+/.test(line))
      return { type: "numbered", text: line.replace(/^\s*\d+[.)]\s+/, "") };
    if (line.trim() === "") return { type: "blank", text: "" };
    return { type: "paragraph", text: line };
  });
}

/** Converts pad content to a self-contained HTML document. */
export function blocksToHtml(blocks: Block[], title: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  const body: string[] = [];
  let listOpen: "ul" | "ol" | null = null;
  const closeList = () => {
    if (listOpen) {
      body.push(`</${listOpen}>`);
      listOpen = null;
    }
  };

  for (const block of blocks) {
    if (block.type === "bullet" || block.type === "numbered") {
      const tag = block.type === "bullet" ? "ul" : "ol";
      if (listOpen !== tag) {
        closeList();
        body.push(`<${tag}>`);
        listOpen = tag;
      }
      body.push(`<li>${escape(block.text)}</li>`);
      continue;
    }
    closeList();
    if (block.type === "blank") continue;
    if (block.type === "paragraph") body.push(`<p>${escape(block.text)}</p>`);
    else body.push(`<${block.type}>${escape(block.text)}</${block.type}>`);
  }
  closeList();

  return [
    "<!doctype html>",
    `<html><head><meta charset="utf-8"><title>${escape(title)}</title>`,
    "<style>body{font-family:Georgia,serif;max-width:720px;margin:48px auto;line-height:1.6;padding:0 24px;color:#1a1a1a}</style>",
    "</head><body>",
    ...body,
    "</body></html>",
  ].join("\n");
}
