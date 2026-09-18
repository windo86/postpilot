import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  MAX_ATTEMPTS,
  classifyFailure,
  jitterMs,
  nextAttemptAt,
  shouldRetry,
} from "./retry.js";
import { InstagramApiError } from "../platforms/instagram/publish.js";

describe("retry policy", () => {
  it("max 3 attempt", () => {
    assert.equal(MAX_ATTEMPTS, 3);
    assert.equal(shouldRetry(true, 1), true);
    assert.equal(shouldRetry(true, 2), true);
    assert.equal(shouldRetry(true, 3), false);
    assert.equal(shouldRetry(false, 1), false);
  });

  it("backoff naik: ~60s lalu ~300s (+jitter ≤30s)", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    const d1 = nextAttemptAt(1, now).getTime() - now.getTime();
    const d2 = nextAttemptAt(2, now).getTime() - now.getTime();
    assert.ok(d1 >= 60_000 && d1 <= 90_000, `d1=${d1}`);
    assert.ok(d2 >= 300_000 && d2 <= 330_000, `d2=${d2}`);
    assert.ok(jitterMs() >= 0 && jitterMs() <= 30_000);
  });

  it("klasifikasi: InstagramApiError, network, unknown", () => {
    assert.equal(classifyFailure(new InstagramApiError("x", 429, "transient")), "transient");
    assert.equal(classifyFailure(new InstagramApiError("x", 400, "permanent")), "permanent");
    assert.equal(classifyFailure(new TypeError("fetch failed")), "transient");
    assert.equal(classifyFailure(new Error("timeout of 5000ms exceeded")), "transient");
    assert.equal(classifyFailure(new Error("validasi aneh")), "unknown");
    assert.equal(classifyFailure("string misterius"), "unknown");
  });
});
