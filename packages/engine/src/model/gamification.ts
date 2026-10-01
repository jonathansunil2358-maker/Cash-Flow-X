import { plSummary } from '../ledger/statements';
import type { Pence } from '../money';
import { pick, type Rng } from '../rng';
import { ratios } from './analysis';
import { industryOf } from './industries';
import { annualise, currentBalanceSheet, trailingPL } from './metrics';
import { headcount, loanPrincipal, type GameState } from './state';
import { UPGRADES } from './upgrades';

// ---------------------------------------------------------------------------------------------
// Founder XP and levels
// ---------------------------------------------------------------------------------------------

/** Total XP needed to reach a level: 0, 100, 300, 600, 1000, 1500… (50 × L × (L − 1)). */
export const xpForLevel = (level: number): number => 50 * level * (level - 1);

export function levelForXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp) level += 1;
  return level;
}

export const XP_REWARDS = {
  monthClosed: 5,
  profitableMonth: 5,
  decision: 15,
  upgrade: 10,
  prestigePerLegacyPoint: 100,
  levelUpGemsPerLevel: 10,
};

/** Features unlocked by founder level. */
export const LEVEL_UNLOCKS: { level: number; feature: 'x2' | 'x4' | 'acquisitions'; label: string }[] = [
  { level: 2, feature: 'x2', label: 'x2 game speed' },
  { level: 4, feature: 'acquisitions', label: 'Mergers & acquisitions' },
  { level: 5, feature: 'x4', label: 'x4 game speed' },
];

export const unlocked = (level: number, feature: 'x2' | 'x4' | 'acquisitions'): boolean =>
  level >= (LEVEL_UNLOCKS.find((u) => u.feature === feature)?.level ?? 1);

// ---------------------------------------------------------------------------------------------
// Achievements
// ---------------------------------------------------------------------------------------------

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  gems: number;
  check: (s: GameState) => boolean;
}

const months = (s: GameState) => s.history.map((r) => plSummary(r.period.pl));
const consecutiveProfitable = (s: GameState): number => {
  let n = 0;
  for (let i = s.history.length - 1; i >= 0; i--) {
    if (plSummary(s.history[i].period.pl).profit > 0) n += 1;
    else break;
  }
  return n;
};
const lastValuation = (s: GameState): Pence => s.history.at(-1)?.valuation?.equityValue ?? 0;

