import { cr, dr, post } from '../ledger/journal';
import { plSummary } from '../ledger/statements';
import { formatGBP, type Pence } from '../money';
import { hashSeed } from '../rng';
import { adjustReputation } from './events';
import { acceptInvestment, investmentAllowed } from './investors';
import { openMarkets } from './export';
import { logItem, ownership, type GameState } from './state';

/**
 * Deals and money: buy a rival, sell the company to a bidder, take a venture-capital round, run a
 * crowdfunding campaign, hedge currency and costs, and file patents. Everything here is deterministic
 * (hashes of the company seed, never the dice) and kept in one small optional state object.
 */
export interface Deals {
  acquired?: number;
  goodwill?: Pence;
  /** Integration of the last acquisition: monthly cost until `end`, impairment test at `test`. */
  integration?: { end: number; monthly: Pence; test: number };
  /** Added to (or taken from) the final score by the way the company was sold or financed. */
  saleBonus?: Pence;
  vcPref?: Pence;
  vcYear?: number;
  crowd?: { goal: Pence; end: number; ok: boolean; tier: number; pledged?: Pence; per?: Pence; left?: number };
  hedgeFx?: number;
  hedgeCost?: { end: number; mult: number };
  patents?: { filed: number; granted: boolean; decided: boolean; fee: Pence }[];
}
export const dealsOf = (s: GameState): Deals => (s.deals ??= {});

const lastRevenue = (s: GameState): Pence => { const r = s.history.at(-1); return r ? plSummary(r.period.pl).revenue : 0; };
const equityOf = (s: GameState): Pence => s.history.at(-1)?.valuation?.equityValue ?? 0;
const roll = (s: GameState, key: string, n = 1000): number => hashSeed(`${s.seedLabel}:${key}`) % n;

// ---------------------------------------------------------------------------------------------
// 1. Acquire a rival
// ---------------------------------------------------------------------------------------------
export const ACQUIRE_MIN_MONTH = 24;
export const MAX_ACQUISITIONS = 2;
export const rivalPrice = (s: GameState, index: number): Pence => {
  const c = s.competitors[index];
  if (!c) return 0;
  return Math.max(20_000_00, Math.round((lastRevenue(s) * 6 * Math.min(2.5, c.strength) * (0.5 + c.quality / 100)) / 10000) * 10000);
};
export function acquireCheck(s: GameState, index: number): { ok: boolean; reason?: string; price: Pence } {
  const price = rivalPrice(s, index);
  const d = dealsOf(s);
  if (!s.competitors[index]) return { ok: false, reason: 'No such rival.', price };
  if (s.competitors.length < 2) return { ok: false, reason: 'You cannot buy the last rival: markets need competition.', price };
  if (s.month < ACQUIRE_MIN_MONTH) return { ok: false, reason: `Sellers want a track record: wait until month ${ACQUIRE_MIN_MONTH + 1}.`, price };
  if ((d.acquired ?? 0) >= MAX_ACQUISITIONS) return { ok: false, reason: `You can make at most ${MAX_ACQUISITIONS} acquisitions.`, price };
  if (d.integration) return { ok: false, reason: 'Finish integrating the last acquisition first.', price };
  if (lastRevenue(s) <= 0) return { ok: false, reason: 'You need sales before you can buy a rival.', price };
  if (s.ledger.balances.cash < price + Math.round(price * 0.03)) return { ok: false, reason: `You need ${formatGBP(price + Math.round(price * 0.03))} in cash.`, price };
  return { ok: true, price };
}
export function acquireRival(s: GameState, index: number): void {
  const price = rivalPrice(s, index);
  const c = s.competitors[index];
  const costs = Math.round(price * 0.03);
  post(s.ledger, s.month, `Acquisition of ${c.name}: price paid above net assets`, [dr('goodwill', price), cr('cash', price)], { cf: 'investing', cfLabel: 'Acquisition of businesses' });
  post(s.ledger, s.month, `Acquisition of ${c.name}: advisers and legal fees`, [dr('dealCosts', costs), cr('cash', costs)], { cf: 'operating' });
  s.competitors.splice(index, 1);
  s.marketSize = Math.round(s.marketSize * 1.06);
  s.morale = Math.max(0, s.morale - 8);
  const d = dealsOf(s);
  d.acquired = (d.acquired ?? 0) + 1;
  d.goodwill = (d.goodwill ?? 0) + price;
  d.integration = { end: s.month + 6, monthly: Math.round(price * 0.015), test: s.month + 12 };
  logItem(s, 'milestone', `You bought ${c.name}`, `Paid ${formatGBP(price)}. Its customers join you (the market you can reach grows 6%), but integration costs ${formatGBP(d.integration.monthly)} a month for six months and the team is unsettled. Goodwill is tested for impairment after a year.`);
}

