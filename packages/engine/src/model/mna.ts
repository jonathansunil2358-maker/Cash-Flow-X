import { cr, dr, post } from '../ledger/journal';
import { formatGBP, type Pence } from '../money';
import { createRng, hashSeed, type Rng } from '../rng';
import { completeAcquisition, generateTargets, targetNetAssets, type CompletionOptions } from './acquisitions';
import { startNamedEvent } from './events';
import { industryOf } from './industries';
import { investmentAllowed, sharesFor } from './investors';
import { loanOffer, spreadFor } from './loans';
import { annualise, trailingPL } from './metrics';
import { cultureOf } from './modifiers-opt';
import { ROLE_IDS } from './industries';
import { logItem, newId, type Acquisition, type AcquisitionTarget, type GameState } from './state';

/**
 * Mergers and acquisitions, version 5. Wraps the yearly target list with a deal room (new listings all year),
 * separate due-diligence checks, negotiation, three ways to pay (cash, part shares, earn-out), an acquisition loan,
 * integration plans with events, competition reviews, bidding wars, hostile bids on rivals, mergers of equals,
 * selling an acquired business, and a negotiated management buyout. Everything is deterministic: hidden facts
 * and rival behaviour come from hashes of the company seed, never from the dice stream.
 */
export type DealPlan = 'fast' | 'steady' | 'separate';
export type BrandPlan = 'target' | 'yours' | 'both';
export type Structure = 'cash' | 'shares' | 'earnout' | 'allshares';
export interface Terms { structure: Structure; loan: boolean; plan: DealPlan; brand: BrandPlan; retention: boolean }
export interface Talk {
  targetId: string;
  status: 'open' | 'agreed' | 'review' | 'dead';
  rounds: number;
  counter?: Pence;
  price?: Pence;
  rival?: { bid: Pence; until: number };
  reviewUntil?: number;
  terms?: Terms;
  note?: string;
}
export interface Integ { name: string; plan: DealPlan; fit: 'good' | 'ok' | 'poor'; start: number; end: number; synergy: Pence; synergyFrom: number; retention?: { monthly: Pence; until: number }; price: Pence; issues: number }
export interface PendingPay { month: number; amount: Pence; kind: 'earnout' | 'legal' | 'capex'; name: string }
export interface Hostile { name: string; bid: Pence; fees: Pence; until: number; premium: number }
export interface Mna { talks?: Talk[]; integrations?: Integ[]; pending?: PendingPay[]; hostile?: Hostile; issue?: string }
export const mnaOf = (s: GameState): Mna => (s.mna ??= {});

const roll = (s: GameState, key: string, n = 1000): number => hashSeed(`${s.seedLabel}:${key}`) % n;
const unit = (s: GameState, key: string): number => roll(s, key) / 1000;
const ownAnnualRevenue = (s: GameState): Pence => { const t = trailingPL(s, 12); return annualise(t.summary.revenue, t.months); };

// ---------------------------------------------------------------------------------------------
// What a seller does not tell you (found by the extra checks)
// ---------------------------------------------------------------------------------------------
export interface Hidden { attrition: number; keyPeople: number; legal: Pence; capex: Pence; culture: string }
const CULTURES = ['culture-frugal', 'culture-bold', 'culture-people', 'culture-steady'];
export function hiddenOf(s: GameState, t: AcquisitionTarget): Hidden {
  const k = (n: string) => unit(s, `hid:${t.id}:${n}`);
  return {
    attrition: Math.round(k('a') * 0.2 * 100) / 100,
    keyPeople: Math.round(k('k') * 0.25 * 100) / 100,
    legal: k('l') < 0.3 ? Math.round((t.askingPrice * (0.02 + k('l2') * 0.06)) / 10000) * 10000 : 0,
    capex: k('c') < 0.4 ? Math.round((t.ppe * k('c2') * 0.5 + 2_000_00) / 10000) * 10000 : 0,
    culture: CULTURES[roll(s, `hid:${t.id}:u`, 4)],
  };
}
export const CHECKS = [
  { id: 'customers', name: 'Customers', blurb: 'How many customers will stay after the deal.' },
  { id: 'people', name: 'People', blurb: 'Which key people might leave, and whether the cultures fit.' },
  { id: 'legal', name: 'Legal', blurb: 'Lawsuits and bills the seller has not mentioned.' },
  { id: 'ops', name: 'Operations', blurb: 'Equipment and systems that need money spent on them.' },
] as const;
export type CheckId = (typeof CHECKS)[number]['id'];
export const checkFee = (t: AcquisitionTarget): Pence => Math.max(3_000_00, Math.round((t.askingPrice * 0.004) / 10000) * 10000);
export const checked = (t: AcquisitionTarget, id: string): boolean => (t.checks ?? []).includes(id);
export function checkAdvice(s: GameState, t: AcquisitionTarget, id: CheckId): string {
  const h = hiddenOf(s, t);
  if (id === 'customers') return h.attrition >= 0.12 ? `Warning: about ${Math.round(h.attrition * 100)}% of its customers are likely to leave after the deal.` : `About ${Math.round(h.attrition * 100)}% of its customers may drift away: nothing alarming.`;
  if (id === 'people') {
    const mine = cultureOf(s.modifiers);
    const fit = fitOf(s, t);
    return `${Math.round(h.keyPeople * 100)}% of its team are flight risks. Culture: ${h.culture.replace('culture-', '')}${mine ? ` against yours (${mine.replace('culture-', '')})` : ''}, a ${fit} fit.`;
  }
  if (id === 'legal') return h.legal > 0 ? `Found a hidden bill of about ${formatGBP(h.legal, { compact: true })}, which you would pay after the deal.` : 'No hidden legal problems.';
  return h.capex > 0 ? `Its kit is tired: expect to spend about ${formatGBP(h.capex, { compact: true })} on it soon after the deal.` : 'Its equipment and systems are in good shape.';
}
const OPPOSITES: Record<string, string> = { 'culture-frugal': 'culture-bold', 'culture-bold': 'culture-frugal', 'culture-people': 'culture-steady', 'culture-steady': 'culture-people' };
export function fitOf(s: GameState, t: AcquisitionTarget): 'good' | 'ok' | 'poor' {
  const mine = cultureOf(s.modifiers); const theirs = hiddenOf(s, t).culture;
  if (!mine) return 'ok';
  return mine === theirs ? 'good' : OPPOSITES[mine] === theirs ? 'poor' : 'ok';
}