export const ACHIEVEMENTS: AchievementDef[] = [
  { id: 'first_sale', name: 'Open for business', description: 'Make your first sale.', icon: 'coin', gems: 10, check: (s) => months(s).some((p) => p.revenue > 0) },
  { id: 'first_profit', name: 'In the black', description: 'Make a profit in a month.', icon: 'chart', gems: 15, check: (s) => months(s).some((p) => p.profit > 0) },
  { id: 'profit_streak', name: 'Steady hands', description: 'Profitable 12 months in a row.', icon: 'shield', gems: 30, check: (s) => consecutiveProfitable(s) >= 12 },
  { id: 'volume_1000', name: 'Crowd pleaser', description: 'Serve 1,000 customers or sell 1,000 units in a month.', icon: 'heart', gems: 20,
    check: (s) => { const k = s.history.at(-1)?.kpis; return !!k && (k.customers >= 1000 || k.unitsSold >= 1000); } },
  { id: 'revenue_1m', name: 'Millionaire turnover', description: '£1m of revenue over 12 months.', icon: 'star', gems: 30,
    check: (s) => { const t = trailingPL(s, 12); return t.months === 12 && t.summary.revenue >= 1_000_000_00; } },
  { id: 'valuation_1m', name: 'Worth a million', description: 'Company valued at £1m.', icon: 'diamond', gems: 25, check: (s) => lastValuation(s) >= 1_000_000_00 },
  { id: 'valuation_10m', name: 'Ten million club', description: 'Company valued at £10m.', icon: 'crown', gems: 60, check: (s) => lastValuation(s) >= 10_000_000_00 },
  { id: 'first_upgrade', name: 'Investing in growth', description: 'Buy a sector upgrade.', icon: 'gear', gems: 10, check: (s) => Object.values(s.upgrades).some((n) => n > 0) },
  { id: 'max_upgrade', name: 'Maxed out', description: 'Take an upgrade to its top level.', icon: 'bolt', gems: 30,
    check: (s) => UPGRADES[s.industryId].some((u) => (s.upgrades[u.id] ?? 0) >= u.maxLevel) },
  { id: 'loan_repaid', name: 'Debt free', description: 'Fully repay a bank loan.', icon: 'key', gems: 20, check: (s) => s.log.some((l) => l.title === 'Loan repaid' || /fully repaid/.test(l.text)) },
  { id: 'dividend', name: 'Pay yourself', description: 'Pay a dividend.', icon: 'coffee', gems: 15, check: (s) => s.ownerDividends > 0 },
  { id: 'acquisition', name: 'Empire builder', description: 'Acquire another company.', icon: 'globe', gems: 30, check: (s) => s.acquisitions.length > 0 },
  { id: 'recession', name: 'Weathered the storm', description: 'Survive a recession.', icon: 'mountain', gems: 30,
    check: (s) => s.status === 'playing' && s.log.some((l) => l.title === 'Recession ends') },
  { id: 'lessee', name: 'Off balance sheet? Not any more', description: 'Lease equipment under IFRS 16.', icon: 'parcel', gems: 10, check: (s) => s.start.equipmentFinance === 'lease' && s.history.length > 0 },
  { id: 'hardcore_2y', name: 'Hardcore', description: 'Survive two years on Hard.', icon: 'flame', gems: 50, check: (s) => s.difficulty === 'hard' && s.status === 'playing' && s.month >= 24 },
  { id: 'lean_cycle', name: 'Cash machine', description: 'Cash conversion cycle under 30 days with revenue over £20k a month.', icon: 'rocket', gems: 25,
    check: (s) => {
      const last = s.history.at(-1);
      if (!last || plSummary(last.period.pl).revenue < 20_000_00) return false;
      const ccc = ratios(s).find((r) => r.id === 'ccc')?.value;
      return ccc !== null && ccc !== undefined && ccc < 30;
    } },
];

/** Achievements newly earned by this state (not in `unlocked`). */
export function newAchievements(s: GameState, unlockedIds: Record<string, string>): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !unlockedIds[a.id] && a.check(s));
}

// ---------------------------------------------------------------------------------------------
// Missions: rotating objectives that teach finance
// ---------------------------------------------------------------------------------------------

export interface Mission {
  id: string;
  template: string;
  target: number;
  /** Which run it belongs to: missions reset when a new company starts. */
  runKey: string;
  rewardXp: number;
  rewardGems: number;
}

interface MissionTemplate {
  id: string;
  better: 'higher' | 'lower';
  format: 'int' | 'gbp' | 'x' | 'days' | 'months';
  title: (target: number, s: GameState) => string;
  hint: string;
  when?: (s: GameState) => boolean;
  target: (s: GameState, rng: Rng) => number;
  current: (s: GameState) => number | null;
}

const lastPL = (s: GameState) => (s.history.length ? plSummary(s.history[s.history.length - 1].period.pl) : null);
const ratioValue = (s: GameState, id: string) => ratios(s).find((r) => r.id === id)?.value ?? null;
const roundNice = (x: number) => {
  const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(Math.max(1, x))) - 1));
  return Math.ceil(x / p) * p;
};

