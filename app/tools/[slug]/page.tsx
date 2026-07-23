/**
 * Programmatic SEO landing pages, generated from lib/seo/toolPages.ts.
 * Each page answers one search query and deep-links into the workspace with
 * the right action preconfigured.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { TOOL_PAGES, getToolPage } from "@/lib/seo/toolPages";
import { absoluteUrl } from "@/lib/site";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return TOOL_PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = getToolPage(slug);
  if (!page) return {};
  const canonical = `/tools/${page.slug}`;
  return {
    title: page.title,
    description: page.metaDescription,
    alternates: { canonical },
    openGraph: { title: page.title, description: page.metaDescription, url: canonical },
    twitter: { card: "summary_large_image", title: page.title, description: page.metaDescription },
  };
}

export default async function ToolPage({ params }: PageProps) {
  const { slug } = await params;
  const page = getToolPage(slug);
  if (!page) notFound();

  const target = page.workspaceQuery.startsWith("/")
    ? page.workspaceQuery
    : `/${page.workspaceQuery}`;

  // HowTo structured data — helps this page earn rich results for its query.
  const howTo = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: page.title,
    description: page.metaDescription,
    url: absoluteUrl(`/tools/${page.slug}`),
    step: page.steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      text: step,
    })),
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howTo) }}
      />
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-bright tracking-tight">{page.title}</h1>
        <p className="text-body leading-relaxed">{page.intro}</p>
        <Link
          href={target}
          className="inline-flex items-center gap-2 rounded-xl bg-accent px-6 py-3 text-white font-medium hover:brightness-110 transition-all"
        >
          Open in the workspace →
        </Link>
      </div>

      <div className="rounded-2xl border border-edge bg-panel p-6 space-y-3">
        <h2 className="font-semibold text-bright">How it works</h2>
        <ol className="space-y-2 text-sm text-body list-decimal list-inside">
          {page.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </div>

      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        {[
          ["🔒 Private", "Files are processed in your browser and never uploaded."],
          ["♾️ Unlimited", "No daily limits, no signup, no watermarks."],
          ["⚡ Instant", "No queue, no server round-trip — it just runs."],
        ].map(([title, body]) => (
          <div key={title} className="rounded-xl border border-edge bg-panel p-4">
            <p className="font-medium text-bright">{title}</p>
            <p className="text-muted mt-1 text-xs leading-relaxed">{body}</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-bright">More tools</h2>
        <div className="flex flex-wrap gap-2">
          {TOOL_PAGES.filter((p) => p.slug !== page.slug)
            .slice(0, 10)
            .map((p) => (
              <Link
                key={p.slug}
                href={`/tools/${p.slug}`}
                className="rounded-full border border-edge px-3 py-1.5 text-xs text-body hover:border-accent/50 hover:text-bright transition-colors"
              >
                {p.title.split("—")[0].trim()}
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
