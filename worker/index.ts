/**
 * PostPilot Background Worker — entry point.
 *
 * Berjalan sebagai proses Node biasa (BUKAN Next.js).
 * Aturan: dilarang import `next/*`, UI components, atau browser-only API.
 * Shared logic hanya dari pure modules (lib/queue, lib/platforms, lib/crypto,
 * lib/validators, lib/ai) + service client (lib/supabase/service.ts).
 *
 * Queue processing penuh diimplementasikan di T-12. Stub ini hanya
 * membuktikan lifecycle worker: start → polling loop → graceful shutdown.
 */

const POLL_INTERVAL_MS = Number(process.env.WORKER_POLL_INTERVAL_MS ?? 5000);

function main(): void {
  console.log(
    `[worker] starting (poll interval ${POLL_INTERVAL_MS}ms, env=${process.env.NODE_ENV ?? "development"})`
  );

  const timer = setInterval(() => {
    console.log("[worker] tick — queue processing belum diimplementasikan (T-12)");
  }, POLL_INTERVAL_MS);

  const shutdown = (signal: string) => {
    console.log(`[worker] received ${signal}, shutting down gracefully...`);
    clearInterval(timer);
    process.exit(0);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

main();
