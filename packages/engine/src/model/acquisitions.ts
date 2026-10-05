import { cr, dr, post } from '../ledger/journal';
import { formatGBP, type Pence } from '../money';
import { chance, pick, range, type Rng } from '../rng';
import { industryOf } from './industries';
import { annualise, currentBalanceSheet, trailingPL } from './metrics';
import { valuationOf } from './valuation';
import { logItem, newId, type AcquisitionTarget, type GameState } from './state';

const PREFIX = ['Apex', 'Bright', 'Cobalt', 'Delta', 'Evergreen', 'Fulcrum', 'Granite', 'Harbour', 'Ivy', 'Juniper', 'Kestrel', 'Lumen', 'Meridian', 'Northstar', 'Oakridge', 'Pioneer', 'Quarry', 'Redwood', 'Summit', 'Tidal'];
const SUFFIX = ['Group', 'Holdings', '& Co', 'Partners', 'Ltd', 'Collective', 'Works', 'Brothers'];

const round1k = (p: Pence) => Math.round(p / 100_000) * 100_000;

/**
 * Generate acquisition targets sized relative to the player's business. Some sellers present
 * "adjusted" EBITDA that overstates recurring earnings: paying for due diligence reveals it.
 */
export function generateTargets(s: GameState, rng: Rng, count = 3): AcquisitionTarget[] {
  const ind = industryOf(s);
  const t = trailingPL(s, 12);
  const base = Math.max(annualise(t.summary.revenue, t.months), 300_000_00);
  const expiresMonth = s.month - (s.month % 12) + 12;
  const out: AcquisitionTarget[] = [];
  for (let i = 0; i < count; i++) {
    const annualRevenue = round1k(base * range(rng, 0.3, 1.5));
    const trueMargin = range(rng, -0.05, 0.22);
    const inflation = chance(rng, 0.4) ? range(rng, 0.03, 0.09) : 0;
    const trueEbitda = Math.round(annualRevenue * trueMargin);
    const reportedEbitda = Math.round(annualRevenue * (trueMargin + inflation));
    const recurringRevenue = annualRevenue * (1 - inflation * 1.5);

    const receivables = round1k((annualRevenue * ind.receivableDays) / 365);
    const inventoryUnits = ind.model === 'unit' ? Math.round(((recurringRevenue / 12 / ind.basePrice) * ind.stockCoverDefault)) : 0;
    const inventory = inventoryUnits * ind.unitCost;
    const ppe = round1k(annualRevenue * range(rng, 0.05, 0.15));
    const payables = round1k((annualRevenue * 0.6 * ind.payableDays) / 365);
    const cash = round1k(annualRevenue * range(rng, 0.02, 0.1));
    const debt = chance(rng, 0.5) ? round1k(annualRevenue * range(rng, 0.1, 0.35)) : 0;
    const volume = recurringRevenue / 12 / ind.basePrice;

    const ev = reportedEbitda > 0
      ? reportedEbitda * ind.multiples.evEbitda * range(rng, 0.7, 1.3)
      : annualRevenue * ind.multiples.evRevenue * range(rng, 0.5, 1.0);
    const netAssets = cash + receivables + inventory + ppe - payables - debt;
    const askingPrice = round1k(Math.max(ev + cash - debt, netAssets + 25_000_00));

    out.push({
      id: newId(s, 'T'),
      name: `${pick(rng, PREFIX)} ${pick(rng, SUFFIX)}`,
      annualRevenue, reportedEbitda, trueEbitda, cash, receivables, inventory, ppe, payables, debt,
      heads: {
        ops: Math.max(1, Math.ceil(volume / ind.capacityPerOps)),
        rnd: Math.round(annualRevenue / 500_000_00),
        sales: Math.round(annualRevenue / 600_000_00),
      },
      volume: ind.model === 'subscription' ? Math.round(volume) : volume,
      askingPrice,
      diligenceFee: Math.max(5_000_00, round1k(askingPrice * 0.01)),
      diligenceDone: false,
      expiresMonth,
    });
  }
  return out;
}

export const targetNetAssets = (t: AcquisitionTarget): Pence =>
  t.cash + t.receivables + t.inventory + t.ppe - t.payables - t.debt;

