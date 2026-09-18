import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
} from "node:crypto";

/**
 * AES-256-GCM untuk access_token, refresh_token, dan AI API keys.
 * Format ciphertext: `v1:<iv-hex>:<auth-tag-hex>:<ciphertext-hex>`.
 * Versi disematkan agar rotasi key memungkinkan di masa depan.
 *
 * Pure Node — tidak ada import `next/*`. Aman dipakai worker.
 * Error tidak pernah menyertakan secret/plaintext.
 */

const VERSION = "v1";
const KEY_ENV = "APP_ENCRYPTION_KEY";
const KEY_BYTES = 32;
const IV_BYTES = 12;
const TAG_BYTES = 16;

function getKey(): Buffer {
  const hex = (process.env[KEY_ENV] ?? "").trim();
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error(
      `Invalid ${KEY_ENV}: expected 64 hex characters (32 bytes).`
    );
  }
  return Buffer.from(hex, "hex");
}

/**
 * Validasi konfigurasi key. Panggil saat startup server/worker agar
 * gagal cepat (fail-fast) bila key belum di-set dengan benar.
 */
export function assertEncryptionKeyConfigured(): void {
  getKey();
}

/** Generate key 32-byte (hex) baru untuk `APP_ENCRYPTION_KEY`. */
export function generateEncryptionKey(): string {
  return randomBytes(KEY_BYTES).toString("hex");
}

/** Enkripsi string → ciphertext berversi. */
export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("hex"), tag.toString("hex"), ciphertext.toString("hex")].join(":");
}

/** Dekripsi ciphertext → string. Gagal untuk key salah / data korup. */
export function decrypt(payload: string): string {
  const parts = payload.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Decryption failed: unsupported version or malformed payload.");
  }
  const [, ivHex, tagHex, ctHex] = parts;
  if (
    !/^[0-9a-fA-F]+$/.test(ivHex) ||
    !/^[0-9a-fA-F]+$/.test(tagHex) ||
    !/^[0-9a-fA-F]*$/.test(ctHex) ||
    ivHex.length !== IV_BYTES * 2 ||
    tagHex.length !== TAG_BYTES * 2
  ) {
    throw new Error("Decryption failed: malformed payload.");
  }

  const key = getKey();
  try {
    const decipher = createDecipheriv(
      "aes-256-gcm",
      key,
      Buffer.from(ivHex, "hex")
    );
    decipher.setAuthTag(Buffer.from(tagHex, "hex"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(ctHex, "hex")),
      decipher.final(),
    ]);
    return plaintext.toString("utf8");
  } catch {
    throw new Error("Decryption failed: wrong key or corrupted data.");
  }
}
