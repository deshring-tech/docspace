"use client";

/**
 * Conversational document interface.
 *
 * Attach a file, type what you want ("make it UPSC photo size", "compress to
 * 100kb", "extract the text"), and DocSpace runs it and hands back the result
 * inline. Everything is local: the request is parsed and executed in the
 * browser — no AI service, no upload, no per-message cost.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { ResultCard } from "@/components/ui/ResultCard";
import { downloadBlob } from "@/lib/download";
import { detectFileKind } from "@/lib/files";
import { formatBytes } from "@/lib/format";
import { parseChatCommand } from "@/lib/chat/intent";
import { CHAT_CAPABILITIES, executeChat } from "@/lib/chat/runCommand";
import { track } from "@/lib/analytics/analytics";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { ProcessedResult, WorkspaceFile } from "@/lib/types";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  outputs?: ProcessedResult[];
  extractedText?: string;
}

const KIND_ICONS: Record<string, string> = {
  pdf: "📕",
  image: "🖼️",
  text: "📝",
  other: "📎",
};

const EXAMPLES = [
  "Compress to 200 KB",
  "Make it UPSC photo size",
  "Convert to PDF",
  "Extract the text",
  "Merge these PDFs",
];

let nextId = 1;
const uid = () => `m${nextId++}`;

export function ChatWorkspace() {
  const [files, setFiles] = useState<WorkspaceFile[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: uid(),
      role: "assistant",
      text:
        "Hi! Attach a file and tell me what to do with it — in plain words. For example:\n• " +
        CHAT_CAPABILITIES.join("\n• "),
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Keep the latest message in view.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, progress]);

  const addFiles = useCallback((incoming: File[]) => {
    const entries: WorkspaceFile[] = incoming.map((file) => {
      const kind = detectFileKind(file);
      return {
        id: `f${nextId++}`,
        file,
        kind,
        previewUrl: kind === "image" ? URL.createObjectURL(file) : undefined,
      };
    });
    setFiles((prev) => [...prev, ...entries]);
    track(ANALYTICS_EVENTS.fileAdded, { count: entries.length });
  }, []);

  const removeFile = useCallback((id: string) => {
    setFiles((prev) => {
      const target = prev.find((f) => f.id === id);
      if (target?.previewUrl) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }, []);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setMessages((prev) => [...prev, { id: uid(), role: "user", text }]);

    const intent = parseChatCommand(text);
    track(ANALYTICS_EVENTS.commandRun, { action: intent.kind, source: "chat" });

    setBusy(true);
    setProgress(null);
    try {
      const reply = await executeChat(intent, files, (note) => setProgress(note));
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          text: reply.message,
          outputs: reply.outputs.length > 0 ? reply.outputs : undefined,
          extractedText: reply.extractedText,
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: uid(),
          role: "assistant",
          text: `Sorry — that failed: ${err instanceof Error ? err.message : "unknown error"}.`,
        },
      ]);
    }
    setProgress(null);
    setBusy(false);
  }, [input, busy, files]);

  return (
    <div
      className="mx-auto max-w-3xl px-4 py-6 flex flex-col h-[calc(100vh-3.5rem)]"
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const dropped = Array.from(e.dataTransfer.files);
        if (dropped.length > 0) addFiles(dropped);
      }}
    >
      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={message.role === "user" ? "flex justify-end" : "flex justify-start"}
          >
            <div
              className={`max-w-[85%] rounded-2xl px-4 py-3 ${
                message.role === "user"
                  ? "bg-accent text-white"
                  : "bg-panel border border-edge text-body"
              }`}
            >
              <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.text}</p>

              {message.extractedText !== undefined && (
                <div className="mt-3 space-y-2">
                  <textarea
                    readOnly
                    value={message.extractedText}
                    className="w-full min-h-32 rounded-lg border border-edge bg-panel-2 px-3 py-2 text-xs text-bright outline-none resize-y font-mono"
                  />
                  <button
                    onClick={() => navigator.clipboard.writeText(message.extractedText!)}
                    className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:brightness-110 cursor-pointer"
                  >
                    Copy text
                  </button>
                </div>
              )}

              {message.outputs && (
                <div className="mt-3 space-y-2">
                  {message.outputs.map((output) => (
                    <ResultCard key={output.filename} result={output} />
                  ))}
                  {message.outputs.length > 1 && (
                    <button
                      onClick={() =>
                        message.outputs!.forEach((o) => downloadBlob(o.blob, o.filename))
                      }
                      className="text-xs text-accent hover:underline cursor-pointer"
                    >
                      Download all
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {progress && (
          <div className="flex justify-start">
            <div className="max-w-[85%] rounded-2xl px-4 py-3 bg-panel border border-edge">
              <span className="inline-flex items-center gap-2 text-sm text-muted">
                <span className="w-4 h-4 rounded-full border-2 border-edge border-t-accent animate-spin" />
                {progress}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Composer */}
      <div className={`rounded-2xl border bg-panel p-3 space-y-3 ${dragging ? "border-accent" : "border-edge"}`}>
        {/* Attached files */}
        {files.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {files.map((file) => (
              <span
                key={file.id}
                className="inline-flex items-center gap-2 rounded-lg border border-edge bg-panel-2 px-2.5 py-1.5 text-xs"
              >
                <span>{KIND_ICONS[file.kind]}</span>
                <span className="text-bright max-w-40 truncate">{file.file.name}</span>
                <span className="text-muted">{formatBytes(file.file.size)}</span>
                <button
                  onClick={() => removeFile(file.id)}
                  className="text-muted hover:text-bad cursor-pointer"
                  title="Remove"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Quick examples (only before the first command) */}
        {messages.length === 1 && (
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                onClick={() => setInput(example)}
                className="rounded-full border border-edge px-2.5 py-1 text-xs text-muted hover:border-accent/50 hover:text-bright cursor-pointer"
              >
                {example}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            onClick={() => inputRef.current?.click()}
            title="Attach a file"
            className="shrink-0 w-10 h-10 rounded-xl border border-edge grid place-items-center text-lg hover:border-accent/50 cursor-pointer"
          >
            +
          </button>
          <input
            ref={inputRef}
            type="file"
            multiple
            className="hidden"
            onChange={(e) => {
              const chosen = Array.from(e.target.files ?? []);
              if (chosen.length > 0) addFiles(chosen);
              e.target.value = "";
            }}
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder="Tell me what to do — e.g. “make it UPSC photo size”"
            className="flex-1 resize-none rounded-xl border border-edge bg-panel-2 px-3 py-2.5 text-sm text-bright outline-none focus:border-accent max-h-32"
          />
          <button
            onClick={send}
            disabled={busy || !input.trim()}
            className="shrink-0 rounded-xl bg-accent px-4 py-2.5 text-sm font-medium text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            {busy ? "…" : "Send"}
          </button>
        </div>
        <p className="text-[11px] text-muted text-center">
          Runs entirely in your browser — files never leave your device.
        </p>
      </div>
    </div>
  );
}