// ---------------------------------------------------------------------------------------------
// 2. Trade-sale auction
// ---------------------------------------------------------------------------------------------
export const SALE_MIN_MONTH = 36;
export interface Bid { id: string; buyer: string; mult: number; blurb: string }
export function bidsFor(s: GameState): Bid[] {
  const year = Math.floor(s.month / 12);
  const m = (k: string, lo: number, hi: number) => Math.round((lo + (roll(s, `bid:${year}:${k}`) / 1000) * (hi - lo)) * 100) / 100;
  return [
    { id: 'strategic', buyer: 'A strategic buyer', mult: m('s', 1.1, 1.4), blurb: 'A big company in your field wants you for the customers.' },
    { id: 'pe', buyer: 'A private-equity fund', mult: m('p', 1.0, 1.2), blurb: 'A fair price from financial buyers.' },
    { id: 'mbo', buyer: 'Your management team', mult: m('m', 0.88, 1.02), blurb: 'The team buys you out at a friendly price.' },
  ];
}
export function saleCheck(s: GameState): { ok: boolean; reason?: string } {
  if (s.status !== 'playing') return { ok: false, reason: 'This company has ended.' };
  if (s.month < SALE_MIN_MONTH) return { ok: false, reason: `Buyers want a track record: wait until month ${SALE_MIN_MONTH + 1}.` };
  if (equityOf(s) < 50_000_00) return { ok: false, reason: 'The company is not worth selling yet (under £50,000).' };
  return { ok: true };
}
export function tradeSale(s: GameState, bidId: string, asked?: number): void {
  const found = bidsFor(s).find((b) => b.id === bidId);
  if (!found) throw new Error('Unknown bid.');
  const bid = asked === undefined ? found : { ...found, mult: Math.round(asked * 100) / 100 };
  const stake = Math.round(equityOf(s) * ownership(s));
  const d = dealsOf(s);
  d.saleBonus = Math.round((bid.mult - 1) * stake);
  s.status = 'finished';
  s.endReason = `You sold the company to ${bid.buyer.toLowerCase()} at ${bid.mult.toFixed(2)} times its valuation.`;
  logItem(s, 'milestone', `Sold to ${bid.buyer.toLowerCase()}`, `${bid.blurb} The price was ${bid.mult.toFixed(2)} times the valuation, ${d.saleBonus >= 0 ? 'a premium' : 'a discount'} of ${formatGBP(Math.abs(d.saleBonus))} on your stake. It counts in your final score.`);
}

