/**
 * OCR engine (Tesseract, in-browser).
 *
 * Two outputs, both fully local:
 *   - ocrToText:          scanned image/PDF -> plain text
 *   - ocrToSearchablePdf: scanned image/PDF -> PDF with an invisible text layer
 *
 * The heavy tesseract.js bundle is dynamically imported only when OCR actually
 * runs. PDF pages are rasterized with the shared pdf.js helper, and per-page
 * searchable PDFs are combined with the shared mergePdfs — no duplicated logic.
 *
 * Engine/model asset paths are configurable via env for self-hosting; the
 * defaults use tesseract.js's own CDN. The user's document is never uploaded —
 * only the open-source engine and language model are fetched.
 */
import { mergePdfs } from "@/lib/pdf/pages";
import { bytesToPdfBlob } from "@/lib/pdf/blob";
import { openPdf, renderPageToCanvas } from "@/lib/pdf/pdfjs";
import { FileKind } from "@/lib/types";

export type OcrMode = "text" | "pdf";

export interface OcrProgress {
  /** Friendly status line, e.g. "Recognizing text". */
  status: string;
  /** Overall completion, 0–1. */
  progress: number;
  page?: number;
  totalPages?: number;
}

type ProgressFn = (progress: OcrProgress) => void;

/** Resolution for rasterizing PDF pages before OCR. Higher = more accurate. */
const OCR_RENDER_SCALE = 2.5;

const ENV = {
  workerPath: process.env.NEXT_PUBLIC_TESSERACT_WORKER_PATH?.trim(),
  corePath: process.env.NEXT_PUBLIC_TESSERACT_CORE_PATH?.trim(),
  langPath: process.env.NEXT_PUBLIC_TESSDATA_URL?.trim(),
};

const STATUS_LABELS: Record<string, string> = {
  "loading tesseract core": "Loading OCR engine",
  "initializing tesseract": "Starting OCR engine",
  "initializing api": "Starting OCR engine",
  "loading language traineddata": "Loading language model",
  "recognizing text": "Recognizing text",
};

function friendly(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

/**
 * Creates a configured Tesseract worker. A shared `state` object lets the
 * logger report overall progress across multiple PDF pages.
 */
async function createConfiguredWorker(
  langs: string,
  state: { page: number; totalPages: number },
  onProgress: ProgressFn,
) {
  const { createWorker } = await import("tesseract.js");

  const options: Record<string, unknown> = {
    logger: (message: { status?: string; progress?: number }) => {
      if (!message.status) return;
      const isRecognizing = message.status === "recognizing text";
      const pageFraction = typeof message.progress === "number" ? message.progress : 0;
      // During recognition, blend per-page progress into an overall value.
      const overall = isRecognizing
        ? (state.page - 1 + pageFraction) / state.totalPages
        : pageFraction;
      onProgress({
        status: friendly(message.status),
        progress: Math.min(1, Math.max(0, overall)),
        page: state.totalPages > 1 ? state.page : undefined,
        totalPages: state.totalPages > 1 ? state.totalPages : undefined,
      });
    },
  };
  if (ENV.workerPath) options.workerPath = ENV.workerPath;
  if (ENV.corePath) options.corePath = ENV.corePath;
  if (ENV.langPath) options.langPath = ENV.langPath;

  return createWorker(langs, 1, options);
}

/** Number of pages to iterate for a source (1 for images). */
async function pageCountFor(file: File, kind: FileKind): Promise<number> {
  if (kind !== "pdf") return 1;
  const doc = await openPdf(await file.arrayBuffer());
  const count = doc.numPages;
  await doc.destroy();
  return count;
}

/** Extracts plain text from a scanned image or PDF. */
export async function ocrToText(
  file: File,
  kind: FileKind,
  langs: string[],
  onProgress: ProgressFn,
): Promise<string> {
  const state = { page: 1, totalPages: await pageCountFor(file, kind) };
  const worker = await createConfiguredWorker(langs.join("+"), state, onProgress);

  try {
    if (kind !== "pdf") {
      const { data } = await worker.recognize(file);
      return data.text.trim();
    }

    const doc = await openPdf(await file.arrayBuffer());
    const parts: string[] = [];
    try {
      for (let page = 1; page <= doc.numPages; page++) {
        state.page = page;
        const canvas = await renderPageToCanvas(doc, page, OCR_RENDER_SCALE);
        const { data } = await worker.recognize(canvas);
        parts.push(data.text.trim());
        canvas.width = 0; // release memory
      }
    } finally {
      await doc.destroy();
    }
    return parts.join("\n\n");
  } finally {
    await worker.terminate();
  }
}

/** Wraps Tesseract's PDF byte output (number[]) in a Blob. */
function pdfBytesToBlob(bytes: number[] | Uint8Array): Blob {
  return bytesToPdfBlob(bytes instanceof Uint8Array ? bytes : Uint8Array.from(bytes));
}

/**
 * Produces a searchable PDF: the original scan with an invisible, selectable
 * text layer. For multi-page PDFs each page is OCR'd and the results merged.
 */
export async function ocrToSearchablePdf(
  file: File,
  kind: FileKind,
  langs: string[],
  onProgress: ProgressFn,
): Promise<Blob> {
  const state = { page: 1, totalPages: await pageCountFor(file, kind) };
  const worker = await createConfiguredWorker(langs.join("+"), state, onProgress);

  try {
    if (kind !== "pdf") {
      const { data } = await worker.recognize(file, {}, { pdf: true });
      if (!data.pdf) throw new Error("OCR did not return a PDF.");
      return pdfBytesToBlob(data.pdf);
    }

    const doc = await openPdf(await file.arrayBuffer());
    const pages: Blob[] = [];
    try {
      for (let page = 1; page <= doc.numPages; page++) {
        state.page = page;
        const canvas = await renderPageToCanvas(doc, page, OCR_RENDER_SCALE);
        const { data } = await worker.recognize(canvas, {}, { pdf: true });
        if (!data.pdf) throw new Error("OCR did not return a PDF.");
        pages.push(pdfBytesToBlob(data.pdf));
        canvas.width = 0;
      }
    } finally {
      await doc.destroy();
    }
    return pages.length === 1 ? pages[0] : mergePdfs(pages);
  } finally {
    await worker.terminate();
  }
}
