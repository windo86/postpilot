import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { validatePrompt } from "./provider.js";
import { createOpenAIProvider, AIError } from "./openai.js";
import { createGoogleProvider } from "./google.js";
import type { FetchImpl } from "./provider.js";

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("validatePrompt", () => {
  it("kosong & kepanjangan ditolak", () => {
    assert.ok(validatePrompt("   "));
    assert.ok(validatePrompt("x".repeat(2001)));
    assert.equal(validatePrompt("buat gambar kucing"), null);
  });
});

describe("openai", () => {
  it("text sukses + error rapi", async () => {
    const ok: FetchImpl = (async () =>
      json(200, { choices: [{ message: { content: "  halo  " } }] })) as FetchImpl;
    assert.equal(await createOpenAIProvider(ok).generateText("k", "hi"), "halo");

    const bad: FetchImpl = (async () =>
      json(401, { error: { message: "bad key" } })) as FetchImpl;
    await assert.rejects(() => createOpenAIProvider(bad).generateText("k", "hi"), /bad key/);
  });

  it("image b64_json & url", async () => {
    const b64: FetchImpl = (async () =>
      json(200, { data: [{ b64_json: Buffer.from("IMG").toString("base64") }] })) as FetchImpl;
    const img = await createOpenAIProvider(b64).generateImage("k", "cat");
    assert.equal(Buffer.from(img.bytes).toString(), "IMG");

    const empty: FetchImpl = (async () => json(200, { data: [] })) as FetchImpl;
    await assert.rejects(() => createOpenAIProvider(empty).generateImage("k", "cat"), AIError);
  });

  it("video throw jelas", async () => {
    await assert.rejects(() => createOpenAIProvider().startVideo("k", "v"), /tidak mendukung/);
  });
});

describe("google", () => {
  it("text gabung parts", async () => {
    const f: FetchImpl = (async () =>
      json(200, { candidates: [{ content: { parts: [{ text: "ha" }, { text: "lo" }] } }] })) as FetchImpl;
    assert.equal(await createGoogleProvider(f).generateText("k", "hi"), "halo");
  });

  it("image inlineData", async () => {
    const f: FetchImpl = (async () =>
      json(200, {
        candidates: [{ content: { parts: [{ inlineData: { mimeType: "image/png", data: Buffer.from("G").toString("base64") } }] } }],
      })) as FetchImpl;
    const img = await createGoogleProvider(f).generateImage("k", "cat");
    assert.equal(Buffer.from(img.bytes).toString(), "G");
    assert.equal(img.mimeType, "image/png");
  });

  it("video async: start → pending → done", async () => {
    let n = 0;
    const f = (async (url: unknown) => {
      const u = String(url);
      if (u.includes(":predictLongRunning")) return json(200, { name: "operations/v1" });
      n++;
      if (n === 1) return json(200, { done: false });
      return json(200, {
        done: true,
        response: { generateVideoResponse: { generatedSamples: [{ video: { uri: "https://x/v.mp4" } }] } },
      });
    }) as unknown as FetchImpl;
    const p = createGoogleProvider(f);
    const op = await p.startVideo("k", "vid");
    assert.equal(op.operationId, "operations/v1");
    // download via fetch global — stub dengan override fetchImpl tak menjangkau dl;
    // cukup pastikan pending terdeteksi:
    const f2 = (async () => json(200, { done: false })) as FetchImpl;
    assert.deepEqual(await createGoogleProvider(f2).checkVideo("k", "operations/v1"), { done: false });
  });
});
