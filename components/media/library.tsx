"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadFile } from "@/components/media/upload-file";

interface Asset {
  id: string;
  original_name: string | null;
  media_type: "image" | "video";
  mime_type: string | null;
  file_size: number | null;
  created_at: string;
}

function AssetCard({ asset, onDeleted }: { asset: Asset; onDeleted: () => void }) {
  const [preview, setPreview] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/media/${asset.id}/preview`)
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => {
        if (!cancelled && j?.url) setPreview(j.url);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [asset.id]);

  async function onDelete() {
    if (!window.confirm(`Hapus ${asset.original_name ?? "file"}?`)) return;
    setDeleting(true);
    await fetch(`/api/media/${asset.id}`, { method: "DELETE" });
    setDeleting(false);
    onDeleted();
  }

  return (
    <article className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex aspect-square items-center justify-center bg-muted">
        {preview ? (
          asset.media_type === "image" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={preview} alt={asset.original_name ?? ""} className="h-full w-full object-cover" />
          ) : (
            <video src={preview} className="h-full w-full object-cover" preload="metadata" />
          )
        ) : (
          <span className="text-sm text-muted-foreground">Memuat...</span>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 p-3">
        <p className="truncate text-sm" title={asset.original_name ?? ""}>
          {asset.original_name}
        </p>
        <Button variant="ghost" size="sm" onClick={onDelete} disabled={deleting}>
          {deleting ? "..." : "Hapus"}
        </Button>
      </div>
    </article>
  );
}

export function MediaLibrary() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [type, setType] = useState<"" | "image" | "video">("");
  const [status, setStatus] = useState<string | null>(null);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [reloadToken, setReloadToken] = useState(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const perPage = 24;

  const refresh = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
      if (q) params.set("q", q);
      if (type) params.set("type", type);
      const res = await fetch(`/api/media?${params.toString()}`);
      if (cancelled) return;
      if (!res.ok) {
        setStatus("Gagal memuat media.");
        return;
      }
      const json = await res.json();
      setAssets(json.data);
      setTotal(json.total);
    })().catch(() => {
      if (!cancelled) setStatus("Gagal memuat media.");
    });
    return () => {
      cancelled = true;
    };
  }, [page, q, type, reloadToken]);

  async function onFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    for (const file of Array.from(files).slice(0, 10)) {
      const key = `${file.name}-${Date.now()}`;
      try {
        setStatus(null);
        await uploadFile(file, (v) =>
          setProgress((p) => ({ ...p, [key]: v }))
        );
        setProgress((p) => {
          const next = { ...p };
          delete next[key];
          return next;
        });
        refresh();
      } catch (e) {
        setProgress((p) => {
          const next = { ...p };
          delete next[key];
          return next;
        });
        setStatus(`Upload ${file.name} gagal: ${(e as Error).message}`);
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="file"
          ref={fileRef}
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
          onChange={(e) => onFiles(e.target.files)}
          className="max-w-xs"
        />
        <Input
          placeholder="Cari nama file..."
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          className="max-w-xs"
        />
        <select
          value={type}
          onChange={(e) => {
            setPage(1);
            setType(e.target.value as "" | "image" | "video");
          }}
          className="rounded-lg border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="">Semua tipe</option>
          <option value="image">Gambar</option>
          <option value="video">Video</option>
        </select>
      </div>

      {status && (
        <p role="status" className="text-sm text-destructive">
          {status}
        </p>
      )}
      {Object.entries(progress).map(([k, v]) => (
        <p key={k} className="text-sm text-muted-foreground">
          {k}: {v}%
        </p>
      ))}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {assets.map((a) => (
          <AssetCard key={a.id} asset={a} onDeleted={refresh} />
        ))}
      </div>
      {assets.length === 0 && (
        <p className="text-sm text-muted-foreground">Belum ada media.</p>
      )}

      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => setPage((p) => p - 1)}
        >
          ← Prev
        </Button>
        <span className="text-sm text-muted-foreground">
          Hal {page} dari {totalPages} ({total} file)
        </span>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          Next →
        </Button>
      </div>
    </div>
  );
}