// ---------------------------------------------------------------------------------------------
// 3. Venture-capital round
// ---------------------------------------------------------------------------------------------
export interface VcOffer { id: number; name: string; amount: Pence; preMoney: Pence; terms: string }
export const VC_MIN_MONTH = 12;
export function vcOffers(s: GameState): VcOffer[] {
  const e = equityOf(s);
  const year = Math.floor(s.month / 12);
  const j = (k: string) => 1 + (roll(s, `vc:${year}:${k}`) / 1000 - 0.5) * 0.1;
  const rnd = (n: Pence) => Math.round(n / 10000) * 10000;
  return [
    { id: 0, name: 'Angel network', amount: rnd(e * 0.1), preMoney: rnd(e * 1.0 * j('a')), terms: 'No strings. A small, friendly cheque.' },
    { id: 1, name: 'Growth fund', amount: rnd(e * 0.2), preMoney: rnd(e * 1.15 * j('b')), terms: 'A board seat lends credibility: reputation +3.' },
    { id: 2, name: 'Mega fund', amount: rnd(e * 0.3), preMoney: rnd(e * 1.3 * j('c')), terms: 'The best price, but a liquidation preference: it takes half its money back again before you, counted against your final score.' },
  ];
}
export function vcCheck(s: GameState, i: number): { ok: boolean; reason?: string } {
  const o = vcOffers(s)[i];
  const year = Math.floor(s.month / 12);
  if (!o) return { ok: false, reason: 'No such offer.' };
  if (s.status !== 'playing') return { ok: false, reason: 'This company has ended.' };
  if (s.month < VC_MIN_MONTH) return { ok: false, reason: `Funds want a track record: wait until month ${VC_MIN_MONTH + 1}.` };
  if (equityOf(s) < 50_000_00) return { ok: false, reason: 'Funds will not look until the company is worth £50,000.' };
  if (dealsOf(s).vcYear === year) return { ok: false, reason: 'You already took a round this year.' };
  return investmentAllowed(s, o.amount, o.preMoney);
}
export function takeVc(s: GameState, i: number): void {
  const o = vcOffers(s)[i];
  const year = Math.floor(s.month / 12);
  acceptInvestment(s, { investmentId: `vc${year}-${i}`, investorId: 'vc', investorName: o.name, amount: o.amount, preMoney: o.preMoney });
  const d = dealsOf(s);
  d.vcYear = year;
  if (i === 1) adjustReputation(s, 3);
  if (i === 2) d.vcPref = (d.vcPref ?? 0) + Math.round(o.amount * 0.5);
}

// ---------------------------------------------------------------------------------------------
// 4. Crowdfunding
// ---------------------------------------------------------------------------------------------
export const CROWD_TIERS = [{ name: 'Small', mult: 0.5 }, { name: 'Medium', mult: 1 }, { name: 'Big', mult: 2 }];
export const crowdGoal = (s: GameState, tier: number): Pence => Math.max(5_000_00, Math.round((lastRevenue(s) * (CROWD_TIERS[tier]?.mult ?? 1)) / 10000) * 10000);
export const crowdChance = (s: GameState, tier: number): number => Math.min(0.9, Math.max(0.15, 0.35 + s.reputation / 200 - tier * 0.12));
export function crowdCheck(s: GameState, tier: number): { ok: boolean; reason?: string } {
  if (!CROWD_TIERS[tier]) return { ok: false, reason: 'Unknown campaign size.' };
  if (dealsOf(s).crowd) return { ok: false, reason: 'You already have a campaign running or being delivered.' };
  if (lastRevenue(s) <= 0) return { ok: false, reason: 'Backers need to see you trading first.' };
  const fee = Math.round(crowdGoal(s, tier) * 0.05);
  if (s.ledger.balances.cash < fee) return { ok: false, reason: `The campaign costs ${formatGBP(fee)} to run.` };
  return { ok: true };
}
export function startCrowd(s: GameState, tier: number): void {
  const goal = crowdGoal(s, tier);
  const fee = Math.round(goal * 0.05);
  post(s.ledger, s.month, 'Crowdfunding campaign: video, rewards and platform fee', [dr('marketing', fee), cr('cash', fee)], { cf: 'operating' });
  const ok = roll(s, `crowd:${s.month}`) / 1000 < crowdChance(s, tier);
  dealsOf(s).crowd = { goal, end: s.month + 2, ok, tier };
  logItem(s, 'action', 'Crowdfunding campaign launched', `Goal ${formatGBP(goal)} over two months. Backers' money is a promise: if you reach the goal you owe them their rewards over the next six months.`);
}

