"use client";

/**
 * Route-level error boundary. If any client component throws during rendering
 * (a corrupt PDF, an unexpected browser limitation), the user sees a friendly
 * recovery card instead of a blank screen — and can retry without losing the
 * whole session. Next.js renders this automatically for errors in the segment.
 */
import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error in the console for debugging; no external reporting.
    console.error("Workspace error:", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center space-y-5">
      <p className="text-5xl">⚠️</p>
      <h1 className="text-2xl font-semibold text-bright">Something went wrong</h1>
      <p className="text-muted">
        A tool hit an unexpected problem — often a file that couldn&apos;t be
        read. Your other files are safe. Try again, or reload the page.
      </p>
      <div className="flex flex-wrap gap-3 justify-center pt-2">
        <button
          onClick={reset}
          className="rounded-xl bg-accent px-5 py-2.5 text-white font-medium hover:brightness-110 transition-all cursor-pointer"
        >
          Try again
        </button>
        <button
          onClick={() => window.location.assign("/")}
          className="rounded-xl border border-edge px-5 py-2.5 text-body hover:border-accent/50 hover:text-bright transition-colors cursor-pointer"
        >
          Back to workspace
        </button>
      </div>
    </div>
  );
}
