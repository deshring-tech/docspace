/**
 * Analytics event contract. A tiny, closed set of meaningful events — funnel
 * top (file added), engagement (a tool run), and conversion (a download).
 * Pageviews are tracked automatically by the provider, so they aren't here.
 *
 * Keeping the set small and named in one place makes the data predictable and
 * every event self-documenting.
 */
export const ANALYTICS_EVENTS = {
  fileAdded: "file_added",
  commandRun: "command_run",
  download: "download",
} as const;

export type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS];

/** Custom properties attached to an event. Never contains file contents. */
export type AnalyticsProps = Record<string, string | number | boolean | undefined>;
