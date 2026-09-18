import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  decrypt,
  encrypt,
  assertEncryptionKeyConfigured,
  generateEncryptionKey,
} from "./index.js";

// Test-only key. BUKAN secret asli — hanya untuk test roundtrip.
const TEST_KEY =
  "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
const OTHER_KEY =
  "fedcba9876543210fedcba9876543210fedcba9876543210fedcba9876543210";

function withKey(key: string | undefined, fn: () => void) {
  const prev = process.env.APP_ENCRYPTION_KEY;
  if (key === undefined) delete process.env.APP_ENCRYPTION_KEY;
  else process.env.APP_ENCRYPTION_KEY = key;
  try {
    fn();
  } finally {
    if (prev === undefined) delete process.env.APP_ENCRYPTION_KEY;
    else process.env.APP_ENCRYPTION_KEY = prev;
  }
}

describe("crypto AES-256-GCM", () => {
  it("roundtrip token", () => {
    withKey(TEST_KEY, () => {
      const token = "ya29.access-token-contoh-12345";
      assert.equal(decrypt(encrypt(token)), token);
    });
  });

  it("roundtrip string kosong & unicode", () => {
    withKey(TEST_KEY, () => {
      assert.equal(decrypt(encrypt("")), "");
      assert.equal(decrypt(encrypt("caption halo 🎉 café")), "caption halo 🎉 café");
    });
  });

  it("IV acak: ciphertext berbeda tiap encrypt", () => {
    withKey(TEST_KEY, () => {
      assert.notEqual(encrypt("sama"), encrypt("sama"));
    });
  });

  it("format ciphertext berversi v1:<iv>:<tag>:<ct>", () => {
    withKey(TEST_KEY, () => {
      const parts = encrypt("x").split(":");
      assert.equal(parts.length, 4);
      assert.equal(parts[0], "v1");
    });
  });

  it("wrong key → gagal tanpa membocorkan secret", () => {
    let ct = "";
    withKey(TEST_KEY, () => {
      ct = encrypt("rahasia");
    });
    withKey(OTHER_KEY, () => {
      assert.throws(() => decrypt(ct), (e: unknown) => {
        const msg = (e as Error).message;
        return (
          !msg.includes("rahasia") &&
          !msg.includes(TEST_KEY) &&
          !msg.includes(OTHER_KEY)
        );
      });
    });
  });

  it("ciphertext korup → gagal", () => {
    withKey(TEST_KEY, () => {
      const ct = encrypt("rahasia");
      const corrupt = ct.slice(0, -2) + (ct.endsWith("00") ? "ff" : "00");
      assert.throws(() => decrypt(corrupt));
    });
  });

  it("versi tak dikenal & format rusak → gagal", () => {
    withKey(TEST_KEY, () => {
      assert.throws(() => decrypt("v9:00:00:00"));
      assert.throws(() => decrypt("bukan-ciphertext"));
      assert.throws(() => decrypt(""));
    });
  });

  it("key hilang/pendek → error tanpa echo nilai key", () => {
    withKey(undefined, () => {
      assert.throws(() => encrypt("x"), /APP_ENCRYPTION_KEY/);
    });
    withKey("terlalupendek", () => {
      assert.throws(() => encrypt("x"), (e: unknown) => {
        return !(e as Error).message.includes("terlalupendek");
      });
    });
  });

  it("assertEncryptionKeyConfigured lolos untuk key valid", () => {
    withKey(TEST_KEY, () => {
      assert.doesNotThrow(() => assertEncryptionKeyConfigured());
    });
  });

  it("generateEncryptionKey menghasilkan 64 hex char", () => {
    const k = generateEncryptionKey();
    assert.match(k, /^[0-9a-f]{64}$/);
    withKey(k, () => {
      assert.equal(decrypt(encrypt("ok")), "ok");
    });
  });
});
