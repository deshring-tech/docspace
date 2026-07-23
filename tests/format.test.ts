import { describe, expect, it } from "vitest";
import { baseName, formatBytes } from "@/lib/format";

describe("formatBytes", () => {
  it("formats bytes, KB and MB with the right unit", () => {
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(1024)).toBe("1.0 KB");
    expect(formatBytes(1536)).toBe("1.5 KB");
    expect(formatBytes(1024 * 1024)).toBe("1.00 MB");
    expect(formatBytes(5 * 1024 * 1024)).toBe("5.00 MB");
  });
});

describe("baseName", () => {
  it("strips the extension", () => {
    expect(baseName("resume.pdf")).toBe("resume");
    expect(baseName("photo.final.jpg")).toBe("photo.final");
  });

  it("keeps names without an extension", () => {
    expect(baseName("README")).toBe("README");
  });

  it("keeps dotfiles intact", () => {
    expect(baseName(".gitignore")).toBe(".gitignore");
  });
});
