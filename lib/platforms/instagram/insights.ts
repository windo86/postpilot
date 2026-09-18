/**
 * Instagram insights per media. Metrik yang tak didukung dibiarkan null
 * (jangan isi nol palsu). Pure — tanpa import `next/*`.
 */

export type FetchImpl = typeof fetch;

export interface InstagramMetrics {
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  views: number | null;
  reach: number | null;
  impressions: number | null;
}

const EMPTY: InstagramMetrics = {
  likes: null, comments: null, shares: null, saves: null,
  views: null, reach: null, impressions: null,
};

/** Metrik inti; `plays` khusus reels → views. */
const CORE_METRICS = ["likes", "comments", "shares", "saved", "reach", "impressions", "plays"];

function graphHost(): string {
  return (process.env.INSTAGRAM_GRAPH_HOST || "https://graph.instagram.com").replace(/\/$/, "");
}

interface InsightsValue {
  value?: number;
}

async function fetchMetrics(
  accessToken: string,
  mediaId: string,
  metrics: string[],
  fetchImpl: FetchImpl
): Promise<Partial<Record<string, number>>> {
  const params = new URLSearchParams({
    metric: metrics.join(","),
    access_token: accessToken,
  });
  const res = await fetchImpl(`${graphHost()}/${mediaId}/insights?${params.toString()}`);
  if (!res.ok) throw new Error(`insights HTTP ${res.status}`);
  const body = (await res.json()) as {
    data?: { name: string; values: InsightsValue[] }[];
  };
  const out: Partial<Record<string, number>> = {};
  for (const row of body.data ?? []) {
    const v = row.values?.[row.values.length - 1]?.value;
    if (typeof v === "number") out[row.name] = v;
  }
  return out;
}

export class InstagramInsightsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InstagramInsightsError";
  }
}

/**
 * Ambil insights; bila batch gagal (mis. satu metrik tak didukung tipe
 * media ini), fallback per-metrik agar yang tersedia tetap tersimpan.
 * Bila SEMUA panggilan gagal (media dihapus / token mati), throw agar
 * pemanggil tahu — jangan simpan snapshot nol palsu.
 */
export async function fetchInstagramInsights(
  accessToken: string,
  mediaId: string,
  fetchImpl: FetchImpl = fetch
): Promise<InstagramMetrics> {
  const merged: Partial<Record<string, number>> = {};
  let succeeded = false;
  try {
    Object.assign(merged, await fetchMetrics(accessToken, mediaId, CORE_METRICS, fetchImpl));
    succeeded = true;
  } catch {
    for (const m of CORE_METRICS) {
      try {
        Object.assign(merged, await fetchMetrics(accessToken, mediaId, [m], fetchImpl));
        succeeded = true;
      } catch {
        // Metrik tak didukung → tetap null.
      }
    }
  }
  if (!succeeded) {
    throw new InstagramInsightsError(
      "Insights tidak tersedia (media dihapus / akses dicabut / token invalid)."
    );
  }
  return {
    likes: merged.likes ?? null,
    comments: merged.comments ?? null,
    shares: merged.shares ?? null,
    saves: merged.saved ?? null,
    views: merged.plays ?? merged.views ?? null,
    reach: merged.reach ?? null,
    impressions: merged.impressions ?? null,
  };
}

export function emptyMetrics(): InstagramMetrics {
  return { ...EMPTY };
}
