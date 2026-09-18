import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  dayKeyInTz,
  timeInTz,
  toLocalInputValue,
  zonedWallToUtc,
} from "./time.js";

describe("schedule time", () => {
  it("Jakarta UTC+7 (tanpa DST)", () => {
    const utc = zonedWallToUtc("2026-09-20", "14:30", "Asia/Jakarta");
    assert.equal(utc.toISOString(), "2026-09-20T07:30:00.000Z");
  });

  it("New York DST September (UTC-4)", () => {
    const utc = zonedWallToUtc("2026-09-20", "14:30", "America/New_York");
    assert.equal(utc.toISOString(), "2026-09-20T18:30:00.000Z");
  });

  it("New York non-DST Januari (UTC-5)", () => {
    const utc = zonedWallToUtc("2026-01-20", "14:30", "America/New_York");
    assert.equal(utc.toISOString(), "2026-01-20T19:30:00.000Z");
  });

  it("day key & jam dalam tz", () => {
    const d = new Date("2026-09-20T18:30:00.000Z");
    assert.equal(dayKeyInTz(d, "Asia/Jakarta"), "2026-09-21");
    assert.equal(dayKeyInTz(d, "UTC"), "2026-09-20");
    assert.equal(timeInTz(d, "Asia/Jakarta"), "01.30");
  });

  it("roundtrip input value", () => {
    const d = new Date("2026-09-20T07:30:00.000Z");
    assert.equal(toLocalInputValue(d, "Asia/Jakarta"), "2026-09-20T14:30");
  });
});