// ---------------------------------------------------------------------------------------------
// Synergies
// ---------------------------------------------------------------------------------------------
export interface Synergy { low: Pence; mid: Pence; high: Pence; integration: Pence }
export function synergyOf(s: GameState, t: AcquisitionTarget): Synergy {
  const ind = industryOf(s);
  let savings = 0;
  for (const r of ROLE_IDS) savings += Math.min(t.heads[r], s.staff[r]) * ((ind.roles[r].salary * s.salaryIndex * 1.15) / 12) * 0.25;
  const revenue = (t.annualRevenue / 12) * 0.04 * 0.3;
  const mid = Math.round(savings + revenue);
  return { low: Math.round(mid * 0.5), mid, high: Math.round(mid * 1.5), integration: Math.round(t.askingPrice * 0.03) };
}

// ---------------------------------------------------------------------------------------------
// Negotiation
// ---------------------------------------------------------------------------------------------
export const reservePrice = (s: GameState, t: AcquisitionTarget): Pence =>
  Math.max(targetNetAssets(t) + 25_000, Math.round((t.askingPrice * (0.8 + 0.14 * unit(s, `res:${t.id}`))) / 1000) * 1000);
export const talkOf = (s: GameState, id: string): Talk | undefined => s.mna?.talks?.find((x) => x.targetId === id);
const ensureTalk = (s: GameState, id: string): Talk => {
  const m = mnaOf(s);
  let t = m.talks?.find((x) => x.targetId === id);
  if (!t) { t = { targetId: id, status: 'open', rounds: 0 }; m.talks = [...(m.talks ?? []), t]; }
  return t;
};
export const MAX_ROUNDS = 3;

export function checkCheck(s: GameState, targetId: string, kind: string): { ok: boolean; reason?: string; fee: Pence } {
  const t = s.targets.find((x) => x.id === targetId);
  if (!t) return { ok: false, reason: 'That company is no longer for sale.', fee: 0 };
  const fee = checkFee(t);
  if (!CHECKS.some((c) => c.id === kind)) return { ok: false, reason: 'Unknown check.', fee };
  if (checked(t, kind)) return { ok: false, reason: 'You already did that check.', fee };
  if (s.ledger.balances.cash < fee) return { ok: false, reason: `The check costs ${formatGBP(fee)}.`, fee };
  return { ok: true, fee };
}
export function runCheck(s: GameState, targetId: string, kind: CheckId): void {
  const t = s.targets.find((x) => x.id === targetId)!;
  const fee = checkFee(t);
  post(s.ledger, s.month, `Due diligence (${kind}): ${t.name}`, [dr('dealCosts', fee), cr('cash', fee)], { cf: 'operating' });
  t.checks = [...(t.checks ?? []), kind];
  logItem(s, 'action', `${CHECKS.find((c) => c.id === kind)!.name} check on ${t.name}`, checkAdvice(s, t, kind));
}

