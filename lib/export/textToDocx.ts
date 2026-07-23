/**
 * Writing pad → Word document, via the `docx` package (runs in the browser).
 * Full Unicode is supported here — Word handles font fallback itself.
 */
import {
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";
import { parseBlocks } from "./markdown";

export async function textToDocx(source: string): Promise<Blob> {
  const children: Paragraph[] = [];

  for (const block of parseBlocks(source)) {
    switch (block.type) {
      case "h1":
        children.push(new Paragraph({ text: block.text, heading: HeadingLevel.HEADING_1 }));
        break;
      case "h2":
        children.push(new Paragraph({ text: block.text, heading: HeadingLevel.HEADING_2 }));
        break;
      case "h3":
        children.push(new Paragraph({ text: block.text, heading: HeadingLevel.HEADING_3 }));
        break;
      case "bullet":
        children.push(new Paragraph({ text: block.text, bullet: { level: 0 } }));
        break;
      case "numbered":
        children.push(
          new Paragraph({
            text: block.text,
            numbering: { reference: "pad-numbering", level: 0 },
          }),
        );
        break;
      case "blank":
        children.push(new Paragraph({ children: [] }));
        break;
      default:
        children.push(new Paragraph({ children: [new TextRun(block.text)] }));
    }
  }

  const doc = new Document({
    numbering: {
      config: [
        {
          reference: "pad-numbering",
          levels: [
            {
              level: 0,
              format: "decimal",
              text: "%1.",
              alignment: "left",
            },
          ],
        },
      ],
    },
    sections: [{ children }],
  });

  return Packer.toBlob(doc);
}
