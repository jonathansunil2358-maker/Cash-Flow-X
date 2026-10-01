import { cardDef, cleanSuggestion } from '@cfx/engine';
import type { UserRow } from './auth';
import { NET_WORTH_SQL, type NetWorthRow } from './social';
import { HttpError, newId, nowIso, weekOf, type Env } from './util';

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
const makeCode = (n = 7): string => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
const cleanCode = (v: unknown): string => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10);
const cleanNote = (v: unknown): string => String(v ?? '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 140);

export const MAX_LINKS = 3;
export const MAX_OPEN_SUGGESTIONS = 5;

// ---------------------------------------------------------------------------------------------
// Co-op: a friend advises or watches your live company. Only you can act on it.
// ---------------------------------------------------------------------------------------------
export async function createLink(env: Env, owner: UserRow, role: unknown) {
  if (role !== 'advise' && role !== 'watch') throw new HttpError(400, 'Choose advise or watch.');
  const have = (await env.DB.prepare('SELECT COUNT(*) AS n FROM coop_links WHERE owner_id = ? AND revoked = 0').bind(owner.id).first<{ n: number }>())?.n ?? 0;
  if (have >= MAX_LINKS) throw new HttpError(429, `You can have ${MAX_LINKS} links at a time. Remove one first.`);
  const code = makeCode();
  await env.DB.prepare('INSERT INTO coop_links (code, owner_id, role, revoked, created_at) VALUES (?, ?, ?, 0, ?)').bind(code, owner.id, role, nowIso()).run();
  return { code, role };
}

export async function joinLink(env: Env, user: UserRow, codeIn: unknown) {
  const code = cleanCode(codeIn);
  const link = await env.DB.prepare('SELECT code, owner_id, role FROM coop_links WHERE code = ? AND revoked = 0').bind(code).first<{ code: string; owner_id: string; role: string }>();
  if (!link) throw new HttpError(404, 'That code does not work. Check it with your friend.');
  if (link.owner_id === user.id) throw new HttpError(409, 'That is your own link.');
  const members = (await env.DB.prepare('SELECT COUNT(*) AS n FROM coop_members WHERE code = ?').bind(code).first<{ n: number }>())?.n ?? 0;
  if (members >= 4) throw new HttpError(409, 'That link already has four people on it.');
  await env.DB.prepare('INSERT OR IGNORE INTO coop_members (code, user_id, joined_at) VALUES (?, ?, ?)').bind(code, user.id, nowIso()).run();
  return { code, role: link.role };
}

async function snapshotOf(env: Env, ownerId: string) {
  const row = await env.DB.prepare(
    `SELECT u.name, r.company_name, r.industry_id, r.difficulty, r.month, r.status, r.equity_value, r.owner_stake, r.profit_to_date, r.icon
     FROM users u LEFT JOIN game_runs r ON r.user_id = u.id AND r.is_active = 1 WHERE u.id = ?`,
  ).bind(ownerId).first<{ name: string; company_name: string | null; industry_id: string | null; difficulty: string | null; month: number | null; status: string | null; equity_value: number | null; owner_stake: number | null; profit_to_date: number | null; icon: string | null }>();
  if (!row) throw new HttpError(404, 'That player no longer exists.');
  return {
    owner: row.name, company: row.company_name, sector: row.industry_id, difficulty: row.difficulty, month: row.month ?? 0, status: row.status ?? 'none',
    equityValue: row.equity_value ?? 0, ownerStake: row.owner_stake ?? 0, profitToDate: row.profit_to_date ?? 0, icon: row.icon,
  };
}

/** A view of the owner's company for the owner or anyone who joined the link. */
export async function viewLink(env: Env, user: UserRow, codeIn: unknown) {
  const code = cleanCode(codeIn);
  const link = await env.DB.prepare('SELECT code, owner_id, role, revoked FROM coop_links WHERE code = ?').bind(code).first<{ code: string; owner_id: string; role: string; revoked: number }>();
  if (!link || link.revoked) throw new HttpError(404, 'That link is not available.');
  const isOwner = link.owner_id === user.id;
  const member = !isOwner && !!(await env.DB.prepare('SELECT 1 FROM coop_members WHERE code = ? AND user_id = ?').bind(code, user.id).first());
  if (!isOwner && !member) throw new HttpError(403, 'Join this link first.');
  const suggestions = await env.DB.prepare(
    `SELECT s.id, s.action_json, s.note, s.status, s.created_at, u.name AS from_name FROM coop_suggestions s JOIN users u ON u.id = s.from_user
     WHERE s.code = ? ORDER BY s.created_at DESC LIMIT 20`,
  ).bind(code).all<{ id: string; action_json: string; note: string; status: string; created_at: string; from_name: string }>();
  return {
    code, role: link.role, isOwner, snapshot: await snapshotOf(env, link.owner_id),
    suggestions: suggestions.results.map((s) => ({ id: s.id, action: JSON.parse(s.action_json), note: s.note, status: s.status, from: s.from_name, createdAt: s.created_at })),
  };
}

export async function myLinks(env: Env, user: UserRow) {
  const mine = await env.DB.prepare(
    `SELECT l.code, l.role, (SELECT COUNT(*) FROM coop_members m WHERE m.code = l.code) AS members,
            (SELECT COUNT(*) FROM coop_suggestions s WHERE s.code = l.code AND s.status = 'open') AS open
     FROM coop_links l WHERE l.owner_id = ? AND l.revoked = 0 ORDER BY l.created_at DESC`,
  ).bind(user.id).all<{ code: string; role: string; members: number; open: number }>();
  const joined = await env.DB.prepare(
    `SELECT l.code, l.role, u.name AS owner FROM coop_members m JOIN coop_links l ON l.code = m.code AND l.revoked = 0 JOIN users u ON u.id = l.owner_id WHERE m.user_id = ? ORDER BY m.joined_at DESC`,
  ).bind(user.id).all<{ code: string; role: string; owner: string }>();
  return { mine: mine.results, joined: joined.results };
}

export async function suggest(env: Env, user: UserRow, codeIn: unknown, body: { action?: unknown; note?: unknown }) {
  const code = cleanCode(codeIn);
  const link = await env.DB.prepare('SELECT owner_id, role, revoked FROM coop_links WHERE code = ?').bind(code).first<{ owner_id: string; role: string; revoked: number }>();
  if (!link || link.revoked) throw new HttpError(404, 'That link is not available.');
  const member = await env.DB.prepare('SELECT 1 FROM coop_members WHERE code = ? AND user_id = ?').bind(code, user.id).first();
  if (!member) throw new HttpError(403, 'Join this link first.');
  if (link.role !== 'advise') throw new HttpError(403, 'This link is for watching only.');
  const action = cleanSuggestion(body.action);
  if (!action) throw new HttpError(422, 'That is not a suggestion you can make.');
  const open = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM coop_suggestions WHERE code = ? AND from_user = ? AND status = 'open'`).bind(code, user.id).first<{ n: number }>())?.n ?? 0;
  if (open >= MAX_OPEN_SUGGESTIONS) throw new HttpError(429, 'Wait for the owner to deal with your earlier suggestions.');
  const id = newId();
  await env.DB.prepare('INSERT INTO coop_suggestions (id, code, from_user, action_json, note, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(id, code, user.id, JSON.stringify(action), cleanNote(body.note), 'open', nowIso()).run();
  return { id };
}

export async function resolveSuggestion(env: Env, user: UserRow, id: string, status: unknown) {
  if (status !== 'done' && status !== 'dismissed') throw new HttpError(400, 'Mark it done or dismissed.');
  const row = await env.DB.prepare('SELECT s.id FROM coop_suggestions s JOIN coop_links l ON l.code = s.code WHERE s.id = ? AND l.owner_id = ?').bind(id, user.id).first();
  if (!row) throw new HttpError(404, 'No such suggestion.');
  await env.DB.prepare('UPDATE coop_suggestions SET status = ? WHERE id = ?').bind(status, id).run();
  return { ok: true };
}

export async function revokeLink(env: Env, user: UserRow, codeIn: unknown) {
  const res = await env.DB.prepare('UPDATE coop_links SET revoked = 1 WHERE code = ? AND owner_id = ?').bind(cleanCode(codeIn), user.id).run();
  if (!res.meta.changes) throw new HttpError(404, 'No such link.');
  return { ok: true };
}

// ---------------------------------------------------------------------------------------------
// Card gifts: a one-time code that moves a spare card to a friend
// ---------------------------------------------------------------------------------------------
export async function giftCard(env: Env, user: UserRow, card: unknown) {
  if (typeof card !== 'string' || !cardDef(card)) throw new HttpError(400, 'Unknown card.');
  const today = nowIso().slice(0, 10);
  const made = (await env.DB.prepare(`SELECT COUNT(*) AS n FROM card_gifts WHERE from_user = ? AND created_at >= ?`).bind(user.id, today).first<{ n: number }>())?.n ?? 0;
  if (made >= 5) throw new HttpError(429, 'You can make five gifts a day.');
  const code = makeCode(8);
  await env.DB.prepare('INSERT INTO card_gifts (code, from_user, card, claimed_by, created_at) VALUES (?, ?, ?, NULL, ?)').bind(code, user.id, card, nowIso()).run();
  return { code, card };
}
export async function claimCard(env: Env, user: UserRow, codeIn: unknown) {
  const code = cleanCode(codeIn);
  const g = await env.DB.prepare('SELECT card, from_user, claimed_by FROM card_gifts WHERE code = ?').bind(code).first<{ card: string; from_user: string; claimed_by: string | null }>();
  if (!g || g.claimed_by) throw new HttpError(404, 'That gift code is not valid any more.');
  if (g.from_user === user.id) throw new HttpError(409, 'You cannot claim your own gift.');
  const res = await env.DB.prepare('UPDATE card_gifts SET claimed_by = ? WHERE code = ? AND claimed_by IS NULL').bind(user.id, code).run();
  if (!res.meta.changes) throw new HttpError(409, 'Someone else just claimed it.');
  return { card: g.card };
}

// ---------------------------------------------------------------------------------------------
// Holding-company rivalry: your guild against the one just above (or below) it by combined value
// ---------------------------------------------------------------------------------------------
export async function guildRival(env: Env, user: UserRow) {
  if (!user.guild_id) return { week: weekOf(), mine: null, rival: null };
  const rows = await env.DB.prepare(
    `SELECT g.id, g.name, g.icon, COALESCE(SUM(r.equity_value), 0) AS value, COUNT(DISTINCT u.id) AS members
     FROM guilds g JOIN users u ON u.guild_id = g.id LEFT JOIN game_runs r ON r.user_id = u.id AND r.is_active = 1 AND r.status = 'playing'
     GROUP BY g.id ORDER BY value DESC, g.name ASC`,
  ).all<{ id: string; name: string; icon: string; value: number; members: number }>();
  const list = rows.results;
  const i = list.findIndex((g) => g.id === user.guild_id);
  if (i < 0) return { week: weekOf(), mine: null, rival: null };
  const mine = list[i];
  const rival = list[i - 1] ?? list[i + 1] ?? null;
  const shape = (g: typeof mine) => ({ name: g.name, icon: g.icon, value: g.value, members: g.members });
  return { week: weekOf(), rank: i + 1, of: list.length, mine: shape(mine), rival: rival ? { ...shape(rival), above: list.indexOf(rival) < i } : null };
}

// ---------------------------------------------------------------------------------------------
// Hall of fame: the richest verified companies right now, as a skyline
// ---------------------------------------------------------------------------------------------
export async function hallOfFame(env: Env) {
  const r = await env.DB.prepare(
    `SELECT * FROM (${NET_WORTH_SQL}) WHERE company_name IS NOT NULL AND net_worth > 0 ORDER BY net_worth DESC, id ASC LIMIT 12`,
  ).all<NetWorthRow>();
  return {
    rows: r.results.map((x, i) => ({ rank: i + 1, name: x.name, icon: x.icon, company: x.company_name, sector: x.industry_id, netWorth: x.net_worth, prestige: x.prestige_count })),
  };
}