export function offerCheck(s: GameState, targetId: string, price: number): { ok: boolean; reason?: string } {
  const t = s.targets.find((x) => x.id === targetId);
  if (!t) return { ok: false, reason: 'That company is no longer for sale.' };
  const talk = talkOf(s, targetId);
  if (talk?.status === 'dead') return { ok: false, reason: 'The seller has walked away.' };
  if (talk?.status === 'agreed' || talk?.status === 'review') return { ok: false, reason: 'You already have a deal in hand.' };
  if (!Number.isSafeInteger(price) || price < targetNetAssets(t) + 10_00) return { ok: false, reason: 'That is below what its assets are worth: no seller would listen.' };
  if (price > t.askingPrice * 1.5) return { ok: false, reason: 'No need to offer that much.' };
  return { ok: true };
}
export function makeOffer(s: GameState, targetId: string, price: Pence): void {
  const t = s.targets.find((x) => x.id === targetId)!;
  const talk = ensureTalk(s, targetId);
  const reserve = reservePrice(s, t);
  talk.rounds += 1;
  if (price >= reserve) { agree(s, t, talk, price); return; }
  if (price < reserve * 0.8) {
    talk.status = 'dead'; talk.note = 'They felt insulted and walked away.';
    s.targets = s.targets.filter((x) => x.id !== targetId);
    logItem(s, 'warning', `${t.name} walked away`, `Your offer of ${formatGBP(price)} was so far below what they wanted that they ended the talks.`);
    return;
  }
  if (talk.rounds >= MAX_ROUNDS) {
    talk.status = 'dead'; talk.note = 'Talks broke down.';
    s.targets = s.targets.filter((x) => x.id !== targetId);
    logItem(s, 'warning', `Talks with ${t.name} broke down`, 'After three rounds you could not agree a price.');
    return;
  }
  if (price >= reserve * 0.93) {
    talk.counter = Math.max(reserve, Math.round((price + reserve * 1.02) / 2 / 1000) * 1000);
    logItem(s, 'notice', `${t.name} counters at ${formatGBP(talk.counter)}`, `You offered ${formatGBP(price)}. Accept their counter, or try again (round ${talk.rounds} of ${MAX_ROUNDS}).`);
  } else {
    talk.counter = Math.max(reserve, Math.round((reserve * 1.04) / 1000) * 1000);
    logItem(s, 'notice', `${t.name} says that is too low`, `They would want about ${formatGBP(talk.counter)}.`);
  }
}
function agree(s: GameState, t: AcquisitionTarget, talk: Talk, price: Pence): void {
  talk.status = 'agreed'; talk.price = price; talk.counter = undefined;
  logItem(s, 'milestone', `${t.name} accepts ${formatGBP(price)}`, 'Heads of terms are agreed. Choose how to pay and how to integrate, then close the deal. Pulling out costs a 2% break fee.');
  // A rival may jump in with a better bid (a bidding war).
  if (roll(s, `bid:${t.id}`, 100) < 25) {
    const bid = Math.round((price * (1.06 + unit(s, `bid2:${t.id}`) * 0.14)) / 1000) * 1000;
    talk.rival = { bid, until: s.month + 2 };
    logItem(s, 'warning', `A rival is bidding for ${t.name}`, `They have offered ${formatGBP(bid)}. Raise your price to at least that within two months, or lose the deal.`);
  }
}
export function acceptCounterCheck(s: GameState, targetId: string): { ok: boolean; reason?: string } {
  const talk = talkOf(s, targetId);
  return talk?.counter && talk.status === 'open' && s.targets.some((t) => t.id === targetId) ? { ok: true } : { ok: false, reason: 'There is no counter-offer to accept.' };
}
export function acceptCounter(s: GameState, targetId: string): void {
  const t = s.targets.find((x) => x.id === targetId)!;
  const talk = talkOf(s, targetId)!;
  agree(s, t, talk, talk.counter!);
}
export function raiseBidCheck(s: GameState, targetId: string, price: number): { ok: boolean; reason?: string } {
  const talk = talkOf(s, targetId);
  if (!talk?.rival || talk.status !== 'agreed') return { ok: false, reason: 'There is no rival bid to answer.' };
  if (!Number.isSafeInteger(price) || price < talk.rival.bid) return { ok: false, reason: `You must offer at least ${formatGBP(talk.rival.bid)} to win it.` };
  if (price > talk.rival.bid * 1.5) return { ok: false, reason: 'No need to offer that much.' };
  return { ok: true };
}
export function raiseBid(s: GameState, targetId: string, price: Pence): void {
  const talk = talkOf(s, targetId)!;
  const t = s.targets.find((x) => x.id === targetId)!;
  talk.price = price; talk.rival = undefined;
  logItem(s, 'milestone', `You beat the rival bid for ${t.name}`, `Your new price is ${formatGBP(price)}.`);
}
export function withdrawCheck(s: GameState, targetId: string): { ok: boolean; reason?: string; fee: Pence } {
  const talk = talkOf(s, targetId);
  const t = s.targets.find((x) => x.id === targetId);
  if (!talk || !t || talk.status === 'dead') return { ok: false, reason: 'There are no talks to end.', fee: 0 };
  const fee = talk.status === 'agreed' || talk.status === 'review' ? Math.round(((talk.price ?? t.askingPrice) * 0.02) / 100) * 100 : 0;
  if (fee > s.ledger.balances.cash) return { ok: false, reason: `The break fee is ${formatGBP(fee)}.`, fee };
  return { ok: true, fee };
}
export function withdraw(s: GameState, targetId: string): void {
  const talk = talkOf(s, targetId)!;
  const t = s.targets.find((x) => x.id === targetId)!;
  const fee = withdrawCheck(s, targetId).fee;
  if (fee > 0) post(s.ledger, s.month, `Break fee: ${t.name}`, [dr('dealCosts', fee), cr('cash', fee)], { cf: 'operating' });
  talk.status = 'dead'; talk.note = 'You withdrew.';
  logItem(s, 'action', `You pulled out of the deal for ${t.name}`, fee > 0 ? `The 2% break fee was ${formatGBP(fee)}.` : 'No fee, as nothing had been agreed.');
}

