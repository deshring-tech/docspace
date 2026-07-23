import type { MetadataRoute } from "next";
import { SITE } from "@/lib/site";

/**
 * PWA manifest. Because every tool runs client-side, the installed app is
 * genuinely useful offline — which is the honest reason to be installable,
 * not just a retention trick.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE.name} — ${SITE.tagline}`,
    short_name: SITE.name,
    description: SITE.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: "#0b0d12",
    theme_color: "#0b0d12",
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/pwa/icon-192",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/pwa/icon-512",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
