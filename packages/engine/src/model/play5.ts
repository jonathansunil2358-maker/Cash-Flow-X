import { cr, dr, post } from '../ledger/journal';
import { plSummary } from '../ledger/statements';
import { formatGBP, type Pence } from '../money';
import { hashSeed } from '../rng';
import { industryOf, ROLE_IDS, type RoleId } from './industries';
import { franchiseCount } from './franchise';
import { logItem, type GameState } from './state';

/**
 * Version 5 fun: how you source (supply chain), when you refresh a product (lifecycle), pop-up shops, a pricing lab,
 * franchise standards, named managers, department focus (skill branches) and cyber security. The random moments
 * (rival moves, shocks, activists, attacks, founder life) are in play5Advance.ts. Everything is deterministic:
 * outcomes come from hashes of the company seed, never from the dice stream.
 */
export interface Pop { month: number; cost: Pence; tier: number }
export interface Manager { name: string; role: RoleId; trait: 'steady' | 'bold' | 'frugal'; since: number }
export interface Play5 {
  security?: 0 | 1 | 2;
  supply?: 'local' | 'mixed' | 'global';
  supplySince?: number;
  refreshed?: number;
  pop?: Pop;
  popResults?: { month: number; cost: Pence; takings: Pence }[];
  fran?: number;
  coached?: number;
  mgr?: Manager[];
  skills?: string[];
  lab?: { month: number; up: number; down: number };
  /** Kind of the industry shock or attack waiting for the player's answer (used by the choice events). */
  shock?: string;
  rival?: string;
  attack?: 'light' | 'heavy';
  last?: Record<string, number>;
}
export const playOf = (s: GameState): Play5 => (s.play5 ??= {});
export const lastRevenue = (s: GameState): Pence => { const r = s.history.at(-1); return r ? plSummary(r.period.pl).revenue : 0; };
export const roll5 = (s: GameState, key: string, n = 1000): number => hashSeed(`${s.seedLabel}:${key}`) % n;
const unit = (s: GameState, key: string): number => roll5(s, key) / 1000;
const round100 = (n: number): Pence => Math.round(n / 100) * 100;

// ---------------------------------------------------------------------------------------------
// Supply chain
// ---------------------------------------------------------------------------------------------
export type Supply = 'local' | 'mixed' | 'global';
export const SUPPLY_INFO: Record<Supply, { name: string; blurb: string; cost: number }> = {
  local: { name: 'Local suppliers', blurb: 'Unit costs 2% higher, but no shipping disruption ever.', cost: 1.02 },
  mixed: { name: 'A mix', blurb: 'The normal way. Rare disruptions.', cost: 1 },
  global: { name: 'Cheapest worldwide', blurb: 'Unit costs 3% lower, but ports, strikes and weather can close the chain for a few months.', cost: 0.97 },
};
export const supplyOf = (s: GameState): Supply => s.play5?.supply ?? 'mixed';
export const supplyMult = (s: GameState): number => SUPPLY_INFO[supplyOf(s)].cost;
export const SUPPLY_COOLDOWN = 6;
export const supplyFee = (s: GameState): Pence => Math.max(500_00, round100(lastRevenue(s) * 0.5));
export function supplyCheck(s: GameState, to: string): { ok: boolean; reason?: string; fee: Pence } {
  const fee = supplyFee(s);
  if (!(to in SUPPLY_INFO)) return { ok: false, reason: 'Unknown sourcing choice.', fee };
  if (to === supplyOf(s)) return { ok: false, reason: 'You already source that way.', fee };
  const since = s.play5?.supplySince;
  if (since !== undefined && s.month - since < SUPPLY_COOLDOWN) return { ok: false, reason: `Switching again needs ${SUPPLY_COOLDOWN - (s.month - since)} more months.`, fee };
  if (s.ledger.balances.cash < fee) return { ok: false, reason: `Switching costs ${formatGBP(fee)}.`, fee };
  return { ok: true, fee };
}
export function setSupply(s: GameState, to: Supply): void {
  const fee = supplyFee(s);
  post(s.ledger, s.month, `Changing suppliers: ${SUPPLY_INFO[to].name}`, [dr('otherCosts', fee), cr('cash', fee)], { cf: 'operating' });
  const p = playOf(s); p.supply = to; p.supplySince = s.month;
  logItem(s, 'action', `Sourcing: ${SUPPLY_INFO[to].name}`, SUPPLY_INFO[to].blurb);
}

