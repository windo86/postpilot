/**
 * Abstraksi provider AI (BYOK). Model ID dari env/config — tidak hardcode di UI.
 * Pure — tanpa import `next/*`.
 */

export type FetchImpl = typeof fetch;

export interface TextOptions {
  maxTokens?: number;
  temperature?: number;
}

export interface ImageOptions {
  /** Ukuran kanonis: "square" | "portrait" | "landscape". Provider yang petakan. */
  size?: "square" | "portrait" | "landscape";
}

export interface GeneratedImage {
  bytes: Uint8Array;
  mimeType: string;
}

export interface VideoOperation {
  operationId: string;
  provider: string;
}

export interface AIProvider {
  readonly name: string;
  generateText(apiKey: string, prompt: string, opts?: TextOptions): Promise<string>;
  generateImage(apiKey: string, prompt: string, opts?: ImageOptions): Promise<GeneratedImage>;
  /** Video async bila didukung; throw bila tidak. */
  startVideo(apiKey: string, prompt: string): Promise<VideoOperation>;
  checkVideo(apiKey: string, operationId: string): Promise<
    | { done: false }
    | { done: true; bytes: Uint8Array; mimeType: string }
  >;
}

export function getProvider(name: string, providers: AIProvider[]): AIProvider {
  const found = providers.find((p) => p.name === name);
  if (!found) throw new Error(`Provider AI tidak dikenal: ${name}`);
  return found;
}

/** Validasi prompt: 1–2000 karakter. */
export function validatePrompt(prompt: string): string | null {
  const len = prompt.trim().length;
  if (len === 0) return "Prompt tidak boleh kosong.";
  if (len > 2000) return `Prompt ${len} karakter melebihi 2000. Persingkat dulu.`;
  return null;
}
