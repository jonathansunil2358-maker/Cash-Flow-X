import type { Action, ActiveBoost, DifficultyId, EquipmentFinance, IndustryId, PerkLevels, PLSummary } from '@cfx/engine';

/** The game server (Cloudflare Worker). Unset = offline-only build (no accounts, no leaderboards). */
export const API_URL: string = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, '') ?? '';
export const GOOGLE_CLIENT_ID: string = (import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined) ?? '';
/** Local development: sign in by name against a Worker running with DEV_AUTH=true. */
export const DEV_AUTH = import.meta.env.VITE_DEV_AUTH === 'true';
export const ONLINE = !!API_URL;

const TOKEN_KEY = 'cfx:session';
export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}
export function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export class ApiError extends Error {
  constructor(readonly status: number, message: string, readonly body: Record<string, unknown>) {
    super(message);
  }
}

async function request<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  if (!API_URL) throw new ApiError(0, 'The game server is not configured for this build.', {});
  const token = getToken();
  let res: Response;
  try {
    res = await fetch(`${API_URL}${path}`, {
      method: init.method ?? (init.body !== undefined ? 'POST' : 'GET'),
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Could not reach the game server. Check your connection.', {});
  }
  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiError(res.status, String(body.error ?? `Request failed (${res.status})`), body);
  return body as T;
}

// ---------------------------------------------------------------------------------------------

export interface Me {
  user: {
    id: string; name: string; icon: string; visibility: Visibility; legacyPoints: number; legacyEarned: number; prestigeCount: number;
    perks: PerkLevels; personalCash: number; client: Record<string, unknown>;
  };
  guild: { id: string; name: string; icon: string; role: string; level: number } | null;
  activeRun: { id: string; status: string; actionsVerified: number; month: number; flaggedReason: string | null } | null;
  investments: {
    offers: { id: string; runId: string; investorId: string; investorName: string; amount: number; preMoney: number }[];
    buyoutRequests: string[];
    holdings: { id: string; investeeName: string; companyName: string; icon: string; status: string; invested: number; dividends: number; buyout: number; value: number }[];
  };
  netWorth: number;
  seasonRewards: { season: string; rewards: { board: Board; rank: number; gems: number; claimed: boolean }[] };
}

export type Visibility = 'full' | 'summary' | 'hidden';
export type Board = 'networth' | 'prestige' | 'guilds';

export interface DailyBoard {
  day: string;
  isToday: boolean;
  challenge: { seed: string; industryId: IndustryId; companyName: string; months: number };
  endsInMs: number;
  entries: { rank: number; id: string; name: string; icon: string; score: number; months: number; me: boolean }[];
  me: { status: string; score: number; months: number; finished: boolean; rank: number | null } | null;
}

export interface RunStart {
  runId: string;
  seed: string;
  industryId: IndustryId;
  difficulty: DifficultyId;
  equipmentFinance: EquipmentFinance;
  perks: PerkLevels;
  boosts: ActiveBoost[];
  prestigeLevel: number;
  companyName: string;
  icon: string;
}

export interface GuildSummary { id: string; name: string; icon: string; members: number; valuation: number; level: number; full: boolean }
export interface GuildMember {
  id: string; name: string; icon: string; role: string; prestiges: number; visibility: Visibility; runId: string | null; hardcore: boolean; playing: boolean;
  valuation: number | null;
  summary: { companyName: string; industryId: IndustryId; revenue: number; profit: number; month: number; ownership: number; customers: number; unitsSold: number; headcount: number } | null;
  financials: { pl: PLSummary; bs: Record<string, number>; equityValue: number; enterpriseValue: number } | null;
}
export interface GuildDetail {
  id: string; name: string; icon: string; isMember: boolean; valuation: number; level: number; perks: string;
  nextLevel: { level: number; combinedValuation: number; label: string } | null; members: GuildMember[];
  weekly: { week: string; profit: number; target: number; gems: number; done: boolean; claimed: boolean };
}
export interface BoardEntry { id: string; name: string; icon: string; value: number; sub: string | null; hardcore?: boolean; me?: boolean }

export const api = {
  health: () => request<{ ok: boolean; googleConfigured: boolean; devAuth: boolean }>('/health'),
  signInGoogle: (credential: string) => request<{ token: string; isNew: boolean }>('/auth/google', { body: { credential } }),
  signInDev: (name: string) => request<{ token: string; isNew: boolean }>('/auth/dev', { body: { name } }),
  signOut: () => request('/auth/logout', { body: {} }),
  me: () => request<Me>('/me'),
  updateMe: (patch: { name?: string; icon?: string; visibility?: Visibility; client?: unknown }) => request('/me', { method: 'PUT', body: patch }),
  buyPerk: (perkId: string) => request<{ perks: PerkLevels; legacyPoints: number }>('/me/perks', { body: { perkId } }),
  createRun: (b: { seed: string; industryId: IndustryId; difficulty: DifficultyId; equipmentFinance: EquipmentFinance; companyName: string; icon: string; boosts: ActiveBoost[]; rulesVersion: number; daily?: boolean }) =>
    request<RunStart>('/runs', { body: b }),
  daily: (day?: string) => request<DailyBoard>(`/daily${day ? `?day=${encodeURIComponent(day)}` : ''}`),
  syncRun: (runId: string, b: { fromAction: number; actions: { month: number; action: Action }[]; month: number; checksum: string }) =>
    request<{ actionsVerified: number; status: string; netWorth?: number }>(`/runs/${runId}/sync`, { body: b }),
  guilds: (q = '') => request<{ guilds: GuildSummary[] }>(`/guilds?q=${encodeURIComponent(q)}`),
  guild: (id: string) => request<GuildDetail>(`/guilds/${id}`),
  createGuild: (name: string, icon: string) => request<{ id: string }>('/guilds', { body: { name, icon } }),
  joinGuild: (id: string) => request(`/guilds/${id}/join`, { body: {} }),
  leaveGuild: () => request('/guild/leave', { body: {} }),
  claimWeekly: () => request<{ gems: number }>('/guild/weekly/claim', { body: {} }),
  invest: (investeeId: string, amount: number) => request<{ id: string }>('/investments', { body: { investeeId, amount } }),
  declineInvestment: (id: string) => request(`/investments/${id}/decline`, { body: {} }),
  leaderboard: (board: Board, period: 'season' | 'all') =>
    request<{ entries: BoardEntry[]; season: string; seasonEnds: string }>(`/leaderboards/${board}?period=${period}`),
  claimSeason: (board: Board) => request<{ gems: number; rank: number }>(`/rewards/season/${board}`, { body: {} }),
};