// ---------------------------------------------------------------------------------------------
// Product lifecycle
// ---------------------------------------------------------------------------------------------
export const REFRESH_MIN_AGE = 18;
export const productAge = (s: GameState): number => s.month - (s.play5?.refreshed ?? 0);
export const lifeStage = (s: GameState): 'launch' | 'peak' | 'ageing' | 'tired' => { const a = productAge(s); return a < 12 ? 'launch' : a < 30 ? 'peak' : a < 48 ? 'ageing' : 'tired'; };
/** Old products sell a little less; a refresh resets the clock. */
export const lifeMult = (s: GameState): number => { const a = productAge(s); return a >= 48 ? 0.96 : a >= 30 ? 0.98 : 1; };
export const refreshFee = (s: GameState): Pence => Math.max(2_000_00, round100(lastRevenue(s) * 0.4));
export function refreshCheck(s: GameState): { ok: boolean; reason?: string; fee: Pence } {
  const fee = refreshFee(s);
  if (productAge(s) < REFRESH_MIN_AGE) return { ok: false, reason: `A product needs ${REFRESH_MIN_AGE} months in the market before a refresh is worth it.`, fee };
  if (s.ledger.balances.cash < fee) return { ok: false, reason: `A refresh costs ${formatGBP(fee)}.`, fee };
  return { ok: true, fee };
}

// ---------------------------------------------------------------------------------------------
// Pop-up shops
// ---------------------------------------------------------------------------------------------
export const POP_TIERS = [
  { name: 'Market stall', k: 0.02, floor: 500_00 },
  { name: 'Shop-in-shop', k: 0.05, floor: 1_500_00 },
  { name: 'Festival stand', k: 0.1, floor: 4_000_00 },
];
export const popCost = (s: GameState, tier: number): Pence => { const t = POP_TIERS[tier]; return t ? round100(Math.max(t.floor, lastRevenue(s) * t.k)) : 0; };
export function popCheck(s: GameState, tier: number): { ok: boolean; reason?: string; cost: Pence } {
  const cost = popCost(s, tier);
  if (!POP_TIERS[tier]) return { ok: false, reason: 'Unknown pop-up.', cost };
  if (s.month < 3) return { ok: false, reason: 'Open your first months before a pop-up.', cost };
  if (s.play5?.pop) return { ok: false, reason: 'A pop-up is already running.', cost };
  if (s.ledger.balances.cash < cost) return { ok: false, reason: `It costs ${formatGBP(cost)}.`, cost };
  return { ok: true, cost };
}
export function startPop(s: GameState, tier: number): void {
  const cost = popCost(s, tier);
  post(s.ledger, s.month, `Pop-up: ${POP_TIERS[tier].name}`, [dr('marketing', cost), cr('cash', cost)], { cf: 'operating' });
  playOf(s).pop = { month: s.month, cost, tier };
  logItem(s, 'action', `A ${POP_TIERS[tier].name.toLowerCase()} opens`, `You spent ${formatGBP(cost)}. Takings come in next month and depend on the season and your brand.`);
}
export function popTakings(s: GameState, p: Pop): Pence {
  const ind = industryOf(s);
  const season = ind.seasonality[(p.month + 1) % 12] ?? 1;
  const factor = (0.45 + unit(s, `pop:${p.month}`) * 1.6) * season * (0.85 + Math.min(1, s.brand / 300) * 0.4) * (1 + p.tier * 0.1);
  return Math.round(p.cost * factor);
}

