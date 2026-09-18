import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { fetchInstagramInsights, InstagramInsightsError, type FetchImpl } from "./insights.js";

function fakeFetch(handler: (url: string) => { status: number; body: unknown }): FetchImpl {
  return (async (url: unknown) => {
    const r = handler(String(url));
    return new Response(JSON.stringify(r.body), { status: r.status });
  }) as FetchImpl;
}

describe("instagram insights", () => {
  it("batch sukses dipetakan", async () => {
    const f = fakeFetch(() => ({
      status: 200,
      body: {
        data: [
          { name: "likes", values: [{ value: 10 }] },
          { name: "comments", values: [{ value: 2 }] },
          { name: "plays", values: [{ value: 100 }] },
        ],
      },
    }));
    const m = await fetchInstagramInsights("t", "m1", f);
    assert.equal(m.likes, 10);
    assert.equal(m.comments, 2);
    assert.equal(m.views, 100);
    assert.equal(m.shares, null);
  });

  it("batch gagal → fallback per-metrik", async () => {
    const f = fakeFetch((url) => {
      if (url.includes("metric=likes")) {
        return { status: 200, body: { data: [{ name: "likes", values: [{ value: 5 }] }] } };
      }
      return { status: 400, body: { error: { message: "unsupported" } } };
    });
    const m = await fetchInstagramInsights("t", "m1", f);
    assert.equal(m.likes, 5);
    assert.equal(m.comments, null);
  });

  it("semua gagal → throw (jangan snapshot nol palsu)", async () => {
    const f = fakeFetch(() => ({
      status: 400,
      body: { error: { message: "does not exist" } },
    }));
    await assert.rejects(
      () => fetchInstagramInsights("t", "gone", f),
      (e: unknown) => e instanceof InstagramInsightsError
    );
  });
});
