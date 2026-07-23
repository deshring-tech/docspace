/**
 * Converts Tiptap's editor JSON into the export model (DocBlock[]).
 * Only the node types our toolbar can produce are handled; anything unknown
 * degrades gracefully into a paragraph.
 */
import { DocBlock, Run } from "./model";

// Tiptap JSON shape (loose — we only read what we need).
interface TiptapMark {
  type: string;
}
interface TiptapNode {
  type: string;
  text?: string;
  marks?: TiptapMark[];
  attrs?: Record<string, unknown>;
  content?: TiptapNode[];
}

function textRuns(node: TiptapNode): Run[] {
  const runs: Run[] = [];
  for (const child of node.content ?? []) {
    if (child.type === "text" && child.text) {
      const marks = new Set((child.marks ?? []).map((mark) => mark.type));
      runs.push({
        text: child.text,
        bold: marks.has("bold") || undefined,
        italic: marks.has("italic") || undefined,
        underline: marks.has("underline") || undefined,
      });
    } else if (child.type === "hardBreak") {
      runs.push({ text: "\n" });
    }
  }
  return runs;
}

function pushListItems(
  list: TiptapNode,
  type: "bullet" | "numbered",
  blocks: DocBlock[],
) {
  for (const item of list.content ?? []) {
    // listItem → paragraph(s) → text. Extra paragraphs become plain ones.
    const paragraphs = (item.content ?? []).filter((n) => n.type === "paragraph");
    paragraphs.forEach((paragraph, index) => {
      const runs = textRuns(paragraph);
      if (index === 0) blocks.push({ type, runs });
      else blocks.push({ type: "paragraph", runs });
    });
  }
}

export function tiptapToBlocks(doc: TiptapNode): DocBlock[] {
  const blocks: DocBlock[] = [];
  for (const node of doc.content ?? []) {
    switch (node.type) {
      case "heading": {
        const level = Math.min(3, Math.max(1, Number(node.attrs?.level) || 1)) as 1 | 2 | 3;
        blocks.push({ type: "heading", level, runs: textRuns(node) });
        break;
      }
      case "bulletList":
        pushListItems(node, "bullet", blocks);
        break;
      case "orderedList":
        pushListItems(node, "numbered", blocks);
        break;
      case "image": {
        const src = String(node.attrs?.src ?? "");
        if (src.startsWith("data:image/")) {
          blocks.push({
            type: "image",
            dataUrl: src,
            width: Number(node.attrs?.width) || 0,
            height: Number(node.attrs?.height) || 0,
          });
        }
        break;
      }
      default:
        blocks.push({ type: "paragraph", runs: textRuns(node) });
    }
  }
  return blocks;
}
