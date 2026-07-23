"use client";

/**
 * The writing pad — a WYSIWYG editor (Tiptap) with a WordPress-style toolbar:
 * headings, bold/italic/underline, lists, undo/redo, and signature/image
 * insertion. Exports to PDF / DOCX / Markdown / HTML / TXT via the shared
 * document model (lib/doc). Drafts autosave to localStorage.
 */
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import ImageExtension from "@tiptap/extension-image";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { tiptapToBlocks } from "@/lib/doc/fromTiptap";
import { docToPdf } from "@/lib/export/docToPdf";
import { docToDocx } from "@/lib/export/docToDocx";
import { docToHtml, docToMarkdown, docToPlainText } from "@/lib/export/docToText";
import { parseBlocks } from "@/lib/export/markdown";
import { PAD_TEMPLATES } from "@/lib/doc/templates";
import { extractSignature } from "@/lib/image/extractSignature";
import { downloadBlob } from "@/lib/download";

const DOC_KEY = "docspace-pad-doc"; // Tiptap JSON draft
const LEGACY_KEY = "docspace-pad-draft"; // old plain-text draft (migrated once)
const IMPORT_KEY = "docspace-pad-import"; // text handed over from the workspace

type ExportFormat = "pdf" | "docx" | "md" | "html" | "txt";

/** Image node extended with width/height so exports know real dimensions. */
const SizedImage = ImageExtension.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: { default: null },
      height: { default: null },
    };
  },
}).configure({ allowBase64: true });

/** Converts legacy markdown-ish plain text into HTML Tiptap can load. */
function markdownToHtml(source: string): string {
  const escape = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return parseBlocks(source)
    .map((block) => {
      switch (block.type) {
        case "h1":
        case "h2":
        case "h3":
          return `<${block.type}>${escape(block.text)}</${block.type}>`;
        case "bullet":
          return `<ul><li>${escape(block.text)}</li></ul>`;
        case "numbered":
          return `<ol><li>${escape(block.text)}</li></ol>`;
        case "blank":
          return "<p></p>";
        default:
          return `<p>${escape(block.text)}</p>`;
      }
    })
    .join("");
}

/** Loads the initial content: workspace import > saved draft > legacy draft. */
function loadInitialContent(): object | string {
  const imported = sessionStorage.getItem(IMPORT_KEY);
  if (imported !== null) {
    sessionStorage.removeItem(IMPORT_KEY);
    return markdownToHtml(imported);
  }
  const saved = localStorage.getItem(DOC_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      /* fall through */
    }
  }
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy) return markdownToHtml(legacy);
  return "";
}

interface ToolButtonProps {
  label: string;
  title: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
}

function ToolButton({ label, title, active, disabled, onClick }: ToolButtonProps) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()} // keep editor selection
      onClick={onClick}
      className={`min-w-8 rounded-md px-2 py-1.5 text-sm transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed
        ${active ? "bg-accent-soft text-bright border border-accent" : "text-body hover:bg-panel-2 border border-transparent"}`}
    >
      {label}
    </button>
  );
}

