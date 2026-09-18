import Link from "next/link";
import type { LucideIcon } from "lucide-react";

/** Empty state: konteks + penjelasan + aksi. Tanpa kata "No data". */
export function EmptyState({
  icon: Icon,
  title,
  description,
  actionHref,
  actionLabel,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionHref: string;
  actionLabel: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-4 py-8 text-center">
      <span className="grid size-10 place-items-center rounded-full bg-[rgb(255_255_255/0.05)]">
        <Icon size={18} className="text-muted-foreground" />
      </span>
      <p className="text-sm font-medium">{title}</p>
      <p className="max-w-xs text-sm text-muted-foreground">{description}</p>
      <Link
        href={actionHref}
        className="mt-1 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-[var(--accent-hover)]"
      >
        {actionLabel}
      </Link>
    </div>
  );
}

/** Header halaman konsisten: judul + deskripsi + slot aksi. */
export function PageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </div>
  );
}
