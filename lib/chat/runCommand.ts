/**
 * Chat command executor.
 *
 * Maps a parsed ChatIntent onto the existing processing engines and returns a
 * conversational reply: a short message plus any downloadable outputs. This is
 * pure orchestration — every actual operation reuses a library the workspace
 * panels already use, so behaviour stays identical across both interfaces.
 *
 * Honesty is enforced here: operations we can't do well client-side (Word
 * conversion) or that are inherently interactive (precise page rotation) return
 * a clear explanation instead of a wrong result.
 */
import { ChatIntent } from "./intent";
import { ProcessedResult, WorkspaceFile } from "@/lib/types";
import { baseName, formatBytes } from "@/lib/format";
import { compressImageToTarget } from "@/lib/image/compressImage";
import { extractSignature, signatureToJpeg } from "@/lib/image/extractSignature";
import { reencodeImage } from "@/lib/image/reencode";
import { compressPdfToTarget } from "@/lib/pdf/compressPdf";
import { imagesToPdf } from "@/lib/pdf/imagesToPdf";
import { pdfToImages } from "@/lib/pdf/pdfToImages";
import { extractPages, mergePdfs, parsePageRanges } from "@/lib/pdf/pages";
import { getPageCount } from "@/lib/pdf/pdfjs";
import { stampPdf } from "@/lib/pdf/stamp";
import { ocrToSearchablePdf, ocrToText } from "@/lib/ocr/ocr";
import { zipBlobs } from "@/lib/zip";

export interface ChatReply {
  message: string;
  outputs: ProcessedResult[];
  /** Free text output (e.g. OCR result) shown inline and copyable. */
  extractedText?: string;
}

export type ProgressFn = (note: string) => void;

const IMAGE_MIME: Record<string, "image/png" | "image/jpeg" | "image/webp"> = {
  png: "image/png",
  jpg: "image/jpeg",
  webp: "image/webp",
};

function pdfs(files: WorkspaceFile[]) {
  return files.filter((f) => f.kind === "pdf");
}
function images(files: WorkspaceFile[]) {
  return files.filter((f) => f.kind === "image");
}

/** What chat can do — surfaced when a request isn't understood. */
export const CHAT_CAPABILITIES = [
  "Compress to an exact size — “compress to 200 KB”",
  "Resize for an exam/visa — “make it UPSC photo size”",
  "Convert — “convert to PDF”, “to PNG”",
  "Merge / split — “merge these”, “extract pages 2-5”",
  "OCR — “extract the text”, “make it searchable”",
  "Signature — “extract my signature”",
  "Watermark — “add a CONFIDENTIAL watermark”",
];

