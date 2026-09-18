import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  generateEndpointToken,
  generateSigningSecret,
  signWebhookPayload,
  verifyWebhookSignature,
} from "./webhooks.js";

// Test-only key (bukan secret asli).
process.env.APP_ENCRYPTION_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

describe("webhooks", () => {
  it("token unik + prefix, secret 64 hex", () => {
    const a = generateEndpointToken();
    const b = generateEndpointToken();
    assert.ok(a.token.startsWith("pp_wh_"));
    assert.notEqual(a.token, b.token);
    assert.equal(a.hash.length, 64);
    assert.match(generateSigningSecret().secret, /^[0-9a-f]{64}$/);
  });

  it("signature valid lolos, body diubah / secret salah / format salah ditolak", () => {
    const body = '{"event":"post.create","eventId":"e1"}';
    const { secret, ciphertext } = generateSigningSecret();
    // ciphertext terenkripsi (bukan secret mentah)
    assert.ok(!ciphertext.includes(secret));
    const sig = signWebhookPayload(body, secret);
    assert.equal(verifyWebhookSignature(body, sig, secret), true);
    assert.equal(verifyWebhookSignature(body + " ", sig, secret), false);
    assert.equal(verifyWebhookSignature(body, sig, "salah"), false);
    assert.equal(verifyWebhookSignature(body, "bogus", secret), false);
    assert.equal(verifyWebhookSignature(body, null, secret), false);
  });
});
