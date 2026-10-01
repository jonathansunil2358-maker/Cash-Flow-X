export interface Env {
  DB: D1Database;
  ALLOWED_ORIGINS: string;
  /** OAuth client ID from Google Cloud (Web application). Required for Google sign-in. */
  GOOGLE_CLIENT_ID?: string;
  /** "true" only in local development: enables POST /auth/dev (sign in by name, no Google). */
  DEV_AUTH?: string;
  SUBMIT_LIMITER?: { limit: (opts: { key: string }) => Promise<{ success: boolean }> };
}

export class HttpError extends Error {
  constructor(readonly status: 400 | 401 | 403 | 404 | 409 | 422 | 429, message: string) {
    super(message);
  }
}

export const nowIso = () => new Date().toISOString();
export const newId = () => crypto.randomUUID();

/** Season = calendar month (UTC), e.g. "2026-10". */
export const seasonOf = (d = new Date()) => d.toISOString().slice(0, 7);
export function previousSeason(d = new Date()): string {
  const p = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() - 1, 1));
  return seasonOf(p);
}

/** ISO week, e.g. "2026-W40". */
export function weekOf(d = new Date()): string {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export function base64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function fromBase64url(s: string): Uint8Array {
  const b = atob(s.replace(/-/g, '+').replace(/_/g, '/') + '==='.slice((s.length + 3) % 4));
  return Uint8Array.from(b, (c) => c.charCodeAt(0));
}

export async function sha256Hex(text: string): Promise<string> {
  const d = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

async function pipe(data: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([data]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

export const gzipJson = (value: unknown) => pipe(new TextEncoder().encode(JSON.stringify(value)), new CompressionStream('gzip'));
export async function gunzipJson<T>(blob: ArrayBuffer | Uint8Array | number[]): Promise<T> {
  const bytes = blob instanceof Uint8Array ? blob : new Uint8Array(blob as ArrayBuffer | number[]);
  return JSON.parse(new TextDecoder().decode(await pipe(bytes, new DecompressionStream('gzip')))) as T;
}

export const cleanName = (v: unknown, max = 24): string =>
  typeof v === 'string' ? v.replace(/[^\p{L}\p{N} &._'-]/gu, '').replace(/\s+/g, ' ').trim().slice(0, max) : '';

export const ICON_IDS = new Set([
  'rocket', 'laptop', 'bolt', 'chart', 'globe', 'gear', 'crown', 'diamond', 'star', 'shield', 'flame', 'key',
  'tshirt', 'burger', 'coffee', 'dumbbell', 'parcel', 'car', 'leaf', 'mountain', 'paw', 'music', 'camera', 'heart',
]);
export const cleanIcon = (v: unknown): string => (typeof v === 'string' && ICON_IDS.has(v) ? v : 'rocket');
