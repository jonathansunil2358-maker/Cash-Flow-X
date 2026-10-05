import { cr, dr, type CfCategory, type JournalLine } from '../ledger/journal';
import { formatGBP, type Pence } from '../money';
import { hashSeed } from '../rng';
import { attractiveness } from './market';
import { industryOf, type IndustryConfig } from './industries';
import { effectivePrice } from './promotions';
import { logItem, type Competitor, type GameState, type World } from './state';

/**
 * The living market. A sector never has more than MAX_RIVALS or fewer than MIN_RIVALS rivals at once, but who they are
 * keeps changing: start-ups appear, weak firms go bust, rivals buy each other, and the strong ones list on the
 * stock market, where their share prices move with how well they are doing against you. Everything is drawn from
 * hashes of the game seed and the month (never the shared random stream), so the server replays it exactly.
 */
export const MIN_RIVALS = 5;
export const MAX_RIVALS = 10;
export const NEWS_KEPT = 30;
export const INDEX_KEPT = 36;
export const IPO_MIN_STRENGTH = 0.6;
export const IPO_MIN_AGE = 18;
/** Fee to deal in shares. */
export const DEAL_FEE = 0.005;
/** The most of one rival the company may own. */
export const MAX_STAKE = 0.3;
/** What the market pays above the last price when a rival is taken over. */
export const TAKEOVER_PREMIUM = 1.2;

const TRAITS = ['slasher', 'snob', 'copycat'] as const;
const FIRST = ['Nova', 'Apex', 'Bright', 'Kite', 'Harbour', 'Summit', 'Ember', 'Lumen', 'Atlas', 'Copper', 'Vertex', 'Juniper', 'Quill', 'Foxglove', 'Meridian', 'Saltmarsh', 'Beacon', 'Cedar', 'Drift', 'Echo', 'Fathom', 'Granite', 'Halcyon', 'Ironbark', 'Jasper', 'Kestrel', 'Larch', 'Marlow', 'Northwind', 'Orchid', 'Pebble', 'Quartz', 'Rowan', 'Sable', 'Thistle', 'Umber', 'Velvet', 'Willow', 'Yarrow', 'Zenith'];
const LAST = ['Works', '& Co', 'Group', 'Labs', 'Holdings', 'Collective', 'Partners', 'Industries', 'Brands', 'Systems', 'Ltd', 'Bros', 'Co-op', 'Ventures'];

/** A number from 0 up to but not including 1, the same for the same seed, month and key. */
const unit = (s: GameState, key: string): number => (hashSeed(`${s.seedLabel}:wld:${key}`) % 100_000) / 100_000;
/** Roughly bell-shaped, mean 0, spread about 1. */
const bell = (s: GameState, key: string): number => (unit(s, `${key}:a`) + unit(s, `${key}:b`) + unit(s, `${key}:c`) - 1.5) * 2;

type Poster = (memo: string, lines: JournalLine[], cf?: CfCategory, cfLabel?: string) => void;

export const worldOf = (s: GameState): World | undefined => s.world;
export const listedRivals = (s: GameState): Competitor[] => s.competitors.filter((c) => c.listed && (c.px ?? 0) > 0);
export const rivalById = (s: GameState, id: number): Competitor | undefined => s.competitors.find((c) => c.id === id);
export const marketCapOf = (c: Competitor): Pence => (c.px ?? 0) * (c.shares ?? 0);

function news(s: GameState, kind: World['news'][number]['kind'], text: string, simulation: boolean): void {
  const w = s.world!;
  w.news.push({ month: s.month, kind, text });
  if (w.news.length > NEWS_KEPT) w.news.splice(0, w.news.length - NEWS_KEPT);
  if (!simulation) logItem(s, kind === 'failed' ? 'warning' : 'event', text, '');
}

/** Each rival's attractiveness next to yours, and what the whole market is worth a year (so each rival's value follows its share of it). */
function marketValues(s: GameState, ind: IndustryConfig): Pence[] {
  const player = attractiveness(s.quality, effectivePrice(s), ind.basePrice, ind.priceElasticity);
  const rivals = s.competitors.map((c) => attractiveness(c.quality, c.price, ind.basePrice, ind.priceElasticity, c.strength));
  const total = Math.max(1e-9, player + rivals.reduce((a, b) => a + b, 0));
  const steady = ind.model === 'subscription' ? 1 / Math.max(0.01, ind.baseChurn) : 1;
  const annual = s.marketSize * ind.basePrice * 12 * steady * 0.5;
  return rivals.map((a) => Math.max(100_000, Math.round(annual * (a / total) * ind.multiples.evRevenue * 0.6)));
}

