/**
 * Writing pad → PDF. A small layout engine on top of pdf-lib:
 * word-wraps each block, handles headings/lists, and paginates onto A4.
 *
 * Known limitation (documented in the UI): pdf-lib's standard fonts cover
 * Latin (WinAnsi) characters only. Unsupported characters are replaced so
 * export never crashes; full Unicode needs an embedded font (post-MVP).
 */
import { PDFDocument, PDFFont, StandardFonts, rgb } from "pdf-lib";
import { bytesToPdfBlob } from "@/lib/pdf/blob";
import { Block, parseBlocks } from "./markdown";

const PAGE = { width: 595.28, height: 841.89 }; // A4 in points
const MARGIN = { top: 64, bottom: 64, left: 60, right: 60 };
const TEXT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right;

interface BlockStyle {
  size: number;
  bold: boolean;
  spaceBefore: number;
  spaceAfter: number;
  indent: number;
  bulletPrefix?: string;
}

const STYLES: Record<Exclude<Block["type"], "blank">, BlockStyle> = {
  h1: { size: 22, bold: true, spaceBefore: 14, spaceAfter: 8, indent: 0 },
  h2: { size: 17, bold: true, spaceBefore: 12, spaceAfter: 6, indent: 0 },
  h3: { size: 14, bold: true, spaceBefore: 10, spaceAfter: 5, indent: 0 },
  paragraph: { size: 11.5, bold: false, spaceBefore: 0, spaceAfter: 7, indent: 0 },
  bullet: { size: 11.5, bold: false, spaceBefore: 0, spaceAfter: 4, indent: 16, bulletPrefix: "•  " },
  numbered: { size: 11.5, bold: false, spaceBefore: 0, spaceAfter: 4, indent: 16, bulletPrefix: "" },
};

/** Replaces characters the standard fonts cannot encode. */
function sanitize(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/—/g, "--")
    .replace(/–/g, "-")
    .replace(/…/g, "...")
    // Anything else outside Latin-1 becomes "?" rather than crashing export.
    .replace(/[^\x20-\x7E -ÿ]/g, "?");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      current = candidate;
    } else {
      if (current) lines.push(current);
      current = word;
    }
  }
  if (current) lines.push(current);
  return lines;
}

export async function textToPdf(source: string): Promise<Blob> {
  const doc = await PDFDocument.create();
  const regular = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE.width, PAGE.height]);
  let cursorY = PAGE.height - MARGIN.top;

  const newPageIfNeeded = (lineHeight: number) => {
    if (cursorY - lineHeight < MARGIN.bottom) {
      page = doc.addPage([PAGE.width, PAGE.height]);
      cursorY = PAGE.height - MARGIN.top;
    }
  };

  let numberedIndex = 0;
  for (const block of parseBlocks(source)) {
    if (block.type === "blank") {
      cursorY -= 6;
      numberedIndex = 0;
      continue;
    }
    if (block.type !== "numbered") numberedIndex = 0;

    const style = STYLES[block.type];
    const font = style.bold ? bold : regular;
    const lineHeight = style.size * 1.45;

    let prefix = style.bulletPrefix ?? "";
    if (block.type === "numbered") prefix = `${++numberedIndex}.  `;

    const text = sanitize(prefix + block.text);
    const lines = wrapText(text, font, style.size, TEXT_WIDTH - style.indent);

    cursorY -= style.spaceBefore;
    lines.forEach((line, index) => {
      newPageIfNeeded(lineHeight);
      // Continuation lines of list items hang-indent past the marker.
      const hang = index > 0 && prefix ? font.widthOfTextAtSize(prefix, style.size) : 0;
      page.drawText(line, {
        x: MARGIN.left + style.indent + hang,
        y: cursorY - style.size,
        size: style.size,
        font,
        color: rgb(0.1, 0.1, 0.12),
      });
      cursorY -= lineHeight;
    });
    cursorY -= style.spaceAfter;
  }

  return bytesToPdfBlob(await doc.save());
}