export function TextPad() {
  const [filename, setFilename] = useState("document");
  const [busy, setBusy] = useState<ExportFormat | "signature" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [, setTick] = useState(0); // re-render toolbar on editor transactions
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [StarterKit.configure({ heading: { levels: [1, 2, 3] } }), SizedImage],
    content: "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "pad-editor outline-none min-h-[58vh] px-8 sm:px-12 py-10",
        "aria-label": "Document editor",
      },
    },
    onTransaction: () => setTick((t) => t + 1),
    onUpdate: ({ editor }) => {
      // Autosave (cheap enough to do on every update for MVP-sized docs).
      localStorage.setItem(DOC_KEY, JSON.stringify(editor.getJSON()));
    },
  });

  // Load draft/import once the (client-only) editor exists.
  useEffect(() => {
    if (editor && editor.isEmpty) {
      const content = loadInitialContent();
      if (content) editor.commands.setContent(content);
    }
  }, [editor]);

  /** Inserts an image file; when `asSignature`, background is removed first. */
  const insertImage = useCallback(
    async (file: File, asSignature: boolean) => {
      if (!editor) return;
      setBusy("signature");
      setError(null);
      try {
        let dataUrl: string;
        let width: number;
        let height: number;
        if (asSignature) {
          const extracted = await extractSignature(file);
          dataUrl = extracted.dataUrl;
          width = extracted.width;
          height = extracted.height;
        } else {
          const bitmap = await createImageBitmap(file);
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
          bitmap.close();
          dataUrl = canvas.toDataURL("image/png");
          width = canvas.width;
          height = canvas.height;
        }
        editor
          .chain()
          .focus()
          .insertContent({ type: "image", attrs: { src: dataUrl, width, height } })
          .run();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not process the image");
      }
      setBusy(null);
    },
    [editor],
  );

  async function exportAs(format: ExportFormat) {
    if (!editor) return;
    setBusy(format);
    setError(null);
    try {
      const blocks = tiptapToBlocks(editor.getJSON());
      switch (format) {
        case "pdf":
          downloadBlob(await docToPdf(blocks), `${filename}.pdf`);
          break;
        case "docx":
          downloadBlob(await docToDocx(blocks), `${filename}.docx`);
          break;
        case "md":
          downloadBlob(
            new Blob([docToMarkdown(blocks)], { type: "text/markdown" }),
            `${filename}.md`,
          );
          break;
        case "html":
          downloadBlob(
            new Blob([docToHtml(blocks, filename)], { type: "text/html" }),
            `${filename}.html`,
          );
          break;
        case "txt":
          downloadBlob(
            new Blob([docToPlainText(blocks)], { type: "text/plain" }),
            `${filename}.txt`,
          );
          break;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    }
    setBusy(null);
  }

  const words = editor?.getText().trim() ? editor.getText().trim().split(/\s+/).length : 0;

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 space-y-4">
      {/* Filename + word count */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={filename}
          onChange={(e) => setFilename(e.target.value.replace(/[\\/:*?"<>|]/g, "") || "document")}
          aria-label="File name"
          className="rounded-md border border-edge bg-panel px-3 py-2 text-sm text-bright outline-none focus:border-accent w-44"
        />
        <span className="text-xs text-muted">{words} words · autosaved</span>
      </div>

      {/* Toolbar */}
      <div className="sticky top-2 z-10 flex flex-wrap items-center gap-1 rounded-xl border border-edge bg-panel px-2 py-1.5 shadow-lg">
        <ToolButton
          label="↶"
          title="Undo"
          disabled={!editor?.can().undo()}
          onClick={() => editor?.chain().focus().undo().run()}
        />
        <ToolButton
          label="↷"
          title="Redo"
          disabled={!editor?.can().redo()}
          onClick={() => editor?.chain().focus().redo().run()}
        />
        <span className="w-px h-5 bg-edge mx-1" />
        <ToolButton
          label="¶"
          title="Paragraph"
          active={editor?.isActive("paragraph")}
          onClick={() => editor?.chain().focus().setParagraph().run()}
        />
        {([1, 2, 3] as const).map((level) => (
          <ToolButton
            key={level}
            label={`H${level}`}
            title={`Heading ${level}`}
            active={editor?.isActive("heading", { level })}
            onClick={() => editor?.chain().focus().toggleHeading({ level }).run()}
          />
        ))}
        <span className="w-px h-5 bg-edge mx-1" />
        <ToolButton
          label="B"
          title="Bold (Ctrl+B)"
          active={editor?.isActive("bold")}
          onClick={() => editor?.chain().focus().toggleBold().run()}
        />
        <ToolButton
          label="I"
          title="Italic (Ctrl+I)"
          active={editor?.isActive("italic")}
          onClick={() => editor?.chain().focus().toggleItalic().run()}
        />
        <ToolButton
          label="U"
          title="Underline (Ctrl+U)"
          active={editor?.isActive("underline")}
          onClick={() => editor?.chain().focus().toggleUnderline().run()}
        />
        <span className="w-px h-5 bg-edge mx-1" />
        <ToolButton
          label="• List"
          title="Bullet list"
          active={editor?.isActive("bulletList")}
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
        />
        <ToolButton
          label="1. List"
          title="Numbered list"
          active={editor?.isActive("orderedList")}
          onClick={() => editor?.chain().focus().toggleOrderedList().run()}
        />
        <span className="w-px h-5 bg-edge mx-1" />
        <ToolButton
          label={busy === "signature" ? "…" : "✍ Sign"}
          title="Insert your signature — pick a photo of it; the background is removed automatically"
          disabled={busy === "signature"}
          onClick={() => signatureInputRef.current?.click()}
        />
        <ToolButton
          label="🖼 Image"
          title="Insert an image as-is"
          onClick={() => imageInputRef.current?.click()}
        />
      </div>

      {/* Hidden pickers for signature / image insertion */}
      <input
        ref={signatureInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) insertImage(file, true);
          e.target.value = "";
        }}
      />
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) insertImage(file, false);
          e.target.value = "";
        }}
      />

      {/* Templates — offered while the document is still empty */}
      {editor?.isEmpty && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted">Start from a template:</span>
          {PAD_TEMPLATES.map((template) => (
            <button
              key={template.id}
              title={template.description}
              onClick={() => editor?.chain().focus().setContent(template.html).run()}
              className="rounded-full border border-edge px-3 py-1.5 text-xs text-body hover:border-accent/50 hover:text-bright transition-colors cursor-pointer"
            >
              {template.name}
            </button>
          ))}
        </div>
      )}

      {/* The page */}
      <div className="rounded-2xl border border-edge bg-white text-neutral-900 shadow-xl">
        <EditorContent editor={editor} />
      </div>

      {/* Export bar */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted mr-1">Export as</span>
        {(["pdf", "docx", "md", "html", "txt"] as ExportFormat[]).map((format) => (
          <Button
            key={format}
            variant={format === "pdf" ? "primary" : "ghost"}
            disabled={busy !== null || !editor || editor.isEmpty}
            onClick={() => exportAs(format)}
          >
            {busy === format ? "…" : format.toUpperCase()}
          </Button>
        ))}
      </div>
      <p className="text-xs text-muted">
        PDF export currently supports Latin characters; Word export supports all
        languages. Signature photos are cleaned automatically — for fine control
        use the workspace's Extract signature tool.
      </p>
      {error && <p className="text-sm text-bad">{error}</p>}
    </div>
  );
}
