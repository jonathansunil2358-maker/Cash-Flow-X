import { cr, dr, post } from '../ledger/journal';
import { plSummary } from '../ledger/statements';
import { formatGBP, type Pence } from '../money';
import { hashSeed } from '../rng';
import { INDUSTRIES, INDUSTRY_IDS, type IndustryId } from './industries';
import { logItem, newId, type GameState } from './state';

/**
 * Big strategy: a second-sector subsidiary, a yearly draft of one of three boons, a stance on the economic
 * cycle, a green track and ESG. Deterministic (hashes, never dice) and held in one optional state object.
 */
export interface Strat {
  subs?: { sector: IndustryId; stake: Pence; since: number }[];
  boons?: string[];
  stance?: 'defensive' | 'neutral' | 'expansion';
  stanceSince?: number;
  green?: string[];
  donations?: number[];
  donatedTotal?: Pence;
}
export const stratOf = (s: GameState): Strat => (s.strat ??= {});
const lastRevenue = (s: GameState): Pence => { const r = s.history.at(-1); return r ? plSummary(r.period.pl).revenue : 0; };
const equityOf = (s: GameState): Pence => s.history.at(-1)?.valuation?.equityValue ?? 0;
const roll = (s: GameState, key: string, n = 1000): number => hashSeed(`${s.seedLabel}:${key}`) % n;

// ---------------------------------------------------------------------------------------------
// 17. Subsidiaries
// ---------------------------------------------------------------------------------------------
export const SUB_MIN_MONTH = 36;
export const SUB_MIN_VALUE = 2_000_000_00;
export const MAX_SUBS = 2;
export const subStake = (s: GameState): Pence => Math.max(50_000_00, Math.round((equityOf(s) * 0.1) / 10000) * 10000);
export const subsOf = (s: GameState) => s.strat?.subs ?? [];
export function subCheck(s: GameState, sector: string): { ok: boolean; reason?: string; stake: Pence } {
  const stake = subStake(s);
  if (!(INDUSTRY_IDS as readonly string[]).includes(sector)) return { ok: false, reason: 'Unknown sector.', stake };
  if (sector === s.industryId) return { ok: false, reason: 'A subsidiary must be in a different sector.', stake };
  if (subsOf(s).some((x) => x.sector === sector)) return { ok: false, reason: 'You already run a subsidiary there.', stake };
  if (subsOf(s).length >= MAX_SUBS) return { ok: false, reason: `At most ${MAX_SUBS} subsidiaries.`, stake };
  if (s.month < SUB_MIN_MONTH) return { ok: false, reason: `Wait until month ${SUB_MIN_MONTH + 1}.`, stake };
  if (equityOf(s) < SUB_MIN_VALUE) return { ok: false, reason: `The group must be worth ${formatGBP(SUB_MIN_VALUE, { compact: true })} first.`, stake };
  if (s.ledger.balances.cash < stake) return { ok: false, reason: `Founding it needs ${formatGBP(stake)}.`, stake };
  return { ok: true, stake };
}
export function foundSub(s: GameState, sector: IndustryId): void {
  const stake = subStake(s);
  post(s.ledger, s.month, `Founding a subsidiary: ${INDUSTRIES[sector].name}`, [dr('investments', stake), cr('cash', stake)], { cf: 'investing', cfLabel: 'Net (purchase)/sale of short-term investments' });
  stratOf(s).subs = [...subsOf(s), { sector, stake, since: s.month }];
  logItem(s, 'milestone', `A new subsidiary: ${INDUSTRIES[sector].name}`, `You put ${formatGBP(stake)} into a second business. It pays you a monthly return that follows its sector's seasons, and now and then has a bad month.`);
}
/** Monthly return on a subsidiary's stake: its sector's margin, its seasons, and an occasional bad month. */
export const subReturn = (s: GameState, sector: IndustryId, stake: Pence, month: number): Pence => {
  const ind = INDUSTRIES[sector];
  const base = ind.targetEbitdaMargin * 0.08 * (ind.seasonality[month % 12] ?? 1);
  return Math.round(stake * base);
};

