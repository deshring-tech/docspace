import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { TOOL_PAGES } from "@/lib/seo/toolPages";

/**
 * Sitemap over every indexable route. The domain comes from the environment
 * (lib/site.ts) so deploying never requires editing this file.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE_URL, priority: 1, changeFrequency: "weekly", lastModified: now },
    { url: `${SITE_URL}/write`, priority: 0.9, changeFrequency: "monthly", lastModified: now },
    { url: `${SITE_URL}/privacy`, priority: 0.3, changeFrequency: "yearly", lastModified: now },
    { url: `${SITE_URL}/terms`, priority: 0.3, changeFrequency: "yearly", lastModified: now },
    ...TOOL_PAGES.map((page) => ({
      url: `${SITE_URL}/tools/${page.slug}`,
      priority: 0.8,
      changeFrequency: "monthly" as const,
      lastModified: now,
    })),
  ];
}
