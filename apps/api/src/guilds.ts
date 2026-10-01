import { GUILD_LEVELS, guildLevelFor, MAX_GUILD_MEMBERS, WEEKLY_GOAL_GEMS, weeklyGoalTarget } from '@cfx/engine';
import type { UserRow } from './auth';
import { guildValuation, memberCount } from './social';
import { cleanIcon, cleanName, HttpError, newId, nowIso, weekOf, type Env } from './util';

export async function listGuilds(env: Env, q: string) {
  const rows = await env.DB.prepare(
    `SELECT g.id, g.name, g.icon, COUNT(u.id) AS members,
            COALESCE(SUM(CASE WHEN r.status = 'playing' THEN r.equity_value ELSE 0 END), 0) AS valuation
     FROM guilds g LEFT JOIN users u ON u.guild_id = g.id
     LEFT JOIN game_runs r ON r.user_id = u.id AND r.is_active = 1
     WHERE g.name LIKE ? GROUP BY g.id ORDER BY valuation DESC LIMIT 30`,
  ).bind(`%${q.replace(/[%_]/g, '')}%`).all<{ id: string; name: string; icon: string; members: number; valuation: number }>();
  return { guilds: rows.results.map((g) => ({ ...g, level: guildLevelFor(g.valuation), full: g.members >= MAX_GUILD_MEMBERS })) };
}

export async function createGuild(env: Env, user: UserRow, body: { name?: unknown; icon?: unknown }) {
  if (user.guild_id) throw new HttpError(409, 'Leave your current holding company first.');
  const name = cleanName(body.name, 30);
  if (name.length < 3) throw new HttpError(400, 'Holding company names need at least 3 characters.');
  const taken = await env.DB.prepare('SELECT 1 FROM guilds WHERE name = ?').bind(name).first();
  if (taken) throw new HttpError(409, 'That name is taken.');
  const id = newId();
  await env.DB.batch([
    env.DB.prepare('INSERT INTO guilds (id, name, icon, owner_id, created_at) VALUES (?, ?, ?, ?, ?)').bind(id, name, cleanIcon(body.icon), user.id, nowIso()),
    env.DB.prepare(`UPDATE users SET guild_id = ?, guild_role = 'owner', updated_at = ? WHERE id = ?`).bind(id, nowIso(), user.id),
  ]);
  return { id, name };
}

export async function joinGuild(env: Env, user: UserRow, guildId: string) {
  if (user.guild_id) throw new HttpError(409, 'Leave your current holding company first.');
  const g = await env.DB.prepare('SELECT id FROM guilds WHERE id = ?').bind(guildId).first();
  if (!g) throw new HttpError(404, 'Holding company not found.');
  if ((await memberCount(env, guildId)) >= MAX_GUILD_MEMBERS) throw new HttpError(409, `This holding company is full (${MAX_GUILD_MEMBERS} members).`);
  await env.DB.prepare(`UPDATE users SET guild_id = ?, guild_role = 'member', updated_at = ? WHERE id = ?`).bind(guildId, nowIso(), user.id).run();
  return { ok: true };
}

/**
 * Leave: stakes between the leaver and remaining members are bought out both ways (each investee's
 * game applies the buy-out the next time it syncs); open offers are refunded. The owner role
 * passes to the longest-standing member, and an empty holding company closes.
 */
export async function leaveGuild(env: Env, user: UserRow) {
  if (!user.guild_id) throw new HttpError(409, 'You are not in a holding company.');
  const gid = user.guild_id;
  const now = nowIso();
  const members = `(SELECT id FROM users WHERE guild_id = ?)`;
  const stmts: D1PreparedStatement[] = [
    env.DB.prepare(`UPDATE investments SET status = 'buyout-requested', updated_at = ?
      WHERE status = 'accepted' AND ((investor_id = ? AND investee_id IN ${members}) OR (investee_id = ? AND investor_id IN ${members}))`)
      .bind(now, user.id, gid, user.id, gid),
    env.DB.prepare(`UPDATE users SET personal_cash = personal_cash + COALESCE((SELECT SUM(amount) FROM investments i
        WHERE i.investor_id = users.id AND i.status = 'offered' AND (i.investor_id = ? OR i.investee_id = ?)), 0)
      WHERE id IN ${members}`).bind(user.id, user.id, gid),
    env.DB.prepare(`UPDATE investments SET status = 'expired', updated_at = ? WHERE status = 'offered' AND (investor_id = ? OR investee_id = ?)`).bind(now, user.id, user.id),
    env.DB.prepare(`UPDATE users SET guild_id = NULL, guild_role = NULL, updated_at = ? WHERE id = ?`).bind(now, user.id),
  ];
  await env.DB.batch(stmts);
  if (user.guild_role === 'owner') {
    const next = await env.DB.prepare(`SELECT id FROM users WHERE guild_id = ? ORDER BY created_at LIMIT 1`).bind(gid).first<{ id: string }>();
    if (next) {
      await env.DB.batch([
        env.DB.prepare(`UPDATE users SET guild_role = 'owner' WHERE id = ?`).bind(next.id),
        env.DB.prepare(`UPDATE guilds SET owner_id = ? WHERE id = ?`).bind(next.id, gid),
      ]);
    } else {
      await env.DB.prepare('DELETE FROM guilds WHERE id = ?').bind(gid).run();
    }
  }
  return { ok: true };
}