// ---------------------------------------------------------------------------------------------
// 18. Boons draft
// ---------------------------------------------------------------------------------------------
export interface Boon { id: string; name: string; text: string }
export const BOONS: Boon[] = [
  { id: 'demand', name: 'Word of mouth', text: 'Demand +2% for good.' },
  { id: 'costs', name: 'Lean suppliers', text: 'Unit costs 2% lower for good.' },
  { id: 'capacity', name: 'Well-oiled machine', text: 'Capacity +2% for good.' },
  { id: 'churn', name: 'Sticky product', text: 'Cancellations 6% lower for good.' },
  { id: 'credit', name: 'Banker friends', text: 'Loans cost 0.5% less for good.' },
  { id: 'quality', name: 'Perfectionists', text: 'Quality improves 0.03 more every month.' },
  { id: 'brand', name: 'A famous face', text: 'Brand +20 now.' },
  { id: 'rep', name: 'A good name', text: 'Reputation +5 now.' },
  { id: 'hiring', name: "Recruiter's mate", text: 'Recruitment fees 10% lower for good.' },
];
export const boonsOf = (s: GameState): string[] => s.strat?.boons ?? [];
export const hasBoon = (s: GameState, id: string): boolean => boonsOf(s).includes(id);
export const boonsDue = (s: GameState): number => Math.max(0, Math.floor(s.month / 12) - boonsOf(s).length);
export function boonOffer(s: GameState): Boon[] {
  const owned = new Set(boonsOf(s));
  const pool = BOONS.filter((b) => !owned.has(b.id));
  const out: Boon[] = [];
  for (let i = 0; i < 3 && pool.length; i++) out.push(pool.splice(roll(s, `boon:${boonsOf(s).length}:${i}`, pool.length), 1)[0]);
  return out;
}
export function boonCheck(s: GameState, id: string): { ok: boolean; reason?: string } {
  if (boonsDue(s) < 1) return { ok: false, reason: 'No boon is due yet: one arrives each year.' };
  if (!boonOffer(s).some((b) => b.id === id)) return { ok: false, reason: 'That card is not on offer.' };
  return { ok: true };
}
export function pickBoon(s: GameState, id: string): void {
  stratOf(s).boons = [...boonsOf(s), id];
  if (id === 'brand') s.brand += 20;
  if (id === 'rep') s.reputation = Math.min(100, s.reputation + 5);
  logItem(s, 'milestone', `Boon chosen: ${BOONS.find((b) => b.id === id)!.name}`, BOONS.find((b) => b.id === id)!.text);
}

// ---------------------------------------------------------------------------------------------
// 19. Cycle desk
// ---------------------------------------------------------------------------------------------
export const STANCE_COOLDOWN = 6;
export const STANCES = [
  { id: 'defensive', name: 'Defensive', blurb: 'Cushion the bad times: you recover half of any slump, but give up 1% of demand in good times.' },
  { id: 'neutral', name: 'Neutral', blurb: 'No bets either way.' },
  { id: 'expansion', name: 'Expansion', blurb: 'Lean into the cycle: half again as much in a boom, half again as much lost in a slump.' },
] as const;
export const stanceOf = (s: GameState): 'defensive' | 'neutral' | 'expansion' => s.strat?.stance ?? 'neutral';
export function stanceFactor(s: GameState): number {
  const econ = s.economy.demandMult;
  const st = stanceOf(s);
  if (st === 'defensive') return econ < 1 ? 1 + (1 - econ) * 0.5 : 0.99;
  if (st === 'expansion') return econ >= 1 ? 1 + (econ - 1) * 0.5 : 1 - (1 - econ) * 0.5;
  return 1;
}
export function stanceCheck(s: GameState, id: string): { ok: boolean; reason?: string } {
  if (!STANCES.some((x) => x.id === id)) return { ok: false, reason: 'Unknown stance.' };
  if (stanceOf(s) === id) return { ok: false, reason: 'That is already your stance.' };
  const since = s.strat?.stanceSince;
  if (since !== undefined && s.month - since < STANCE_COOLDOWN) return { ok: false, reason: `Hold your stance for six months: change again in month ${since + STANCE_COOLDOWN + 1}.` };
  return { ok: true };
}
export function setStance(s: GameState, id: 'defensive' | 'neutral' | 'expansion'): void {
  const st = stratOf(s); st.stance = id; st.stanceSince = s.month;
  logItem(s, 'action', `Cycle stance: ${STANCES.find((x) => x.id === id)!.name}`, STANCES.find((x) => x.id === id)!.blurb);
}
/** The next quarterly rate decision the central bank is leaning towards, from the same seed as everything else. */
export function rateOutlook(s: GameState): 'rise' | 'hold' | 'fall' {
  const r = roll(s, `rate:${Math.floor(s.month / 3)}`, 10);
  return r < 3 ? 'fall' : r < 7 ? 'hold' : 'rise';
}

