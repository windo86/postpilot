import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { listPlatformsWithMetrics } from "@/lib/db/post-metrics";

function csvCell(value: string | number | null | undefined): string {
  const s = value === null || value === undefined ? "" : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/** Export CSV sesuai filter (platform opsional). */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const platform = new URL(request.url).searchParams.get("platform");
  const service = createServiceClient();
  const data = await listPlatformsWithMetrics(
    service,
    user.id,
    platform === "instagram" || platform === "tiktok" ? platform : undefined
  );

  const header = [
    "post_id", "post_title", "platform", "username", "published_at",
    "likes", "comments", "shares", "saves", "views", "reach", "impressions", "fetched_at",
  ];
  const lines = [header.join(",")];
  for (const row of data) {
    const m = row.metrics;
    lines.push(
      [
        row.postId, row.postTitle, row.platform, row.username, row.publishedAt,
        m?.likes ?? "", m?.comments ?? "", m?.shares ?? "", m?.saves ?? "",
        m?.views ?? "", m?.reach ?? "", m?.impressions ?? "", m?.fetched_at ?? "",
      ].map(csvCell).join(",")
    );
  }

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="postpilot-analytics.csv"`,
    },
  });
}
