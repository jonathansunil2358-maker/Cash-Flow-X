import { guildLevelFor } from '@cfx/engine';
import type { UserRow } from './auth';
import { NET_WORTH_SQL, type NetWorthRow } from './social';
import { HttpError, nowIso, previousSeason, seasonOf, type Env } from './util';

export type Board = 'networth' | 'prestige' | 'guilds';
export type Period = 'season' | 'all';

export interface BoardEntry {
  id: string;
  name: string;
  icon: string;
  value: number;
  sub: string | null;
  hardcore?: boolean;
  me?: boolean;
}

const LIMIT = 50;

async function rows(env: Env, board: Board, period: Period, season: string): Promise<BoardEntry[]> {
  if (board === 'networth') {
    if (period === 'all') {
      const r = await env.DB.prepare(`SELECT * FROM (${NET_WORTH_SQL}) ORDER BY net_worth DESC LIMIT ${LIMIT}`).all<NetWorthRow>();
      return r.results.map((x) => ({ id: x.id, name: x.name, icon: x.icon, value: x.net_worth, sub: x.company_name ?? x.guild_name, hardcore: x.difficulty === 'hard' }));
    }
    const r = await env.DB.prepare(
      `SELECT u.id, u.name, u.icon, s.peak_net_worth AS v, g.name AS guild, gr.difficulty
       FROM season_stats s JOIN users u ON u.id = s.user_id LEFT JOIN guilds g ON g.id = u.guild_id
       LEFT JOIN game_runs gr ON gr.user_id = u.id AND gr.is_active = 1
       WHERE s.season = ? AND s.peak_net_worth > 0 ORDER BY s.peak_net_worth DESC LIMIT ${LIMIT}`,
    ).bind(season).all<{ id: string; name: string; icon: string; v: number; guild: string | null; difficulty: string | null }>();
    return r.results.map((x) => ({ id: x.id, name: x.name, icon: x.icon, value: x.v, sub: x.guild, hardcore: x.difficulty === 'hard' }));
  }
  if (board === 'prestige') {
    const r = period === 'all'
      ? await env.DB.prepare(`SELECT u.id, u.name, u.icon, u.prestige_count AS v, g.name AS guild FROM users u LEFT JOIN guilds g ON g.id = u.guild_id
          WHERE u.prestige_count > 0 ORDER BY u.prestige_count DESC, u.legacy_earned DESC LIMIT ${LIMIT}`).all<{ id: string; name: string; icon: string; v: number; guild: string | null }>()
      : await env.DB.prepare(`SELECT u.id, u.name, u.icon, s.prestiges AS v, g.name AS guild FROM season_stats s JOIN users u ON u.id = s.user_id
          LEFT JOIN guilds g ON g.id = u.guild_id WHERE s.season = ? AND s.prestiges > 0 ORDER BY s.prestiges DESC LIMIT ${LIMIT}`).bind(season)
          .all<{ id: string; name: string; icon: string; v: number; guild: string | null }>();
    return r.results.map((x) => ({ id: x.id, name: x.name, icon: x.icon, value: x.v, sub: x.guild }));
  }
  const r = period === 'all'
    ? await env.DB.prepare(
      `SELECT g.id, g.name, g.icon, COUNT(u.id) AS members, COALESCE(SUM(CASE WHEN r.status = 'playing' THEN r.equity_value ELSE 0 END), 0) AS v
       FROM guilds g LEFT JOIN users u ON u.guild_id = g.id LEFT JOIN game_runs r ON r.user_id = u.id AND r.is_active = 1
       GROUP BY g.id ORDER BY v DESC LIMIT ${LIMIT}`,
    ).all<{ id: string; name: string; icon: string; members: number; v: number }>()
    : await env.DB.prepare(
      `SELECT g.id, g.name, g.icon, (SELECT COUNT(*) FROM users u WHERE u.guild_id = g.id) AS members, s.peak_valuation AS v
       FROM guild_season s JOIN guilds g ON g.id = s.guild_id WHERE s.season = ? ORDER BY s.peak_valuation DESC LIMIT ${LIMIT}`,
    ).bind(season).all<{ id: string; name: string; icon: string; members: number; v: number }>();
  return r.results.map((x) => ({ id: x.id, name: x.name, icon: x.icon, value: x.v, sub: `${x.members} members · level ${guildLevelFor(x.v)}` }));
}

export async function leaderboard(env: Env, viewer: UserRow | null, board: Board, period: Period) {
  if (!['networth', 'prestige', 'guilds'].includes(board)) throw new HttpError(404, 'Unknown leaderboard.');
  const season = seasonOf();
  const entries = await rows(env, board, period, season);
  const meId = board === 'guilds' ? viewer?.guild_id : viewer?.id;
  return {
    board, period, season,
    seasonEnds: new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth() + 1, 1)).toISOString(),
    entries: entries.map((e) => ({ ...e, me: !!meId && e.id === meId })),
  };
}

/** Season rewards: the top 10 of each board in a finished season get gems once. */
export const SEASON_REWARDS = (rank: number): number => (rank === 1 ? 300 : rank <= 3 ? 200 : rank <= 10 ? 100 : 0);

export async function seasonRewards(env: Env, user: UserRow) {
  const season = previousSeason();
  const out: { board: Board; rank: number; gems: number; claimed: boolean }[] = [];
  for (const board of ['networth', 'prestige', 'guilds'] as Board[]) {
    const list = await rows(env, board, 'season', season);
    const id = board === 'guilds' ? user.guild_id : user.id;
    const rank = id ? list.findIndex((e) => e.id === id) + 1 : 0;
    const gems = rank ? SEASON_REWARDS(rank) : 0;
    if (!gems) continue;
    const claimed = await env.DB.prepare(`SELECT 1 FROM reward_claims WHERE user_id = ? AND kind = ? AND period = ?`).bind(user.id, `season-${board}`, season).first();
    out.push({ board, rank, gems, claimed: !!claimed });
  }
  return { season, rewards: out };
}

export async function claimSeasonReward(env: Env, user: UserRow, board: Board) {
  const { season, rewards } = await seasonRewards(env, user);
  const r = rewards.find((x) => x.board === board);
  if (!r) throw new HttpError(409, 'No reward for that board last season.');
  const res = await env.DB.prepare(`INSERT OR IGNORE INTO reward_claims (user_id, kind, period, gems, created_at) VALUES (?, ?, ?, ?, ?)`)
    .bind(user.id, `season-${board}`, season, r.gems, nowIso()).run();
  if (!res.meta.changes) throw new HttpError(409, 'Already claimed.');
  return { gems: r.gems, season, rank: r.rank };
}