// ---------------------------------------------------------------------------------------------
// Pricing lab
// ---------------------------------------------------------------------------------------------
export const LAB_COOLDOWN = 6;
export const labFee = (s: GameState): Pence => Math.max(500_00, round100(lastRevenue(s) * 0.01));
export function labCheck(s: GameState): { ok: boolean; reason?: string; fee: Pence } {
  const fee = labFee(s);
  const last = s.play5?.lab?.month;
  if (lastRevenue(s) <= 0) return { ok: false, reason: 'You need some sales to test prices on.', fee };
  if (last !== undefined && s.month - last < LAB_COOLDOWN) return { ok: false, reason: `Wait ${LAB_COOLDOWN - (s.month - last)} more months for a fresh test.`, fee };
  if (s.ledger.balances.cash < fee) return { ok: false, reason: `A test costs ${formatGBP(fee)}.`, fee };
  return { ok: true, fee };
}
/** What a 5% price change would do to monthly revenue, measured on your customers (a noisy guess around the sector's elasticity). */
export function labResult(s: GameState): { up: number; down: number } {
  const e = industryOf(s).priceElasticity * (0.85 + unit(s, `lab:${s.month}`) * 0.3);
  const f = (dp: number): number => Math.round(((1 + dp) * (1 - e * dp) - 1) * 1000) / 10;
  return { up: f(0.05), down: f(-0.05) };
}
export function runLab(s: GameState): void {
  const fee = labFee(s);
  post(s.ledger, s.month, 'Pricing lab: test', [dr('otherCosts', fee), cr('cash', fee)], { cf: 'operating' });
  const r = labResult(s);
  playOf(s).lab = { month: s.month, ...r };
  logItem(s, 'action', 'Pricing lab results', `Raising your price 5% would move revenue by ${r.up >= 0 ? '+' : ''}${r.up}%. Cutting it 5% would move revenue by ${r.down >= 0 ? '+' : ''}${r.down}%.`);
}

// ---------------------------------------------------------------------------------------------
// Franchise standards
// ---------------------------------------------------------------------------------------------
export const franRating = (s: GameState): number => s.play5?.fran ?? 70;
export const COACH_COOLDOWN = 3;
export const coachFee = (s: GameState): Pence => Math.max(1_000_00, round100(lastRevenue(s) * 0.03));
export function coachCheck(s: GameState): { ok: boolean; reason?: string; fee: Pence } {
  const fee = coachFee(s);
  if (!franchiseCount(s)) return { ok: false, reason: 'You have no franchises.', fee };
  const last = s.play5?.coached;
  if (last !== undefined && s.month - last < COACH_COOLDOWN) return { ok: false, reason: 'Your coaches have only just visited.', fee };
  if (s.ledger.balances.cash < fee) return { ok: false, reason: `Coaching costs ${formatGBP(fee)}.`, fee };
  return { ok: true, fee };
}
export function coachFranchises(s: GameState): void {
  const fee = coachFee(s);
  post(s.ledger, s.month, 'Franchise coaching visits', [dr('otherCosts', fee), cr('cash', fee)], { cf: 'operating' });
  const p = playOf(s); p.fran = Math.min(100, franRating(s) + 20); p.coached = s.month;
  logItem(s, 'action', 'Franchise standards coached', `Franchisee rating is now ${p.fran} out of 100.`);
}

// ---------------------------------------------------------------------------------------------
// Managers
// ---------------------------------------------------------------------------------------------
export const MAX_MANAGERS = 3;
const FIRST = ['Priya', 'Tom', 'Aisha', 'Marcus', 'Elena', 'Jamal', 'Sophie', 'Kenji', 'Rosa', 'Oliver'];
const LAST = ['Okafor', 'Lindqvist', 'Brennan', 'Haddad', 'Moreau', 'Walsh', 'Tanaka', 'Novak', 'Reyes', 'Patel'];
export const TRAITS: Record<Manager['trait'], string> = { steady: 'Steady: morale +1 a month', bold: 'Bold: demand +1%', frugal: 'Frugal: unit costs 1% lower' };
export const mgrOf = (s: GameState): Manager[] => s.play5?.mgr ?? [];
export const promoteFee = (s: GameState, role: RoleId): Pence => round100((industryOf(s).roles[role].salary * s.salaryIndex * 0.5));
export function promoteCheck(s: GameState, role: string): { ok: boolean; reason?: string; fee: Pence } {
  if (!(ROLE_IDS as string[]).includes(role)) return { ok: false, reason: 'Unknown team.', fee: 0 };
  const r = role as RoleId; const fee = promoteFee(s, r);
  if (mgrOf(s).length >= MAX_MANAGERS) return { ok: false, reason: `At most ${MAX_MANAGERS} managers.`, fee };
  if (mgrOf(s).some((m) => m.role === r)) return { ok: false, reason: 'That team already has a manager.', fee };
  if (s.staff[r] < 3) return { ok: false, reason: 'You need at least three people in the team.', fee };
  if (s.ledger.balances.cash < fee) return { ok: false, reason: `The promotion and pay rise cost ${formatGBP(fee)}.`, fee };
  return { ok: true, fee };
}
export function promote(s: GameState, role: RoleId): void {
  const fee = promoteFee(s, role);
  post(s.ledger, s.month, `Promotion to ${role} manager`, [dr('wages', fee), cr('cash', fee)], { cf: 'operating' });
  const h = hashSeed(`${s.seedLabel}:mgr:${s.month}:${role}`);
  const m: Manager = { name: `${FIRST[h % FIRST.length]} ${LAST[(h >>> 4) % LAST.length]}`, role, trait: (['steady', 'bold', 'frugal'] as const)[(h >>> 9) % 3], since: s.month };
  playOf(s).mgr = [...mgrOf(s), m];
  logItem(s, 'milestone', `${m.name} becomes ${role} manager`, `${TRAITS[m.trait]}. Capacity +1.5%. A manager can be lured away if morale sinks.`);
}
export const mgrCapacity = (s: GameState): number => 1 + 0.015 * mgrOf(s).length;
export const mgrDemand = (s: GameState): number => (mgrOf(s).some((m) => m.trait === 'bold') ? 1.01 : 1);
export const mgrCost = (s: GameState): number => (mgrOf(s).some((m) => m.trait === 'frugal') ? 0.99 : 1);
export const mgrMorale = (s: GameState): number => mgrOf(s).filter((m) => m.trait === 'steady').length;

