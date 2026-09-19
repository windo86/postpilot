"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Topic {
  id: string;
  keyword: string;
  source: string | null;
  source_url: string | null;
  captured_at: string | null;
  expires_at: string | null;
}

const EMPTY = { keyword: "", source: "", sourceUrl: "", expiresAt: "" };

export function TrendingManager() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const perPage = 20;

  const refresh = useCallback(() => setReloadToken((t) => t + 1), []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const params = new URLSearchParams({ page: String(page), perPage: String(perPage) });
      if (q) params.set("q", q);
      const res = await fetch(`/api/trending?${params.toString()}`);
      if (cancelled || !res.ok) return;
      const j = await res.json();
      setTopics(j.data ?? []);
      setTotal(j.total ?? 0);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [page, q, reloadToken]);

  function startEdit(t: Topic) {
    setEditing(t.id);
    setForm({
      keyword: t.keyword,
      source: t.source ?? "",
      sourceUrl: t.source_url ?? "",
      expiresAt: t.expires_at ? t.expires_at.slice(0, 16) : "",
    });
  }

  function cancelEdit() {
    setEditing(null);
    setForm(EMPTY);
  }

  async function onSubmit() {
    setError(null);
    if (!form.keyword.trim()) {
      setError("Keyword wajib diisi.");
      return;
    }
    const payload = {
      keyword: form.keyword.trim(),
      source: form.source.trim() || null,
      sourceUrl: form.sourceUrl.trim() || null,
      capturedAt: editing ? undefined : new Date().toISOString(),
      expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
    };
    const res = await fetch(editing ? `/api/trending/${editing}` : "/api/trending", {
      method: editing ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const j = await res.json().catch(() => null);
    if (!res.ok) {
      setError(j?.error ?? "Gagal menyimpan");
      return;
    }
    cancelEdit();
    refresh();
  }

  async function onDelete(id: string) {
    if (!window.confirm("Hapus topik ini?")) return;
    await fetch(`/api/trending/${id}`, { method: "DELETE" });
    refresh();
  }

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  return (
    <div className="space-y-4">
      <div className="space-y-2 rounded-2xl border border-[rgb(255_255_255/0.07)] p-4">
        <h2 className="font-medium">{editing ? "Edit topik" : "Tambah topik"}</h2>
        <Input
          placeholder="Keyword, mis. resep ayam geprek"
          value={form.keyword}
          onChange={(e) => setForm((f) => ({ ...f, keyword: e.target.value }))}
          maxLength={200}
        />
        <div className="flex flex-wrap gap-2">
          <Input
            placeholder="Sumber (opsional)"
            value={form.source}
            onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
            className="max-w-xs"
          />
          <Input
            placeholder="URL sumber (opsional)"
            value={form.sourceUrl}
            onChange={(e) => setForm((f) => ({ ...f, sourceUrl: e.target.value }))}
            className="max-w-xs"
          />
          <Input
            type="datetime-local"
            value={form.expiresAt}
            onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
            className="max-w-xs"
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <div className="flex gap-2">
          <Button size="sm" onClick={onSubmit}>
            {editing ? "Simpan" : "Tambah"}
          </Button>
          {editing && (
            <Button size="sm" variant="ghost" onClick={cancelEdit}>
              Batal
            </Button>
          )}
        </div>
      </div>

      <Input
        placeholder="Cari keyword..."
        value={q}
        onChange={(e) => {
          setPage(1);
          setQ(e.target.value);
        }}
        className="max-w-xs"
      />

      <ul className="space-y-2">
        {topics.map((t) => (
          <li
            key={t.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-xl px-2 py-2.5 hover:bg-[rgb(255_255_255/0.03)]"
          >
            <div>
              <p className="font-medium">{t.keyword}</p>
              <p className="text-sm text-muted-foreground">
                {t.source ?? "manual"}
                {t.expires_at ? ` · s/d ${new Date(t.expires_at).toLocaleDateString("id-ID")}` : ""}
              </p>
            </div>
            <div className="flex gap-2">
              {t.source_url && (
                <a href={t.source_url} target="_blank" rel="noreferrer" className="text-sm underline">
                  Sumber
                </a>
              )}
              <Button size="sm" variant="ghost" onClick={() => startEdit(t)}>
                Edit
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onDelete(t.id)}>
                Hapus
              </Button>
            </div>
          </li>
        ))}
      </ul>
      {topics.length === 0 && (
        <p className="text-sm text-muted-foreground">Belum ada topik.</p>
      )}

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
          ← Prev
        </Button>
        <span className="text-sm text-muted-foreground">
          Hal {page} dari {totalPages} ({total})
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next →
        </Button>
      </div>
    </div>
  );
}
