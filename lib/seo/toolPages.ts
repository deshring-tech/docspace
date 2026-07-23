/**
 * Registry powering the programmatic SEO landing pages at /tools/[slug].
 * Every page deep-links into the workspace with the right action (and preset)
 * pre-selected, so the landing page → task flow is one click.
 *
 * Growing this list is a content task, not a code task: add an entry here and
 * the page, sitemap entry, and metadata are generated automatically.
 */

export interface ToolPage {
  slug: string;
  /** <title> / H1, matched to the search query. */
  title: string;
  metaDescription: string;
  /** Query string appended to "/" to preconfigure the workspace. */
  workspaceQuery: string;
  /** Landing page copy: intro paragraph + how-to steps. */
  intro: string;
  steps: string[];
}

const KB_TARGETS = [50, 100, 200, 300, 500];

/** Generates the "compress PDF to N KB" family from one template. */
const compressPdfPages: ToolPage[] = KB_TARGETS.map((kb) => ({
  slug: `compress-pdf-to-${kb}kb`,
  title: `Compress PDF to ${kb} KB Online — Free, No Upload`,
  metaDescription: `Compress a PDF to under ${kb} KB directly in your browser. Free, unlimited, no signup — your file never leaves your device.`,
  workspaceQuery: `?action=compress&maxkb=${kb}`,
  intro: `Many exam portals and government forms reject PDFs over ${kb} KB. This tool compresses your PDF to fit under ${kb} KB entirely in your browser — nothing is uploaded to any server.`,
  steps: [
    "Drop your PDF into the workspace below.",
    `The ${kb} KB target is already selected — press Compress.`,
    "Download the compressed PDF and upload it to the portal.",
  ],
}));

const imageKbPages: ToolPage[] = [20, 50, 100, 200].map((kb) => ({
  slug: `resize-image-to-${kb}kb`,
  title: `Resize Image to ${kb} KB Online — Exact Size, Free`,
  metaDescription: `Reduce a JPEG or PNG to exactly ${kb} KB in your browser. Free and private — the image never leaves your device.`,
  workspaceQuery: `?action=compress&maxkb=${kb}`,
  intro: `Need an image under ${kb} KB for a form upload? This tool compresses it to fit — guaranteed under the limit, processed locally in your browser.`,
  steps: [
    "Drop your photo or scan into the workspace.",
    `The ${kb} KB target is preset — press Compress.`,
    "Download the resized image.",
  ],
}));

const examPages: ToolPage[] = [
  {
    slug: "ssc-photo-resize",
    title: "SSC Photo & Signature Resizer — 20–50 KB Photo, 10–20 KB Signature",
    metaDescription:
      "Resize your photo and signature to SSC specifications (JPEG, exact dimensions and KB limits) free in your browser.",
    workspaceQuery: "?action=compress&preset=ssc-photo",
    intro:
      "SSC's One-Time Registration rejects photos and signatures that don't meet exact size limits. This tool outputs SSC-ready files in one click.",
    steps: [
      "Drop your photo (or signature) into the workspace.",
      "The SSC preset is already selected — switch to SSC Signature if needed.",
      "Press Compress and download the upload-ready file.",
    ],
  },
  {
    slug: "upsc-photo-resize",
    title: "UPSC Photo & Signature Resizer — 20–300 KB, Upload Ready",
    metaDescription:
      "Make your photo and signature UPSC upload-ready (JPEG, 20–300 KB) free in your browser. No upload, no signup.",
    workspaceQuery: "?action=compress&preset=upsc-photo",
    intro:
      "UPSC's online application enforces strict photo and signature size windows. Get a compliant file in one click, processed locally.",
    steps: [
      "Drop your photo or signature into the workspace.",
      "The UPSC preset is preselected.",
      "Press Compress and download.",
    ],
  },
  {
    slug: "neet-photo-resize",
    title: "NEET Photo & Signature Resizer — NTA Upload Sizes",
    metaDescription:
      "Resize your NEET photo (10–200 KB) and signature (4–30 KB) to NTA specifications, free and in-browser.",
    workspaceQuery: "?action=compress&preset=neet-photo",
    intro:
      "NTA's NEET application rejects files outside its size windows. This tool produces compliant files instantly in your browser.",
    steps: [
      "Drop your photo or signature.",
      "Pick NEET Photo or NEET Signature.",
      "Compress and download.",
    ],
  },
  {
    slug: "resize-signature-to-20kb",
    title: "Resize Signature to 20 KB — SSC, Bank & Govt Forms",
    metaDescription:
      "Compress your signature image to under 20 KB (with a 10 KB minimum where required) directly in your browser. Free.",
    workspaceQuery: "?action=compress&preset=ssc-signature",
    intro:
      "Signature uploads for SSC, banking and other government forms usually require 10–20 KB JPEGs. Get one in a single click.",
    steps: [
      "Drop a photo or scan of your signature.",
      "The 10–20 KB signature preset is selected.",
      "Compress and download.",
    ],
  },
];

