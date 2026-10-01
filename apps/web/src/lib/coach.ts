import {
  cashFlowStatement, formatGBP, formatInt, formatPct, INDUSTRIES, plSummary, upgradeOptions, type GameState, type IndustryConfig, type Pence,
} from '@cfx/engine';

/**
 * In-game coaching: why cash moved differently from profit last month, and one practical tip.
 * Everything here reads closed months from the books; nothing changes the game.
 */

const roundTo = (p: Pence, step: Pence) => Math.round(p / step) * step;

/** A sensible first marketing budget: about 8% of what the founder alone could sell, at least £500. */
export function startingMarketing(ind: IndustryConfig): Pence {
  return Math.max(500_00, roundTo(ind.basePrice * ind.founderCapacity * 0.08, 250_00));
}

/** Suggested monthly marketing: about 8% of last month's revenue, never below the starting amount. */
export function suggestedMarketing(game: GameState): Pence {
  const last = game.history.at(-1);
  const revenue = last ? plSummary(last.period.pl).revenue : 0;
  return Math.max(startingMarketing(INDUSTRIES[game.industryId]), roundTo(revenue * 0.08, 250_00));
}

/** Plain-English names for cash flow statement lines (the statement keeps the IAS 7 wording). */
function plainLabel(label: string, amount: Pence): string {
  const l = label.toLowerCase();
  if (l.includes('depreciation')) return 'Depreciation (no cash)';
  if (l.includes('inventor')) return amount < 0 ? 'Stock bought' : 'Stock used up';
  if (l.includes('receivable')) return amount < 0 ? 'Customers yet to pay' : 'Customers paid up';
  if (l.includes('tax')) return amount > 0 ? 'Tax owed, not yet paid' : 'Tax paid';
  if (l.includes('payable')) return amount > 0 ? 'Bills not yet paid' : 'Bills paid off';
  if (l.includes('deferred revenue')) return amount > 0 ? 'Customers paid in advance' : 'Prepaid revenue earned';
  if (l.includes('accrual')) return amount > 0 ? 'Costs not yet paid' : 'Old costs paid';
  if (l.includes('prepayment')) return amount < 0 ? 'Costs paid in advance' : 'Prepaid costs used';
  return label;
}

export interface CashBridge { profit: Pence; cashChange: Pence; lines: { label: string; amount: Pence }[] }

/** Last month's profit, the biggest reasons cash moved differently, and the actual change in cash. */
export function cashBridge(game: GameState): CashBridge | null {
  const last = game.history.at(-1);
  if (!last) return null;
  const cf = cashFlowStatement(last.period, last.closing.cash);
  const merged = new Map<string, Pence>();
  for (const l of [...cf.adjustments, ...cf.workingCapital, ...cf.investing, ...cf.financing]) {
    if (!l.amount) continue;
    const label = plainLabel(l.label, l.amount);
    merged.set(label, (merged.get(label) ?? 0) + l.amount);
  }
  const sorted = [...merged].map(([label, amount]) => ({ label, amount })).filter((l) => l.amount !== 0)
    .sort((a, b) => Math.abs(b.amount) - Math.abs(a.amount));
  const lines = sorted.slice(0, 3);
  const rest = sorted.slice(3).reduce((s, l) => s + l.amount, 0);
  if (rest) lines.push({ label: 'Everything else', amount: rest });
  return { profit: cf.profit, cashChange: cf.netChange, lines };
}

export type TipTarget = { sheet: 'team' | 'upgrades' | 'finance'; scrollTo?: string } | { upgrade: string };
export interface Tip { text: string; action: string; target: TipTarget }

/** The single most useful thing to look at next, or null when nothing stands out. */
export function adviserTip(game: GameState): Tip | null {
  const last = game.history.at(-1);
  if (!last || game.status !== 'playing') return null;
  const ind = INDUSTRIES[game.industryId];
  const k = last.kpis;
  const profit = plSummary(last.period.pl).profit;
  const turnedAway = k.lostSales > Math.max(5, k.demand * 0.05);

  if (turnedAway && k.utilisation >= 0.97) {
    return {
      text: `You turned away ${formatInt(k.lostSales)} ${ind.unitPlural} last month because you're at full capacity. More ${ind.roles.ops.title.toLowerCase()} would let you serve them.`,
      action: 'Hire staff', target: { sheet: 'team', scrollTo: 'card-team' },
    };
  }
  if (turnedAway && ind.model === 'unit') {
    return {
      text: `You ran out of stock and missed ${formatInt(k.lostSales)} sales. A higher stock cover keeps shelves full, though it ties up more cash.`,
      action: 'Stock policy', target: { sheet: 'team', scrollTo: 'card-inventory' },
    };
  }
  if (game.marketingBudget === 0) {
    return {
      text: `With no marketing budget your brand fades 10% a month and fewer people find you. Around ${formatGBP(suggestedMarketing(game), { compact: true })} a month is a sensible start.`,
      action: 'Set marketing', target: { sheet: 'team', scrollTo: 'card-marketing' },
    };
  }
  if (profit < 0 && k.utilisation < 0.8) {
    return {
      text: `You're losing money with ${formatPct(1 - k.utilisation, 0)} of your capacity unused. Your rent and staff are already paid for, so filling that space with more marketing is the cheapest growth.`,
      action: 'Marketing', target: { sheet: 'team', scrollTo: 'card-marketing' },
    };
  }
  const rivals = game.competitors.length ? game.competitors.reduce((s, c) => s + c.price, 0) / game.competitors.length : 0;
  if (k.utilisation >= 0.95 && rivals && k.price < rivals * 0.95) {
    return {
      text: `You're nearly full and cheaper than your rivals (they average ${formatGBP(rivals, { pence: true })}). A small price rise earns more from the same ${ind.unitPlural}.`,
      action: 'Pricing', target: { sheet: 'team', scrollTo: 'card-pricing' },
    };
  }
  const cash = game.ledger.balances.cash;
  const affordable = upgradeOptions(game).filter((o) => !o.maxed && !o.locked && o.cost * 2 <= cash).sort((a, b) => a.cost - b.cost)[0];
  if (profit > 0 && affordable) {
    return {
      text: `You're profitable with cash to spare. ${affordable.def.name} (${formatGBP(affordable.cost, { compact: true })}) would compound your growth: ${affordable.def.description.toLowerCase()}`,
      action: affordable.level ? 'Upgrade' : 'Build', target: { upgrade: affordable.def.id },
    };
  }
  return null;
}