// ---------------------------------------------------------------------------------------------
// Closing a deal
// ---------------------------------------------------------------------------------------------
export const PLAN_INFO: Record<DealPlan, { name: string; blurb: string; pct: number; synergy: number; delay: number; risk: number }> = {
  fast: { name: 'Fast', blurb: 'Merge systems at once: bigger savings, sooner, but more things go wrong. Costs 5% of the price.', pct: 0.05, synergy: 1.4, delay: 3, risk: 1.8 },
  steady: { name: 'Steady', blurb: 'A measured nine-month merge. Costs 3%.', pct: 0.03, synergy: 1, delay: 6, risk: 1 },
  separate: { name: 'Keep separate', blurb: 'Run it as it is for a year: no savings and no drama. Costs 1%.', pct: 0.01, synergy: 0, delay: 12, risk: 0.3 },
};
export const BRAND_INFO: Record<BrandPlan, { name: string; blurb: string; attrition: number; brand: number; costPct: number }> = {
  target: { name: "Keep their brand", blurb: 'Customers stay (half the usual loss) but your own brand gains little.', attrition: 0.5, brand: 4, costPct: 0 },
  yours: { name: 'Switch to yours', blurb: 'Your brand grows most, but 40% more of their customers drift away.', attrition: 1.4, brand: 14, costPct: 0 },
  both: { name: 'Run both', blurb: 'A balance of the two, for 1% of the price.', attrition: 0.8, brand: 8, costPct: 0.01 },
};
export const STRUCTURES: Record<Exclude<Structure, 'allshares'>, { name: string; blurb: string }> = {
  cash: { name: 'All cash', blurb: 'Simple. Pay the full price at closing.' },
  shares: { name: '30% in shares', blurb: 'The seller takes 30% of the price in new shares: less cash out, but you own less.' },
  earnout: { name: 'Earn-out', blurb: 'Pay 60% now and the rest in a year, only in full if the business performs.' },
};
export const DEFAULT_TERMS: Terms = { structure: 'cash', loan: false, plan: 'steady', brand: 'both', retention: false };
export const RETENTION_PCT = 0.02;

