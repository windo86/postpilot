import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildInstagramCaption,
  classifyInstagramError,
  createCarouselContainer,
  createMediaContainer,
  getContainerStatus,
  getPublishingLimit,
  publishContainer,
  sanitizeInstagramResponse,
  InstagramApiError,
  type FetchImpl,
} from "./publish.js";

function fakeFetch(routes: Record<string, { status: number; body: unknown }>): FetchImpl {
  return (async (url: unknown, init?: { method?: string }) => {
    const key = `${init?.method ?? "GET"} ${String(url).split("?")[0]}`;
    const route = routes[key];
    if (!route) throw new Error(`route tak dikenal: ${key}`);
    return new Response(JSON.stringify(route.body), { status: route.status });
  }) as FetchImpl;
}

const HOST = "https://graph.instagram.com";

describe("classify", () => {
  it("429/5xx transient, 400/401/403 + 190 permanent", () => {
    assert.equal(classifyInstagramError(429), "transient");
    assert.equal(classifyInstagramError(503), "transient");
    assert.equal(classifyInstagramError(400), "permanent");
    assert.equal(classifyInstagramError(401), "permanent");
    assert.equal(classifyInstagramError(200, 190), "permanent");
    assert.equal(classifyInstagramError(200), "unknown");
  });
});

describe("caption + sanitize", () => {
  it("gabung caption + hashtag", () => {
    assert.equal(buildInstagramCaption("halo", ["a", "#b"]), "halo\n#a #b");
    assert.equal(buildInstagramCaption(null, ["a"]), "#a");
    assert.equal(buildInstagramCaption(null, []), "");
  });

  it("sanitize menutup token", () => {
    const out = sanitizeInstagramResponse({
      id: "123",
      access_token: "rahasia",
      nested: { client_secret: "x" },
    }) as Record<string, unknown>;
    assert.equal(out.id, "123");
    assert.equal(out.access_token, "***");
    assert.equal((out.nested as Record<string, unknown>).client_secret, "***");
  });
});

describe("publish flow (mock)", () => {
  const fetchOk = fakeFetch({
    [`POST ${HOST}/999/media`]: { status: 200, body: { id: "container-1" } },
    [`GET ${HOST}/container-1`]: { status: 200, body: { status_code: "FINISHED" } },
    [`POST ${HOST}/999/media_publish`]: { status: 200, body: { id: "media-1" } },
    [`GET ${HOST}/999/content_publishing_limit`]: {
      status: 200,
      body: { data: [{ quota_usage: 2, rate_limit_settings: { quota_total: 25 } }] },
    },
  });

  it("image: container → FINISHED → publish", async () => {
    const cid = await createMediaContainer(
      { accessToken: "t", igUserId: "999", media: { url: "https://x/y.jpg", mediaType: "image" }, captionText: "halo" },
      fetchOk
    );
    assert.equal(cid, "container-1");
    assert.equal(await getContainerStatus("t", "container-1", fetchOk), "FINISHED");
    assert.equal(await publishContainer("t", "999", "container-1", fetchOk), "media-1");
  });

  it("carousel memakai children + media_type CAROUSEL", async () => {
    let seen = "";
    const spy = (async (url: unknown, init?: { body?: string }) => {
      seen = String(init?.body ?? "");
      return new Response(JSON.stringify({ id: "car-1" }), { status: 200 });
    }) as FetchImpl;
    const id = await createCarouselContainer("t", "999", ["a", "b"], "cap", spy);
    assert.equal(id, "car-1");
    assert.ok(seen.includes("media_type=CAROUSEL"));
    assert.ok(seen.includes("children=a%2Cb") || seen.includes("children=a,b"));
  });

  it("error 400 → InstagramApiError permanent", async () => {
    const bad = fakeFetch({
      [`POST ${HOST}/999/media`]: { status: 400, body: { error: { message: "Invalid aspect", code: 100 } } },
    });
    await assert.rejects(
      () => createMediaContainer(
        { accessToken: "t", igUserId: "999", media: { url: "u", mediaType: "image" }, captionText: "" },
        bad
      ),
      (e: unknown) => e instanceof InstagramApiError && e.kind === "permanent" && e.httpStatus === 400
    );
  });

  it("kuota terbaca", async () => {
    const q = await getPublishingLimit("t", "999", fetchOk);
    assert.deepEqual(q, { quotaTotal: 25, quotaUsed: 2 });
  });

  it("status tak dikenal → unknown", async () => {
    const weird = fakeFetch({
      [`GET ${HOST}/c9`]: { status: 200, body: { status_code: "MELEDAK" } },
    });
    await assert.rejects(() => getContainerStatus("t", "c9", weird), /tak dikenal/);
  });
});
