"use client";

import {
  BatteryFull,
  Bell,
  Bookmark,
  Clapperboard,
  Heart,
  Home,
  MapPin,
  MessageCircle,
  MessageCircleHeart,
  Music2,
  Plus,
  Search,
  Send,
  Signal,
  SquarePlus,
  Wifi,
} from "lucide-react";

/**
 * Mockup preview ala aplikasi asli dalam bingkai iPhone 17 Pro Max
 * (rasio layar tetap 19.5:9, Dynamic Island, dark mode).
 * Instagram mengikuti referensi home screen: header app, stories,
 * post, aksi + jumlah, caption, tab bar.
 * Data milik user asli (media, username, avatar, caption) — angka 0
 * jujur karena belum tayang; lingkaran story lain ilustratif.
 */

export interface PreviewMedia {
  url: string;
  mediaType: "image" | "video" | string;
  alt: string;
}

/** Layar tetap setinggi iPhone (19.5:9), konten seperti feed asli. */
function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[290px] rounded-[3.2rem] border border-[rgb(255_255_255/0.14)] bg-[#1a1a1c] p-[9px] shadow-[0_24px_60px_-20px_rgb(0_0_0/0.85)]">
      <div className="relative aspect-[9/19.5] overflow-hidden rounded-[2.6rem] bg-black">
        {/* Status bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center justify-between px-7 pt-3.5 text-white">
          <span className="text-[11px] font-semibold">9:41</span>
          <span className="flex items-center gap-1">
            <Signal size={11} />
            <Wifi size={11} />
            <BatteryFull size={14} />
          </span>
        </div>
        {/* Dynamic Island */}
        <div className="pointer-events-none absolute left-1/2 top-2.5 z-30 h-[22px] w-[86px] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/10" />
        {children}
        {/* Home indicator */}
        <div className="pointer-events-none absolute inset-x-0 bottom-1.5 z-30 flex justify-center">
          <span className="h-1 w-28 rounded-full bg-white/80" />
        </div>
      </div>
    </div>
  );
}

