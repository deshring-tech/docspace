/**
 * Shared types used across the workspace.
 */

/** Broad category of a dropped file — drives which actions we offer. */
export type FileKind = "pdf" | "image" | "text" | "other";

/** A file loaded into the workspace, plus metadata we derive from it. */
export interface WorkspaceFile {
  id: string;
  file: File;
  kind: FileKind;
  /** Page count, populated lazily for PDFs. */
  pageCount?: number;
  /** Object URL for image previews (revoked when the file is removed). */
  previewUrl?: string;
  /** Pixel dimensions, populated lazily for images (drives suggestions). */
  imageWidth?: number;
  imageHeight?: number;
  /** For PDFs: whether a real text layer exists. False ⇒ likely scanned. */
  hasText?: boolean;
}

/** Result of any processing operation, ready for download. */
export interface ProcessedResult {
  blob: Blob;
  filename: string;
  /** Human-readable note, e.g. "312 KB → 98 KB". */
  note?: string;
}

/** The actions the workspace can perform. */
export type ActionId =
  | "compress"
  | "pages"
  | "merge"
  | "split"
  | "convert"
  | "signature"
  | "stamp"
  | "ocr"
  | "photo"
  | "images-to-pdf";
