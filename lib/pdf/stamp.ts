/**
 * Stamping: diagonal text watermarks and page numbers, applied with pdf-lib
 * directly onto the existing pages (no rasterizing — text stays selectable).
 */
import { PDFDocument, StandardFonts, degrees, rgb } from "pdf-lib";
import { bytesToPdfBlob } from "./blob";

export interface StampOptions {
  /** Watermark text; empty/undefined = no watermark. */
  watermark?: string;
  /** 0–1, how visible the watermark is. */
  opacity?: number;
  /** Add "1 / N" page numbers at the bottom center. */
  pageNumbers?: boolean;
}

/** Standard fonts are WinAnsi-only; strip anything they can't encode. */
function sanitize(text: string): string {
  return text.replace(/[^\x20-\x7E -ÿ]/g, "?");
}

export async function stampPdf(file: File, options: StampOptions): Promise<Blob> {
  const doc = await PDFDocument.load(await file.arrayBuffer(), {
    ignoreEncryption: true,
  });
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const watermark = options.watermark ? sanitize(options.watermark.trim()) : "";
  const opacity = Math.min(1, Math.max(0.05, options.opacity ?? 0.15));

  const pages = doc.getPages();
  pages.forEach((page, index) => {
    const { width, height } = page.getSize();

    if (watermark) {
      // Scale the watermark to span most of the diagonal.
      const diagonal = Math.sqrt(width * width + height * height);
      let size = 64;
      while (size > 12 && font.widthOfTextAtSize(watermark, size) > diagonal * 0.6) {
        size -= 4;
      }
      const textWidth = font.widthOfTextAtSize(watermark, size);
      const angle = Math.atan2(height, width); // along the diagonal
      page.drawText(watermark, {
        x: width / 2 - (textWidth / 2) * Math.cos(angle),
        y: height / 2 - (textWidth / 2) * Math.sin(angle),
        size,
        font,
        color: rgb(0.45, 0.45, 0.5),
        opacity,
        rotate: degrees((angle * 180) / Math.PI),
      });
    }

    if (options.pageNumbers) {
      const label = `${index + 1} / ${pages.length}`;
      const size = 10;
      page.drawText(label, {
        x: width / 2 - font.widthOfTextAtSize(label, size) / 2,
        y: 24,
        size,
        font,
        color: rgb(0.35, 0.35, 0.4),
      });
    }
  });

  return bytesToPdfBlob(await doc.save());
}
