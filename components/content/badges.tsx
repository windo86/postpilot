import {
  AlertTriangle,
  Ban,
  CheckCircle2,
  Clock,
  FileText,
  Loader2,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { cn } from "cn";

/** Status PRD → Bahasa Indonesia + ikon + tint lembut (bukan color-only). */
const STATUS: Record<string, { label: string; icon: LucideIcon; tone: string }> = {
  draft: { label: "Draft", icon: FileText, tone: "bg-[rgb(255_255_255/0.06)] text-muted-foreground" },
  scheduled: { label: "Terjadwal", icon: Clock, tone: "bg-[rgb(59_130_246/0.12)] text-accent" },
  queued: { label: "Menunggu", icon: Clock, tone: "bg-[rgb(59_130_246/0.12)] text-accent" },
  processing: { label: "Sedang diproses", icon: Loader2, tone: "bg-[rgb(59_130_246/0.12)] text-accent" },
  published: { label: "Terbit", icon: CheckCircle2, tone: "bg-[rgb(52_211_153/0.10)] text-[var(--success)]" },
  partial_failed: { label: "Sebagian gagal", icon: AlertTriangle, tone: "bg-[rgb(251_191_36/0.10)] text-[var(--warning)]" },
  failed: { label: "Gagal", icon: XCircle, tone: "bg-[rgb(248_113_113/0.10)] text-[var(--danger)]" },
  cancelled: { label: "Dibatalkan", icon: Ban, tone: "bg-[rgb(255_255_255/0.06)] text-muted-foreground" },
  active: { label: "Aktif", icon: CheckCircle2, tone: "bg-[rgb(52_211_153/0.10)] text-[var(--success)]" },
  expired: { label: "Kedaluwarsa", icon: AlertTriangle, tone: "bg-[rgb(251_191_36/0.10)] text-[var(--warning)]" },
  reauth_required: { label: "Perlu login ulang", icon: AlertTriangle, tone: "bg-[rgb(251_191_36/0.10)] text-[var(--warning)]" },
  disconnected: { label: "Terputus", icon: XCircle, tone: "bg-[rgb(255_255_255/0.06)] text-muted-foreground" },
  pending: { label: "Menunggu", icon: Clock, tone: "bg-[rgb(59_130_246/0.12)] text-accent" },
  succeeded: { label: "Berhasil", icon: CheckCircle2, tone: "bg-[rgb(52_211_153/0.10)] text-[var(--success)]" },
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const s = STATUS[status] ?? STATUS.draft;
  const Icon = s.icon;
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
        s.tone,
        className
      )}
    >
      <Icon size={12} />
      {s.label}
    </span>
  );
}

const PLATFORM: Record<string, { label: string; dot: string }> = {
  instagram: { label: "Instagram", dot: "linear-gradient(135deg,#f472b6,#fb923c)" },
  tiktok: { label: "TikTok", dot: "#22d3ee" },
};

export function PlatformBadge({ platform, className }: { platform: string; className?: string }) {
  const p = PLATFORM[platform] ?? { label: platform, dot: "#9aa3b2" };
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full bg-[rgb(255_255_255/0.05)] px-2 py-0.5 text-[11px] text-muted-foreground",
        className
      )}
    >
      <span aria-hidden className="size-1.5 rounded-full" style={{ background: p.dot }} />
      {p.label}
    </span>
  );
}
