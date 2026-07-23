import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center space-y-5">
      <p className="text-6xl font-bold text-accent">404</p>
      <h1 className="text-2xl font-semibold text-bright">This page doesn&apos;t exist</h1>
      <p className="text-muted">
        The page you&apos;re looking for moved or never existed. Everything you
        need is one screen away.
      </p>
      <div className="flex flex-wrap gap-3 justify-center pt-2">
        <Link
          href="/"
          className="rounded-xl bg-accent px-5 py-2.5 text-white font-medium hover:brightness-110 transition-all"
        >
          Open the workspace
        </Link>
        <Link
          href="/write"
          className="rounded-xl border border-edge px-5 py-2.5 text-body hover:border-accent/50 hover:text-bright transition-colors"
        >
          Start writing
        </Link>
      </div>
    </div>
  );
}
