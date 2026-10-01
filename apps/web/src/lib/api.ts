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
    id: string; name: string; icon: string; title: string | null; visibility: Visibility; legacyPoints: number; legacyEarned: number; prestigeCount: number;
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
  entries: FixedEntry[];
  me: FixedMe | null;
}
export interface FixedEntry { rank: number; id: string; name: string; icon: string; title: string | null; score: number; months: number; me: boolean }
export interface FixedMe { status: string; score: number; months: number; finished: boolean; rank: number | null }
export interface WeeklyBoard {
  week: string;
  isCurrent: boolean;
  challenge: { seed: string; industryId: IndustryId; companyName: string; months: number; twist: { id: string; name: string; blurb: string } };
  endsInMs: number;
  entries: FixedEntry[];
  me: FixedMe | null;
  reward: { week: string; rank: number; gems: number; claimed: boolean } | null;
}
export interface CommunityView { week: string; months: number; target: number; reached: boolean; players: number; contributed: boolean; claimed: boolean; gems: number }
export interface TournamentMatch { round: 'quarter' | 'semi' | 'final'; a: { id: string; name: string; score: number } | null; b: { id: string; name: string; score: number } | null; aScore: number | null; bScore: number | null; winner: { id: string; name: string; score: number } | null }
export interface TournamentView {
  week: string; saturday: string; sunday: string; entrants: { id: string; name: string; score: number }[]; me: boolean;
  bracket: { quarters: TournamentMatch[]; semis: TournamentMatch[]; final: TournamentMatch; champion: { id: string; name: string; score: number } | null } | null;
}
export interface RivalView { week: string; rank?: number; you: number; rival: { id: string; name: string; title: string | null; icon: string; netWorth: number; company: string | null; industry: string | null; rank: number } | null }
export interface SharedPlan { id: string; name: string; price: number; marketing: number; hires: number; likes: number; author: string; title: string | null; liked: boolean; mine: boolean }
export interface ReplayData { kind: string; key: string; rank: number; name: string; title: string | null; score: number; months: number; game: { seed: string; industryId: IndustryId; companyName: string; scenarioId: string }; actions: { month: number; action: Action }[] }

export interface ChallengeView {
  code: string;
  creator: string;
  expiresAt: string;
  expired: boolean;
  maxPlayers?: number;
  challenge: { seed: string; industryId: IndustryId; companyName: string; months: number };
  entries: FixedEntry[];
  me: FixedMe | null;
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
  modifiers?: string[];
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
export interface BoardEntry { id: string; name: string; icon: string; title?: string | null; value: number; sub: string | null; hardcore?: boolean; me?: boolean }

export const api = {
  health: () => request<{ ok: boolean; googleConfigured: boolean; devAuth: boolean }>('/health'),
  signInGoogle: (credential: string) => request<{ token: string; isNew: boolean }>('/auth/google', { body: { credential } }),
  signInDev: (name: string) => request<{ token: string; isNew: boolean }>('/auth/dev', { body: { name } }),
  signOut: () => request('/auth/logout', { body: {} }),
  me: () => request<Me>('/me'),
  updateMe: (patch: { name?: string; icon?: string; title?: string | null; visibility?: Visibility; client?: unknown }) => request('/me', { method: 'PUT', body: patch }),
  buyPerk: (perkId: string) => request<{ perks: PerkLevels; legacyPoints: number }>('/me/perks', { body: { perkId } }),
  createRun: (b: { seed: string; industryId: IndustryId; difficulty: DifficultyId; equipmentFinance: EquipmentFinance; companyName: string; icon: string; boosts: ActiveBoost[]; rulesVersion: number; daily?: boolean; weekly?: boolean; challenge?: string; modifiers?: string[] }) =>
    request<RunStart>('/runs', { body: b }),
  carryOver: (runId: string, b: { state: unknown; actions: number }) =>
    request<{ actionsVerified: number; month: number; status: string }>(`/runs/${runId}/carryover`, { body: b }),
  weekly: (week?: string) => request<WeeklyBoard>(`/weekly${week ? `?week=${encodeURIComponent(week)}` : ''}`),
  claimWeeklyEvent: () => request<{ gems: number; week: string; rank: number }>('/rewards/weekly', { body: {} }),
  createChallenge: (duel = false) => request<{ code: string; expiresAt: string; maxPlayers?: number; challenge: ChallengeView['challenge'] }>('/challenges', { body: { duel } }),
  community: () => request<CommunityView>('/community'),
  claimCommunity: () => request<{ gems: number; week: string }>('/rewards/community', { body: {} }),
  tournament: () => request<TournamentView>('/tournament'),
  rival: () => request<RivalView>('/rival'),
  plans: (sort: 'top' | 'new' = 'top') => request<{ plans: SharedPlan[] }>(`/plans?sort=${sort}`),
  publishPlan: (plan: unknown) => request<{ id: string }>('/plans', { body: { plan } }),
  likePlan: (id: string) => request<{ liked: boolean; likes: number }>(`/plans/${id}/like`, { body: {} }),
  deleteSharedPlan: (id: string) => request<{ ok: boolean }>(`/plans/${id}/delete`, { body: {} }),
  replay: (kind: 'daily' | 'weekly' | 'challenge', key: string, rank = 1) => request<ReplayData>(`/replays/${kind}/${encodeURIComponent(key)}?rank=${rank}`),
  challenge: (code: string) => request<ChallengeView>(`/challenges/${encodeURIComponent(code)}`),
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
