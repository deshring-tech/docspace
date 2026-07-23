/**
 * Rich document → PDF. A small layout engine on pdf-lib:
 * word-wraps styled runs (bold/italic/underline pick the right Helvetica
 * face), embeds images (signatures), and paginates onto A4.
 *
 * Known limitation (stated in the UI): standard fonts cover Latin (WinAnsi)
 * characters only; unsupported characters are replaced so export never
 * crashes. Full Unicode needs an embedded font (post-MVP).
 */
import { PDFDocument, PDFFont, PDFImage, PDFPage, StandardFonts, rgb } from "pdf-lib";
import { bytesToPdfBlob } from "@/lib/pdf/blob";
import { DocBlock, Run } from "@/lib/doc/model";

const PAGE = { width: 595.28, height: 841.89 }; // A4 in points
const MARGIN = { top: 64, bottom: 64, left: 60, right: 60 };
const TEXT_WIDTH = PAGE.width - MARGIN.left - MARGIN.right;
const MAX_IMAGE_HEIGHT = 160; // signatures shouldn't dominate the page

interface BlockStyle {
  size: number;
  spaceBefore: number;
  spaceAfter: number;
  indent: number;
}

const HEADING_STYLES: Record<1 | 2 | 3, BlockStyle> = {
  1: { size: 22, spaceBefore: 14, spaceAfter: 8, indent: 0 },
  2: { size: 17, spaceBefore: 12, spaceAfter: 6, indent: 0 },
  3: { size: 14, spaceBefore: 10, spaceAfter: 5, indent: 0 },
};
const BODY: BlockStyle = { size: 11.5, spaceBefore: 0, spaceAfter: 7, indent: 0 };
const LIST: BlockStyle = { size: 11.5, spaceBefore: 0, spaceAfter: 4, indent: 16 };

/** Replaces characters the standard fonts cannot encode. */
function sanitize(text: string): string {
  return text
    .replace(/[‘’]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/—/g, "--")
    .replace(/–/g, "-")
    .replace(/…/g, "...")
    .replace(/[^\x20-\x7E -ÿ\n]/g, "?");
}

/** A word (or explicit break) tagged with its style, ready for wrapping. */
interface Token {
  text: string;
  bold: boolean;
  italic: boolean;
  underline: boolean;
  lineBreak?: boolean;
}

function runsToTokens(runs: Run[], forceBold: boolean): Token[] {
  const tokens: Token[] = [];
  for (const run of runs) {
    const style = {
      bold: forceBold || !!run.bold,
      italic: !!run.italic,
      underline: !!run.underline,
    };
    for (const part of sanitize(run.text).split("\n")) {
      if (tokens.length > 0 && part !== sanitize(run.text).split("\n")[0]) {
        tokens.push({ text: "", ...style, lineBreak: true });
      }
      for (const word of part.split(/\s+/).filter(Boolean)) {
        tokens.push({ text: word, ...style });
      }
    }
  }
  return tokens;
}