// ---------------------------------------------------------------------------------------------
// 20. Green track
// ---------------------------------------------------------------------------------------------
export const GREEN_STEPS = [
  { id: 'solar', name: 'Solar panels', blurb: 'Cuts rent and energy costs 6% for good.', cost: 4 },
  { id: 'recycle', name: 'Recycling and repair', blurb: 'Unit costs 1.5% lower for good.', cost: 3 },
  { id: 'certify', name: 'Green certification', blurb: 'Reputation +4 and demand +1.5%, with a yearly audit fee.', cost: 2 },
];
export const greenOf = (s: GameState): string[] => s.strat?.green ?? [];
export const hasGreen = (s: GameState, id: string): boolean => greenOf(s).includes(id);
export const greenCost = (s: GameState, id: string): Pence => Math.max(5_000_00, Math.round((lastRevenue(s) * (GREEN_STEPS.find((g) => g.id === id)?.cost ?? 0)) / 10000) * 10000);
export function greenCheck(s: GameState, id: string): { ok: boolean; reason?: string; cost: Pence } {
  const cost = greenCost(s, id);
  if (!GREEN_STEPS.some((g) => g.id === id)) return { ok: false, reason: 'Unknown step.', cost };
  if (hasGreen(s, id)) return { ok: false, reason: 'Already done.', cost };
  if (lastRevenue(s) <= 0) return { ok: false, reason: 'You need sales first.', cost };
  if (s.ledger.balances.cash < cost) return { ok: false, reason: `It costs ${formatGBP(cost)}.`, cost };
  return { ok: true, cost };
}
export function goGreen(s: GameState, id: string): void {
  const cost = greenCost(s, id);
  if (id === 'certify') post(s.ledger, s.month, 'Green certification: assessment and fees', [dr('otherCosts', cost), cr('cash', cost)], { cf: 'operating' });
  else post(s.ledger, s.month, `Green investment: ${GREEN_STEPS.find((g) => g.id === id)!.name}`, [dr('ppe', cost), cr('cash', cost)], { cf: 'investing', cfLabel: 'Purchase of property, plant & equipment' });
  if (id !== 'certify') s.ppeAssets.push({ id: newId(s, 'A'), label: GREEN_STEPS.find((g) => g.id === id)!.name, cost, lifeMonths: 120, accumulated: 0 });
  stratOf(s).green = [...greenOf(s), id];
  if (id === 'certify') s.reputation = Math.min(100, s.reputation + 4);
  logItem(s, 'milestone', `Green step: ${GREEN_STEPS.find((g) => g.id === id)!.name}`, `Cost ${formatGBP(cost)}. ${GREEN_STEPS.find((g) => g.id === id)!.blurb}`);
}

