"use client";

import * as tus from "tus-js-client";
import { createClient } from "@/lib/supabase/client";

/**
 * Upload satu file: authorize → direct (signed/TUS) → complete.
 * Dipakai Media Library & Composer. Progress via callback (0-100).
 */

export interface UploadedAsset {
  assetId: string;
  mode: "signed" | "tus";
}

interface AuthorizeResponse {
  assetId: string;
  mode: "signed" | "tus";
  bucket: string;
  path: string;
  token?: string;
}

export function probeImage(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
      URL.revokeObjectURL(url);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Gambar tidak terbaca"));
    };
    img.src = url;
  });
}

export function probeVideo(file: File): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.preload = "metadata";
    video.onloadedmetadata = () => {
      resolve({ width: video.videoWidth, height: video.videoHeight, duration: video.duration });
      URL.revokeObjectURL(url);
    };
    video.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Video tidak terbaca"));
    };
    video.src = url;
  });
}

export async function uploadFile(
  file: File,
  onProgress?: (percent: number) => void
): Promise<UploadedAsset> {
  const authRes = await fetch("/api/media/authorize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ filename: file.name, mime: file.type, size: file.size }),
  });
  const auth: AuthorizeResponse & { error?: string } = await authRes.json();
  if (!authRes.ok) throw new Error(auth.error ?? "Otorisasi upload gagal");

  if (auth.mode === "signed") {
    const supabase = createClient();
    onProgress?.(10);
    const { error } = await supabase.storage
      .from(auth.bucket)
      .uploadToSignedUrl(auth.path, auth.token!, file);
    if (error) throw new Error(error.message);
  } else {
    const supabase = createClient();
    const { data } = await supabase.auth.getSession();
    const accessToken = data.session?.access_token;
    if (!accessToken) throw new Error("Sesi habis, login ulang.");
    await new Promise<void>((resolve, reject) => {
      const upload = new tus.Upload(file, {
        endpoint: `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/upload/resumable`,
        retryDelays: [0, 3000, 5000, 10000],
        headers: { authorization: `Bearer ${accessToken}` },
        metadata: {
          bucketName: auth.bucket,
          objectName: auth.path,
          contentType: file.type || "application/octet-stream",
          cacheControl: "3600",
        },
        onError: (e) => reject(e),
        onProgress: (sent, total) => onProgress?.(Math.round((sent / total) * 100)),
        onSuccess: () => resolve(),
      });
      upload.findPreviousUploads().then((prev) => {
        if (prev.length > 0) upload.resumeFromPreviousUpload(prev[0]);
        upload.start();
      });
    });
  }

  onProgress?.(100);
  let dims: { width?: number; height?: number; duration?: number } = {};
  try {
    dims = file.type.startsWith("image/") ? await probeImage(file) : await probeVideo(file);
  } catch {
    dims = {};
  }
  const doneRes = await fetch("/api/media/complete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      assetId: auth.assetId,
      width: dims.width ?? null,
      height: dims.height ?? null,
      durationSeconds: dims.duration ?? null,
    }),
  });
  if (!doneRes.ok) {
    const j = await doneRes.json().catch(() => null);
    throw new Error(j?.error ?? "Complete upload gagal");
  }
  return { assetId: auth.assetId, mode: auth.mode };
}
