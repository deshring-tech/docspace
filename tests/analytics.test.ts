import { afterEach, describe, expect, it, vi } from "vitest";

describe("analytics — disabled by default", () => {
  it("is disabled and no-ops when no domain is configured", async () => {
    vi.resetModules();
    const mod = await import("@/lib/analytics/analytics");
    expect(mod.ANALYTICS_ENABLED).toBe(false);
    // Must not throw even with no provider and no window.
    expect(() => mod.track("download", { type: "pdf" })).not.toThrow();
  });
});

describe("cleanProps", () => {
  it("drops undefined values", async () => {
    const { cleanProps } = await import("@/lib/analytics/analytics");
    expect(cleanProps({ a: 1, b: undefined, c: "x" })).toEqual({ a: 1, c: "x" });
  });

  it("returns undefined when everything is empty", async () => {
    const { cleanProps } = await import("@/lib/analytics/analytics");
    expect(cleanProps({ a: undefined })).toBeUndefined();
    expect(cleanProps(undefined)).toBeUndefined();
  });
});

describe("analytics — enabled path", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("sends cleaned events to the provider when a domain is set", async () => {
    vi.stubEnv("NEXT_PUBLIC_ANALYTICS_DOMAIN", "docspace.test");
    const plausible = vi.fn();
    vi.stubGlobal("window", { plausible });

    vi.resetModules();
    const mod = await import("@/lib/analytics/analytics");
    expect(mod.ANALYTICS_ENABLED).toBe(true);

    mod.track("command_run", { action: "compress", preset: undefined, target: 200 });
    expect(plausible).toHaveBeenCalledWith("command_run", {
      props: { action: "compress", target: 200 },
    });
  });
});
