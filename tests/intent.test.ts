import { describe, expect, it } from "vitest";
import { matchCommands } from "@/lib/intent/commands";

describe("matchCommands", () => {
  it("returns a default list for an empty query", () => {
    const results = matchCommands("");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((c) => c.result.action === "compress")).toBe(true);
  });

  it("extracts a KB target and surfaces an exact-size command first", () => {
    const results = matchCommands("compress below 150kb");
    expect(results[0].label).toContain("150 KB");
    expect(results[0].result).toMatchObject({ action: "compress", maxKb: 150 });
  });

  it("converts MB targets to KB", () => {
    const results = matchCommands("under 2mb");
    expect(results[0].result.maxKb).toBe(2048);
  });

  it("infers compression from a bare size with no verb", () => {
    const results = matchCommands("200kb");
    expect(results[0].result).toMatchObject({ action: "compress", maxKb: 200 });
  });

  it("matches tools by keyword", () => {
    expect(matchCommands("merge")[0].result.action).toBe("merge");
    expect(matchCommands("signature")[0].result.action).toBe("signature");
    expect(matchCommands("watermark")[0].result.action).toBe("stamp");
  });

  it("maps exam intents to the right preset", () => {
    const results = matchCommands("ssc photo");
    const top = results[0];
    expect(top.result.action).toBe("compress");
    expect(top.result.presetId).toBe("ssc-photo");
  });

  it("returns nothing for gibberish", () => {
    expect(matchCommands("zzzqqq")).toHaveLength(0);
  });

  it("respects the result limit", () => {
    expect(matchCommands("", 3)).toHaveLength(3);
  });
});