function newName(s: GameState, serial: number): string {
  for (let tries = 0; tries < 20; tries++) {
    const name = `${FIRST[hashSeed(`${s.seedLabel}:wn:${serial}:${tries}`) % FIRST.length]} ${LAST[hashSeed(`${s.seedLabel}:wl:${serial}:${tries}`) % LAST.length]}`;
    if (!s.competitors.some((c) => c.name === name)) return name;
  }
  return `Rival ${serial}`;
}

function ensureWorld(s: GameState): { w: World; created: boolean } {
  if (s.world) return { w: s.world, created: false };
  let id = 1;
  for (const c of s.competitors) {
    c.id = id++;
    c.born = 0;
  }
  s.world = {
    nextId: id, budget: s.competitors.reduce((a, c) => a + c.strength, 0), mood: 0, index: [1000],
    news: [], founded: 0, failed: 0, mergers: 0, ipos: 0, holdings: {},
  };
  return { w: s.world, created: true };
}

/** Give a rival a stock market listing: shares in issue so that today's price is a few pounds. */
function listRival(s: GameState, c: Competitor, value: Pence, key: string): void {
  const px = 300 + (hashSeed(`${s.seedLabel}:px0:${c.id}:${key}`) % 2800);
  c.listed = true;
  c.shares = Math.max(1000, Math.round(value / px));
  c.px = px;
  c.pxPrev = px;
  c.ipoPx = px;
  c.pxHist = [px];
}

function settleGone(w: World, c: Competitor, kind: 'acquired' | 'failed'): void {
  if (c.id !== undefined && w.holdings[c.id]) (w.gone ??= {})[c.id] = { kind, px: c.px ?? 0 };
}