export async function executeChat(
  intent: ChatIntent,
  files: WorkspaceFile[],
  onProgress: ProgressFn,
): Promise<ChatReply> {
  const outputs: ProcessedResult[] = [];

  switch (intent.kind) {
    // ——— Compress / resize ———
    case "compress":
    case "photo": {
      const targets = intent.kind === "photo" ? images(files) : [...images(files), ...pdfs(files)];
      if (targets.length === 0) {
        return { message: "Add an image or PDF first, then tell me the size you need.", outputs };
      }
      const preset = intent.kind === "photo" ? intent.preset : intent.preset;
      const maxKb = preset ? preset.maxKB : intent.kind === "compress" ? intent.maxKb : undefined;
      if (!maxKb && !preset) {
        return {
          message: "What size should I target? For example “compress to 100 KB” or “make it SSC photo size”.",
          outputs,
        };
      }
      const suffix = preset ? preset.id : `${maxKb}kb`;
      for (const item of targets) {
        onProgress(`Compressing ${item.file.name}…`);
        if (item.kind === "image") {
          const out = await compressImageToTarget(item.file, {
            maxBytes: (maxKb ?? preset!.maxKB) * 1024,
            minBytes: preset?.minKB ? preset.minKB * 1024 : undefined,
            width: preset?.width,
            height: preset?.height,
            mimeType: "image/jpeg",
          });
          outputs.push({
            blob: out.blob,
            filename: `${baseName(item.file.name)}-${suffix}.jpg`,
            note: `${formatBytes(item.file.size)} → ${formatBytes(out.blob.size)}${out.width ? ` · ${out.width}×${out.height}px` : ""}`,
          });
        } else {
          const out = await compressPdfToTarget(item.file, (maxKb ?? preset!.maxKB) * 1024, (d, t) =>
            onProgress(`Compressing ${item.file.name} — page ${d}/${t}`),
          );
          outputs.push({
            blob: out.blob,
            filename: `${baseName(item.file.name)}-${suffix}.pdf`,
            note: `${formatBytes(item.file.size)} → ${formatBytes(out.blob.size)}`,
          });
        }
      }
      const note = preset
        ? `Done — sized for ${preset.label} (${preset.spec}).${preset.kind === "photo" ? " For precise face framing, use the Passport photo tool." : ""}`
        : `Done — compressed to ≤ ${maxKb} KB.`;
      return { message: note, outputs };
    }

    // ——— Convert ———
    case "convert": {
      if (intent.unsupported) {
        return {
          message: `I can't convert to ${intent.unsupported} yet — high-fidelity ${intent.unsupported} conversion is on the roadmap, not shipped as a poor version. I can convert images ↔ PDF and PDF → PNG/JPG.`,
          outputs,
        };
      }
      const img = images(files);
      const pdf = pdfs(files);
      const format = intent.format ?? (img.length > 0 ? "pdf" : "png");

      if (format === "pdf") {
        if (img.length === 0) return { message: "Add one or more images to make a PDF.", outputs };
        onProgress("Building PDF…");
        const blob = await imagesToPdf(img.map((f) => f.file));
        outputs.push({ blob, filename: "images.pdf", note: `${img.length} image(s) → one PDF` });
        return { message: "Done — combined your image(s) into a PDF.", outputs };
      }

      const mime = IMAGE_MIME[format];
      for (const item of img) {
        outputs.push({
          blob: await reencodeImage(item.file, mime),
          filename: `${baseName(item.file.name)}.${format}`,
        });
      }
      for (const item of pdf) {
        if (format === "webp") {
          return { message: "PDF pages can be exported to PNG or JPG (not WebP).", outputs };
        }
        onProgress(`Rendering ${item.file.name}…`);
        const pages = await pdfToImages(item.file, mime as "image/png" | "image/jpeg", (d, t) =>
          onProgress(`Rendering ${item.file.name} — page ${d}/${t}`),
        );
        if (pages.length === 1) {
          outputs.push({ blob: pages[0], filename: `${baseName(item.file.name)}.${format}` });
        } else {
          const zip = await zipBlobs(
            pages.map((blob, i) => ({ blob, filename: `${baseName(item.file.name)}-page-${i + 1}.${format}` })),
          );
          outputs.push({ blob: zip, filename: `${baseName(item.file.name)}-${format}.zip`, note: `${pages.length} pages` });
        }
      }
      if (outputs.length === 0) return { message: `Add a file I can convert to ${format.toUpperCase()}.`, outputs };
      return { message: `Done — converted to ${format.toUpperCase()}.`, outputs };
    }

    // ——— Images → one PDF ———
    case "images-to-pdf": {
      const img = images(files);
      if (img.length === 0) return { message: "Add one or more images first.", outputs };
      onProgress("Building PDF…");
      const blob = await imagesToPdf(img.map((f) => f.file));
      outputs.push({ blob, filename: "images.pdf", note: `${img.length} image(s), one per page` });
      return { message: "Done — one PDF from your images.", outputs };
    }

    // ——— Merge ———
    case "merge": {
      const pdf = pdfs(files);
      if (pdf.length < 2) return { message: "Add at least two PDFs to merge.", outputs };
      onProgress("Merging…");
      const blob = await mergePdfs(pdf.map((f) => f.file));
      outputs.push({ blob, filename: "merged.pdf", note: `${pdf.length} PDFs combined` });
      return { message: "Done — merged into one PDF.", outputs };
    }

    // ——— Split / extract pages ———
    case "split": {
      const pdf = pdfs(files);
      if (pdf.length === 0) return { message: "Add a PDF to split.", outputs };
      const file = pdf[0];
      if (!intent.range) {
        return { message: `Which pages? Try “extract pages 1-3” or “extract page 2 of ${file.file.name}”.`, outputs };
      }
      const pageCount = file.pageCount ?? (await getPageCount(file.file));
      try {
        const indices = parsePageRanges(intent.range, pageCount);
        onProgress("Extracting pages…");
        const blob = await extractPages(file.file, indices);
        outputs.push({
          blob,
          filename: `${baseName(file.file.name)}-pages.pdf`,
          note: `${indices.length} page(s) from ${file.file.name}`,
        });
        return { message: `Done — extracted page(s) ${intent.range}.`, outputs };
      } catch (err) {
        return { message: err instanceof Error ? err.message : "Could not parse that page range.", outputs };
      }
    }

    // ——— OCR ———
    case "ocr": {
      const target = [...pdfs(files), ...images(files)][0];
      if (!target) return { message: "Add a scanned image or PDF, then ask me to read it.", outputs };
      if (intent.mode === "text") {
        const text = await ocrToText(target.file, target.kind, intent.langs, (p) =>
          onProgress(`${p.status}${p.page ? ` — page ${p.page}/${p.totalPages}` : ""}`),
        );
        return {
          message: `Here's the text I read from ${target.file.name}:`,
          outputs,
          extractedText: text || "(No text detected.)",
        };
      }
      const blob = await ocrToSearchablePdf(target.file, target.kind, intent.langs, (p) =>
        onProgress(`${p.status}${p.page ? ` — page ${p.page}/${p.totalPages}` : ""}`),
      );
      outputs.push({
        blob,
        filename: `${baseName(target.file.name)}-searchable.pdf`,
        note: "invisible text layer added",
      });
      return { message: "Done — your scan is now a searchable PDF.", outputs };
    }

    // ——— Signature ———
    case "signature": {
      const img = images(files);
      if (img.length === 0) return { message: "Add a photo of your signature first.", outputs };
      onProgress("Extracting signature…");
      const extracted = await extractSignature(img[0].file);
      outputs.push({
        blob: extracted.blob,
        filename: `${baseName(img[0].file.name)}-signature.png`,
        note: `${extracted.width}×${extracted.height}px · transparent`,
      });
      outputs.push({
        blob: await signatureToJpeg(extracted),
        filename: `${baseName(img[0].file.name)}-signature.jpg`,
        note: "white background",
      });
      return { message: "Done — cleaned your signature (transparent PNG + white-bg JPG).", outputs };
    }

    // ——— Watermark / page numbers ———
    case "stamp": {
      const pdf = pdfs(files);
      if (pdf.length === 0) return { message: "Add a PDF to watermark or number.", outputs };
      onProgress("Stamping…");
      for (const item of pdf) {
        const blob = await stampPdf(item.file, {
          watermark: intent.watermark,
          pageNumbers: intent.pageNumbers,
        });
        outputs.push({
          blob,
          filename: `${baseName(item.file.name)}-stamped.pdf`,
          note: [intent.watermark ? `“${intent.watermark}”` : null, intent.pageNumbers ? "page numbers" : null]
            .filter(Boolean)
            .join(" + "),
        });
      }
      return { message: "Done — stamped your PDF.", outputs };
    }

    // ——— Not understood ———
    default:
      return {
        message:
          "I can't do that one yet. Here's what I can handle right now:\n• " +
          CHAT_CAPABILITIES.join("\n• "),
        outputs,
      };
  }
}
