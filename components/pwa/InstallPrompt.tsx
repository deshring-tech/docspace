"use client";

/**
 * Registers the service worker and offers an install button.
 *
 * Without accounts there is no other way to bring someone back, so the install
 * prompt is the main retention lever — but it stays quiet: it only appears if
 * the browser actually fires `beforeinstallprompt`, and a dismissal is
 * remembered so it never nags.
 */
import { useEffect, useState } from "react";

/** Chrome's install-prompt event, which is not in the standard DOM types. */
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "docspace-install-dismissed";

export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  // Register the service worker (production only — it would fight hot reload).
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Offline support is a bonus; never surface a failure to the user.
    });
  }, []);

  useEffect(() => {
    if (localStorage.getItem(DISMISSED_KEY)) return;
    const onPrompt = (event: Event) => {
      event.preventDefault(); // keep it until the user asks
      setDeferred(event as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!deferred) return null;

  const dismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setDeferred(null);
  };

  return (
    <div className="fixed bottom-4 right-4 z-40 max-w-xs rounded-xl border border-edge bg-panel p-4 shadow-2xl space-y-2">
      <p className="text-sm font-medium text-bright">Install DocSpace</p>
      <p className="text-xs text-muted">
        Add it to your device to open instantly — and keep using every tool
        offline.
      </p>
      <div className="flex gap-2 pt-1">
        <button
          onClick={async () => {
            const event = deferred;
            setDeferred(null);
            await event.prompt();
            await event.userChoice;
            localStorage.setItem(DISMISSED_KEY, "1");
          }}
          className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:brightness-110 transition-all cursor-pointer"
        >
          Install
        </button>
        <button
          onClick={dismiss}
          className="rounded-lg border border-edge px-3 py-1.5 text-xs text-body hover:text-bright transition-colors cursor-pointer"
        >
          Not now
        </button>
      </div>
    </div>
  );
}