/** One month of the living market. Runs inside the monthly tick, after the rivals have moved. */
export function advanceWorld(s: GameState, simulation: boolean): void {
  if (!s.competitors.length) return;
  const ind = industryOf(s);
  const { w, created } = ensureWorld(s);
  const m = s.month;
  const values = marketValues(s, ind);

  // First visit for an older game, or a rival bought from outside: make sure everyone has an id.
  for (const c of s.competitors) {
    if (c.id === undefined) { c.id = w.nextId++; c.born ??= m; }
  }

  // Early on, the strongest sector rivals are already listed.
  if (created) {
    s.competitors.forEach((c, i) => { if (c.strength >= 1 && !c.listed) listRival(s, c, values[i], 'start'); });
  }

  // Strength drifts: better products win, and the total the market can carry stays about the same.
  const avgQ = s.competitors.reduce((a, c) => a + c.quality, 0) / s.competitors.length;
  for (const c of s.competitors) {
    c.strength = Math.min(2.2, Math.max(0.1, c.strength + bell(s, `str:${c.id}:${m}`) * 0.025 + ((c.quality - avgQ) / 60) * 0.02));
  }

  // Failures: a rival squeezed down to almost nothing goes bust (never below the minimum number of rivals).
  for (const c of [...s.competitors]) {
    if (s.competitors.length <= MIN_RIVALS) break;
    const weak = c.strength < 0.13 && m - (c.born ?? 0) >= 6;
    const shock = (c.born ?? 0) < m && unit(s, `shock:${c.id}:${m}`) < 0.003;
    if ((weak && unit(s, `fail:${c.id}:${m}`) < 0.35) || shock) {
      s.competitors.splice(s.competitors.indexOf(c), 1);
      settleGone(w, c, 'failed');
      w.failed += 1;
      news(s, 'failed', c.listed ? `${c.name} went bust and its shares are worthless` : `${c.name} went bust`, simulation);
    }
  }

  // Mergers: a strong rival buys a weaker one. Listed targets are bought at a premium to their share price.
  const n = s.competitors.length;
  const pMerge = n >= 8 ? 0.04 : n >= 6 ? 0.025 : n > MIN_RIVALS ? 0.01 : 0;
  if (pMerge > 0 && unit(s, `merge:${m}`) < pMerge) {
    const buyers = s.competitors.filter((c) => c.strength >= 0.5);
    if (buyers.length) {
      const buyer = buyers[Math.floor(unit(s, `buyer:${m}`) * buyers.length)];
      const targets = s.competitors.filter((c) => c !== buyer && c.strength < buyer.strength * 0.9);
      if (targets.length) {
        const target = targets[Math.floor(unit(s, `target:${m}`) * targets.length)];
        const price = target.listed ? Math.round(marketCapOf(target) * TAKEOVER_PREMIUM) : Math.round((values[s.competitors.indexOf(target)] ?? 0) * (1.1 + unit(s, `mprice:${m}`) * 0.3));
        s.competitors.splice(s.competitors.indexOf(target), 1);
        if (target.listed && target.id !== undefined && w.holdings[target.id]) (w.gone ??= {})[target.id] = { kind: 'acquired', px: Math.round((target.px ?? 0) * TAKEOVER_PREMIUM) };
        buyer.strength = Math.min(2.2, buyer.strength + target.strength * 0.55);
        buyer.quality = Math.min(100, buyer.quality * 0.75 + target.quality * 0.25 + 1);
        if (buyer.px) buyer.px = Math.round(buyer.px * 1.03);
        w.mergers += 1;
        news(s, 'merger', `${buyer.name} bought ${target.name}${price > 0 ? ` for ${formatGBP(price, { compact: true })}` : ''}${target.listed ? ' (a listed company, at a 20% premium)' : ''}`, simulation);
      }
    }
  }

  // Start-ups: a new rival appears now and then, small at first. Below the minimum one always does.
  const count = s.competitors.length;
  const pEnter = count < MIN_RIVALS ? 1 : count < 8 ? 0.09 : count < MAX_RIVALS ? 0.04 : 0;
  if (count < MAX_RIVALS && unit(s, `enter:${m}`) < pEnter) {
    const strength = 0.2 + unit(s, `estr:${m}`) * 0.2;
    const id = w.nextId++;
    const price = Math.round(ind.basePrice * (0.8 + unit(s, `eprice:${id}`) * 0.3));
    const c: Competitor = {
      name: newName(s, id), quality: Math.round(Math.min(90, Math.max(15, avgQ * (0.7 + unit(s, `eq:${id}`) * 0.35)))), price, strength,
      cutMonths: 0, normalPrice: price, lastLaunchYear: -1, id, born: m,
      trait: TRAITS[Math.floor(unit(s, `etrait:${id}`) * 3)], bossIx: Math.floor(unit(s, `eboss:${id}`) * 5),
    };
    s.competitors.push(c);
    w.founded += 1;
    news(s, 'founded', `${c.name} launched in your market`, simulation);
  }

  // The market can only carry so much: whatever a start-up wins, the others lose, so it stays about as tough for you.
  const carried = s.competitors.reduce((a, c) => a + c.strength, 0);
  if (carried > 0) {
    const f = w.budget / carried;
    for (const c of s.competitors) c.strength = Math.min(2.2, Math.max(0.1, c.strength * f));
  }

  // Listings: a strong, established rival floats on the stock market.
  const fresh = marketValues(s, ind);
  s.competitors.forEach((c, i) => {
    if (c.listed || c.strength < IPO_MIN_STRENGTH || m - (c.born ?? 0) < IPO_MIN_AGE) return;
    if (unit(s, `ipo:${c.id}:${m}`) >= 0.05) return;
    listRival(s, c, fresh[i], `ipo${m}`);
    w.ipos += 1;
    news(s, 'ipo', `${c.name} floated on the stock market at ${formatGBP(c.px!, { pence: true })} a share`, simulation);
  });

  // Share prices: each drifts toward what its company is worth (its share of your market), with the market's mood and its own noise.
  w.mood = Math.max(-0.25, Math.min(0.25, w.mood * 0.85 + bell(s, `mood:${m}`) * 0.035));
  let sum = 0;
  let k = 0;
  s.competitors.forEach((c, i) => {
    if (!c.listed || !c.px || !c.shares) return;
    const target = Math.max(1, fresh[i] / c.shares);
    const ret = 0.12 * Math.log(target / c.px) + 0.004 + w.mood * 0.3 + bell(s, `px:${c.id}:${m}`) * 0.05;
    const next = Math.max(1, Math.round(c.px * Math.exp(Math.max(-0.45, Math.min(0.45, ret)))));
    c.pxPrev = c.px;
    c.px = next;
    (c.pxHist ??= []).push(next);
    if (c.pxHist.length > 36) c.pxHist.shift();
    sum += next / c.pxPrev - 1;
    k += 1;
  });
  const last = w.index.at(-1) ?? 1000;
  w.index.push(Math.round(last * (1 + (k ? sum / k : 0)) * 10) / 10);
  if (w.index.length > INDEX_KEPT) w.index.shift();
}

// ---------------------------------------------------------------------------------------------
// Owning shares in rivals
// ---------------------------------------------------------------------------------------------
export const holdingValue = (s: GameState): Pence => Object.values(s.world?.holdings ?? {}).reduce((a, h) => a + h.carry, 0);

