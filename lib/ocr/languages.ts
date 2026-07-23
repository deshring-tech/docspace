/**
 * OCR languages offered in the UI. Codes are Tesseract traineddata names.
 * The list is India-first (English + the major official scripts) plus a few
 * widely-requested international languages. Selecting several is allowed —
 * Tesseract combines them (e.g. "eng+hin") for bilingual documents.
 *
 * Each selected language downloads its model once, then caches — so the list
 * is kept deliberately curated rather than exhaustive.
 */
export interface OcrLanguage {
  code: string;
  label: string;
}

export const OCR_LANGUAGES: OcrLanguage[] = [
  { code: "eng", label: "English" },
  { code: "hin", label: "Hindi" },
  { code: "ben", label: "Bengali" },
  { code: "tam", label: "Tamil" },
  { code: "tel", label: "Telugu" },
  { code: "mar", label: "Marathi" },
  { code: "guj", label: "Gujarati" },
  { code: "kan", label: "Kannada" },
  { code: "mal", label: "Malayalam" },
  { code: "pan", label: "Punjabi" },
  { code: "urd", label: "Urdu" },
  { code: "ara", label: "Arabic" },
  { code: "fra", label: "French" },
  { code: "spa", label: "Spanish" },
  { code: "deu", label: "German" },
];

export const DEFAULT_OCR_LANGUAGE = "eng";
