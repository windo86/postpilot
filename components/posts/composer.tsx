"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { uploadFile } from "@/components/media/upload-file";

interface MediaItem {
  id: string;
  original_name: string | null;
  media_type: "image" | "video";
}

interface Account {
  id: string;
  platform: "instagram" | "tiktok";
  username: string | null;
  display_name: string | null;
  platform_account_id: string;
  status: string;
}

interface TargetDraft {
  caption: string;
  hashtags: string;
  commercialDisclosure: boolean;
  privacyLevel: string;
}

const TIKTOK_PRIVACY = [
  "PUBLIC_TO_EVERYONE",
  "MUTUAL_FOLLOW_FRIENDS",
  "FOLLOWER_OF_CREATOR",
  "SELF_ONLY",
];

export function Composer() {
  const router = useRouter();
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [previews, setPreviews] = useState<Record<string, string>>({});
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Record<string, TargetDraft>>({});
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/media?perPage=24")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => setMedia(j.data ?? []))
      .catch(() => undefined);
    fetch("/api/accounts")
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((j) => setAccounts((j.data ?? []).filter((a: Account) => a.status === "active")))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    selectedMedia.forEach((id) => {
      if (previews[id]) return;
      fetch(`/api/media/${id}/preview`)
        .then((r) => (r.ok ? r.json() : null))
        .then((j) => {
          if (j?.url) setPreviews((p) => ({ ...p, [id]: j.url }));
        })
        .catch(() => undefined);
    });
  }, [selectedMedia, previews]);

  function toggleMedia(id: string) {
    setSelectedMedia((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));
  }

  function toggleAccount(id: string) {
    setSelectedAccounts((s) => {
      if (s.includes(id)) {
        const next = s.filter((x) => x !== id);
        setDrafts((d) => {
          const copy = { ...d };
          delete copy[id];
          return copy;
        });
        return next;
      }
      setDrafts((d) => ({
        ...d,
        [id]: d[id] ?? {
          caption: "",
          hashtags: "",
          commercialDisclosure: false,
          privacyLevel: "PUBLIC_TO_EVERYONE",
        },
      }));
      return [...s, id];
    });
  }

  function patchDraft(id: string, patch: Partial<TargetDraft>) {
    setDrafts((d) => ({ ...d, [id]: { ...d[id], ...patch } }));
  }

  async function onUploadNew(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      for (const file of Array.from(files).slice(0, 10)) {
        const { assetId } = await uploadFile(file);
        const res = await fetch("/api/media?perPage=24").then((r) => r.json());
        setMedia(res.data ?? []);
        setSelectedMedia((s) => (s.includes(assetId) ? s : [...s, assetId]));
      }
    } catch (e) {
      setError(`Upload gagal: ${(e as Error).message}`);
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function onSubmit() {
    setError(null);
    if (selectedMedia.length === 0) {
      setError("Pilih minimal 1 media.");
      return;
    }
    if (selectedAccounts.length === 0) {
      setError("Pilih minimal 1 akun target.");
      return;
    }
    for (const accId of selectedAccounts) {
      const d = drafts[accId];
      if (d && d.caption.length > 2200) {
        setError("Caption maksimal 2200 karakter.");
        return;
      }
    }

    setSaving(true);
    try {
      const accountById = new Map(accounts.map((a) => [a.id, a]));
      const res = await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title || null,
          mediaIds: selectedMedia,
          targets: selectedAccounts.map((accId) => {
            const acc = accountById.get(accId)!;
            const d = drafts[accId];
            return {
              connectedAccountId: accId,
              platform: acc.platform,
              caption: d.caption || null,
              hashtags: d.hashtags.split(",").map((h) => h.trim().replace(/^#+/, "")).filter(Boolean),
              commercialDisclosure: acc.platform === "tiktok" ? d.commercialDisclosure : false,
              privacyLevel: acc.platform === "tiktok" ? d.privacyLevel : null,
            };
          }),
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Gagal membuat post");
      router.push(`/posts/${json.postId}`);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-6">
        <section className="space-y-3">
          <h2 className="font-medium">1. Media</h2>
          <Input
            type="file"
            ref={fileRef}
            multiple
            accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
            onChange={(e) => onUploadNew(e.target.files)}
            disabled={uploading}
          />
          {uploading && <p className="text-sm text-muted-foreground">Mengunggah...</p>}
          <div className="grid grid-cols-3 gap-2">
            {media.map((m) => {
              const active = selectedMedia.includes(m.id);
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => toggleMedia(m.id)}
                  className={`truncate rounded-lg border p-2 text-left text-xs ${
                    active ? "border-primary bg-muted" : "border-border"
                  }`}
                  title={m.original_name ?? ""}
                >
                  {m.media_type === "video" ? "🎬 " : "🖼️ "}
                  {m.original_name}
                </button>
              );
            })}
          </div>
          {media.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Media kosong — upload baru atau tambah via <a href="/media" className="underline">Media Library</a>.
            </p>
          )}
        </section>

        <section className="space-y-3">
          <h2 className="font-medium">2. Akun target</h2>
          {accounts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Belum ada akun aktif. <a href="/accounts" className="underline">Connect dulu</a>.
            </p>
          )}
          {accounts.map((a) => (
            <label key={a.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={selectedAccounts.includes(a.id)}
                onChange={() => toggleAccount(a.id)}
              />
              <span className="rounded bg-muted px-2 py-0.5 text-xs uppercase">{a.platform}</span>
              {a.username ?? a.platform_account_id}
            </label>
          ))}
        </section>

        <section className="space-y-4">
          <h2 className="font-medium">3. Caption per platform</h2>
          <Input
            placeholder="Judul internal (opsional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
          />
          {selectedAccounts.map((accId) => {
            const acc = accounts.find((a) => a.id === accId)!;
            const d = drafts[accId];
            if (!d) return null;
            return (
              <div key={accId} className="space-y-2 rounded-xl border border-border p-4">
                <p className="text-sm font-medium">
                  {acc.platform} — {acc.username ?? acc.platform_account_id}
                </p>
                <textarea
                  rows={3}
                  maxLength={2200}
                  placeholder={`Caption ${acc.platform}...`}
                  value={d.caption}
                  onChange={(e) => patchDraft(accId, { caption: e.target.value })}
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm"
                />
                <p className="text-xs text-muted-foreground">{d.caption.length}/2200</p>
                <Input
                  placeholder="Hashtag, pisahkan koma (tanpa # juga boleh)"
                  value={d.hashtags}
                  onChange={(e) => patchDraft(accId, { hashtags: e.target.value })}
                />
                {acc.platform === "tiktok" && (
                  <>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={d.commercialDisclosure}
                        onChange={(e) => patchDraft(accId, { commercialDisclosure: e.target.checked })}
                      />
                      Konten komersial / sponsored
                    </label>
                    <label className="block text-sm">
                      Privacy
                      <select
                        value={d.privacyLevel}
                        onChange={(e) => patchDraft(accId, { privacyLevel: e.target.value })}
                        className="ml-2 rounded-lg border border-input bg-background px-2 py-1 text-sm"
                      >
                        {TIKTOK_PRIVACY.map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      Privacy divalidasi ulang dari creator info saat publish.
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </section>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button onClick={onSubmit} disabled={saving}>
          {saving ? "Menyimpan..." : "Simpan post"}
        </Button>
      </div>

      <div className="space-y-4">
        <h2 className="font-medium">Preview</h2>
        {selectedAccounts.length === 0 && (
          <p className="text-sm text-muted-foreground">Pilih akun untuk preview.</p>
        )}
        {selectedAccounts.map((accId) => {
          const acc = accounts.find((a) => a.id === accId);
          const d = drafts[accId];
          if (!acc || !d) return null;
          return (
            <article key={accId} className="rounded-xl border border-border bg-card p-4">
              <p className="text-xs uppercase text-muted-foreground">{acc.platform}</p>
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {selectedMedia.map((mid) => (
                  <div key={mid} className="h-24 w-24 shrink-0 rounded bg-muted">
                    {previews[mid] &&
                      (media.find((m) => m.id === mid)?.media_type === "video" ? (
                        <video src={previews[mid]} className="h-full w-full rounded object-cover" preload="metadata" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={previews[mid]} alt="" className="h-full w-full rounded object-cover" />
                      ))}
                  </div>
                ))}
                {selectedMedia.length === 0 && (
                  <p className="text-sm text-muted-foreground">Belum ada media.</p>
                )}
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{d.caption || "(tanpa caption)"}</p>
              {d.hashtags && <p className="text-sm text-primary">{d.hashtags}</p>}
              {acc.platform === "tiktok" && d.commercialDisclosure && (
                <p className="mt-1 text-xs text-muted-foreground">🔖 Konten komersial · {d.privacyLevel}</p>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
