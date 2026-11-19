import { describe, it, expect } from "vitest";
import { slugifyState } from "./slug.js";

describe("slugifyState", () => {
  it("lowercases and hyphenates", () => {
    expect(slugifyState("Cross River")).toBe("cross-river");
  });
  it("handles a single word", () => {
    expect(slugifyState("Kogi")).toBe("kogi");
  });
});