// ---------------------------------------------------------------------------------------------
// Department focus: three branches, one point a year
// ---------------------------------------------------------------------------------------------
export interface Node { id: string; branch: 'finance' | 'ops' | 'brand'; name: string; text: string }
export const NODES: Node[] = [
  { id: 'fin1', branch: 'finance', name: 'Tidy books', text: 'Loans cost 0.3% less.' },
  { id: 'fin2', branch: 'finance', name: 'Bank relationship', text: 'Loans cost a further 0.3% less.' },
  { id: 'fin3', branch: 'finance', name: 'Treasury desk', text: 'Overdraft limit 10% larger.' },
  { id: 'ops1', branch: 'ops', name: 'Shift planning', text: 'Capacity +1.5%.' },
  { id: 'ops2', branch: 'ops', name: 'Lean line', text: 'Capacity +1.5% more.' },
  { id: 'ops3', branch: 'ops', name: 'Bulk buying', text: 'Unit costs 1.5% lower.' },
  { id: 'brd1', branch: 'brand', name: 'Local press', text: 'Demand +1%.' },
  { id: 'brd2', branch: 'brand', name: 'Fan club', text: 'Demand +1% more.' },
  { id: 'brd3', branch: 'brand', name: 'Sticky brand', text: 'Cancellations 5% lower.' },
];
export const nodesOf = (s: GameState): string[] => s.play5?.skills ?? [];
export const hasNode = (s: GameState, id: string): boolean => nodesOf(s).includes(id);
export const pointsLeft = (s: GameState): number => Math.max(0, Math.floor(s.month / 12) - nodesOf(s).length);
export function nodeCheck(s: GameState, id: string): { ok: boolean; reason?: string } {
  const n = NODES.find((x) => x.id === id);
  if (!n) return { ok: false, reason: 'Unknown skill.' };
  if (hasNode(s, id)) return { ok: false, reason: 'You already have that.' };
  const before = NODES.filter((x) => x.branch === n.branch)[NODES.filter((x) => x.branch === n.branch).indexOf(n) - 1];
  if (before && !hasNode(s, before.id)) return { ok: false, reason: `Take ${before.name} first.` };
  if (pointsLeft(s) < 1) return { ok: false, reason: 'No points to spend. You earn one every year.' };
  return { ok: true };
}
export function takeNode(s: GameState, id: string): void {
  const n = NODES.find((x) => x.id === id)!;
  playOf(s).skills = [...nodesOf(s), id];
  logItem(s, 'milestone', `Department focus: ${n.name}`, n.text);
}