/** What closing a deal on these terms would cost in cash right now (price part, fees and the loan that offsets it). */
export function closingCosts(s: GameState, t: AcquisitionTarget, price: Pence, terms: Terms): { now: Pence; shares: Pence; deferred: Pence; fees: Pence; loan: Pence; cash: Pence } {
  const net = targetNetAssets(t);
  let now = price; let shares = 0; let deferred = 0;
  if (terms.structure === 'shares') shares = Math.round(price * 0.3);
  if (terms.structure === 'allshares') { shares = price; }
  if (terms.structure === 'earnout') { now = Math.min(price, Math.max(Math.round(price * 0.6), net + 10_00)); deferred = price - now; }
  const fees = Math.round(price * (PLAN_INFO[terms.plan].pct + BRAND_INFO[terms.brand].costPct));
  const wantLoan = terms.loan ? Math.min(Math.round((now - shares) * 0.6), loanOffer(s).maxAmount) : 0;
  const loan = wantLoan >= 5_000_00 ? wantLoan : 0;
  return { now, shares, deferred, fees, loan, cash: now - shares + fees - loan + (loan ? Math.round(loan * 0.01) : 0) };
}
export function needsReview(s: GameState, t: AcquisitionTarget): boolean {
  const share = s.history.at(-1)?.kpis.preferenceShare ?? 0;
  const mine = ownAnnualRevenue(s);
  return (share >= 0.3 && t.annualRevenue >= 0.3 * mine) || share >= 0.4;
}
export function closeCheck(s: GameState, targetId: string, terms: Terms): { ok: boolean; reason?: string } {
  const t = s.targets.find((x) => x.id === targetId);
  const talk = talkOf(s, targetId);
  if (!t) return { ok: false, reason: 'That company is no longer for sale.' };
  if (!talk || talk.status !== 'agreed' || talk.price === undefined) return { ok: false, reason: 'Agree a price first.' };
  if (talk.rival) return { ok: false, reason: 'A rival bid is on the table: raise your price first.' };
  if (!['cash', 'shares', 'earnout'].includes(terms.structure)) return { ok: false, reason: 'Unknown payment structure.' };
  if (!PLAN_INFO[terms.plan] || !BRAND_INFO[terms.brand]) return { ok: false, reason: 'Unknown plan.' };
  return affordable(s, t, talk.price, terms);
}
function affordable(s: GameState, t: AcquisitionTarget, price: Pence, terms: Terms): { ok: boolean; reason?: string } {
  const c = closingCosts(s, t, price, terms);
  if (terms.structure === 'shares' || terms.structure === 'allshares') {
    const pre = s.history.at(-1)?.valuation?.equityValue ?? 0;
    const allowed = investmentAllowed(s, c.shares, Math.max(1, pre));
    if (!allowed.ok) return allowed;
  }
  if (s.ledger.balances.cash < c.cash + (terms.retention ? 0 : 0)) return { ok: false, reason: `You need ${formatGBP(c.cash)} in cash for this deal on these terms.` };
  return { ok: true };
}
export function closeDeal(s: GameState, targetId: string, terms: Terms): void {
  const t = s.targets.find((x) => x.id === targetId)!;
  const talk = talkOf(s, targetId)!;
  talk.terms = terms;
  if (needsReview(s, t)) {
    talk.status = 'review'; talk.reviewUntil = s.month + 2;
    logItem(s, 'warning', `The competition regulator is reviewing ${t.name}`, `Your market share is high, so the deal is under review until month ${talk.reviewUntil + 1}. It may be cleared, cleared with conditions, or blocked.`);
    return;
  }
  finishDeal(s, t, talk, terms, false);
}
function finishDeal(s: GameState, t: AcquisitionTarget, talk: Talk, terms: Terms, remedy: boolean): void {
  const price = talk.price ?? t.askingPrice;
  const c = closingCosts(s, t, price, terms);
  const h = hiddenOf(s, t);
  const fit = fitOf(s, t);
  const plan = PLAN_INFO[terms.plan];
  // Loan first, so the cash is there to pay with.
  if (c.loan > 0) {
    const spread = spreadFor(s, c.loan);
    const fee = Math.round(c.loan * 0.01);
    const id = newId(s, 'L');
    post(s.ledger, s.month, `Acquisition loan ${id} drawn down`, [dr('cash', c.loan), cr('loans', c.loan)], { cf: 'financing', cfLabel: 'Proceeds from borrowings' });
    post(s.ledger, s.month, `Acquisition loan ${id} arrangement fee`, [dr('interestExpense', fee), cr('cash', fee)], { cf: 'operating' });
    s.loans.push({ id, label: `Acquisition loan ${id}`, principal: c.loan, original: c.loan, spread, penalty: 0, termMonths: 60, monthsRemaining: 60, startMonth: s.month, consecutiveBreaches: 0 });
  }
  // What really comes across: customers leave and key people go, as the checks would have shown.
  const attritionMult = BRAND_INFO[terms.brand].attrition * (remedy ? 1.25 : 1);
  const lost = Math.min(0.6, h.attrition * attritionMult + (remedy ? 0.2 : 0));
  const flee = Math.min(0.6, h.keyPeople * (terms.retention ? 0.5 : 1) * (terms.plan === 'fast' ? 1.3 : 1) + (remedy ? 0.2 : 0));
  const t2: AcquisitionTarget = { ...t, volume: t.volume * (1 - lost), heads: { ops: Math.round(t.heads.ops * (1 - flee)), rnd: Math.round(t.heads.rnd * (1 - flee)), sales: Math.round(t.heads.sales * (1 - flee)) } };
  const opts: CompletionOptions = { price: c.now, sharePart: c.shares, integrationPct: plan.pct, brandGain: BRAND_INFO[terms.brand].brand };
  const syn = synergyOf(s, t);
  completeAcquisition(s, t2, opts);
  if (c.shares > 0) {
    const pre = Math.max(1, s.history.at(-1)?.valuation?.equityValue ?? 1);
    const n = sharesFor(s, c.shares, pre);
    s.shares.total += n;
    s.outsideHolders.push({ id: `deal-${t.id}`, investorId: 'seller', investorName: t.name.slice(0, 24), shares: n, invested: c.shares, dividends: 0, buyout: 0, status: 'active' });
  }
  const rebrand = Math.round(price * BRAND_INFO[terms.brand].costPct);
  if (rebrand > 0) post(s.ledger, s.month, `Rebranding costs: ${t.name}`, [dr('dealCosts', rebrand), cr('cash', rebrand)], { cf: 'operating' });
  const m = mnaOf(s);
  const acq = s.acquisitions.at(-1)!;
  acq.plan = terms.plan; acq.structure = terms.structure; acq.volume = t2.volume; acq.heads = { ...t2.heads }; acq.synergy = syn.mid; acq.realised = 0;
  const factor = plan.synergy * (fit === 'good' ? 1.15 : fit === 'poor' ? 0.6 : 1);
  m.integrations = [...(m.integrations ?? []), {
    name: t.name, plan: terms.plan, fit, start: s.month, end: s.month + 12, synergy: Math.round(syn.mid * factor), synergyFrom: s.month + plan.delay, price, issues: 0,
    ...(terms.retention ? { retention: { monthly: Math.round((price * RETENTION_PCT) / 12), until: s.month + 12 } } : {}),
  }];
  const pending = m.pending ?? [];
  if (c.deferred > 0) pending.push({ month: s.month + 12, amount: c.deferred, kind: 'earnout', name: t.name });
  if (h.legal > 0) pending.push({ month: s.month + 3, amount: h.legal, kind: 'legal', name: t.name });
  if (h.capex > 0) pending.push({ month: s.month + 2, amount: h.capex, kind: 'capex', name: t.name });
  m.pending = pending;
  talk.status = 'dead'; talk.note = 'Completed.';
  s.targets = s.targets.filter((x) => x.id !== t.id);
  s.morale = Math.max(0, Math.min(100, s.morale + (fit === 'poor' ? -6 : fit === 'good' ? 2 : -2)));
  logItem(s, 'milestone', `Closed: ${t.name} on ${PLAN_INFO[terms.plan].name.toLowerCase()} integration`,
    `${Math.round(lost * 100)}% of its customers and ${Math.round(flee * 100)}% of its team did not come across. Expected savings: ${formatGBP(Math.round(syn.mid * factor), { compact: true })} a month from month ${s.month + plan.delay + 1}.${c.deferred > 0 ? ` ${formatGBP(c.deferred, { compact: true })} is still owed in a year if it performs.` : ''}`);
}