/** Holding company page: members, what each lets others see, level, weekly goal. */
export async function guildDetail(env: Env, viewer: UserRow, guildId: string) {
  const g = await env.DB.prepare('SELECT * FROM guilds WHERE id = ?').bind(guildId).first<{ id: string; name: string; icon: string; owner_id: string }>();
  if (!g) throw new HttpError(404, 'Holding company not found.');
  const isMember = viewer.guild_id === guildId;
  const rows = await env.DB.prepare(
    `SELECT u.id, u.name, u.icon, u.guild_role, u.visibility, u.prestige_count, r.id AS run_id, r.status, r.stats_json, r.equity_value, r.difficulty
     FROM users u LEFT JOIN game_runs r ON r.user_id = u.id AND r.is_active = 1
     WHERE u.guild_id = ? ORDER BY r.equity_value DESC`,
  ).bind(guildId).all<{
    id: string; name: string; icon: string; guild_role: string; visibility: string; prestige_count: number; run_id: string | null;
    status: string | null; stats_json: string | null; equity_value: number | null; difficulty: string | null;
  }>();
  const valuation = await guildValuation(env, guildId);
  const level = guildLevelFor(valuation);
  const week = weekOf();
  const weekly = await env.DB.prepare('SELECT profit FROM guild_weekly WHERE guild_id = ? AND week = ?').bind(guildId, week).first<{ profit: number }>();
  const claimed = await env.DB.prepare(`SELECT 1 FROM reward_claims WHERE user_id = ? AND kind = 'weekly' AND period = ?`).bind(viewer.id, week).first();
  const members = rows.results.map((m) => {
    const self = m.id === viewer.id;
    const vis = self ? 'full' : isMember ? m.visibility : 'summary';
    const stats = m.stats_json && m.status === 'playing' ? JSON.parse(m.stats_json) : null;
    return {
      id: m.id, name: m.name, icon: m.icon, role: m.guild_role, prestiges: m.prestige_count, visibility: m.visibility, runId: m.run_id,
      hardcore: m.difficulty === 'hard', playing: m.status === 'playing',
      valuation: vis === 'hidden' ? null : m.status === 'playing' ? m.equity_value : 0,
      summary: vis === 'hidden' || !stats ? null : {
        companyName: stats.companyName, industryId: stats.industryId, revenue: stats.revenue, profit: stats.profit, month: stats.month,
        ownership: stats.ownership, customers: stats.customers, unitsSold: stats.unitsSold, headcount: stats.headcount,
      },
      financials: vis === 'full' && stats ? { pl: stats.pl, bs: stats.bs, equityValue: stats.equityValue, enterpriseValue: stats.enterpriseValue } : null,
    };
  });
  const target = weeklyGoalTarget(members.length);
  return {
    id: g.id, name: g.name, icon: g.icon, isMember, valuation, level, perks: GUILD_LEVELS.find((l) => l.level === level)!.label,
    nextLevel: GUILD_LEVELS.find((l) => l.level === level + 1) ?? null, members,
    weekly: { week, profit: weekly?.profit ?? 0, target, gems: WEEKLY_GOAL_GEMS, done: (weekly?.profit ?? 0) >= target, claimed: !!claimed },
  };
}

export async function claimWeekly(env: Env, user: UserRow) {
  if (!user.guild_id) throw new HttpError(409, 'Join a holding company to take part in weekly goals.');
  const week = weekOf();
  const weekly = await env.DB.prepare('SELECT profit FROM guild_weekly WHERE guild_id = ? AND week = ?').bind(user.guild_id, week).first<{ profit: number }>();
  if ((weekly?.profit ?? 0) < weeklyGoalTarget(await memberCount(env, user.guild_id))) throw new HttpError(409, 'This week\'s goal is not reached yet.');
  const res = await env.DB.prepare(`INSERT OR IGNORE INTO reward_claims (user_id, kind, period, gems, created_at) VALUES (?, 'weekly', ?, ?, ?)`)
    .bind(user.id, week, WEEKLY_GOAL_GEMS, nowIso()).run();
  if (!res.meta.changes) throw new HttpError(409, 'Already claimed this week.');
  return { gems: WEEKLY_GOAL_GEMS };
}
