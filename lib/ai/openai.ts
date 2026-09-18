import {
  type AIProvider,
  type FetchImpl,
  type GeneratedImage,
  type ImageOptions,
  type TextOptions,
  type VideoOperation,
} from "./provider";

/**
 * OpenAI (BYOK): chat completions + gpt-image. Model dari env.
 * Video tidak didukung OpenAI → startVideo throw jelas.
 * Pure — `fetchImpl` injectable untuk test.
 */

function model(envKey: string, fallback: string): string {
  return process.env[envKey] || fallback;
}

export class AIError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AIError";
  }
}

async function readError(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as { error?: { message?: string } | string };
    const msg =
      typeof body.error === "string" ? body.error : (body.error?.message ?? JSON.stringify(body));
    return String(msg).slice(0, 300);
  } catch {
    return `HTTP ${res.status}`;
  }
}

export function createOpenAIProvider(fetchImpl: FetchImpl = fetch): AIProvider {
  async function call(apiKey: string, path: string, body: unknown): Promise<Response> {
    const res = await fetchImpl(`https://api.openai.com${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new AIError(`OpenAI gagal: ${await readError(res)}`);
    return res;
  }

  return {
    name: "openai",

    async generateText(apiKey, prompt, opts?: TextOptions): Promise<string> {
      const res = await call(apiKey, "/v1/chat/completions", {
        model: model("OPENAI_MODEL_TEXT", "gpt-4o-mini"),
        messages: [{ role: "user", content: prompt }],
        max_tokens: opts?.maxTokens ?? 500,
        temperature: opts?.temperature ?? 0.8,
      });
      const body = (await res.json()) as {
        choices?: { message?: { content?: string } }[];
      };
      const text = body.choices?.[0]?.message?.content?.trim();
      if (!text) throw new AIError("OpenAI mengembalikan teks kosong.");
      return text;
    },

    async generateImage(apiKey, prompt, opts?: ImageOptions): Promise<GeneratedImage> {
      const size =
        opts?.size === "portrait" ? "1024x1792" : opts?.size === "landscape" ? "1792x1024" : "1024x1024";
      const res = await call(apiKey, "/v1/images/generations", {
        model: model("OPENAI_MODEL_IMAGE", "gpt-image-1"),
        prompt,
        size,
      });
      const body = (await res.json()) as {
        data?: { b64_json?: string; url?: string }[];
      };
      const first = body.data?.[0];
      if (first?.b64_json) {
        return { bytes: Buffer.from(first.b64_json, "base64"), mimeType: "image/png" };
      }
      if (first?.url) {
        const img = await fetchImpl(first.url);
        if (!img.ok) throw new AIError("Unduh gambar OpenAI gagal.");
        return {
          bytes: new Uint8Array(await img.arrayBuffer()),
          mimeType: img.headers.get("content-type") ?? "image/png",
        };
      }
      throw new AIError("OpenAI tidak mengembalikan gambar.");
    },

    async startVideo(): Promise<VideoOperation> {
      throw new AIError("OpenAI tidak mendukung text-to-video. Pakai provider Google.");
    },

    async checkVideo(): Promise<{ done: false }> {
      throw new AIError("OpenAI tidak mendukung text-to-video. Pakai provider Google.");
    },
  };
}
