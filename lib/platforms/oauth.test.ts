import { describe, it } from "node:test";
import assert from "node:assert/strict";

import {
  buildInstagramAuthorizeUrl,
  type InstagramOAuthConfig,
} from "./instagram/client.js";
import {
  buildTikTokAuthorizeUrl,
  type TikTokOAuthConfig,
} from "./tiktok/client.js";
import { createStateToken, isValidStateToken } from "./oauth-state.js";

const igCfg: InstagramOAuthConfig = {
  clientId: "12345",
  clientSecret: "secret",
  redirectUri: "http://localhost:3000/api/accounts/instagram/callback",
  scopes: ["instagram_business_basic", "instagram_business_content_publish"],
};

const ttCfg: TikTokOAuthConfig = {
  clientKey: "abcde",
  clientSecret: "secret",
  redirectUri: "http://localhost:3000/api/accounts/tiktok/callback",
  scopes: ["user.info.basic", "video.upload", "video.publish"],
};

describe("oauth state", () => {
  it("token 64 hex & valid", () => {
    const t = createStateToken();
    assert.match(t, /^[0-9a-f]{64}$/);
    assert.equal(isValidStateToken(t), true);
    assert.equal(isValidStateToken("acak"), false);
    assert.equal(isValidStateToken(null), false);
  });
});

describe("instagram authorize url", () => {
  it("memuat host, client_id, scope, state", () => {
    const url = new URL(buildInstagramAuthorizeUrl(igCfg, "state123"));
    assert.equal(url.host, "www.instagram.com");
    assert.equal(url.searchParams.get("client_id"), "12345");
    assert.equal(url.searchParams.get("response_type"), "code");
    assert.equal(
      url.searchParams.get("scope"),
      "instagram_business_basic,instagram_business_content_publish"
    );
    assert.equal(url.searchParams.get("state"), "state123");
  });

  it("config kosong → error jelas", () => {
    assert.throws(
      () => buildInstagramAuthorizeUrl({ ...igCfg, clientId: "" }, "s"),
      /belum dikonfigurasi/
    );
  });
});

describe("tiktok authorize url", () => {
  it("memuat host v2, client_key, scope, state", () => {
    const url = new URL(buildTikTokAuthorizeUrl(ttCfg, "state456"));
    assert.equal(url.host, "www.tiktok.com");
    assert.ok(url.pathname.startsWith("/v2/auth/authorize"));
    assert.equal(url.searchParams.get("client_key"), "abcde");
    assert.equal(url.searchParams.get("response_type"), "code");
    assert.equal(
      url.searchParams.get("scope"),
      "user.info.basic,video.upload,video.publish"
    );
    assert.equal(url.searchParams.get("state"), "state456");
  });

  it("config kosong → error jelas", () => {
    assert.throws(
      () => buildTikTokAuthorizeUrl({ ...ttCfg, clientSecret: "" }, "s"),
      /belum dikonfigurasi/
    );
  });
});
