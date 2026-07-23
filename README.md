# DocSpace

**The fastest way to finish any document task.** A privacy-first document
workspace that runs entirely in the browser — no uploads, no accounts, no
limits.

## What it does (MVP)

| Feature | Where | How it works |
| --- | --- | --- |
| **Exact-KB compression** (the hero) | Workspace → Compress / Resize | Binary-searches JPEG quality (and scale) to fit a size window; one-click presets for SSC, UPSC, NEET, JEE, PAN and Passport photo/signature specs |
| PDF compression to a KB target | same panel | Renders pages with pdf.js, re-encodes as JPEG, rebuilds with pdf-lib, walking a quality ladder until it fits |
| Merge / Split / Extract pages | Workspace → Merge / Split | pdf-lib page copying; multi-file output is zipped |
| Rotate / delete / reorder pages | Workspace → Edit pages | Visual thumbnail grid, applied in one rebuild pass |
| Universal converter | Workspace → Convert | One "Export as…" surface: images ↔ PDF, PDF → JPG/PNG, image format conversion. PDF→Word is deliberately *not* shipped until it can be done well |
| Writing pad (WYSIWYG) | `/write` | Tiptap rich-text editor: headings, bold/italic/underline, lists, undo/redo, image + one-click **signature insertion**; exports to **PDF, DOCX, Markdown, HTML, TXT** with formatting and images preserved; drafts autosave to localStorage |
| **Passport / ID photo maker** | Workspace → Passport photo | Interactive crop (drag to pan, zoom) with official head-position guides, optional plain-background whitening, exported at exact pixel size **and** exact KB. Specs are read from the shared exam-preset registry, so dimensions live in one place. Warns when output falls under a portal's minimum |
| **Signature extractor** | Workspace → Extract signature | Photo of pen-on-paper signature → clean cutout: Otsu auto-threshold (+ sensitivity slider), ink recolor (black/blue/original), auto-crop, transparent PNG or white-bg JPG |
| **Command palette (goal-first)** | `Ctrl+K` anywhere in the workspace | Type the goal ("compress below 200kb", "ssc photo", "merge") — a fully local intent parser (no AI, no network) ranks and runs the right tool, preconfigured |
| Smart suggestions | Workspace, automatic | Local heuristics, not AI: big PDF → compress, 2+ PDFs → merge, passport-ratio image → exam presets, wide image → signature extraction, 2+ images → one PDF. Dismissable chips |
| Watermark & page numbers | Workspace → Watermark / numbers | Diagonal text watermark (adjustable opacity) and 1/N page numbers via pdf-lib — pages stay vector, text stays selectable |
| Templates | `/write`, when empty | Resume, cover letter, formal letter/application, report, meeting notes, assignment |
| **OCR (scan → text)** | Workspace → OCR | tesseract.js in-browser: extract editable text, or produce a **searchable PDF** (invisible text layer). Multi-language (English, Hindi + major Indian scripts). Lazy-loaded; PDF pages reuse the shared pdf.js renderer and `mergePdfs` |
| **Installable PWA / offline** | Everywhere | Manifest + generated icons + service worker. Because every tool is client-side, the installed app genuinely works with no connection (OCR excepted — its engine loads from a CDN). Install prompt appears only if the browser offers it, and a dismissal is remembered |
| Scanned-PDF detection | Workspace, automatic | Probes the first page for a real text layer; a PDF without one suggests OCR |
| Programmatic SEO pages | `/tools/[slug]` | 19 landing pages generated from a registry, each deep-linking into the workspace with the tool preconfigured |

Everything is client-side: pdf-lib + pdf.js + canvas + the `docx` package.
There is no backend and no file ever leaves the device — which is also why
hosting is nearly free (any static/Node host works).

## Run it

**One click:** double-click `Start-DocSpace.bat` — it installs dependencies on
first run, builds if needed, starts the server and opens your browser.

**From a terminal:**

```bash
npm install     # also copies pdf.js worker/fonts/cmaps into /public
npm run dev     # http://localhost:4680 (dev, hot reload)
npm run build   # production build
npm run start   # http://localhost:4680 (production)
npm test        # run the Vitest suite (pure-logic cores)
```

The app runs on port **4680** (deliberately uncommon, so it never collides
with other local projects on 3000/5173/8080).

## Deploying

The app is a static/serverless Next.js build — deploy to any Next-compatible
host (Vercel, Netlify, Cloudflare, a Node server). One required setting:

```
NEXT_PUBLIC_SITE_URL=https://your-domain.com   # canonical URL for SEO/OG/sitemap
```

See `.env.example`. Everything else (favicon, OG image, robots, sitemap,
structured data) is generated automatically from `lib/site.ts`.