export interface StockCheck { ok: boolean; reason?: string; shares: number; price: Pence; cost: Pence; fee: Pence }

export function stockCheck(s: GameState, side: 'buy' | 'sell', id: number, shares: number): StockCheck {
  const c = rivalById(s, id);
  const px = c?.px ?? 0;
  const base = { shares, price: px, cost: shares * px, fee: Math.round(shares * px * DEAL_FEE) };
  const bad = (reason: string): StockCheck => ({ ...base, ok: false, reason });
  if (!Number.isInteger(shares) || shares < 1) return bad('Choose a whole number of shares.');
  if (s.status !== 'playing') return bad('The company is not trading.');
  if (!c || !c.listed || !px || !c.shares) return bad('That company is not on the stock market.');
  const held = s.world?.holdings[id]?.shares ?? 0;
  if (side === 'sell') return shares > held ? bad(`You only own ${held.toLocaleString('en-GB')} shares.`) : { ...base, ok: true };
  if (held + shares > Math.floor(c.shares * MAX_STAKE)) return bad(`You can own at most ${MAX_STAKE * 100}% of a company.`);
  if (base.cost + base.fee > s.ledger.balances.cash) return bad(`You need ${formatGBP(base.cost + base.fee)} in the bank.`);
  return { ...base, ok: true };
}

export function tradeStock(s: GameState, side: 'buy' | 'sell', id: number, shares: number, post: Poster): void {
  const q = stockCheck(s, side, id, shares);
  if (!q.ok) throw new Error(q.reason);
  const w = ensureWorld(s).w;
  const c = rivalById(s, id)!;
  const h = (w.holdings[id] ??= { shares: 0, carry: 0 });
  if (side === 'buy') {
    post(`Bought shares in ${c.name}`, [dr('investments', q.cost), cr('cash', q.cost)], 'investing', 'Net (purchase)/sale of short-term investments');
    if (q.fee > 0) post(`Dealing fee on ${c.name} shares`, [dr('dealCosts', q.fee), cr('cash', q.fee)], 'operating');
    h.shares += shares;
    h.carry += q.cost;
  } else {
    post(`Sold shares in ${c.name}`, [dr('cash', q.cost), cr('investments', q.cost)], 'investing', 'Net (purchase)/sale of short-term investments');
    if (q.fee > 0) post(`Dealing fee on ${c.name} shares`, [dr('dealCosts', q.fee), cr('cash', q.fee)], 'operating');
    h.shares -= shares;
    h.carry -= q.cost;
    if (h.shares <= 0) delete w.holdings[id];
  }
}

/**
 * Month-end: shares held are carried at price x shares (fair value through profit or loss). A rival that was
 * bought out pays holders the takeover price; one that went bust wipes the holding out.
 */
export function revalueHoldings(s: GameState, post: Poster): void {
  const w = s.world;
  if (!w) return;
  for (const [key, h] of Object.entries(w.holdings)) {
    const id = Number(key);
    const gone = w.gone?.[id];
    const c = rivalById(s, id);
    if (gone) {
      const proceeds = gone.kind === 'acquired' ? h.shares * gone.px : 0;
      const gain = proceeds - h.carry;
      const lines: JournalLine[] = [];
      if (proceeds > 0) lines.push(dr('cash', proceeds));
      if (gain < 0) lines.push(dr('fairValueGains', -gain));
      lines.push(cr('investments', h.carry));
      if (gain > 0) lines.push(cr('fairValueGains', gain));
      post(gone.kind === 'acquired' ? 'Shares in a rival sold in a takeover' : 'Shares in a failed rival written off', lines,
        proceeds > 0 ? 'investing' : undefined, proceeds > 0 ? 'Net (purchase)/sale of short-term investments' : undefined);
      logItem(s, gone.kind === 'acquired' ? 'milestone' : 'warning', gone.kind === 'acquired' ? 'Your shares were bought in a takeover' : 'Your shares in a failed rival are worthless',
        gone.kind === 'acquired' ? `You received ${formatGBP(proceeds)}, ${formatGBP(gain)} more than they were carried at.` : `You lost ${formatGBP(h.carry)}.`);
      delete w.holdings[id];
      continue;
    }
    if (!c || !c.px) { delete w.holdings[id]; continue; }
    const value = h.shares * c.px;
    const change = value - h.carry;
    if (change > 0) post('Rival shares revalued to fair value', [dr('investments', change), cr('fairValueGains', change)]);
    else if (change < 0) post('Rival shares revalued to fair value', [dr('fairValueGains', -change), cr('investments', -change)]);
    h.carry = value;
  }
  w.gone = undefined;
}
