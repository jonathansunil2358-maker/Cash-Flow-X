import { annualise, trailingPL } from './metrics';
import { covenantTest, overdraftLimit } from './loans';
import { plSummary } from '../ledger/statements';
import type { GameState } from './state';

/**
 * A single risk gauge: 0 is calm, 100 is about to go under. It is built from things you can see
 * (runway, overdraft, losses, covenants, morale) so you can fix them one by one.
 */
export interface RiskFactor {
  label: string;
  points: number;
  detail: string;
}
export interface Risk {
  score: number;
  level: 'calm' | 'watch' | 'danger' | 'critical';
  label: string;
  factors: RiskFactor[];
}

export function riskOf(s: GameState): Risk {
  const factors: RiskFactor[] = [];
  const cash = s.ledger.balances.cash;
  const limit = overdraftLimit(s);
  const last3 = s.history.slice(-3);
  const burn = last3.length ? -last3.reduce((a, r) => a + (r.closing.cash - r.period.openingCash), 0) / last3.length : 0;

  // Runway: how many months until cash plus the overdraft is gone, if the last three months repeat.
  if (burn > 0) {
    const runway = (cash + limit) / burn;
    const pts = runway < 3 ? 40 : runway < 6 ? 25 : runway < 12 ? 10 : 0;
    if (pts) factors.push({ label: 'Cash is shrinking', points: pts, detail: `At the recent pace you have about ${Math.max(0, Math.floor(runway))} months of money left.` });
  }
  if (cash < 0 && limit > 0) {
    const used = Math.min(1, -cash / limit);
    factors.push({ label: 'Overdraft in use', points: Math.round(used * 25), detail: `${Math.round(used * 100)}% of your overdraft is used.` });
  }
  const t = trailingPL(s, 3);
  if (t.months >= 3 && t.summary.profit < 0) factors.push({ label: 'Losing money', points: 12, detail: 'The last three months added up to a loss.' });
  const cov = covenantTest(s);
  if (cov.breach) factors.push({ label: 'Bank covenants', points: 15, detail: 'Debt is too high for your earnings: the bank may recall a loan.' });
  if (s.morale < 40) factors.push({ label: 'Unhappy team', points: 8, detail: 'Low morale means slower work and people leaving.' });
  const rival = s.competitors.find((c) => c.cutMonths > 0);
  if (rival) factors.push({ label: 'Price war', points: 6, detail: `${rival.name} is undercutting you.` });
  const ttm = trailingPL(s, 12);
  const receivables = s.ledger.balances.receivables;
  const annualRev = annualise(ttm.summary.revenue, ttm.months);
  if (annualRev > 0 && receivables > annualRev * 0.25) factors.push({ label: 'Customers slow to pay', points: 6, detail: 'A lot of your sales are still unpaid.' });
  if (s.tax.due > 0 && s.tax.due > cash) factors.push({ label: 'Tax bill bigger than cash', points: 10, detail: 'You owe more tax than you hold in the bank.' });
  const lastMonth = s.history.at(-1);
  if (lastMonth && plSummary(lastMonth.period.pl).profit < 0 && cash < 0) factors.push({ label: 'Overdrawn and losing money', points: 8, detail: 'The two together are how companies fail.' });

  const score = Math.min(100, factors.reduce((a, f) => a + f.points, 0));
  const level = score >= 70 ? 'critical' : score >= 40 ? 'danger' : score >= 15 ? 'watch' : 'calm';
  const label = { calm: 'Calm', watch: 'Keep an eye on it', danger: 'Danger', critical: 'Critical' }[level];
  return { score, level, label, factors: factors.sort((a, b) => b.points - a.points) };
}