// ---------------------------------------------------------------------------------------------
// Buying a rival: hostile bids
// ---------------------------------------------------------------------------------------------
export const HOSTILE_PREMIUMS = [0.2, 0.35, 0.5];
export const hostileChance = (s: GameState, name: string, premium: number): number => {
  const c = s.competitors.find((x) => x.name === name);
  return Math.min(0.9, Math.max(0.1, 0.25 + premium - ((c?.strength ?? 1) > 1.2 ? 0.1 : 0)));
};
export function hostileCheck(s: GameState, index: number, premium: number, basePrice: Pence): { ok: boolean; reason?: string; bid: Pence; fees: Pence } {
  const c = s.competitors[index];
  const bid = Math.round(basePrice * (1 + premium));
  const fees = Math.round(bid * 0.02);
  if (!c) return { ok: false, reason: 'No such rival.', bid, fees };
  if (!HOSTILE_PREMIUMS.includes(premium)) return { ok: false, reason: 'Choose a premium of 20%, 35% or 50%.', bid, fees };
  if (s.competitors.length < 2) return { ok: false, reason: 'You cannot buy the last rival.', bid, fees };
  if (s.month < 24) return { ok: false, reason: 'Wait until month 25.', bid, fees };
  if (s.mna?.hostile) return { ok: false, reason: 'You already have a bid out.', bid, fees };
  if (s.ledger.balances.cash < bid + fees) return { ok: false, reason: `You need ${formatGBP(bid + fees)} in cash to back the bid.`, bid, fees };
  return { ok: true, bid, fees };
}
export function hostileBid(s: GameState, index: number, premium: number, basePrice: Pence): void {
  const c = s.competitors[index];
  const { bid, fees } = hostileCheck(s, index, premium, basePrice);
  post(s.ledger, s.month, `Adviser and bid fees: ${c.name}`, [dr('dealCosts', fees), cr('cash', fees)], { cf: 'operating' });
  mnaOf(s).hostile = { name: c.name, bid, fees, until: s.month + 2, premium };
  logItem(s, 'milestone', `You bid ${formatGBP(bid)} for ${c.name}`, `That is a ${Math.round(premium * 100)}% premium. Its board will answer within two months. Fees of ${formatGBP(fees)} are paid whatever happens.`);
}

// ---------------------------------------------------------------------------------------------
// Merger of equals
// ---------------------------------------------------------------------------------------------
export function mergerCheck(s: GameState, targetId: string): { ok: boolean; reason?: string } {
  const t = s.targets.find((x) => x.id === targetId);
  if (!t) return { ok: false, reason: 'That company is no longer for sale.' };
  if (s.month < 24) return { ok: false, reason: 'Wait until month 25: partners want a track record.' };
  if (t.annualRevenue < ownAnnualRevenue(s) * 0.8) return { ok: false, reason: 'Only a company at least 80% of your size can be a partner for a merger of equals.' };
  const talk = talkOf(s, targetId);
  if (talk?.status === 'agreed' || talk?.status === 'review') return { ok: false, reason: 'You already have a deal in hand with them.' };
  const terms: Terms = { structure: 'allshares', loan: false, plan: 'steady', brand: 'both', retention: false };
  return affordable(s, t, t.askingPrice, terms);
}
export function mergerOfEquals(s: GameState, targetId: string): void {
  const t = s.targets.find((x) => x.id === targetId)!;
  const talk = ensureTalk(s, targetId);
  talk.price = t.askingPrice;
  finishDeal(s, t, talk, { structure: 'allshares', loan: false, plan: 'steady', brand: 'both', retention: false }, false);
  s.reputation = Math.min(100, s.reputation + 2);
  logItem(s, 'milestone', `Merger of equals with ${t.name}`, 'Paid entirely in shares: the two businesses are one, and the other owners now hold a big stake in the new company.');
}

