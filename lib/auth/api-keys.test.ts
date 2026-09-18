import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  apiKeyRateLimitMax,
  checkApiKeyRateLimit,
  extractApiKey,
  generateRawKey,
  hashApiKey,
  resetApiKeyRateLimit,
} from "./api-keys.js";

describe("api keys", () => {
  it("generate: format, prefix, hash konsisten", () => {
    const { rawKey, prefix, hash } = generateRawKey();
    assert.ok(rawKey.startsWith("pp_live_"));
    assert.equal(prefix, rawKey.slice(0, 12));
    assert.equal(hash, hashApiKey(rawKey));
    assert.equal(hash.length, 64);
  });

  it("extract: Bearer & x-api-key", () => {
    assert.equal(extractApiKey(new Request("http://x", { headers: { authorization: "Bearer abc" } })), "abc");
    assert.equal(extractApiKey(new Request("http://x", { headers: { "x-api-key": "k2" } })), "k2");
    assert.equal(extractApiKey(new Request("http://x")), null);
  });

  it("rate limit: blokir setelah batas, Retry-After > 0", () => {
    resetApiKeyRateLimit();
    const max = apiKeyRateLimitMax();
    assert.ok(max > 0);
    for (let i = 0; i < max; i++) {
      assert.equal(checkApiKeyRateLimit("h").allowed, true);
    }
    const blocked = checkApiKeyRateLimit("h");
    assert.equal(blocked.allowed, false);
    assert.ok(blocked.retryAfterSec >= 1 && blocked.retryAfterSec <= 60);
    // key lain tidak terpengaruh
    assert.equal(checkApiKeyRateLimit("lain").allowed, true);
    resetApiKeyRateLimit();
  });
});