// ---------------------------------------------------------------------------------------------
// 5. Hedging
// ---------------------------------------------------------------------------------------------
export const HEDGE_MONTHS = 6;
export function hedgeCheck(s: GameState, kind: 'fx' | 'cost'): { ok: boolean; reason?: string; fee: Pence } {
  const d = dealsOf(s);
  const rev = lastRevenue(s);
  const fee = kind === 'fx' ? Math.round(rev * 0.01 * Math.max(1, openMarkets(s).length)) : Math.round(rev * 0.012);
  if (s.month < 6) return { ok: false, reason: 'Wait until month 7 so the bank knows you.', fee };
  if (rev <= 0) return { ok: false, reason: 'You need sales to hedge.', fee };
  if (kind === 'fx' && !openMarkets(s).length) return { ok: false, reason: 'Open an export market first: there is no currency to hedge.', fee };
  if (kind === 'fx' && (d.hedgeFx ?? -1) >= s.month) return { ok: false, reason: 'The currency is already hedged.', fee };
  if (kind === 'cost' && d.hedgeCost && d.hedgeCost.end >= s.month) return { ok: false, reason: 'Costs are already locked in.', fee };
  if (s.ledger.balances.cash < fee) return { ok: false, reason: `The hedge costs ${formatGBP(fee)}.`, fee };
  return { ok: true, fee };
}
export function buyHedge(s: GameState, kind: 'fx' | 'cost'): void {
  const fee = hedgeCheck(s, kind).fee;
  post(s.ledger, s.month, kind === 'fx' ? 'Currency hedge: forward contracts' : 'Cost hedge: fixed-price supply contract', [dr('otherCosts', fee), cr('cash', fee)], { cf: 'operating' });
  const d = dealsOf(s);
  if (kind === 'fx') d.hedgeFx = s.month + HEDGE_MONTHS;
  else d.hedgeCost = { end: s.month + HEDGE_MONTHS, mult: s.economy.unitCostMult };
  logItem(s, 'action', kind === 'fx' ? 'Currency hedged' : 'Costs locked in', `Cost ${formatGBP(fee)}. For ${HEDGE_MONTHS} months ${kind === 'fx' ? 'currency swings no longer touch your export sales' : 'your unit costs stay where they are today, whatever inflation does (and you give up any fall)'}.`);
}
export const fxHedged = (s: GameState): boolean => (s.deals?.hedgeFx ?? -1) >= s.month;
/** The unit-cost multiplier to use this month: locked while a cost hedge runs. */
export const hedgedCostMult = (s: GameState): number => (s.deals?.hedgeCost && s.deals.hedgeCost.end >= s.month ? s.deals.hedgeCost.mult : s.economy.unitCostMult);

// ---------------------------------------------------------------------------------------------
// 6. Patents
// ---------------------------------------------------------------------------------------------
export const MAX_PATENTS = 3;
export const PATENT_MONTHS = 6;
export const LICENCE_RATE = 0.015;
export const patentFee = (s: GameState): Pence => Math.max(5_000_00, Math.round((lastRevenue(s) * 0.3) / 10000) * 10000);
export const patentChance = (s: GameState): number => Math.min(0.85, 0.5 + s.staff.rnd * 0.02);
export function patentCheck(s: GameState): { ok: boolean; reason?: string; fee: Pence } {
  const fee = patentFee(s);
  const list = dealsOf(s).patents ?? [];
  if (list.length >= MAX_PATENTS) return { ok: false, reason: `You can hold at most ${MAX_PATENTS} patents.`, fee };
  if (list.some((p) => !p.decided)) return { ok: false, reason: 'Wait for the last application to be decided.', fee };
  if (s.staff.rnd < 1) return { ok: false, reason: 'You need someone in R&D to write the application.', fee };
  if (s.ledger.balances.cash < fee) return { ok: false, reason: `Filing costs ${formatGBP(fee)}.`, fee };
  return { ok: true, fee };
}
export function filePatent(s: GameState): void {
  const fee = patentFee(s);
  post(s.ledger, s.month, 'Patent application: attorneys and filing fees', [dr('research', fee), cr('cash', fee)], { cf: 'operating' });
  (dealsOf(s).patents ??= []).push({ filed: s.month, granted: false, decided: false, fee });
  logItem(s, 'action', 'Patent filed', `Cost ${formatGBP(fee)}. A decision takes ${PATENT_MONTHS} months; the better your R&D team, the better the odds (${Math.round(patentChance(s) * 100)}% now).`);
}
export const grantedPatents = (s: GameState): number => (s.deals?.patents ?? []).filter((p) => p.granted).length;