// ---------------------------------------------------------------------------------------------
// Selling an acquired business
// ---------------------------------------------------------------------------------------------
export const acquiredOf = (s: GameState): Acquisition[] => s.acquisitions.filter((a) => !a.divested);
export function divestOffer(s: GameState, a: Acquisition): Pence {
  const f = 0.55 + unit(s, `div:${a.name}:${s.month}`) * 0.5;
  return Math.round((a.price * f * (s.month - a.month < 12 ? 0.9 : 1)) / 1000) * 1000;
}
export function divestCheck(s: GameState, name: string): { ok: boolean; reason?: string; offer: Pence } {
  const a = s.acquisitions.find((x) => x.name === name && !x.divested);
  if (!a) return { ok: false, reason: 'No such business to sell.', offer: 0 };
  if (s.month - a.month < 6) return { ok: false, reason: 'Wait six months after the deal before selling it on.', offer: 0 };
  return { ok: true, offer: divestOffer(s, a) };
}
export function divest(s: GameState, name: string): void {
  const a = s.acquisitions.find((x) => x.name === name && !x.divested)!;
  const proceeds = divestOffer(s, a);
  const carry = Math.min(s.ledger.balances.goodwill, a.goodwill);
  if (carry > 0) post(s.ledger, s.month, `Sale of ${a.name}: goodwill derecognised`, [dr('cash', carry), cr('goodwill', carry)], { cf: 'investing', cfLabel: 'Disposal of business' });
  const diff = proceeds - carry;
  if (diff > 0) post(s.ledger, s.month, `Gain on sale of ${a.name}`, [dr('cash', diff), cr('otherIncome', diff)], { cf: 'operating' });
  if (diff < 0) post(s.ledger, s.month, `Loss on sale of ${a.name}`, [dr('otherCosts', -diff), cr('cash', -diff)], { cf: 'operating' });
  // The people and customers go with it.
  const ind = industryOf(s);
  if (a.heads) for (const r of ROLE_IDS) s.staff[r] = Math.max(0, s.staff[r] - a.heads[r]);
  if (a.volume) { if (ind.model === 'subscription') s.customers = Math.max(0, s.customers - Math.round(a.volume)); else s.acquiredDemand = Math.max(0, s.acquiredDemand - a.volume); }
  a.divested = { month: s.month, proceeds };
  const m = mnaOf(s);
  m.integrations = (m.integrations ?? []).filter((i) => i.name !== a.name);
  logItem(s, 'milestone', `Sold ${a.name}`, `Proceeds ${formatGBP(proceeds)} against ${formatGBP(a.price)} paid. Its team and customers leave with it.`);
}

// ---------------------------------------------------------------------------------------------
// A negotiated exit: ask for a price from a bidder
// ---------------------------------------------------------------------------------------------
export function askCheck(bidMult: number, ask: number): { ok: boolean; counter?: number } {
  if (!Number.isFinite(ask) || ask < 0.8 || ask > 1.6) return { ok: false };
  return ask <= bidMult * 1.05 ? { ok: true } : { ok: false, counter: Math.round(bidMult * 1.02 * 100) / 100 };
}

