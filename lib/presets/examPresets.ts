/**
 * Exam / form upload presets for Indian government portals.
 *
 * IMPORTANT PRODUCT NOTE: portals change their specs between notification
 * cycles. These defaults are based on recent notifications and every value is
 * editable in the UI before processing. The disclaimer is surfaced to users.
 */

export interface ExamPreset {
  id: string;
  /** Short label shown on the preset chip, e.g. "SSC Photo". */
  label: string;
  /** The exam/portal it belongs to, used for grouping. */
  group: string;
  kind: "photo" | "signature" | "document";
  /** Exact output dimensions in px (undefined = keep aspect, size-only). */
  width?: number;
  height?: number;
  /** Size window in KB. */
  minKB?: number;
  maxKB: number;
  /** One-line spec summary shown under the chip. */
  spec: string;
}

export const EXAM_PRESETS: ExamPreset[] = [
  // ——— SSC (CGL / CHSL / MTS via OTR) ———
  {
    id: "ssc-photo",
    label: "SSC Photo",
    group: "SSC",
    kind: "photo",
    width: 276,
    height: 354,
    minKB: 20,
    maxKB: 50,
    spec: "JPEG, 3.5×4.5 cm, 20–50 KB",
  },
  {
    id: "ssc-signature",
    label: "SSC Signature",
    group: "SSC",
    kind: "signature",
    width: 315,
    height: 236,
    minKB: 10,
    maxKB: 20,
    spec: "JPEG, 4×3 cm, 10–20 KB",
  },

  // ——— UPSC (OTR / online application) ———
  {
    id: "upsc-photo",
    label: "UPSC Photo",
    group: "UPSC",
    kind: "photo",
    width: 350,
    height: 350,
    minKB: 20,
    maxKB: 300,
    spec: "JPEG, square, 20–300 KB",
  },
  {
    id: "upsc-signature",
    label: "UPSC Signature",
    group: "UPSC",
    kind: "signature",
    width: 350,
    height: 350,
    minKB: 20,
    maxKB: 300,
    spec: "JPEG, square, 20–300 KB",
  },

  // ——— NEET (NTA) ———
  {
    id: "neet-photo",
    label: "NEET Photo",
    group: "NEET",
    kind: "photo",
    width: 276,
    height: 354,
    minKB: 10,
    maxKB: 200,
    spec: "JPEG, passport size, 10–200 KB",
  },
  {
    id: "neet-signature",
    label: "NEET Signature",
    group: "NEET",
    kind: "signature",
    minKB: 4,
    maxKB: 30,
    spec: "JPEG, 4–30 KB",
  },

  // ——— JEE Main (NTA) ———
  {
    id: "jee-photo",
    label: "JEE Photo",
    group: "JEE",
    kind: "photo",
    width: 276,
    height: 354,
    minKB: 10,
    maxKB: 300,
    spec: "JPEG, passport size, 10–300 KB",
  },
  {
    id: "jee-signature",
    label: "JEE Signature",
    group: "JEE",
    kind: "signature",
    minKB: 4,
    maxKB: 30,
    spec: "JPEG, 4–30 KB",
  },

  // ——— PAN card (NSDL/UTIITSL online) ———
  {
    id: "pan-photo",
    label: "PAN Photo",
    group: "PAN",
    kind: "photo",
    width: 213,
    height: 213,
    maxKB: 20,
    spec: "JPEG, 213×213 px, ≤ 20 KB",
  },
  {
    id: "pan-signature",
    label: "PAN Signature",
    group: "PAN",
    kind: "signature",
    width: 213,
    height: 213,
    maxKB: 10,
    spec: "JPEG, 213×213 px, ≤ 10 KB",
  },

  // ——— Passport Seva ———
  {
    id: "passport-photo",
    label: "Passport Photo",
    group: "Passport",
    kind: "photo",
    width: 630,
    height: 810,
    minKB: 10,
    maxKB: 300,
    spec: "JPEG, 3.5×4.5 cm, 10–300 KB",
  },

  // ——— United States ———
  // Square 2×2in photos are the US standard across passport, visa and DV.
  {
    id: "us-passport-photo",
    label: "US Passport",
    group: "US",
    kind: "photo",
    width: 600,
    height: 600,
    minKB: 10,
    maxKB: 240,
    spec: "JPEG, 2×2 in (600×600 px), ≤ 240 KB",
  },
  {
    id: "us-visa-photo",
    label: "US Visa (DS-160)",
    group: "US",
    kind: "photo",
    width: 600,
    height: 600,
    minKB: 10,
    maxKB: 240,
    spec: "JPEG, square 600×600 px, ≤ 240 KB",
  },
  {
    id: "us-dv-lottery-photo",
    label: "DV Lottery",
    group: "US",
    kind: "photo",
    width: 600,
    height: 600,
    minKB: 10,
    maxKB: 240,
    spec: "JPEG, square 600×600 px, ≤ 240 KB",
  },

  // ——— Other international ———
  // Sizes vary by consulate and portal; these are the common baselines and
  // every value stays editable in the UI.
  {
    id: "uk-passport-photo",
    label: "UK Passport",
    group: "International",
    kind: "photo",
    width: 600,
    height: 750,
    minKB: 50,
    maxKB: 10240,
    spec: "JPEG, min 600×750 px, 50 KB–10 MB",
  },
  {
    id: "schengen-visa-photo",
    label: "Schengen Visa",
    group: "International",
    kind: "photo",
    width: 413,
    height: 531,
    minKB: 10,
    maxKB: 300,
    spec: "JPEG, 35×45 mm (413×531 px), ≤ 300 KB",
  },
  {
    id: "photo-35x45mm",
    label: "35×45 mm",
    group: "International",
    kind: "photo",
    width: 413,
    height: 531,
    maxKB: 500,
    spec: "JPEG, 35×45 mm at 300 DPI — common worldwide",
  },
  {
    id: "photo-2x2in",
    label: "2×2 inch",
    group: "International",
    kind: "photo",
    width: 600,
    height: 600,
    maxKB: 500,
    spec: "JPEG, 2×2 in at 300 DPI — US standard size",
  },

  // ——— Generic document targets (certificates / PDFs) ———
  {
    id: "doc-100kb",
    label: "Under 100 KB",
    group: "Documents",
    kind: "document",
    maxKB: 100,
    spec: "Any file, compressed to ≤ 100 KB",
  },
  {
    id: "doc-200kb",
    label: "Under 200 KB",
    group: "Documents",
    kind: "document",
    maxKB: 200,
    spec: "Any file, compressed to ≤ 200 KB",
  },
  {
    id: "doc-300kb",
    label: "Under 300 KB",
    group: "Documents",
    kind: "document",
    maxKB: 300,
    spec: "Any file, compressed to ≤ 300 KB",
  },
  {
    id: "doc-500kb",
    label: "Under 500 KB",
    group: "Documents",
    kind: "document",
    maxKB: 500,
    spec: "Any file, compressed to ≤ 500 KB",
  },
];

export function getPreset(id: string): ExamPreset | undefined {
  return EXAM_PRESETS.find((preset) => preset.id === id);
}

/** Preset groups in display order. */
export const PRESET_GROUPS = [
  "SSC",
  "UPSC",
  "NEET",
  "JEE",
  "PAN",
  "Passport",
  "US",
  "International",
  "Documents",
];