/**
 * Consolidate an acquisition (IFRS 3, simplified): identifiable assets and liabilities come in at
 * book value as a proxy for fair value, the excess of price over net assets is goodwill, and
 * the cash line is presented net of cash acquired.
 */
export interface CompletionOptions {
  /** What is paid at completion (default: the asking price). A later earn-out adds to goodwill when it falls due. */
  price?: Pence;
  /** The part of that price paid in new shares instead of cash. */
  sharePart?: Pence;
  /** Integration costs as a share of the price (default 3%). */
  integrationPct?: number;
  /** Brand strength gained (default 10). */
  brandGain?: number;
}
export function completeAcquisition(s: GameState, target: AcquisitionTarget, opts: CompletionOptions = {}): void {
  const ind = industryOf(s);
  const L = s.ledger;
  const netAssets = targetNetAssets(target);
  const price = opts.price ?? target.askingPrice;
  const sharePart = Math.max(0, Math.min(price, opts.sharePart ?? 0));
  const goodwill = price - netAssets;
  const units = ind.model === 'unit' ? Math.round(target.inventory / ind.unitCost) : 0;
  const inventory = units * ind.unitCost;

  post(L, s.month, `Acquisition of ${target.name}`, [
    dr('cash', target.cash),
    dr('receivables', target.receivables),
    dr('inventory', inventory),
    dr('ppe', target.ppe),
    dr('goodwill', goodwill + (target.inventory - inventory)),
    cr('payables', target.payables),
    cr('loans', target.debt),
    ...(price - sharePart !== 0 ? [cr('cash', price - sharePart)] : []),
    ...(sharePart > 0 ? [cr('shareCapital', sharePart)] : []),
  ], { cf: 'investing', cfLabel: 'Acquisition of subsidiary, net of cash acquired' });

  if (target.receivables) s.receivablesQueue[0] = (s.receivablesQueue[0] ?? 0) + target.receivables;
  if (target.payables) s.payablesQueue[0] = (s.payablesQueue[0] ?? 0) + target.payables;
  s.inventoryUnits += units;
  if (target.ppe) s.ppeAssets.push({ id: newId(s, 'A'), label: `${target.name} assets`, cost: target.ppe, lifeMonths: 36, accumulated: 0 });
  if (target.debt) {
    s.loans.push({
      id: newId(s, 'L'), label: `${target.name} debt (assumed)`, principal: target.debt, original: target.debt,
      spread: 0.04, penalty: 0, termMonths: 36, monthsRemaining: 36, startMonth: s.month, consecutiveBreaches: 0,
    });
  }

  const integration = Math.round(price * (opts.integrationPct ?? 0.03));
  post(L, s.month, `Integration costs: ${target.name}`, [dr('dealCosts', integration), cr('cash', integration)], { cf: 'operating' });

  s.staff.ops += target.heads.ops;
  s.staff.rnd += target.heads.rnd;
  s.staff.sales += target.heads.sales;
  if (ind.model === 'subscription') s.customers += Math.round(target.volume);
  else s.acquiredDemand += target.volume;
  s.brand += opts.brandGain ?? 10;

  s.acquisitions.push({ name: target.name, month: s.month, price, netAssets, goodwill: goodwill + (target.inventory - inventory) });
  s.targets = s.targets.filter((t) => t.id !== target.id);
  logItem(s, 'milestone', `Acquired ${target.name}`,
    `Paid ${formatGBP(price)} for net assets of ${formatGBP(netAssets)}. The difference is recognised as goodwill and tested for impairment every year end.`);
}

/**
 * Annual goodwill impairment test (IAS 36, single cash-generating unit): recoverable amount is the
 * business's enterprise value; carrying amount is operating capital employed. Any shortfall is
 * written off goodwill. Acquisitions younger than 6 months are not tested.
 */
export function impairmentLoss(s: GameState): Pence {
  const goodwill = s.ledger.balances.goodwill;
  if (goodwill <= 0) return 0;
  const latest = Math.max(...s.acquisitions.map((a) => a.month));
  if (s.month - latest < 6) return 0;
  const bs = currentBalanceSheet(s);
  const carrying = bs.totalAssets - bs.cash - bs.investments - (bs.payables + bs.accruals + bs.deferredRevenue + bs.taxPayable);
  const recoverable = valuationOf(s).enterpriseValue;
  return Math.min(goodwill, Math.max(0, carrying - recoverable));
}