// ---------------------------------------------------------------------------------------------
// Each month
// ---------------------------------------------------------------------------------------------
export function advanceMna(s: GameState, rng: Rng, simulation: boolean): void {
  void rng;
  // Listings come and go all year.
  s.targets = s.targets.filter((t) => t.expiresMonth > s.month);
  if (!simulation && s.month >= 6 && s.targets.length < 6 && roll(s, `list:${s.month}`, 100) < 30) {
    const fresh = generateTargets(s, createRng({ rng: hashSeed(`${s.seedLabel}:newtarget:${s.month}`) }), 1)[0];
    if (fresh) {
      fresh.expiresMonth = s.month + 3 + roll(s, `lexp:${s.month}`, 3);
      s.targets.push(fresh);
      logItem(s, 'notice', `New listing: ${fresh.name}`, `Asking ${formatGBP(fresh.askingPrice, { compact: true })}. Open the M&A tab to look at it.`);
    }
  }
  const m = s.mna;
  if (!m) return;
  // Talks: a lapsed target ends the talks; a rival bid that is not answered wins the company.
  for (const talk of m.talks ?? []) {
    if (talk.status === 'dead') continue;
    const t = s.targets.find((x) => x.id === talk.targetId);
    if (!t) { talk.status = 'dead'; talk.note = 'The offer expired.'; continue; }
    if (talk.status === 'agreed' && talk.rival && s.month >= talk.rival.until) {
      talk.status = 'dead'; talk.note = 'A rival won it.';
      s.targets = s.targets.filter((x) => x.id !== t.id);
      const c = s.competitors[roll(s, `rb:${t.id}`, Math.max(1, s.competitors.length))];
      if (c) c.strength *= 1.05;
      if (!simulation) logItem(s, 'warning', `A rival snapped up ${t.name}`, 'You did not answer their higher bid in time. Your rivals just got a little stronger.');
    }
    if (talk.status === 'review' && talk.reviewUntil !== undefined && s.month >= talk.reviewUntil) {
      const r = roll(s, `rev:${t.id}`, 100);
      const terms = talk.terms ?? DEFAULT_TERMS;
      if (r < 10) {
        const fee = Math.round(((talk.price ?? t.askingPrice) * 0.02) / 100) * 100;
        if (fee > 0) post(s.ledger, s.month, `Break fee after a blocked deal: ${t.name}`, [dr('dealCosts', fee), cr('cash', fee)], { cf: 'operating' });
        talk.status = 'dead'; talk.note = 'Blocked by the regulator.';
        s.targets = s.targets.filter((x) => x.id !== t.id);
        if (!simulation) logItem(s, 'warning', `The regulator blocked the ${t.name} deal`, `You paid a ${formatGBP(fee)} break fee.`);
      } else if (affordable(s, t, talk.price ?? t.askingPrice, terms).ok) {
        const remedy = r >= 70;
        if (!simulation) logItem(s, 'notice', remedy ? `The regulator cleared ${t.name} with conditions` : `The regulator cleared ${t.name}`, remedy ? 'You must sell off part of the business: more of its customers and people are lost.' : 'No conditions. The deal closes now.');
        finishDeal(s, t, talk, terms, remedy);
      } else {
        talk.status = 'dead'; talk.note = 'You could not fund it after the review.';
        s.targets = s.targets.filter((x) => x.id !== t.id);
      }
    }
  }
  // Payments that fall due: earn-outs, legal bills, equipment catch-up.
  if (m.pending?.length) {
    const keep: PendingPay[] = [];
    for (const p of m.pending) {
      if (s.month < p.month) { keep.push(p); continue; }
      if (p.kind === 'earnout') {
        const integ = m.integrations?.find((i) => i.name === p.name);
        const perf = Math.min(1, 0.55 + unit(s, `eo:${p.name}`) * 0.5 + (integ?.fit === 'good' ? 0.1 : integ?.fit === 'poor' ? -0.1 : 0) - (integ?.issues ?? 0) * 0.08);
        const pay = Math.round(p.amount * Math.max(0.3, perf));
        post(s.ledger, s.month, `Earn-out paid for ${p.name}`, [dr('goodwill', pay), cr('cash', pay)], { cf: 'investing', cfLabel: 'Acquisition of subsidiary, net of cash acquired' });
        const a = s.acquisitions.find((x) => x.name === p.name);
        if (a) a.goodwill += pay;
        if (!simulation) logItem(s, 'notice', `Earn-out for ${p.name}: ${Math.round(Math.max(0.3, perf) * 100)}% paid`, `The business ${perf >= 0.9 ? 'performed well' : 'underperformed'}, so you paid ${formatGBP(pay)} of the ${formatGBP(p.amount)} you owed.`);
      } else {
        post(s.ledger, s.month, p.kind === 'legal' ? `Legal claim surfaced after buying ${p.name}` : `Catch-up spending on ${p.name}'s equipment`, [dr('otherCosts', p.amount), cr('cash', p.amount)], { cf: 'operating' });
        if (!simulation) logItem(s, 'warning', p.kind === 'legal' ? `A legal bill from ${p.name}` : `${p.name}'s kit needed spending`, `${formatGBP(p.amount)}. A check before the deal would have shown it.`);
      }
    }
    m.pending = keep.length ? keep : undefined;
  }
  // Integrations: synergy income, retention pay, trouble.
  const integrations: Integ[] = [];
  for (const i of m.integrations ?? []) {
    if (i.synergy > 0 && s.month >= i.synergyFrom && s.month < i.synergyFrom + 24) {
      post(s.ledger, s.month, `Merger synergies: ${i.name}`, [dr('cash', i.synergy), cr('otherIncome', i.synergy)], { cf: 'operating' });
      const a = s.acquisitions.find((x) => x.name === i.name);
      if (a) a.realised = (a.realised ?? 0) + i.synergy;
    }
    if (i.retention && s.month < i.retention.until) post(s.ledger, s.month, `Retention bonuses: ${i.name}`, [dr('wages', i.retention.monthly), cr('cash', i.retention.monthly)], { cf: 'operating' });
    if (!simulation && s.month > i.start && s.month <= i.end && !s.pendingEvent) {
      const risk = 0.1 * PLAN_INFO[i.plan].risk * (i.fit === 'poor' ? 1.6 : i.fit === 'good' ? 0.6 : 1);
      if (roll(s, `int:${i.name}:${s.month}`, 1000) / 1000 < risk) { mnaOf(s).issue = i.name; i.issues += 1; startNamedEvent(s, 'integrationIssue', createRng({ rng: hashSeed(`${s.seedLabel}:issue:${s.month}`) })); }
    }
    if (s.month < Math.max(i.end, i.synergyFrom + 24) || (i.retention && s.month < i.retention.until)) integrations.push(i);
  }
  if (m.integrations) m.integrations = integrations.length ? integrations : undefined;
  // A hostile bid on a rival gets its answer.
  const h = m.hostile;
  if (h && s.month >= h.until) {
    m.hostile = undefined;
    const idx = s.competitors.findIndex((c) => c.name === h.name);
    const r = unit(s, `hostile:${h.name}`);
    if (idx < 0) return;
    if (r < hostileChance(s, h.name, h.premium) && s.ledger.balances.cash >= h.bid) {
      const c = s.competitors[idx];
      post(s.ledger, s.month, `Acquisition of ${c.name} (after a hostile bid): price paid above net assets`, [dr('goodwill', h.bid), cr('cash', h.bid)], { cf: 'investing', cfLabel: 'Acquisition of businesses' });
      s.competitors.splice(idx, 1);
      s.marketSize = Math.round(s.marketSize * 1.06);
      s.morale = Math.max(0, s.morale - 6);
      const d = (s.deals ??= {});
      d.acquired = (d.acquired ?? 0) + 1; d.goodwill = (d.goodwill ?? 0) + h.bid;
      if (!simulation) logItem(s, 'milestone', `${c.name}'s board accepted your bid`, `You paid ${formatGBP(h.bid)}. Its customers join you.`);
    } else if (r > 0.88) {
      const c = s.competitors[idx]; c.strength *= 1.3;
      if (!simulation) logItem(s, 'warning', `${h.name} found a white knight`, 'A friendlier buyer stepped in and your bid failed. The rival is now stronger.');
    } else {
      s.competitors[idx].strength *= 1.03;
      if (!simulation) logItem(s, 'warning', `${h.name} rejected your bid`, `Its board refused, and the fees (${formatGBP(h.fees)}) are lost. It is a little more determined now.`);
    }
  }
  void newId;
}
