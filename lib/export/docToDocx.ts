/**
 * Rich document → Word. Full Unicode and real formatting — Word handles
 * fonts itself, so unlike the PDF path nothing needs sanitizing.
 */
import {
  Document,
  HeadingLevel,
  ImageRun,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { DocBlock, Run } from "@/lib/doc/model";

const HEADINGS = {
  1: HeadingLevel.HEADING_1,
  2: HeadingLevel.HEADING_2,
  3: HeadingLevel.HEADING_3,
} as const;

const MAX_IMAGE_WIDTH = 400; // px in the Word document
const MAX_IMAGE_HEIGHT = 200;

function toTextRuns(runs: Run[]): TextRun[] {
  return runs.flatMap((run) =>
    // Splitting on \n turns hard breaks into separate runs with `break`.
    run.text.split("\n").map(
      (part, index) =>
        new TextRun({
          text: part,
          bold: run.bold,
          italics: run.italic,
          underline: run.underline ? {} : undefined,
          break: index > 0 ? 1 : undefined,
        }),
    ),
  );
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export async function docToDocx(blocks: DocBlock[]): Promise<Blob> {
  const children: Paragraph[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case "heading":
        children.push(
          new Paragraph({ children: toTextRuns(block.runs), heading: HEADINGS[block.level] }),
        );
        break;
      case "bullet":
        children.push(
          new Paragraph({ children: toTextRuns(block.runs), bullet: { level: 0 } }),
        );
        break;
      case "numbered":
        children.push(
          new Paragraph({
            children: toTextRuns(block.runs),
            numbering: { reference: "pad-numbering", level: 0 },
          }),
        );
        break;
      case "image": {
        const scale = Math.min(
          MAX_IMAGE_WIDTH / (block.width || MAX_IMAGE_WIDTH),
          MAX_IMAGE_HEIGHT / (block.height || MAX_IMAGE_HEIGHT),
          1,
        );
        children.push(
          new Paragraph({
            children: [
              new ImageRun({
                type: block.dataUrl.startsWith("data:image/png") ? "png" : "jpg",
                data: dataUrlToBytes(block.dataUrl),
                transformation: {
                  width: Math.round((block.width || MAX_IMAGE_WIDTH) * scale),
                  height: Math.round((block.height || MAX_IMAGE_HEIGHT) * scale),
                },
              }),
            ],
          }),
        );
        break;
      }
      default:
        children.push(new Paragraph({ children: toTextRuns(block.runs) }));
    }
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "pad-numbering",
          levels: [{ level: 0, format: "decimal", text: "%1.", alignment: "left" }],
        },
      ],
    },
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}
