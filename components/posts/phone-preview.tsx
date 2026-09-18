"use client";

import {
  BatteryFull,
  Bookmark,
  Heart,
  MessageCircle,
  Music2,
  Plus,
  Send,
  Signal,
  Wifi,
} from "lucide-react";

/**
 * Mockup preview ala aplikasi asli dalam bingkai iPhone 17 Pro Max
 * (Dynamic Island, bezel titanium, dark mode). Data asli: media,
 * username, avatar, caption user — tanpa angka palsu.
 */

export interface PreviewMedia {
  url: string;
  mediaType: "image" | "video" | string;
  alt: string;
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-[300px] rounded-[3rem] border border-[rgb(255_255_255/0.14)] bg-black p-2 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8)]">
      <div className="relative overflow-hidden rounded-[2.5rem] bg-black">
        {/* Status bar */}
        <div className="pointer-events-none absolute inset-x-0 top-0 z-20 flex items-center justify-between px-7 pt-3.5 text-white">
          <span className="text-[11px] font-semibold">9:41</span>
          <span className="flex items-center gap-1">
            <Signal size={11} />
            <Wifi size={11} />
            <BatteryFull size={14} />
          </span>
        </div>
        {/* Dynamic Island */}
        <div className="pointer-events-none absolute left-1/2 top-2.5 z-20 h-[22px] w-[92px] -translate-x-1/2 rounded-full bg-black ring-1 ring-white/10" />
        {children}
        {/* Home indicator */}
        <div className="pointer-events-none absolute inset-x-0 bottom-1.5 z-20 flex justify-center">
          <span className="h-1 w-28 rounded-full bg-white/80" />
        </div>
      </div>
    </div>
  );
}

function Avatar({ url, name }: { url: string | null; name: string }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={name} className="size-8 shrink-0 rounded-full object-cover ring-1 ring-white/20" />;
  }
  return (
    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[rgb(255_255_255/0.14)] text-xs font-semibold text-white">
      {(name.trim()[0] ?? "?").toUpperCase()}
    </span>
  );
}

function MediaView({ media }: { media: PreviewMedia | null }) {
  if (!media) {
    return <div className="flex aspect-square w-full items-center justify-center bg-[#0d0d0f] text-xs text-white/40">Belum ada media</div>;
  }
  if (media.mediaType === "video") {
    return <video src={media.url} className="aspect-[4/5] w-full object-cover" preload="metadata" muted playsInline />;
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={media.url} alt={media.alt} className="aspect-square w-full object-cover" />;
}

/** Tiruan tampilan post Instagram dark mode. */
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
      <div className="bg-black pb-6 pt-12 text-white">
        <div className="flex items-center gap-2.5 px-3 py-2">
          <Avatar url={avatarUrl} name={username} />
          <span className="min-w-0 flex-1 truncate text-[13px] font-semibold">{username}</span>
          <span className="text-base font-bold tracking-widest text-white/80">···</span>
        </div>
        <MediaView media={media} />
        <div className="flex items-center gap-4 px-3 pt-2.5">
          <Heart size={24} strokeWidth={1.8} />
          <MessageCircle size={24} strokeWidth={1.8} className="-scale-x-100" />
          <Send size={24} strokeWidth={1.8} />
          <span className="ml-auto">
            <Bookmark size={24} strokeWidth={1.8} />
          </span>
        </div>
        <p className="px-3 pt-2 text-[13px] font-semibold">0 likes</p>
        <p className="px-3 pt-1 text-[13px] leading-snug">
          <span className="font-semibold">{username}</span>{" "}
          <span className="text-white/90">
            {caption || <span className="text-white/40">(tanpa caption)</span>}
          </span>{" "}
          {hashtags && <span className="text-[#e0e6f5]">{hashtags}</span>}
        </p>
        <p className="px-3 pt-1.5 text-[11px] uppercase text-white/40">Baru saja</p>
      </div>
    </PhoneFrame>
  );
}

/** Tiruan tampilan video TikTok dark mode (full-bleed + rel kanan). */
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
      <div className="relative bg-black pb-6 pt-10">
        {media && media.mediaType === "video" ? (
          <video src={media.url} className="aspect-[9/16] w-full object-cover" preload="metadata" muted playsInline />
        ) : media ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={media.url} alt={media.alt} className="aspect-[9/16] w-full object-cover" />
        ) : (
          <div className="flex aspect-[9/16] w-full items-center justify-center text-xs text-white/40">
            Belum ada media
          </div>
        )}
        {/* Rel kanan */}
        <div className="absolute bottom-24 right-2 z-10 flex flex-col items-center gap-4 text-white">
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
        <div className="absolute inset-x-0 bottom-6 z-10 space-y-1.5 px-3 pr-16 text-white">
          <p className="text-[15px] font-bold">@{username}</p>
          <p className="text-[13px] leading-snug">
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
