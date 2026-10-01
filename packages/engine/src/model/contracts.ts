import type { Pence } from '../money';
import { intRange, pick, range, type Rng } from '../rng';
import { industryOf } from './industries';
import { logItem, newId, type Contract, type ContractOffer, type GameState } from './state';

/**
 * Big contracts: a client wants a fixed volume every month at a fixed price for a long time. You
 * get guaranteed sales (a little under list price, with their own payment terms) but your
 * capacity is committed first, and you pay a penalty for every unit you fail to deliver.
 */
export const CONTRACT_MIN_MONTH = 9;
/** Chance each quarter that a client comes calling. */
export const CONTRACT_OFFER_CHANCE = 0.55;
export const OFFER_LIFETIME = 3;
export const MAX_OFFERS = 2;
export const MAX_CONTRACTS = 3;
export const CONTRACT_TERMS = [6, 12, 24] as const;

const CLIENTS = ['Northgate Council', 'Harbour & Vale', 'Brightwell Group', 'Ashdown Retail', 'Kestrel Logistics', 'Meridian Hotels', 'Oakfield Trust', 'Summit Partners', 'Redcar Foods', 'Lanternworks'];

export const contractUnits = (s: GameState): number => s.contracts.reduce((a, c) => a + c.units, 0);

/** Units (or seats) the business sold in its last closed month, the yardstick for offer sizes. */
export function recentVolume(s: GameState): number {
  const k = s.history.at(-1)?.kpis;
  if (!k) return 0;
  return industryOf(s).model === 'subscription' ? k.customers : k.unitsSold;
}

/** Once a quarter a client may make an offer, sized to what you already sell. */
export function maybeOffer(s: GameState, rng: Rng): void {
  if (s.month < CONTRACT_MIN_MONTH || s.month % 3 !== 0) return;
  s.contractOffers = s.contractOffers.filter((o) => o.expiresMonth >= s.month);
  const roll = rng.next();
  if (roll >= CONTRACT_OFFER_CHANCE || s.contractOffers.length >= MAX_OFFERS || s.contracts.length >= MAX_CONTRACTS) return;
  const volume = recentVolume(s);
  const ind = industryOf(s);
  const units = Math.max(ind.id === 'automotive' ? 1 : 5, Math.round(volume * range(rng, 0.2, 0.45)));
  const months = pick(rng, CONTRACT_TERMS);
  const price = Math.round((s.price * range(rng, 0.8, 0.94)) / 100) * 100;
  const paymentDays = pick(rng, [30, 60, 90]);
  const penaltyPct = intRange(rng, 25, 50);
  const client = pick(rng, CLIENTS);
  s.contractOffers.push({ id: newId(s, 'K'), client, units, price: Math.max(100, price), months, paymentDays, penaltyPct, expiresMonth: s.month + OFFER_LIFETIME });
}

/** What a contract is worth to you each month at list price compared to what the client pays. */
export const contractMonthlyRevenue = (c: Pick<ContractOffer, 'units' | 'price'>): Pence => c.units * c.price;

export interface ContractCheck {
  allowed: boolean;
  reason?: string;
}
export function acceptCheck(s: GameState, offerId: string): ContractCheck {
  const o = s.contractOffers.find((x) => x.id === offerId);
  if (!o) return { allowed: false, reason: 'That offer has gone.' };
  if (o.expiresMonth < s.month) return { allowed: false, reason: 'That offer has expired.' };
  if (s.contracts.length >= MAX_CONTRACTS) return { allowed: false, reason: `You can only hold ${MAX_CONTRACTS} contracts at a time.` };
  return { allowed: true };
}

export function signContract(s: GameState, o: ContractOffer): Contract {
  const c: Contract = { id: o.id, client: o.client, units: o.units, price: o.price, months: o.months, monthsLeft: o.months, paymentDays: o.paymentDays, penaltyPct: o.penaltyPct };
  s.contracts.push(c);
  s.contractOffers = s.contractOffers.filter((x) => x.id !== o.id);
  return c;
}

/** Called once a month after delivery: runs contracts down and removes the ones that end. */
export function advanceContracts(s: GameState, simulation: boolean): void {
  for (const c of s.contracts) c.monthsLeft -= 1;
  const done = s.contracts.filter((c) => c.monthsLeft <= 0);
  if (!done.length) return;
  s.contracts = s.contracts.filter((c) => c.monthsLeft > 0);
  if (!simulation) for (const c of done) logItem(s, 'notice', `Contract with ${c.client} complete`, `${c.months} months delivered. Capacity is free for other customers again.`);
}

/** Split `delivered` units across contracts in signing order: earlier contracts are served first. */
export function serveContracts(s: GameState, delivered: number): { contract: Contract; units: number }[] {
  let left = delivered;
  return s.contracts.map((c) => {
    const units = Math.min(c.units, left);
    left -= units;
    return { contract: c, units };
  });
}