// ---------------------------------------------------------------------------------------------
// Monthly
// ---------------------------------------------------------------------------------------------
export function advanceDeals(s: GameState, simulation: boolean): void {
  const d = s.deals;
  if (!d) return;
  const say = (kind: 'notice' | 'warning' | 'milestone' | 'event', title: string, text: string) => { if (!simulation) logItem(s, kind, title, text); };
  if (d.integration) {
    const g = d.integration;
    if (s.month < g.end) post(s.ledger, s.month, 'Integration of the acquired business', [dr('dealCosts', g.monthly), cr('cash', g.monthly)], { cf: 'operating' });
    if (s.month >= g.test) {
      // Some deals disappoint: a deterministic one-in-four loses a third of the goodwill.
      if (roll(s, `impair:${g.test}`, 100) < 25 && (d.goodwill ?? 0) > 0) {
        const loss = Math.round((d.goodwill ?? 0) / 3);
        post(s.ledger, s.month, 'Goodwill impairment on the acquisition', [dr('impairment', loss), cr('goodwill', loss)], { cf: 'operating' });
        d.goodwill = (d.goodwill ?? 0) - loss;
        say('warning', 'The acquisition disappointed', `Customers did not stay as hoped, so ${formatGBP(loss)} of goodwill was written off.`);
      } else say('milestone', 'The acquisition has bedded in', 'The two businesses now run as one.');
      d.integration = undefined;
    }
  }
  const c = d.crowd;
  if (c) {
    if (c.pledged === undefined && s.month >= c.end) {
      if (c.ok) {
        const pledged = Math.round(c.goal * (1 + (roll(s, `pledge:${c.end}`) / 1000) * 0.4));
        post(s.ledger, s.month, 'Crowdfunding backers: money received before rewards are delivered', [dr('cash', pledged), cr('deferredRevenue', pledged)], { cf: 'operating' });
        c.pledged = pledged; c.left = 6; c.per = Math.round(pledged / 6);
        for (let i = 0; i < 6; i++) s.deferredSchedule[i] += i === 5 ? pledged - c.per * 5 : c.per;
        say('milestone', 'Crowdfunding goal reached!', `Backers pledged ${formatGBP(pledged)}. You now owe them their rewards: it is recognised as revenue over six months.`);
      } else { d.crowd = undefined; say('notice', 'The crowdfunding campaign fell short', 'Not enough backers this time. Nobody is charged; you lost the campaign costs.'); }
    } else if (c.pledged !== undefined && (c.left ?? 0) > 0) {
      c.left = (c.left ?? 0) - 1;
      if (c.left === 0) d.crowd = undefined;
    }
  }
  if (d.patents) {
    for (const p of d.patents) {
      if (!p.decided && s.month >= p.filed + PATENT_MONTHS) {
        p.decided = true;
        p.granted = roll(s, `patent:${p.filed}`) / 1000 < patentChance(s);
        say(p.granted ? 'milestone' : 'notice', p.granted ? 'Patent granted' : 'Patent refused', p.granted ? 'Competitors must now pay to use your idea: licence income starts.' : 'The examiner was not convinced. The fee is gone.');
      }
    }
    const n = grantedPatents(s);
    if (n > 0 && lastRevenue(s) > 0) {
      const income = Math.round(lastRevenue(s) * LICENCE_RATE * n);
      post(s.ledger, s.month, `Patent licence income (${n})`, [dr('cash', income), cr('otherIncome', income)], { cf: 'operating' });
      if (s.month % 12 === 0) {
        const renew = Math.round(n * (d.patents[0]?.fee ?? 0) * 0.2);
        if (renew > 0) post(s.ledger, s.month, 'Patent renewal fees', [dr('otherCosts', renew), cr('cash', renew)], { cf: 'operating' });
      }
    }
  }
}

/** What the sale or financing deals add to (or take from) the final score's wealth. */
export const dealsAdjustment = (s: GameState): Pence => (s.deals?.saleBonus ?? 0) - (s.deals?.vcPref ?? 0);
