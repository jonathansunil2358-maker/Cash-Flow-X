import type { Context, Next } from 'hono';
import { base64url, cleanName, fromBase64url, HttpError, newId, nowIso, sha256Hex, type Env } from './util';

export interface UserRow {
  id: string;
  name: string;
  icon: string;
  legacy_points: number;
  legacy_earned: number;
  prestige_count: number;
  perks_json: string;
  personal_cash: number;
  client_json: string;
  guild_id: string | null;
  guild_role: string | null;
  visibility: string;
  title: string | null;
}

export type AppEnv = { Bindings: Env; Variables: { user: UserRow } };

const SESSION_DAYS = 60;
const GOOGLE_ISSUERS = new Set(['accounts.google.com', 'https://accounts.google.com']);
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';

interface GoogleClaims {
  iss: string;
  aud: string;
  sub: string;
  exp: number;
  name?: string;
  given_name?: string;
}

async function googleKeys(): Promise<{ keys: (JsonWebKey & { kid: string })[] }> {
  const cache = caches.default;
  const hit = await cache.match(JWKS_URL);
  if (hit) return hit.json();
  const res = await fetch(JWKS_URL);
  if (!res.ok) throw new HttpError(401, 'Could not reach Google to verify sign-in.');
  const body = await res.clone().json();
  const maxAge = /max-age=(\d+)/.exec(res.headers.get('cache-control') ?? '')?.[1] ?? '3600';
  await cache.put(JWKS_URL, new Response(JSON.stringify(body), { headers: { 'cache-control': `max-age=${maxAge}` } }));
  return body as { keys: (JsonWebKey & { kid: string })[] };
}

/** Verify a Google Identity Services ID token (RS256 JWT) and return its claims. */
export async function verifyGoogleIdToken(token: string, clientId: string): Promise<GoogleClaims> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new HttpError(401, 'Invalid Google credential.');
  const header = JSON.parse(new TextDecoder().decode(fromBase64url(parts[0]))) as { alg: string; kid: string };
  if (header.alg !== 'RS256') throw new HttpError(401, 'Invalid Google credential.');
  const jwk = (await googleKeys()).keys.find((k) => k.kid === header.kid);
  if (!jwk) throw new HttpError(401, 'Google signing key not found. Try again.');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, fromBase64url(parts[2]), new TextEncoder().encode(`${parts[0]}.${parts[1]}`));
  if (!ok) throw new HttpError(401, 'Invalid Google credential.');
  const claims = JSON.parse(new TextDecoder().decode(fromBase64url(parts[1]))) as GoogleClaims;
  if (!GOOGLE_ISSUERS.has(claims.iss)) throw new HttpError(401, 'Credential was not issued by Google.');
  if (claims.aud !== clientId) throw new HttpError(401, 'Credential was issued for a different app.');
  if (claims.exp * 1000 < Date.now()) throw new HttpError(401, 'Google sign-in expired. Try again.');
  return claims;
}

/** Find or create the user for an identity, then open a session. Returns the bearer token. */
export async function signIn(env: Env, identity: { googleSub?: string; devName?: string; name: string }): Promise<{ token: string; userId: string; isNew: boolean }> {
  const col = identity.googleSub ? 'google_sub' : 'dev_name';
  const key = identity.googleSub ?? identity.devName!;
  let user = await env.DB.prepare(`SELECT id FROM users WHERE ${col} = ?`).bind(key).first<{ id: string }>();
  let isNew = false;
  if (!user) {
    const id = newId();
    const now = nowIso();
    await env.DB.prepare(`INSERT INTO users (id, ${col}, name, created_at, updated_at) VALUES (?, ?, ?, ?, ?)`)
      .bind(id, key, cleanName(identity.name) || 'Founder', now, now).run();
    user = { id };
    isNew = true;
  }
  const raw = new Uint8Array(32);
  crypto.getRandomValues(raw);
  const token = base64url(raw);
  const expires = new Date(Date.now() + SESSION_DAYS * 86_400_000).toISOString();
  await env.DB.prepare('INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (?, ?, ?)').bind(await sha256Hex(token), user.id, expires).run();
  return { token, userId: user.id, isNew };
}

export async function signOut(env: Env, token: string): Promise<void> {
  await env.DB.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(await sha256Hex(token)).run();
}

const bearer = (c: Context) => /^Bearer (\S+)$/.exec(c.req.header('authorization') ?? '')?.[1] ?? null;

/** Middleware: require a valid session and load the user. */
export async function requireUser(c: Context<AppEnv>, next: Next) {
  const token = bearer(c);
  if (!token) throw new HttpError(401, 'Sign in to continue.');
  const row = await c.env.DB.prepare(
    `SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ? AND s.expires_at > ?`,
  ).bind(await sha256Hex(token), nowIso()).first<UserRow>();
  if (!row) throw new HttpError(401, 'Your session has expired. Sign in again.');
  c.set('user', row);
  await next();
}

export const tokenOf = bearer;
