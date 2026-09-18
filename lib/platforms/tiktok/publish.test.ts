import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildTikTokTitle,
  classifyTikTokError,
  fetchCreatorInfo,
  fetchPublishStatus,
  initVideoDirectPost,
  splitChunks,
  uploadVideoChunk,
  TikTokApiError,
  type FetchImpl,
} from "./publish.js";

const MB = 1024 * 1024;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("classify + title", () => {
  it("429/5xx + spam_risk_too_many transient; 401/scope permanent", () => {
    assert.equal(classifyTikTokError(429, null), "transient");
    assert.equal(classifyTikTokError(500, null), "transient");
    assert.equal(classifyTikTokError(200, "spam_risk_too_many_posts"), "transient");
    assert.equal(classifyTikTokError(401, "access_token_invalid"), "permanent");
    assert.equal(classifyTikTokError(403, "scope_not_authorized"), "permanent");
    assert.equal(classifyTikTokError(200, null), "unknown");
  });

  it("title gabung caption + hashtag", () => {
    assert.equal(buildTikTokTitle("halo", ["a", "#b"]), "halo #a #b");
    assert.equal(buildTikTokTitle(null, []), "");
  });
});

describe("splitChunks", () => {
  it("<5MB satu chunk penuh", () => {
    assert.deepEqual(splitChunks(3 * MB, 10 * MB), [{ first: 0, last: 3 * MB - 1 }]);
  });

  it("50MB → 5 chunk 10MB", () => {
    const c = splitChunks(50 * MB, 10 * MB);
    assert.equal(c.length, 5);
    assert.deepEqual(c[0], { first: 0, last: 10 * MB - 1 });
    assert.equal(c[4].last, 50 * MB - 1);
  });

  it("ekor kecil digabung (tanpa sisa <5MB)", () => {
    const c = splitChunks(12 * MB, 10 * MB);
    assert.equal(c.length, 1);
    assert.equal(c[0].last, 12 * MB - 1);
  });

  it("kontigu & menutup total", () => {
    const c = splitChunks(70 * MB, 10 * MB);
    for (let i = 1; i < c.length; i++) assert.equal(c[i].first, c[i - 1].last + 1);
    assert.equal(c[c.length - 1].last, 70 * MB - 1);
  });
});

describe("flow mock", () => {
  it("creator_info dipetakan", async () => {
    const f = (async () =>
      json(200, {
        data: {
          creator_nickname: "toko",
          privacy_level_options: ["PUBLIC_TO_EVERYONE", "SELF_ONLY"],
          max_video_post_duration_sec: 600,
        },
        error: { code: "ok" },
      })) as FetchImpl;
    const info = await fetchCreatorInfo("t", f);
    assert.equal(info.nickname, "toko");
    assert.deepEqual(info.privacyOptions, ["PUBLIC_TO_EVERYONE", "SELF_ONLY"]);
    assert.equal(info.maxVideoDurationSeconds, 600);
  });

  it("init → publish_id + upload_url", async () => {
    const f = (async () =>
      json(200, { data: { publish_id: "pub-1", upload_url: "https://up/x" }, error: { code: "ok" } })) as FetchImpl;
    const r = await initVideoDirectPost(
      "t",
      { title: "hai", privacyLevel: "SELF_ONLY", videoSize: 100, chunkSize: 100, totalChunks: 1 },
      f
    );
    assert.deepEqual(r, { publishId: "pub-1", uploadUrl: "https://up/x" });
  });

  it("chunk 206 partial, 201 done, 500 transient", async () => {
    const partial = (async () => new Response("", { status: 206 })) as FetchImpl;
    const done = (async () => new Response("", { status: 201 })) as FetchImpl;
    const err = (async () => new Response("boom", { status: 500 })) as FetchImpl;
    const bytes = new Uint8Array([1, 2, 3]);
    assert.equal(await uploadVideoChunk("u", "video/mp4", bytes, 0, 2, 3, partial), "partial");
    assert.equal(await uploadVideoChunk("u", "video/mp4", bytes, 0, 2, 3, done), "done");
    await assert.rejects(() => uploadVideoChunk("u", "video/mp4", bytes, 0, 2, 3, err), TikTokApiError);
  });

  it("status FAILED bawa fail_reason; COMPLETE bawa post id", async () => {
    const f = (async () =>
      json(200, {
        data: { status: "PUBLISH_COMPLETE", publicly_available_post_id: ["v1"], share_url: "https://t/v" },
        error: { code: "ok" },
      })) as FetchImpl;
    const r = await fetchPublishStatus("t", "pub-1", f);
    assert.equal(r.status, "PUBLISH_COMPLETE");
    assert.deepEqual(r.publicPostIds, ["v1"]);
  });

  it("error envelope → TikTokApiError permanent", async () => {
    const f = (async () =>
      json(401, { error: { code: "access_token_invalid", message: "bad token" } })) as FetchImpl;
    await assert.rejects(() => fetchCreatorInfo("t", f), (e: unknown) => {
      const err = e as TikTokApiError;
      return err instanceof TikTokApiError && err.kind === "permanent" && err.code === "access_token_invalid";
    });
  });
});
