import { describe, expect, it } from "vitest";

import { chapterAction, chipSubmitsAtOnce, nodeStates, pct, scoreDelta } from "./logic";
import type { ChapterInfo } from "./logic";

const ch = (key: string, done: number, total: number, complete: boolean, unlocked: boolean): ChapterInfo => ({
  key,
  title: key,
  blurb: "",
  done,
  total,
  complete,
  unlocked,
});

describe("map", () => {
  it("marks done, current, open and locked chapters", () => {
    expect(nodeStates([ch("a", 0, 7, false, true), ch("b", 0, 4, false, false)])).toEqual(["current", "locked"]);
    expect(nodeStates([ch("a", 7, 7, true, true), ch("b", 1, 4, false, true), ch("c", 0, 2, false, true)])).toEqual(["done", "current", "open"]);
  });
  it("labels the chapter button", () => {
    expect(chapterAction(ch("a", 0, 7, false, true))).toBe("Start");
    expect(chapterAction(ch("a", 3, 7, false, true))).toBe("Continue");
    expect(chapterAction(ch("a", 7, 7, true, true))).toBe("Review");
    expect(chapterAction(ch("b", 0, 4, false, false))).toBe("Locked");
  });
});

describe("numbers", () => {
  it("shows the measured share as a whole percent", () => {
    expect(pct("0.6900")).toBe(69);
    expect(pct(1)).toBe(100);
  });
  it("shows the score change between chapters", () => {
    expect(scoreDelta(null, 667.45)).toBe("667");
    expect(scoreDelta(667.45, 702.1)).toBe("667 → 702 (+35)");
    expect(scoreDelta(702, 690)).toBe("702 → 690 (-12)");
    expect(scoreDelta(700.2, 699.9)).toBe("700 (no change)");
  });
});

it("auto-advances on a chip except when the savings card still needs the mix", () => {
  expect(chipSubmitsAtOnce({ kind: "money" }, "50000")).toBe(true);
  expect(chipSubmitsAtOnce({ kind: "savings_mix" }, "500000")).toBe(false);
  expect(chipSubmitsAtOnce({ kind: "savings_mix" }, "0")).toBe(true);
});