**Analytics (optional):** set `NEXT_PUBLIC_ANALYTICS_DOMAIN` to enable
cookieless, aggregate analytics (Plausible-compatible; override the endpoint
with `NEXT_PUBLIC_ANALYTICS_SRC` for self-hosting). Left unset, no third-party
script loads and nothing is sent. Three events are tracked — `file_added`,
`command_run`, `download` — plus automatic pageviews; never file contents.

## Codebase map

```
app/
  page.tsx               Home = the workspace (reads ?action/?preset/?maxkb deep links)
  write/page.tsx         The writing pad
  tools/[slug]/page.tsx  SEO landing pages + HowTo structured data (from the registry)
  privacy/ terms/        Legal pages (shared components/legal/LegalPage shell)
  sitemap.ts robots.ts   SEO routes, driven by lib/site.ts (env URL)
  icon.tsx               Generated favicon (brand in code, no binary asset)
  opengraph-image.tsx    Generated social-share card
  manifest.ts pwa/         PWA manifest + generated 192/512 icons
  error.tsx not-found.tsx Graceful crash recovery + 404
  layout.tsx globals.css App shell, metadata, JSON-LD + design tokens

components/
  workspace/Workspace.tsx     Single-screen product: files rail + action panels
  workspace/CommandPalette.tsx Ctrl+K goal-first palette
  workspace/DropZone.tsx      Drag-drop / browse entry point
  workspace/panels/           One file per action (Compress, Convert, Pages, Merge,
                              Split, Signature, Stamp, ImagesToPdf)
  write/TextPad.tsx           WYSIWYG editor, autosave, templates, export
  legal/LegalPage.tsx         Shared shell for privacy/terms
  ui/                         Button, Spinner, ResultCard primitives

lib/
  site.ts                  Single source of truth: brand + env-driven URL
  image/compressImage.ts   Exact-KB image engine (quality binary search)
  pdf/compressPdf.ts       PDF → target-KB engine (render + re-encode ladder)
  pdf/pages.ts             merge / rebuild(reorder+rotate+delete) / split / ranges
  pdf/imagesToPdf.ts       Images → A4 PDF
  pdf/pdfToImages.ts       PDF pages → PNG/JPEG
  pdf/pdfjs.ts             Lazy pdf.js loader (worker/fonts/cmaps from /public;
                           renders with intent:"print" so background tabs work)
  image/canvas.ts          Shared canvas→Blob helper (used by every encoder)
  image/photoCrop.ts       Passport-photo geometry (pure, tested) + bg whitening
  image/extractSignature.ts Signature cutout engine (Otsu threshold + crop)
  ocr/ocr.ts               OCR engine (lazy tesseract.js): text + searchable PDF
  ocr/languages.ts         Curated OCR language list
  intent/commands.ts       Local goal→tool parser powering the Ctrl+K palette
  suggest/suggestions.ts   Heuristic "smart suggestion" rules
  pdf/stamp.ts             Watermark + page-number stamping
  presets/examPresets.ts   Exam/form/photo specs (India + US + International)
                           — the single place to edit when a spec changes
  seo/toolPages.ts         Landing-page registry — add an entry, get a page
  doc/                     Rich-document model + Tiptap JSON → model converter
  export/                  docToPdf (styled-run layout engine), docToDocx,
                           docToText (HTML/MD/TXT); markdown.ts for imports

scripts/copy-pdf-worker.mjs  Postinstall: copies pdf.js assets to /public
tests/                       Vitest suites over the pure-logic cores (npm test)
```

## Product decisions baked in

- **No tool pages.** One workspace; actions appear based on what was dropped.
- **Honest limits.** PDF→Word is shown as "soon" instead of shipping the bad
  open-source conversion. Warnings surface when a size window is unreachable.
- **Presets are defaults, not gospel.** Exam specs drift between notification
  cycles — the UI says so, and `examPresets.ts` is the single place to update.
- **Files already under a target are returned untouched** — never make a file
  worse.
- **PDF export from the pad is Latin-only for now** (pdf-lib standard fonts);
  DOCX export is full Unicode. Embedding a Unicode font is the known next step.

## Roadmap (post-MVP)

1. Unicode font embedding for pad→PDF (Hindi and other scripts)
2. ML background removal + face detection for the photo maker (today's
   whitening is a deliberate, honestly-labelled flood-fill for plain walls)
3. Protect/unlock PDFs (needs qpdf-wasm; pdf-lib cannot encrypt)
4. PDF→Word via a licensed SDK or server-side conversion (paid tier)
5. AI features (summarize/translate/chat-with-PDF) as the clearly-labeled
   cloud/paid layer — the local core stays free and unlimited
