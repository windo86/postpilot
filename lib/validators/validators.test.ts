import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { validateInstagramPost } from "./instagram.js";
import { validateTikTokPost } from "./tiktok.js";
import type { MediaInfo } from "./common.js";

const img1080: MediaInfo = { mimeType: "image/jpeg", sizeBytes: 500_000, width: 1080, height: 1080 };
const imgWide: MediaInfo = { mimeType: "image/png", sizeBytes: 1_000_000, width: 1910, height: 1000 };
const imgTall: MediaInfo = { mimeType: "image/jpeg", sizeBytes: 500_000, width: 500, height: 2000 };
const reelOk: MediaInfo = { mimeType: "video/mp4", sizeBytes: 10_000_000, width: 1080, height: 1920, durationSeconds: 30 };
const reelLong: MediaInfo = { mimeType: "video/mp4", sizeBytes: 10_000_000, width: 1080, height: 1920, durationSeconds: 3600 };
const noDuration: MediaInfo = { mimeType: "video/mp4", sizeBytes: 10_000_000 };
const webp: MediaInfo = { mimeType: "image/webp", sizeBytes: 100_000, width: 500, height: 500 };
const pdf: MediaInfo = { mimeType: "application/pdf", sizeBytes: 100_000 };

describe("instagram", () => {
  it("single image valid (square & landscape 1.91)", () => {
    assert.equal(validateInstagramPost({ media: [img1080], caption: "halo" }).ok, true);
    assert.equal(validateInstagramPost({ media: [imgWide] }).ok, true);
  });

  it("caption >2200 ditolak", () => {
    const r = validateInstagramPost({ media: [img1080], caption: "x".repeat(2201) });
    assert.equal(r.ok, false);
    assert.match(r.issues[0].message, /2200/);
  });

  it("webp ditolak dengan instruksi convert", () => {
    const r = validateInstagramPost({ media: [webp] });
    assert.equal(r.ok, false);
    assert.match(r.issues[0].message, /JPG\/PNG/);
  });

  it("rasio terlalu tinggi ditolak", () => {
    const r = validateInstagramPost({ media: [imgTall] });
    assert.equal(r.ok, false);
    assert.match(r.issues[0].message, /Rasio/);
  });

  it("reels valid & durasi over ditolak", () => {
    assert.equal(validateInstagramPost({ media: [reelOk] }).ok, true);
    const r = validateInstagramPost({ media: [reelLong] });
    assert.equal(r.ok, false);
    assert.match(r.issues[0].message, /Durasi/);
  });

  it("durasi tak diketahui → error actionable", () => {
    const r = validateInstagramPost({ media: [noDuration] });
    assert.equal(r.ok, false);
    assert.match(r.issues[0].message, /Upload ulang/);
  });

  it("carousel 1 video+1 gambar divalidasi per item, format asing ditolak", () => {
    const bad = validateInstagramPost({ media: [img1080, pdf] });
    assert.equal(bad.ok, false);
  });

  it("carousel 11 item ditolak", () => {
    const r = validateInstagramPost({ media: Array(11).fill(img1080) });
    assert.equal(r.ok, false);
    assert.match(r.issues[0].message, /Carousel/);
  });
});

describe("tiktok", () => {
  const creator = {
    privacyOptions: ["PUBLIC_TO_EVERYONE", "SELF_ONLY"],
    maxVideoDurationSeconds: 600,
  };

  it("video valid + privacy valid", () => {
    const r = validateTikTokPost({
      media: [reelOk], caption: "halo", privacyLevel: "SELF_ONLY", creatorInfo: creator,
    });
    assert.equal(r.ok, true);
  });

  it("privacy di luar opsi creator ditolak", () => {
    const r = validateTikTokPost({
      media: [reelOk], privacyLevel: "MUTUAL_FOLLOW_FRIENDS", creatorInfo: creator,
    });
    assert.equal(r.ok, false);
    assert.match(r.issues[0].message, /Privacy/);
  });

  it("tanpa creator_info privacy tidak dicek (submit)", () => {
    const r = validateTikTokPost({ media: [reelOk], privacyLevel: "APAPUN" });
    assert.equal(r.ok, true);
  });

  it("durasi ikut max dinamis creator", () => {
    const short = { ...creator, maxVideoDurationSeconds: 60 };
    const long = { ...reelOk, durationSeconds: 120 };
    const r = validateTikTokPost({ media: [long], creatorInfo: short });
    assert.equal(r.ok, false);
    assert.match(r.issues[0].message, /3–60 dtk/);
  });

  it("campur foto+video ditolak", () => {
    const r = validateTikTokPost({ media: [img1080, reelOk] });
    assert.equal(r.ok, false);
    assert.match(r.issues[0].message, /campur/);
  });

  it("2 video ditolak, 3 foto ok", () => {
    assert.equal(validateTikTokPost({ media: [reelOk, reelOk] }).ok, false);
    assert.equal(validateTikTokPost({ media: [img1080, img1080, img1080] }).ok, true);
  });
});
