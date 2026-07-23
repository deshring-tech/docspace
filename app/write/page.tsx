import type { Metadata } from "next";
import { TextPad } from "@/components/write/TextPad";

export const metadata: Metadata = {
  title: "Write & export — PDF, Word, Markdown",
  description:
    "A distraction-free writing pad that exports to PDF, DOCX, Markdown, HTML and TXT. Free, in your browser, autosaved locally.",
};

export default function WritePage() {
  return <TextPad />;
}
