"use client";

/**
 * The Ctrl+K command palette — the goal-first entry point. Type what you want
 * ("compress below 200kb", "ssc photo", "merge"); matching is instant and
 * fully local (lib/intent/commands.ts).
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Command, CommandResult, matchCommands } from "@/lib/intent/commands";

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  onRun: (result: CommandResult) => void;
}

export function CommandPalette({ open, onClose, onRun }: CommandPaletteProps) {
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const commands = matchCommands(query);

  // Reset and focus whenever the palette opens.
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelected(0);
      // Focus after the element mounts.
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  const run = useCallback(
    (command: Command) => {
      onRun(command.result);
      onClose();
    },
    [onRun, onClose],
  );

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-start justify-center pt-[15vh] px-4"
      onClick={onClose}
      role="dialog"
      aria-label="Command palette"
    >
      <div
        className="w-full max-w-xl rounded-2xl border border-edge bg-panel shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setSelected(0);
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") onClose();
            else if (e.key === "ArrowDown") {
              e.preventDefault();
              setSelected((s) => Math.min(s + 1, commands.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setSelected((s) => Math.max(s - 1, 0));
            } else if (e.key === "Enter" && commands[selected]) {
              run(commands[selected]);
            }
          }}
          placeholder="What would you like to do?  e.g. compress below 200kb"
          className="w-full bg-transparent px-5 py-4 text-bright outline-none placeholder:text-muted border-b border-edge"
        />
        <ul className="max-h-80 overflow-y-auto py-2">
          {commands.length === 0 && (
            <li className="px-5 py-3 text-sm text-muted">
              Nothing matched — try &quot;compress&quot;, &quot;merge&quot;,
              &quot;signature&quot; or a size like &quot;200kb&quot;.
            </li>
          )}
          {commands.map((command, index) => (
            <li key={command.id}>
              <button
                onClick={() => run(command)}
                onMouseEnter={() => setSelected(index)}
                className={`w-full text-left px-5 py-2.5 flex items-baseline gap-2 cursor-pointer
                  ${index === selected ? "bg-accent-soft text-bright" : "text-body"}`}
              >
                <span className="text-sm">{command.label}</span>
                {command.hint && (
                  <span className="text-xs text-muted">{command.hint}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
        <p className="px-5 py-2 border-t border-edge text-[11px] text-muted">
          ↑↓ navigate · Enter run · Esc close — everything runs locally
        </p>
      </div>
    </div>
  );
}