// ---------------------------------------------------------------------------------------------
// Cyber security
// ---------------------------------------------------------------------------------------------
export const SECURITY_LEVELS = [
  { name: 'Basic', pct: 0, risk: 0.012, blurb: 'Passwords and hope.' },
  { name: 'Managed', pct: 0.003, risk: 0.006, blurb: 'Monitoring and backups: 0.3% of sales a month.' },
  { name: 'Hardened', pct: 0.008, risk: 0.002, blurb: 'A security team and drills: 0.8% of sales a month.' },
];
export const securityOf = (s: GameState): 0 | 1 | 2 => s.play5?.security ?? 0;
export const securityCost = (s: GameState): Pence => Math.round(lastRevenue(s) * SECURITY_LEVELS[securityOf(s)].pct);
export function securityCheck(s: GameState, level: number): { ok: boolean; reason?: string } {
  if (!SECURITY_LEVELS[level]) return { ok: false, reason: 'Unknown level.' };
  if (level === securityOf(s)) return { ok: false, reason: 'That is your current level.' };
  return { ok: true };
}
export function setSecurity(s: GameState, level: 0 | 1 | 2): void {
  playOf(s).security = level;
  logItem(s, 'action', `Security: ${SECURITY_LEVELS[level].name}`, SECURITY_LEVELS[level].blurb);
}

// ---------------------------------------------------------------------------------------------
// Multipliers used by modifiers.ts
// ---------------------------------------------------------------------------------------------
export const play5Capacity = (s: GameState): number => mgrCapacity(s) * (hasNode(s, 'ops1') ? 1.015 : 1) * (hasNode(s, 'ops2') ? 1.015 : 1);
export const play5Cost = (s: GameState): number => supplyMult(s) * mgrCost(s) * (hasNode(s, 'ops3') ? 0.985 : 1);
export const play5Demand = (s: GameState): number => lifeMult(s) * mgrDemand(s) * (hasNode(s, 'brd1') ? 1.01 : 1) * (hasNode(s, 'brd2') ? 1.01 : 1);
export const play5Churn = (s: GameState): number => (hasNode(s, 'brd3') ? 0.95 : 1);
export const play5Spread = (s: GameState): number => -(hasNode(s, 'fin1') ? 0.003 : 0) - (hasNode(s, 'fin2') ? 0.003 : 0);
export const play5Overdraft = (s: GameState): number => (hasNode(s, 'fin3') ? 1.1 : 1);
/** Everything above that modifiers.ts caches on (so a change in one of them is never missed). */
export const play5Key = (s: GameState): string => `${supplyOf(s)}${Math.floor(productAge(s) / 6)}${mgrOf(s).map((m) => m.role[0] + m.trait[0]).join('')}${skillsKey(s)}`;
const skillsKey = (s: GameState): string => (s.play5?.skills ?? []).join('');

// ---------------------------------------------------------------------------------------------
// Awards night and the company timeline (read-only, built from what already happened)
// ---------------------------------------------------------------------------------------------
export interface YearRecap { year: number; revenue: Pence; profit: Pence; best: { month: number; profit: Pence }; worst: { month: number; profit: Pence }; awards: string[]; staff: number }
export function yearRecap(s: GameState, year: number): YearRecap | null {
  const rows = s.history.filter((h) => Math.floor(h.month / 12) === year);
  if (rows.length < 12) return null;
  const pl = rows.map((r) => ({ month: r.month, ...plSummary(r.period.pl) }));
  const profit = (x: { profit: Pence }): Pence => x.profit;
  const best = pl.reduce((a, b) => (profit(b) > profit(a) ? b : a));
  const worst = pl.reduce((a, b) => (profit(b) < profit(a) ? b : a));
  return {
    year, revenue: pl.reduce((a, x) => a + x.revenue, 0), profit: pl.reduce((a, x) => a + x.profit, 0),
    best: { month: best.month, profit: best.profit }, worst: { month: worst.month, profit: worst.profit },
    awards: (s.awards ?? []).filter((a) => a.year === year).map((a) => a.id), staff: rows.at(-1)?.kpis.headcount ?? 0,
  };
}
export const recapYears = (s: GameState): number[] => { const out: number[] = []; for (let y = 0; y < Math.floor(s.month / 12); y++) if (yearRecap(s, y)) out.push(y); return out; };
export interface TimelineItem { month: number; title: string; text: string }
export function timelineOf(s: GameState): TimelineItem[] {
  return s.log.filter((l) => l.kind === 'milestone').map((l) => ({ month: l.month, title: l.title, text: l.text })).reverse().slice(0, 80);
}
