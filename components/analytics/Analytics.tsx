"use client";

/**
 * Injects the cookieless analytics provider — but only when a data domain is
 * configured (see lib/analytics/analytics.ts). When disabled it renders
 * nothing, so no third-party script loads at all.
 *
 * The inline init stub queues any events fired before the main script finishes
 * loading, so early interactions aren't lost.
 */
import Script from "next/script";
import {
  ANALYTICS_DOMAIN,
  ANALYTICS_ENABLED,
  ANALYTICS_SRC,
} from "@/lib/analytics/analytics";

export function Analytics() {
  if (!ANALYTICS_ENABLED) return null;

  return (
    <>
      <Script
        id="analytics-init"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html:
            "window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}",
        }}
      />
      <Script
        defer
        data-domain={ANALYTICS_DOMAIN}
        src={ANALYTICS_SRC}
        strategy="afterInteractive"
      />
    </>
  );
}
