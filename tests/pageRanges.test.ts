import { describe, expect, it } from "vitest";
import { parsePageRanges } from "@/lib/pdf/pages";

describe("parsePageRanges", () => {
  it("parses single pages and ranges into 0-based indices", () => {
    expect(parsePageRanges("1", 10)).toEqual([0]);
    expect(parsePageRanges("1-3", 10)).toEqual([0, 1, 2]);
    expect(parsePageRanges("1-3, 5, 8-10", 10)).toEqual([0, 1, 2, 4, 7, 8, 9]);
  });

  it("tolerates whitespace and trailing commas", () => {
    expect(parsePageRanges(" 2 , 4 ", 5)).toEqual([1, 3]);
    expect(parsePageRanges("1,", 5)).toEqual([0]);
  });

  it("rejects out-of-bounds ranges", () => {
    expect(() => parsePageRanges("0", 5)).toThrow();
    expect(() => parsePageRanges("6", 5)).toThrow();
    expect(() => parsePageRanges("3-2", 5)).toThrow();
  });

  it("rejects malformed input", () => {
    expect(() => parsePageRanges("abc", 5)).toThrow();
    expect(() => parsePageRanges("", 5)).toThrow();
  });
});
