import {
  type AIProvider,
  type FetchImpl,
  type GeneratedImage,
  type TextOptions,
  type VideoOperation,
} from "./provider";
import { AIError } from "./openai";

/**
 * Google AI Studio (BYOK): Gemini text + image, Veo video (async).
 * Model dari env. Pure — `fetchImpl` injectable untuk test.
 */

const BASE = "https://generativelanguage.googleapis.com/v1beta";

function model(envKey: string, fallback: string): string {
  return process.env[envKey] || fallback;
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } };
    return String(body.error?.message ?? JSON.stringify(body)).slice(0, 300);
  } catch {
    return `HTTP ${res.status}`;
  }
}

interface ContentPart {
  text?: string;
  inlineData?: { mimeType?: string; data?: string };
}

export function createGoogleProvider(fetchImpl: FetchImpl = fetch): AIProvider {
  async function generate(
    apiKey: string,
    modelId: string,
    body: unknown
  ): Promise<{ parts: ContentPart[] }> {
    const res = await fetchImpl(
      `${BASE}/models/${modelId}:generateContent?key=${encodeURIComponent(apiKey)}`,
      { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
    );
    if (!res.ok) throw new AIError(`Google gagal: ${await readError(res)}`);
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: ContentPart[] } }[];
    };
    return { parts: json.candidates?.[0]?.content?.parts ?? [] };
  }

  return {
    name: "google",

    async generateText(apiKey, prompt, opts?: TextOptions): Promise<string> {
      const { parts } = await generate(apiKey, model("GOOGLE_MODEL_TEXT", "gemini-2.5-flash"), {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          maxOutputTokens: opts?.maxTokens ?? 500,
          temperature: opts?.temperature ?? 0.8,
        },
      });
      const text = parts.map((p) => p.text ?? "").join("").trim();
      if (!text) throw new AIError("Google mengembalikan teks kosong.");
      return text;
    },

    async generateImage(apiKey, prompt): Promise<GeneratedImage> {
      const { parts } = await generate(apiKey, model("GOOGLE_MODEL_IMAGE", "gemini-2.5-flash-image"), {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
      });
      const img = parts.find((p) => p.inlineData?.data);
      if (!img?.inlineData?.data) throw new AIError("Google tidak mengembalikan gambar.");
      return {
        bytes: Buffer.from(img.inlineData.data, "base64"),
        mimeType: img.inlineData.mimeType ?? "image/png",
      };
    },

    async startVideo(apiKey, prompt): Promise<VideoOperation> {
      const modelId = model("GOOGLE_MODEL_VIDEO", "veo-2.0-generate-001");
      const res = await fetchImpl(
        `${BASE}/models/${modelId}:predictLongRunning?key=${encodeURIComponent(apiKey)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instances: [{ prompt }] }),
        }
      );
      if (!res.ok) throw new AIError(`Google video gagal dimulai: ${await readError(res)}`);
      const body = (await res.json()) as { name?: string };
      if (!body.name) throw new AIError("Google tidak mengembalikan operation ID.");
      return { operationId: body.name, provider: "google" };
    },

    async checkVideo(apiKey, operationId) {
      const res = await fetchImpl(
        `${BASE}/${operationId}?key=${encodeURIComponent(apiKey)}`
      );
      if (!res.ok) throw new AIError(`Cek status video gagal: ${await readError(res)}`);
      const body = (await res.json()) as {
        done?: boolean;
        response?: { generateVideoResponse?: { generatedSamples?: { video?: { uri?: string } }[] } };
      };
      if (!body.done) return { done: false as const };
      const uri = body.response?.generateVideoResponse?.generatedSamples?.[0]?.video?.uri;
      if (!uri) throw new AIError("Video selesai tanpa URI hasil.");
      const dl = await fetchImpl(`${uri}&key=${encodeURIComponent(apiKey)}`);
      if (!dl.ok) throw new AIError("Unduh hasil video gagal.");
      return {
        done: true as const,
        bytes: new Uint8Array(await dl.arrayBuffer()),
        mimeType: dl.headers.get("content-type") ?? "video/mp4",
      };
    },
  };
}