export const MISSION_TEMPLATES: MissionTemplate[] = [
  { id: 'team', better: 'higher', format: 'int', title: (t) => `Grow your team to ${t} people`, hint: 'Hire in the Team panel. Watch staff costs in the Books.',
    target: (s) => headcount(s) + 2, current: (s) => headcount(s) },
  { id: 'volume', better: 'higher', format: 'int',
    title: (t, s) => (industryOf(s).model === 'subscription' ? `Reach ${t.toLocaleString('en-GB')} ${industryOf(s).unitPlural}` : `Sell ${t.toLocaleString('en-GB')} ${industryOf(s).unitPlural} in a month`),
    hint: 'Marketing builds reach; quality and price win preference; capacity caps sales.',
    target: (s) => { const k = s.history.at(-1)?.kpis; const v = k ? Math.max(k.customers, k.unitsSold) : 0; return roundNice(Math.max(20, v * 1.3)); },
    current: (s) => { const k = s.history.at(-1)?.kpis; return k ? Math.max(k.customers, k.unitsSold) : 0; } },
  { id: 'revenue', better: 'higher', format: 'gbp', title: (t) => `Make £${(t / 100).toLocaleString('en-GB')} of revenue in a month`, hint: 'Revenue is recognised when earned, not when cash arrives.',
    target: (s) => roundNice(Math.max(5_000_00, (lastPL(s)?.revenue ?? 0) * 1.25)), current: (s) => lastPL(s)?.revenue ?? 0 },
  { id: 'profitStreak', better: 'higher', format: 'int', title: (t) => `Make a profit ${t} months in a row`, hint: 'Profit is revenue less every cost, including depreciation, interest and tax.',
    target: () => 3, current: (s) => consecutiveProfitable(s) },
  { id: 'currentRatio', better: 'higher', format: 'x', title: () => 'Get your current ratio above 1.5x', hint: 'Current assets ÷ current liabilities. Cash, receivables and stock count; so do bills due within a year.',
    when: (s) => s.history.length >= 3, target: () => 1.5, current: (s) => ratioValue(s, 'currentRatio') },
  { id: 'dso', better: 'lower', format: 'days', title: (t) => `Get receivable days (DSO) below ${t}`, hint: 'Shorter customer terms bring cash in sooner. Set them in Team › Credit terms.',
    when: (s) => s.customerDays > 0 && s.history.length >= 3, target: (s) => Math.max(15, s.customerDays - 10), current: (s) => ratioValue(s, 'dso') },
  { id: 'upgrades', better: 'higher', format: 'int', title: (t) => `Own ${t} upgrade levels`, hint: 'Upgrades are capex: they hit cash now and the P&L slowly through depreciation.',
    target: (s) => Object.values(s.upgrades).reduce((a, n) => a + n, 0) + 2, current: (s) => Object.values(s.upgrades).reduce((a, n) => a + n, 0) },
  { id: 'runway', better: 'higher', format: 'months', title: (t) => `Hold ${t} months of costs in cash`, hint: 'Cash runway protects you from bad news. Check the Forecast.',
    when: (s) => s.history.length >= 3, target: () => 6,
    current: (s) => { const t = trailingPL(s, 3); const monthly = t.months ? (t.summary.costOfSales + t.summary.opex) / t.months : 0; return monthly > 0 ? Math.max(0, currentBalanceSheet(s).cash) / monthly : null; } },
  { id: 'deleverage', better: 'lower', format: 'gbp', title: (t) => `Cut bank debt below £${(t / 100).toLocaleString('en-GB')}`, hint: 'Lower debt lowers interest and keeps you inside covenants.',
    when: (s) => loanPrincipal(s) > 20_000_00, target: (s) => roundNice(loanPrincipal(s) * 0.6), current: (s) => loanPrincipal(s) },
  { id: 'ebitdaMargin', better: 'higher', format: 'int', title: (t) => `Reach a ${t}% EBITDA margin (12 months)`, hint: 'EBITDA ÷ revenue: operating profitability before financing and depreciation.',
    when: (s) => s.history.length >= 6, target: (s) => Math.max(5, Math.round(industryOf(s).targetEbitdaMargin * 100 * 0.6)),
    current: (s) => { const t = trailingPL(s, 12); const rev = annualise(t.summary.revenue, t.months); return rev > 0 ? Math.round((annualise(t.summary.ebitda, t.months) / rev) * 100) : null; } },
];

