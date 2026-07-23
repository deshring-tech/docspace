/**
 * Privacy-first analytics.
 *
 * Design goals:
 *  - Cookieless and aggregate: no personal data, no file contents, ever.
 *  - Off by default: if NEXT_PUBLIC_ANALYTICS_DOMAIN is unset, everything
 *    no-ops — nothing loads, nothing is sent. This keeps dev/local silent and
 *    the privacy policy truthful.
 *  - Vendor-agnostic surface: events go through the Plausible-compatible
 *    `window.plausible(event, { props })` API. Point NEXT_PUBLIC_ANALYTICS_SRC
 *    at Plausible cloud (default), a self-hosted instance, or any compatible
 *    endpoint — no code change.
 */
import { AnalyticsEvent, AnalyticsProps } from "./events";

const DOMAIN = process.env.NEXT_PUBLIC_ANALYTICS_DOMAIN?.trim();

/** True only when a data domain has been configured for this deployment. */
export const ANALYTICS_ENABLED = Boolean(DOMAIN);
export const ANALYTICS_DOMAIN = DOMAIN ?? "";
export const ANALYTICS_SRC =
  process.env.NEXT_PUBLIC_ANALYTICS_SRC?.trim() || "https://plausible.io/js/script.js";

declare global {
  interface Window {
    plausible?: (
      event: string,
      options?: { props?: AnalyticsProps; callback?: () => void },
    ) => void;
  }
}

/** Removes undefined values so we never send empty property keys. */
export function cleanProps(props?: AnalyticsProps): AnalyticsProps | undefined {
  if (!props) return undefined;
  const entries = Object.entries(props).filter(([, value]) => value !== undefined);
  return entries.length > 0 ? Object.fromEntries(entries) : undefined;
}

/**
 * Records an event. Safe to call anywhere: it no-ops on the server and when
 * analytics is disabled, and it never throws.
 */
export function track(event: AnalyticsEvent, props?: AnalyticsProps): void {
  if (!ANALYTICS_ENABLED || typeof window === "undefined") return;
  const clean = cleanProps(props);
  window.plausible?.(event, clean ? { props: clean } : undefined);
}