export async function docToPdf(blocks: DocBlock[]): Promise<Blob> {
  const doc = await PDFDocument.create();
  const fonts: Record<string, PDFFont> = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    italic: await doc.embedFont(StandardFonts.HelveticaOblique),
    boldItalic: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
  };
  const fontFor = (token: Token): PDFFont =>
    token.bold && token.italic
      ? fonts.boldItalic
      : token.bold
        ? fonts.bold
        : token.italic
          ? fonts.italic
          : fonts.regular;

  let page = doc.addPage([PAGE.width, PAGE.height]);
  let cursorY = PAGE.height - MARGIN.top;

  const ensureRoom = (needed: number): void => {
    if (cursorY - needed < MARGIN.bottom) {
      page = doc.addPage([PAGE.width, PAGE.height]);
      cursorY = PAGE.height - MARGIN.top;
    }
  };

  const drawTokenLine = (
    line: Token[],
    x: number,
    size: number,
    lineHeight: number,
  ): void => {
    ensureRoom(lineHeight);
    let cursorX = x;
    const spaceWidth = fonts.regular.widthOfTextAtSize(" ", size);
    for (const token of line) {
      const font = fontFor(token);
      const width = font.widthOfTextAtSize(token.text, size);
      page.drawText(token.text, {
        x: cursorX,
        y: cursorY - size,
        size,
        font,
        color: rgb(0.1, 0.1, 0.12),
      });
      if (token.underline) {
        page.drawLine({
          start: { x: cursorX, y: cursorY - size - 1.5 },
          end: { x: cursorX + width, y: cursorY - size - 1.5 },
          thickness: 0.75,
          color: rgb(0.1, 0.1, 0.12),
        });
      }
      cursorX += width + spaceWidth;
    }
    cursorY -= lineHeight;
  };

  /** Wraps tokens into lines of maxWidth and draws them. */
  const drawWrapped = (
    tokens: Token[],
    style: BlockStyle,
    prefix: string,
    prefixBold: boolean,
  ): void => {
    const size = style.size;
    const lineHeight = size * 1.45;
    const startX = MARGIN.left + style.indent;
    const prefixFont = prefixBold ? fonts.bold : fonts.regular;
    const prefixWidth = prefix ? prefixFont.widthOfTextAtSize(prefix, size) : 0;
    const spaceWidth = fonts.regular.widthOfTextAtSize(" ", size);
    const maxWidth = TEXT_WIDTH - style.indent - prefixWidth;

    cursorY -= style.spaceBefore;

    // Empty block = blank line.
    if (tokens.length === 0) {
      cursorY -= lineHeight * 0.5 + style.spaceAfter;
      return;
    }

    let line: Token[] = [];
    let lineWidth = 0;
    let firstLine = true;

    const flush = () => {
      if (firstLine && prefix) {
        ensureRoom(lineHeight);
        page.drawText(prefix, {
          x: startX,
          y: cursorY - size,
          size,
          font: prefixFont,
          color: rgb(0.1, 0.1, 0.12),
        });
      }
      drawTokenLine(line, startX + prefixWidth, size, lineHeight);
      firstLine = false;
      line = [];
      lineWidth = 0;
    };

    for (const token of tokens) {
      if (token.lineBreak) {
        flush();
        continue;
      }
      const width = fontFor(token).widthOfTextAtSize(token.text, size);
      if (line.length > 0 && lineWidth + width > maxWidth) flush();
      line.push(token);
      lineWidth += width + spaceWidth;
    }
    if (line.length > 0) flush();
    cursorY -= style.spaceAfter;
  };

  const imageCache = new Map<string, PDFImage>();
  let numberedIndex = 0;

  for (const block of blocks) {
    if (block.type !== "numbered") numberedIndex = 0;
    switch (block.type) {
      case "heading":
        drawWrapped(
          runsToTokens(block.runs, true),
          HEADING_STYLES[block.level],
          "",
          false,
        );
        break;
      case "bullet":
        drawWrapped(runsToTokens(block.runs, false), LIST, "•  ", false);
        break;
      case "numbered":
        drawWrapped(runsToTokens(block.runs, false), LIST, `${++numberedIndex}.  `, false);
        break;
      case "image": {
        let image = imageCache.get(block.dataUrl);
        if (!image) {
          image = block.dataUrl.startsWith("data:image/png")
            ? await doc.embedPng(block.dataUrl)
            : await doc.embedJpg(block.dataUrl);
          imageCache.set(block.dataUrl, image);
        }
        // Fit within text width and a sane height; never upscale.
        const scale = Math.min(
          TEXT_WIDTH / image.width,
          MAX_IMAGE_HEIGHT / image.height,
          0.75,
        );
        const drawWidth = image.width * scale;
        const drawHeight = image.height * scale;
        ensureRoom(drawHeight + 10);
        page.drawImage(image, {
          x: MARGIN.left,
          y: cursorY - drawHeight,
          width: drawWidth,
          height: drawHeight,
        });
        cursorY -= drawHeight + 10;
        break;
      }
      default:
        drawWrapped(runsToTokens(block.runs, false), BODY, "", false);
    }
  }

  return bytesToPdfBlob(await doc.save());
}
