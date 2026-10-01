import { chance, type Rng } from '../rng';
import { recomputeEconomy } from './events';
import { logItem, type GameState } from './state';

/**
 * Surprise and tension: short streaks of luck and rumours that may or may not come true. Both only
 * start in real play (never in forecasts) and draw random numbers at the end of the month.
 */
export const LUCK_CHANCE = 0.04;
export const LUCK_MONTHS = 3;
export const LUCK_DEMAND = 0.05;

export type RumourKind = 'rivalCut' | 'boom' | 'supply';
export interface Rumour {
  kind: RumourKind;
  text: string;
  /** Decided when the rumour starts, revealed when it resolves. */
  truth: boolean;
  resolveMonth: number;
  /** For a rival rumour: which rival. */
  target: number;
}

export const RUMOUR_CHANCE = 0.06;
export const RUMOUR_TRUE_SHARE = 0.65;
export const RUMOUR_DELAY = 2;

export const luckOf = (s: GameState) => s.economy.active.find((a) => a.type === 'luck') ?? null;

/** Called once a month at the end of the sequence. */
export function advanceSurprise(s: GameState, rng: Rng, simulation: boolean): void {
  if (simulation) return;
  // Luck streaks: rare, short, either way.
  if (!luckOf(s) && s.month >= 6 && chance(rng, LUCK_CHANCE)) {
    const hot = chance(rng, 0.5);
    s.economy.active.push({
      type: 'luck', title: hot ? 'Hot streak' : 'Cold snap', startMonth: s.month, remaining: LUCK_MONTHS + 1,
      effects: { demandMult: hot ? 1 + LUCK_DEMAND : 1 - LUCK_DEMAND },
    });
    recomputeEconomy(s);
    logItem(s, 'event', hot ? 'A hot streak' : 'A cold snap', hot ? 'Everything seems to be going your way: demand +5% for the next three months.' : 'Nothing is going right: demand −5% for the next three months. It will pass.');
  }

  // Rumours: resolve the old one, maybe start a new one.
  const r = s.rumour;
  if (r && s.month >= r.resolveMonth) {
    if (r.truth) applyRumour(s, r);
    logItem(s, r.truth ? 'event' : 'notice', r.truth ? 'The rumour was true' : 'The rumour was false', r.truth ? `${r.text} It really happened.` : `${r.text} Nothing came of it.`);
    s.rumour = undefined;
  } else if (!r && s.month >= 6 && chance(rng, RUMOUR_CHANCE)) {
    const kind = (['rivalCut', 'boom', 'supply'] as RumourKind[])[Math.min(2, Math.floor(rng.next() * 3))];
    const target = Math.min(s.competitors.length - 1, Math.floor(rng.next() * Math.max(1, s.competitors.length)));
    const rival = s.competitors[Math.max(0, target)];
    const text = kind === 'rivalCut' ? `Word is that ${rival?.name ?? 'a rival'} is about to slash its prices.`
      : kind === 'boom' ? 'Whispers in the trade press suggest customers are about to spend more.'
        : 'A supplier is rumoured to be putting its prices up soon.';
    s.rumour = { kind, text, truth: chance(rng, RUMOUR_TRUE_SHARE), resolveMonth: s.month + RUMOUR_DELAY, target: Math.max(0, target) };
    logItem(s, 'notice', 'A rumour is going round', `${text} Do you believe it?`);
  }
}

function applyRumour(s: GameState, r: Rumour): void {
  if (r.kind === 'rivalCut') {
    const c = s.competitors[r.target];
    if (c) { c.cutMonths = 3; c.price = Math.round(c.price * 0.94); }
  } else if (r.kind === 'boom') {
    s.economy.active.push({ type: 'rumour-boom', title: 'Spending surge', startMonth: s.month, remaining: 4, effects: { demandMult: 1.08 } });
    recomputeEconomy(s);
  } else {
    s.economy.active.push({ type: 'rumour-supply', title: 'Supplier price rise', startMonth: s.month, remaining: 4, effects: { unitCostMult: 1.08 } });
    recomputeEconomy(s);
  }
}
