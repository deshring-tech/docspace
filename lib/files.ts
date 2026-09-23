/** Shared file helpers used by the workspace and chat interfaces. */
import { FileKind } from "./types";

/** Classifies a dropped file into the broad kind that drives available tools. */
export function detectFileKind(file: File): FileKind {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf" || name.endsWith(".pdf")) return "pdf";
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("text/") || name.endsWith(".txt") || name.endsWith(".md")) return "text";
  return "other";
}
