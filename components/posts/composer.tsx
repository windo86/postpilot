"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Film, Image as ImageIcon, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlatformBadge } from "@/components/content/badges";
import { InstagramPreview, IPhoneHomeScreen, TikTokPreview } from "@/components/posts/phone-preview";
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
  avatar_url: string | null;
  platform_account_id: string;
  status: string;
}

interface TargetDraft {
  caption: string;
  hashtags: string;
  commercialDisclosure: boolean;
  privacyLevel: string;
}

interface CreatorInfo {
  nickname: string | null;
  privacyOptions: string[];
  maxVideoDurationSeconds: number;
}

const TIKTOK_PRIVACY_FALLBACK = [
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
  const [creatorInfo, setCreatorInfo] = useState<Record<string, CreatorInfo>>({});
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
      // Privacy options asli dari TikTok API (bukan tebakan statis).
      const acc = accounts.find((a) => a.id === id);
      if (acc?.platform === "tiktok") {
        fetch(`/api/tiktok/creator-info?accountId=${id}`)
          .then((r) => (r.ok ? r.json() : null))
          .then((j) => {
            if (!j || !Array.isArray(j.privacyOptions) || j.privacyOptions.length === 0) return;
            setCreatorInfo((c) => ({ ...c, [id]: j }));
            setDrafts((d) =>
              d[id] ? { ...d, [id]: { ...d[id], privacyLevel: j.privacyOptions[0] } } : d
            );
          })
          .catch(() => undefined);
      }
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
    <div className="grid gap-8 lg:grid-cols-2">
      <div className="space-y-7">
        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">1 · Media</h2>
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
                  aria-pressed={active}
                  className={`flex items-center gap-1.5 truncate rounded-xl border p-2 text-left text-xs transition-colors ${
                    active
                      ? "border-accent/50 bg-[rgb(59_130_246/0.10)]"
                      : "border-[rgb(255_255_255/0.07)] hover:bg-[rgb(255_255_255/0.04)]"
                  }`}
                  title={m.original_name ?? ""}
                >
                  {m.media_type === "video" ? <Film size={13} /> : <ImageIcon size={13} />}
                  {m.original_name}
                </button>
              );
            })}
          </div>
          {media.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Media kosong — upload baru atau tambah via <Link href="/media" className="underline">Media Library</Link>.
            </p>
          )}
        </section>

        <section className="space-y-2">
          <h2 className="text-sm font-medium text-muted-foreground">2 · Akun target</h2>
          {accounts.length === 0 && (
            <p className="text-sm text-muted-foreground">
              Belum ada akun aktif. <Link href="/accounts" className="underline">Connect dulu</Link>.
            </p>
          )}
          {accounts.map((a) => {
            const checked = selectedAccounts.includes(a.id);
            return (
              <label
                key={a.id}
                className={`flex cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm transition-colors ${
                  checked
                    ? "border-accent/50 bg-[rgb(59_130_246/0.08)]"
                    : "border-[rgb(255_255_255/0.07)] hover:bg-[rgb(255_255_255/0.03)]"
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleAccount(a.id)}
                  className="size-4 accent-[#2f6de4]"
                />
                <PlatformBadge platform={a.platform} />
                <span className="truncate">{a.username ?? a.platform_account_id}</span>
              </label>
            );
          })}
        </section>

        <section className="space-y-3">
          <h2 className="text-sm font-medium text-muted-foreground">3 · Caption per platform</h2>
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
              <div key={accId} className="space-y-2.5 rounded-2xl border border-[rgb(255_255_255/0.07)] p-4" style={{ background: "var(--surface)" }}>
                <p className="flex items-center gap-2 text-sm font-medium">
                  <PlatformBadge platform={acc.platform} />
                  {acc.username ?? acc.platform_account_id}
                </p>
                <textarea
                  rows={3}
                  maxLength={2200}
                  placeholder={`Caption ${acc.platform}...`}
                  value={d.caption}
                  onChange={(e) => patchDraft(accId, { caption: e.target.value })}
                  className="w-full rounded-xl border border-[rgb(255_255_255/0.08)] bg-[rgb(255_255_255/0.03)] px-3 py-2 text-sm outline-none placeholder:text-muted-foreground focus:border-accent/60"
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
                      Privacy{creatorInfo[accId] ? ` (${creatorInfo[accId].nickname ?? "akun TikTok"})` : ""}
                      <select
                        value={d.privacyLevel}
                        onChange={(e) => patchDraft(accId, { privacyLevel: e.target.value })}
                        className="ml-2 rounded-lg border border-input bg-background px-2 py-1 text-sm"
                      >
                        {(creatorInfo[accId]?.privacyOptions ?? TIKTOK_PRIVACY_FALLBACK).map((p) => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                    </label>
                    <p className="text-xs text-muted-foreground">
                      {creatorInfo[accId]
                        ? `Opsi asli dari TikTok · maks ${creatorInfo[accId].maxVideoDurationSeconds} dtk.`
                        : "Memuat opsi dari TikTok... (fallback bila gagal, divalidasi ulang saat publish)."}
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

      <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
        <h2 className="text-sm font-medium text-muted-foreground">Preview</h2>
        {selectedAccounts.length === 0 && (
          <div className="space-y-2">
            <IPhoneHomeScreen />
            <p className="text-center text-sm text-muted-foreground">
              Pilih akun target — preview aplikasi tampil di sini.
            </p>
          </div>
        )}
        {selectedAccounts.map((accId) => {
          const acc = accounts.find((a) => a.id === accId);
          const d = drafts[accId];
          if (!acc || !d) return null;
          const firstId = selectedMedia[0];
          const firstMeta = firstId ? media.find((m) => m.id === firstId) : undefined;
          const previewMedia =
            firstId && previews[firstId] && firstMeta
              ? {
                  url: previews[firstId],
                  mediaType: firstMeta.media_type,
                  alt: firstMeta.original_name ?? "Preview",
                }
              : null;
          const name = acc.username ?? acc.display_name ?? acc.platform_account_id;
          const tags = d.hashtags
            .split(",")
            .map((h) => h.trim().replace(/^#+/, ""))
            .filter(Boolean)
            .map((h) => `#${h}`)
            .join(" ");
          return (
            <div key={accId} className="space-y-2">
              <p className="flex items-center gap-2">
                <PlatformBadge platform={acc.platform} />
                {acc.platform === "tiktok" && d.commercialDisclosure && (
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Tag size={12} /> Komersial · {d.privacyLevel}
                  </span>
                )}
              </p>
              {acc.platform === "instagram" ? (
                <InstagramPreview
                  media={previewMedia}
                  username={name}
                  avatarUrl={acc.avatar_url}
                  caption={d.caption}
                  hashtags={tags}
                />
              ) : (
                <TikTokPreview
                  media={previewMedia}
                  username={name}
                  avatarUrl={acc.avatar_url}
                  caption={d.caption}
                  hashtags={tags}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
