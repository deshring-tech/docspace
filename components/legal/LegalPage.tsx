/**
 * Shared shell for static legal/content pages (privacy, terms). Centralizes
 * the container, heading and "last updated" line so each page only supplies
 * its body.
 */
import { ReactNode } from "react";

interface LegalPageProps {
  title: string;
  updated: string; // human-readable date
  children: ReactNode;
}

export function LegalPage({ title, updated, children }: LegalPageProps) {
  return (
    <div className="mx-auto max-w-2xl px-4 py-12 space-y-6">
      <div className="space-y-1">
        <h1 className="text-3xl font-bold text-bright tracking-tight">{title}</h1>
        <p className="text-xs text-muted">Last updated: {updated}</p>
      </div>
      <div className="space-y-5 text-body leading-relaxed [&_h2]:text-bright [&_h2]:font-semibold [&_h2]:text-lg [&_h2]:mt-6 [&_a]:text-accent [&_a]:underline [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1">
        {children}
      </div>
    </div>
  );
}
