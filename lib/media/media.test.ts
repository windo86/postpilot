import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildStoragePath,
  mediaConfigFromEnv,
  mediaTypeForMime,
  ownerIdFromPath,
  sanitizeFilename,
  validateUploadFile,
  type MediaConfig,
} from "./config.js";

const cfg: MediaConfig = {
  bucket: "media",
  imageMimes: ["image/jpeg", "image/png"],
  videoMimes: ["video/mp4"],
  maxImageBytes: 8 * 1024 * 1024,
  maxVideoBytes: 250 * 1024 * 1024,
  tusThresholdBytes: 50 * 1024 * 1024,
};

describe("media config", () => {
  it("default dari env kosong", () => {
    const prev = { ...process.env };
    delete process.env.MEDIA_BUCKET;
    delete process.env.MEDIA_MAX_IMAGE_BYTES;
    const c = mediaConfigFromEnv();
    Object.assign(process.env, {
      MEDIA_BUCKET: prev.MEDIA_BUCKET,
      MEDIA_MAX_IMAGE_BYTES: prev.MEDIA_MAX_IMAGE_BYTES,
    });
    assert.equal(c.bucket, "media");
    assert.equal(c.maxImageBytes, 8 * 1024 * 1024);
  });
});

describe("validateUploadFile", () => {
  it("gambar valid", () => {
    const r = validateUploadFile("image/png", 1024, cfg);
    assert.equal(r.ok, true);
    assert.equal(r.mediaType, "image");
  });

  it("mime tak dikenal ditolak dengan pesan jelas", () => {
    const r = validateUploadFile("application/pdf", 1024, cfg);
    assert.equal(r.ok, false);
    assert.match(r.error ?? "", /tidak didukung/);
  });

  it("oversize ditolak dengan angka batas", () => {
    const r = validateUploadFile("image/jpeg", 9 * 1024 * 1024, cfg);
    assert.equal(r.ok, false);
    assert.match(r.error ?? "", /8 MB/);
  });

  it("mime case-insensitive", () => {
    assert.equal(mediaTypeForMime("IMAGE/PNG", cfg), "image");
  });
});

describe("storage path", () => {
  it("format user/yyyy/mm/uuid-nama", () => {
    const p = buildStoragePath({
      userId: "uid-1",
      uuid: "abc",
      filename: "Foto Liburan.JPG",
      now: new Date("2026-03-05T00:00:00Z"),
    });
    assert.equal(p, "uid-1/2026/03/abc-foto-liburan.jpg");
  });

  it("sanitize menolak traversal & karakter aneh", () => {
    assert.equal(sanitizeFilename("../../etc/passwd"), "passwd");
    assert.equal(sanitizeFilename("a%%%b  c.png"), "a-b-c.png");
  });

  it("ownerIdFromPath ambil segmen pertama", () => {
    assert.equal(ownerIdFromPath("uid-1/2026/x.png"), "uid-1");
    assert.equal(ownerIdFromPath(""), null);
  });
});