const utilityPages: ToolPage[] = [
  {
    slug: "merge-pdf",
    title: "Merge PDF Files Online — Free, Private, No Limits",
    metaDescription:
      "Combine multiple PDFs into one, in any order, directly in your browser. Free and unlimited — files never leave your device.",
    workspaceQuery: "?action=merge",
    intro:
      "Combine certificates, chapters or scans into a single PDF. Drag to reorder, merge, download — all locally in your browser.",
    steps: ["Drop two or more PDFs.", "Arrange the order.", "Press Merge and download."],
  },
  {
    slug: "split-pdf",
    title: "Split PDF Online — Extract Pages Free, No Upload",
    metaDescription:
      "Extract pages or split a PDF into separate files in your browser. Free, private, unlimited.",
    workspaceQuery: "?action=split",
    intro:
      "Pull out the pages you need — a range like 2-5, single pages, or every page as its own file.",
    steps: ["Drop your PDF.", "Type a page range like 1-3, 7.", "Extract and download."],
  },
  {
    slug: "jpg-to-pdf",
    title: "JPG to PDF Converter — Free, In-Browser, Multi-Image",
    metaDescription:
      "Convert JPG, PNG or WebP images into a single PDF in your browser. Free and private.",
    workspaceQuery: "?action=images-to-pdf",
    intro:
      "Turn photos and scans into a clean A4 PDF — one image per page, orientation handled automatically.",
    steps: ["Drop one or more images.", "Order them as needed.", "Convert and download the PDF."],
  },
  {
    slug: "pdf-to-jpg",
    title: "PDF to JPG Converter — Every Page as an Image, Free",
    metaDescription:
      "Convert PDF pages to high-quality JPG or PNG images in your browser. Free, no upload.",
    workspaceQuery: "?action=convert",
    intro: "Export every page of a PDF as a crisp image, bundled into a ZIP when there are many.",
    steps: ["Drop your PDF.", "Choose JPG or PNG.", "Convert and download."],
  },
  {
    slug: "rotate-pdf",
    title: "Rotate PDF Pages Online — Free & Private",
    metaDescription:
      "Rotate, reorder or delete PDF pages visually in your browser. Free, unlimited, no upload.",
    workspaceQuery: "?action=pages",
    intro:
      "Fix sideways scans in seconds: rotate individual pages, drag to reorder, remove blanks — then download.",
    steps: ["Drop your PDF.", "Rotate/reorder/delete pages on the thumbnails.", "Apply and download."],
  },
  {
    slug: "us-passport-photo",
    title: "US Passport Photo Tool — 2×2 inch, 600×600 px, Free Online",
    metaDescription:
      "Make a US passport photo online: 2×2 inch (600×600 px), under 240 KB, with head-position guides. Free and private — your photo never leaves your device.",
    workspaceQuery: "?action=photo&preset=us-passport-photo",
    intro:
      "Create a US passport photo to the official 2×2 inch (600×600 px) square format. Position your face using the built-in head guides, then export at the exact size and file size required — processed entirely in your browser.",
    steps: [
      "Drop your photo into the workspace.",
      "The US Passport size is already selected — drag and zoom to fit the guides.",
      "Create the photo and download it.",
    ],
  },
  {
    slug: "dv-lottery-photo",
    title: "DV Lottery Photo Tool — 600×600 px, Under 240 KB, Free",
    metaDescription:
      "Resize and crop your Green Card DV Lottery photo to 600×600 px under 240 KB, free and in your browser. Nothing uploaded.",
    workspaceQuery: "?action=photo&preset=us-dv-lottery-photo",
    intro:
      "The Diversity Visa entry form rejects photos that aren't a square 600×600 px under 240 KB. This tool crops to that spec exactly, with guides for head position — all locally in your browser.",
    steps: [
      "Drop your photo into the workspace.",
      "The DV Lottery spec is preselected — frame your face inside the guides.",
      "Create and download the compliant photo.",
    ],
  },
  {
    slug: "schengen-visa-photo",
    title: "Schengen Visa Photo — 35×45 mm Online, Free & Private",
    metaDescription:
      "Crop and resize your Schengen visa photo to 35×45 mm (413×531 px) under 300 KB. Free, in-browser, nothing uploaded.",
    workspaceQuery: "?action=photo&preset=schengen-visa-photo",
    intro:
      "Prepare a Schengen visa photo at the standard 35×45 mm European format, with head-position guides and an exact file-size target. Everything runs in your browser.",
    steps: [
      "Drop your photo into the workspace.",
      "The 35×45 mm Schengen size is preselected.",
      "Frame your face inside the guides, then create and download.",
    ],
  },
  {
    slug: "uk-passport-photo",
    title: "UK Passport Photo Tool — 600×750 px Digital Photo, Free",
    metaDescription:
      "Create a UK passport digital photo (minimum 600×750 px) with head guides, free and in your browser. Your photo is never uploaded.",
    workspaceQuery: "?action=photo&preset=uk-passport-photo",
    intro:
      "Prepare a UK passport digital photo at the required minimum 600×750 px, framed with head-position guides. Processed locally — nothing leaves your device.",
    steps: [
      "Drop your photo into the workspace.",
      "The UK Passport size is preselected.",
      "Adjust the framing, then create and download.",
    ],
  },
  {
    slug: "passport-photo-maker",
    title: "Passport Photo Maker — Exact Size & KB, Free Online",
    metaDescription:
      "Make a passport, visa or exam photo online: crop with head guides, whiten the background, and export at exact pixel size and KB. Free, nothing uploaded.",
    workspaceQuery: "?action=photo",
    intro:
      "Turn a normal photo into a compliant passport, visa or exam photo. Position the face using official head guides, optionally whiten a plain background, and export at the exact dimensions and file size the portal demands — all in your browser.",
    steps: [
      "Drop your photo into the workspace.",
      "Pick the size (Passport, UPSC, SSC, NEET, JEE, PAN or custom).",
      "Drag and zoom to fit the guides, then create and download.",
    ],
  },
  {
    slug: "ocr-pdf",
    title: "OCR PDF & Images Online — Scan to Text, Free & Private",
    metaDescription:
      "Extract text from scanned PDFs and photos, or make a scan searchable — free, in your browser. Supports English, Hindi and more. Nothing uploaded.",
    workspaceQuery: "?action=ocr",
    intro:
      "Turn a scanned document or photo into editable text, or add an invisible text layer so a scan becomes searchable. OCR runs entirely in your browser — your file is never uploaded.",
    steps: [
      "Drop a scanned PDF or image into the workspace.",
      "Choose your language(s) and output — text or searchable PDF.",
      "Run OCR and copy the text or download the result.",
    ],
  },
  {
    slug: "image-to-text",
    title: "Image to Text (OCR) — Free Online Photo to Text",
    metaDescription:
      "Extract text from a photo or screenshot in your browser. Free, private, supports many languages — nothing uploaded.",
    workspaceQuery: "?action=ocr",
    intro:
      "Pull the text out of a photo, screenshot or scan in seconds. Processed locally in your browser and downloadable as a .txt file.",
    steps: [
      "Drop an image into the workspace.",
      "Pick the language(s) in the OCR panel.",
      "Extract the text, then copy or download it.",
    ],
  },
  {
    slug: "watermark-pdf",
    title: "Add Watermark to PDF — Free, In-Browser, No Upload",
    metaDescription:
      "Stamp CONFIDENTIAL, DRAFT or any text diagonally across every PDF page — free, private, processed in your browser.",
    workspaceQuery: "?action=stamp",
    intro:
      "Protect your documents before sharing: add a diagonal text watermark to every page with adjustable opacity. Text stays selectable — pages are not rasterized.",
    steps: [
      "Drop your PDF into the workspace.",
      "Type the watermark text and set opacity.",
      "Apply and download.",
    ],
  },
  {
    slug: "add-page-numbers-to-pdf",
    title: "Add Page Numbers to PDF Online — Free & Private",
    metaDescription:
      "Add 1/N page numbers to any PDF in your browser. Free, unlimited, nothing uploaded.",
    workspaceQuery: "?action=stamp",
    intro:
      "Number every page of a PDF (1 / N, bottom center) in seconds — useful for reports, submissions and printed documents.",
    steps: [
      "Drop your PDF.",
      "Tick 'Add page numbers'.",
      "Apply and download.",
    ],
  },
  {
    slug: "signature-background-remover",
    title: "Signature Background Remover — Photo to Clean Signature, Free",
    metaDescription:
      "Turn a photo of your signature into a clean transparent PNG or white-background JPG in your browser. Free, private, no upload.",
    workspaceQuery: "?action=signature",
    intro:
      "Photograph your signature on plain paper and get a clean cutout — background removed, cropped, ready for documents and exam portals. Processed entirely in your browser.",
    steps: [
      "Drop a photo of your signature.",
      "Adjust sensitivity if needed; pick black or blue ink.",
      "Download as transparent PNG or white-background JPG.",
    ],
  },
  {
    slug: "text-to-pdf",
    title: "Write & Export to PDF — Free Online Writing Pad",
    metaDescription:
      "Type a document and export it as PDF, Word (DOCX), Markdown, HTML or TXT — free, in your browser.",
    workspaceQuery: "/write",
    intro:
      "Skip the word processor. Write in the pad (headings and lists supported) and export straight to PDF or DOCX.",
    steps: ["Open the writing pad.", "Type your document.", "Export as PDF, DOCX, HTML, Markdown or TXT."],
  },
];

export const TOOL_PAGES: ToolPage[] = [
  ...compressPdfPages,
  ...imageKbPages,
  ...examPages,
  ...utilityPages,
];

export function getToolPage(slug: string): ToolPage | undefined {
  return TOOL_PAGES.find((page) => page.slug === slug);
}