function Avatar({ url, name, size = "size-8" }: { url: string | null; name: string; size?: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className={`${size} shrink-0 rounded-full object-cover ring-1 ring-white/20`} />;
  }
  return (
    <span className={`grid ${size} shrink-0 place-items-center rounded-full bg-[rgb(255_255_255/0.14)] text-xs font-semibold text-white`}>
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

/** Ring gradien ala story Instagram (oranye–pink–ungu). */
function StoryRing({ children }: { children: React.ReactNode }) {
  return (
    <span
      className="grid shrink-0 place-items-center rounded-full p-[2.5px]"
      style={{ background: "conic-gradient(from 210deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5,#feda75)" }}
    >
      <span className="grid place-items-center rounded-full bg-black p-[2.5px]">{children}</span>
    </span>
  );
}

/** Baris stories: akun user + lingkaran ilustratif ala feed asli. */
function StoriesRow({ username, avatarUrl }: { username: string; avatarUrl: string | null }) {
  const others = ["S", "K", "J", "K", "V"];
  const labels = ["santai_id", "kuliner_id", "jalan_id", "kreator_id", "vlog_id"];
  return (
    <div className="border-b border-white/10 px-1 pb-2.5 pt-1">
      <div className="flex gap-3 overflow-hidden px-2">
        <span className="flex w-14 shrink-0 flex-col items-center gap-1">
          <span className="relative">
            <Avatar url={avatarUrl} name={username} size="size-14" />
            <span className="absolute -bottom-0.5 -right-0.5 grid size-5 place-items-center rounded-full bg-[#0095f6] ring-2 ring-black">
              <Plus size={13} strokeWidth={3} className="text-white" />
            </span>
          </span>
          <span className="w-full truncate text-center text-[10px] text-white/80">Cerita Anda</span>
        </span>
        {others.map((o, i) => (
          <span key={i} className="flex w-14 shrink-0 flex-col items-center gap-1" aria-hidden>
            <StoryRing>
              <span className="grid size-[46px] place-items-center rounded-full bg-[#26262a] text-sm font-semibold text-white/70">
                {o}
              </span>
            </StoryRing>
            <span className="w-full truncate text-center text-[10px] text-white/80">{labels[i]}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Tiruan home Instagram dark mode sesuai referensi. */
export function InstagramPreview({
  media,
  username,
  avatarUrl,
  caption,
  hashtags,
}: {
  media: PreviewMedia | null;
  username: string;
  avatarUrl: string | null;
  caption: string;
  hashtags: string;
}) {
  return (
    <PhoneFrame>
      <div className="flex h-full flex-col bg-black text-white">
        {/* Header aplikasi */}
        <div className="flex items-center px-4 pb-1 pt-12">
          <span className="font-serif text-[22px] italic tracking-tight" style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}>
            Instagram
          </span>
          <span className="ml-auto flex items-center gap-5">
            <span className="relative">
              <Bell size={24} strokeWidth={1.8} />
              <span className="absolute -right-1.5 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#ff3040] px-1 text-[9px] font-bold">
                4
              </span>
            </span>
            <span className="relative">
              <MessageCircleHeart size={24} strokeWidth={1.8} />
              <span className="absolute -right-1.5 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#ff3040] px-1 text-[9px] font-bold">
                2
              </span>
            </span>
          </span>
        </div>

        <StoriesRow username={username} avatarUrl={avatarUrl} />

        {/* Postingan user */}
        <div>
          <div className="flex items-center gap-2.5 px-3 py-2">
            <StoryRing>
              <Avatar url={avatarUrl} name={username} size="size-7" />
            </StoryRing>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-semibold">{username}</span>
              <span className="flex items-center gap-0.5 text-[11px] text-white/70">
                <MapPin size={10} /> Jakarta, Indonesia
              </span>
            </span>
            <span className="pr-1 text-base font-bold tracking-widest text-white/80">···</span>
          </div>
          {media ? (
            media.mediaType === "video" ? (
              <video src={media.url} className="aspect-[4/5] w-full object-cover" preload="metadata" muted playsInline />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={media.url} alt={media.alt} className="aspect-[4/5] w-full object-cover" />
            )
          ) : (
            <div className="flex aspect-[4/5] w-full items-center justify-center bg-[#0d0d0f] text-xs text-white/40">
              Belum ada media
            </div>
          )}
          <div className="flex items-center gap-4 px-3 pt-2.5">
            <span className="flex items-center gap-1.5">
              <Heart size={25} strokeWidth={1.8} className="text-[#ff3040]" fill="currentColor" />
              <span className="text-[13px] font-semibold">0</span>
            </span>
            <span className="flex items-center gap-1.5">
              <MessageCircle size={24} strokeWidth={1.8} className="-scale-x-100" />
              <span className="text-[13px] font-semibold">0</span>
            </span>
            <Send size={24} strokeWidth={1.8} />
            <span className="ml-auto">
              <Bookmark size={24} strokeWidth={1.8} />
            </span>
          </div>
          <p className="px-3 pt-2 text-[13px] font-semibold">0 likes</p>
          <p className="line-clamp-3 px-3 pt-1 text-[13px] leading-snug">
            <span className="font-semibold">{username}</span>{" "}
            <span className="text-white/90">
              {caption || <span className="text-white/40">(tanpa caption)</span>}
            </span>{" "}
            {hashtags && <span className="text-[#e0e6f5]">{hashtags}</span>}
          </p>
          <p className="px-3 pt-1 text-[13px] text-white/50">Lihat semua 0 komentar</p>
          <p className="px-3 pt-1 text-[11px] uppercase text-white/40">Baru saja</p>
        </div>

        <div className="flex-1" />

        {/* Tab bar bawah */}
        <div className="flex items-center justify-around border-t border-white/10 bg-black px-2 pb-6 pt-2.5">
          <Home size={25} fill="currentColor" strokeWidth={1.8} />
          <Search size={25} strokeWidth={1.8} />
          <SquarePlus size={25} strokeWidth={1.8} />
          <Clapperboard size={25} strokeWidth={1.8} />
          <span className="relative">
            <Avatar url={avatarUrl} name={username} size="size-6" />
            <span className="absolute -right-1 -top-1 grid min-h-4 min-w-4 place-items-center rounded-full bg-[#ff3040] px-1 text-[9px] font-bold">
              9+
            </span>
          </span>
        </div>
      </div>
    </PhoneFrame>
  );
}

/** Tiruan video TikTok dark mode: full-bleed + scrim + rel + caption. */
export function TikTokPreview({
  media,
  username,
  avatarUrl,
  caption,
  hashtags,
}: {
  media: PreviewMedia | null;
  username: string;
  avatarUrl: string | null;
  caption: string;
  hashtags: string;
}) {
  return (
    <PhoneFrame>
      <div className="relative h-full overflow-hidden bg-black">
        {media ? (
          media.mediaType === "video" ? (
            <video src={media.url} className="absolute inset-0 h-full w-full object-cover" preload="metadata" muted playsInline />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.url} alt={media.alt} className="absolute inset-0 h-full w-full object-cover" />
          )
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40">
            Belum ada media
          </div>
        )}
        {/* Scrim atas & bawah agar teks terbaca */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-20 bg-gradient-to-b from-black/60 to-transparent" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-44 bg-gradient-to-t from-black/70 to-transparent" />
        {/* Rel kanan */}
        <div className="absolute bottom-28 right-2 z-20 flex flex-col items-center gap-4 text-white">
          <span className="relative">
            <Avatar url={avatarUrl} name={username} />
            <span className="absolute -bottom-1.5 left-1/2 grid size-4 -translate-x-1/2 place-items-center rounded-full bg-[#fe2c55]">
              <Plus size={11} strokeWidth={3} />
            </span>
          </span>
          <span className="flex flex-col items-center gap-0.5">
            <Heart size={27} strokeWidth={1.8} fill="currentColor" />
            <span className="text-[11px] font-semibold">0</span>
          </span>
          <span className="flex flex-col items-center gap-0.5">
            <MessageCircle size={27} strokeWidth={1.8} fill="currentColor" />
            <span className="text-[11px] font-semibold">0</span>
          </span>
          <span className="flex flex-col items-center gap-0.5">
            <Bookmark size={27} strokeWidth={1.8} fill="currentColor" />
            <span className="text-[11px] font-semibold">0</span>
          </span>
          <Send size={25} strokeWidth={1.8} fill="currentColor" />
        </div>
        {/* Caption bawah */}
        <div className="absolute inset-x-0 bottom-7 z-20 space-y-1.5 px-3 pr-16 text-white">
          <p className="text-[15px] font-bold">@{username}</p>
          <p className="line-clamp-2 text-[13px] leading-snug">
            {caption || <span className="text-white/60">(tanpa caption)</span>}{" "}
            {hashtags && <span className="font-semibold">{hashtags}</span>}
          </p>
          <p className="flex items-center gap-1.5 text-[12px]">
            <Music2 size={12} />
            <span className="truncate">original sound - {username}</span>
          </p>
        </div>
      </div>
    </PhoneFrame>
  );
}
