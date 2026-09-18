/**
 * PostPilot Background Worker — entry point.
 *
 * Satu-satunya komponen yang publish ke Instagram/TikTok, refresh token,
 * recovery stale job, dan kirim notifikasi failure.
 * Berjalan sebagai proses Node biasa (BUKAN Next.js): dilarang import
 * `next/*`, UI components, atau browser-only API.
 */

import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { assertEncryptionKeyConfigured } from "@/lib/crypto";
import { createServiceClient } from "@/lib/supabase/service-client";
import { runWorkerIteration } from "@/lib/queue/processor";
import { refreshDueTokens } from "@/lib/queue/token-refresh";
import { refreshStaleAnalytics } from "@/lib/analytics/refresh";
import { pollPendingVideoOperations } from "@/lib/ai/operations";
import { createOpenAIProvider } from "@/lib/ai/openai";
import { createGoogleProvider } from "@/lib/ai/google";

/** Muat .env.local (Next.js melakukannya otomatis; Node biasa tidak). */
function loadEnvFile(path = ".env.local"): void {
  let content = "";
  try {
    content = fs.readFileSync(path, "utf8");
  } catch {
    return;
  }
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const i = trimmed.indexOf("=");
    const key = trimmed.slice(0, i).trim();
    const value = trimmed.slice(i + 1).trim();
    if (key && process.env[key] === undefined) process.env[key] = value;
  }
}

function env(name: string, required: boolean): string | undefined {
  const value = process.env[name];
  if (required && !value) {
    throw new Error(`[worker] ${name} belum di-set — cek .env.local`);
  }
  return value;
}

async function main(): Promise<void> {
  loadEnvFile();
  env("NEXT_PUBLIC_SUPABASE_URL", true);
  env("SUPABASE_SERVICE_ROLE_KEY", true);
  assertEncryptionKeyConfigured();

  const workerId = `worker-${randomUUID().slice(0, 8)}`;
  const pollMs = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 5000);
  const claimLimit = Number(process.env.WORKER_CLAIM_LIMIT ?? 5);
  console.log(`[worker] starting id=${workerId} poll=${pollMs}ms (env=${process.env.NODE_ENV ?? "development"})`);

  const client = createServiceClient();
  let shuttingDown = false;

  const shutdown = (signal: string) => {
    console.log(`[worker] ${signal} diterima — selesaikan iterasi berjalan lalu berhenti...`);
    shuttingDown = true;
  };
  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));

  while (!shuttingDown) {
    const started = Date.now();
    try {
      const tokens = await refreshDueTokens(client).catch((e) => {
        console.error(`[worker] refresh token gagal: ${(e as Error).message}`);
        return { refreshed: 0, reauth: 0 };
      });
      if (tokens.refreshed + tokens.reauth > 0) {
        console.log(`[worker] token: refreshed=${tokens.refreshed} reauth=${tokens.reauth}`);
      }
      const { recovered, claimed } = await runWorkerIteration(client, workerId, claimLimit);
      const analytics = await refreshStaleAnalytics(client).catch((e) => {
        console.error(`[worker] analytics gagal: ${(e as Error).message}`);
        return 0;
      });
      const aiVideos = await pollPendingVideoOperations(client, [
        createOpenAIProvider(),
        createGoogleProvider(),
      ]).catch((e) => {
        console.error(`[worker] AI video gagal: ${(e as Error).message}`);
        return 0;
      });
      if (claimed > 0 || recovered > 0 || analytics > 0 || aiVideos > 0) {
        console.log(
          `[worker] iterasi: claimed=${claimed} recovered=${recovered} analytics=${analytics} aiVideos=${aiVideos} (${Date.now() - started}ms)`
        );
      }
    } catch (e) {
      console.error(`[worker] iterasi gagal: ${(e as Error).message}`);
    }
    if (shuttingDown) break;
    await new Promise((r) => setTimeout(r, pollMs));
  }

  console.log("[worker] berhenti dengan mulus.");
  process.exit(0);
}

main().catch((e) => {
  console.error(`[worker] fatal: ${(e as Error).message}`);
  process.exit(1);
});