const TEMPLATE_BY_ID = Object.fromEntries(MISSION_TEMPLATES.map((t) => [t.id, t])) as Record<string, MissionTemplate>;

export const runKeyOf = (s: GameState): string => `${s.seedLabel}|${s.companyName}|${s.industryId}`;

export interface MissionStatus {
  mission: Mission;
  title: string;
  hint: string;
  current: number | null;
  target: number;
  progress: number;
  done: boolean;
  format: MissionTemplate['format'];
}

export function missionStatus(m: Mission, s: GameState): MissionStatus {
  const t = TEMPLATE_BY_ID[m.template];
  const current = t.current(s);
  const done = current !== null && (t.better === 'higher' ? current >= m.target : current <= m.target);
  let progress = 0;
  if (current !== null) progress = t.better === 'higher' ? current / Math.max(1e-9, m.target) : Math.min(1, m.target / Math.max(1e-9, current));
  return { mission: m, title: t.title(m.target, s), hint: t.hint, current, target: m.target, progress: Math.min(1, Math.max(0, progress)), done, format: t.format };
}

/** Keep three live missions for this run, replacing any from an older run or already claimed. */
export function refillMissions(existing: Mission[], s: GameState, rng: Rng, count = 3): Mission[] {
  const key = runKeyOf(s);
  const keep = existing.filter((m) => m.runKey === key);
  const used = new Set(keep.map((m) => m.template));
  const out = [...keep];
  const pool = MISSION_TEMPLATES.filter((t) => !used.has(t.id) && (t.when?.(s) ?? true) && !missionStatusOf(t, s));
  while (out.length < count && pool.length) {
    const t = pick(rng, pool);
    pool.splice(pool.indexOf(t), 1);
    out.push({ id: `${t.id}-${s.month}-${out.length}`, template: t.id, target: t.target(s, rng), runKey: key, rewardXp: 60, rewardGems: 10 });
  }
  return out;
}

/** True when a template's natural target is already met (don't offer free missions). */
function missionStatusOf(t: MissionTemplate, s: GameState): boolean {
  const target = t.target(s, { next: () => 0.5 });
  const current = t.current(s);
  return current !== null && (t.better === 'higher' ? current >= target : current <= target);
}

// ---------------------------------------------------------------------------------------------
// Daily rewards
// ---------------------------------------------------------------------------------------------

export const DAILY_REWARDS = [10, 15, 20, 25, 30, 40, 60];

export interface DailyState {
  lastClaim: string | null;
  streak: number;
}

const dayNumber = (isoDate: string): number => Math.floor(Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000);

export interface DailyStatus {
  canClaim: boolean;
  /** The streak day this claim would count as (1-7, repeating at 7). */
  day: number;
  gems: number;
}

export function dailyStatus(d: DailyState, todayIso: string): DailyStatus {
  if (d.lastClaim === todayIso) {
    const day = Math.min(d.streak, DAILY_REWARDS.length);
    return { canClaim: false, day, gems: DAILY_REWARDS[day - 1] ?? DAILY_REWARDS[0] };
  }
  const continues = d.lastClaim !== null && dayNumber(todayIso) - dayNumber(d.lastClaim) === 1;
  const streak = continues ? d.streak + 1 : 1;
  const day = Math.min(streak, DAILY_REWARDS.length);
  return { canClaim: true, day, gems: DAILY_REWARDS[day - 1] };
}

export function claimDaily(d: DailyState, todayIso: string): { daily: DailyState; gems: number } {
  const st = dailyStatus(d, todayIso);
  if (!st.canClaim) throw new Error('Already claimed today.');
  const continues = d.lastClaim !== null && dayNumber(todayIso) - dayNumber(d.lastClaim) === 1;
  return { daily: { lastClaim: todayIso, streak: continues ? d.streak + 1 : 1 }, gems: st.gems };
}