// ---------------------------------------------------------------------------------------------
// 21. Charity and ESG
// ---------------------------------------------------------------------------------------------
export const DONATE_COOLDOWN = 3;
export const donationMin = (s: GameState): Pence => Math.max(1_000_00, Math.round((lastRevenue(s) * 0.02) / 10000) * 10000);
export function donateCheck(s: GameState, amount: number): { ok: boolean; reason?: string } {
  const min = donationMin(s);
  const last = (s.strat?.donations ?? []).at(-1);
  if (!Number.isSafeInteger(amount) || amount < min) return { ok: false, reason: `The smallest gift that counts is ${formatGBP(min)}.` };
  if (amount > Math.floor(s.ledger.balances.cash * 0.2)) return { ok: false, reason: 'Give at most a fifth of your cash at a time.' };
  if (last !== undefined && s.month - last < DONATE_COOLDOWN) return { ok: false, reason: 'Wait a quarter between gifts.' };
  return { ok: true };
}
export function donate(s: GameState, amount: Pence): void {
  post(s.ledger, s.month, 'Charitable donation', [dr('otherCosts', amount), cr('cash', amount)], { cf: 'operating' });
  const st = stratOf(s);
  st.donations = [...(st.donations ?? []), s.month].slice(-6);
  st.donatedTotal = (st.donatedTotal ?? 0) + amount;
  s.reputation = Math.min(100, s.reputation + 1.5);
  logItem(s, 'action', 'A gift to charity', `You gave ${formatGBP(amount)}. People noticed: reputation +1.5.`);
}
export interface Esg { score: number; rating: 'A' | 'B' | 'C' | 'D'; parts: [string, number][] }
export function esgOf(s: GameState): Esg {
  const green = greenOf(s).length * 15;
  const gifts = Math.min(30, (s.strat?.donations ?? []).filter((m) => s.month - m < 12).length * 10);
  const people = s.morale >= 65 ? 15 : s.morale >= 50 ? 8 : 0;
  const trust = s.reputation >= 70 ? 10 : s.reputation >= 55 ? 5 : 0;
  const score = Math.min(100, green + gifts + people + trust);
  return { score, rating: score >= 70 ? 'A' : score >= 45 ? 'B' : score >= 25 ? 'C' : 'D', parts: [['Green steps', green], ['Giving this year', gifts], ['Team morale', people], ['Reputation', trust]] };
}
export const esgSpreadDelta = (s: GameState): number => (s.strat ? (esgOf(s).rating === 'A' ? -0.0025 : 0) : 0);

// ---------------------------------------------------------------------------------------------
// Monthly
// ---------------------------------------------------------------------------------------------
export function advanceStrategy(s: GameState, simulation: boolean): void {
  const st = s.strat;
  if (!st) return;
  for (const sub of st.subs ?? []) {
    if (roll(s, `subbad:${sub.sector}:${s.month}`, 100) < 4) {
      const loss = Math.round(sub.stake * 0.05);
      post(s.ledger, s.month, `Subsidiary loss: ${INDUSTRIES[sub.sector].name}`, [dr('fairValueGains', loss), cr('investments', loss)], { cf: 'none' });
      sub.stake -= loss;
      if (!simulation) logItem(s, 'warning', `A bad month at your ${INDUSTRIES[sub.sector].name.toLowerCase()} subsidiary`, `It lost ${formatGBP(loss)} of its value.`);
    } else {
      const ret = subReturn(s, sub.sector, sub.stake, s.month);
      if (ret > 0) post(s.ledger, s.month, `Subsidiary profit share: ${INDUSTRIES[sub.sector].name}`, [dr('cash', ret), cr('otherIncome', ret)], { cf: 'operating' });
    }
  }
  if (hasGreen(s, 'certify') && s.month % 12 === 0 && lastRevenue(s) > 0) {
    const fee = Math.round(lastRevenue(s) * 0.002);
    if (fee > 0) post(s.ledger, s.month, 'Green certification: yearly audit', [dr('otherCosts', fee), cr('cash', fee)], { cf: 'operating' });
  }
}
