import type { Pence } from '../money';
import { annualise, currentBalanceSheet, trailingPL } from './metrics';
import { valuationOf } from './valuation';
import { loanPrincipal, ownership, type GameState } from './state';

export interface HealthComponent {
  label: string;
  value: string;
  score: number;
}

export interface Health {
  score: number;
  grade: 'A' | 'B' | 'C' | 'D' | 'E';
  components: HealthComponent[];
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

/** A 0-1 financial health score from liquidity, leverage, returns and cash runway. */
export function financialHealth(s: GameState): Health {
  const bs = currentBalanceSheet(s);
  const t = trailingPL(s, 12);
  const ebitda = annualise(t.summary.ebitda, t.months);
  const ebit = annualise(t.summary.ebit, t.months);
  const monthlyCosts = t.months ? (t.summary.costOfSales + t.summary.opex) / t.months : 0;

  const currentRatio = bs.currentLiabilities > 0 ? bs.currentAssets / bs.currentLiabilities : 5;
  const debt = loanPrincipal(s) + bs.overdraft;
  const leverage = debt === 0 ? 0 : ebitda > 0 ? debt / ebitda : Infinity;
  const capitalEmployed = bs.totalAssets - bs.currentLiabilities;
  const roce = capitalEmployed > 0 ? ebit / capitalEmployed : 0;
  const runway = monthlyCosts > 0 ? (bs.cash + bs.investments) / monthlyCosts : 12;

  const components: HealthComponent[] = [
    { label: 'Liquidity (current ratio)', value: `${currentRatio.toFixed(2)}x`, score: clamp01(currentRatio / 1.5) },
    { label: 'Leverage (debt / EBITDA)', value: Number.isFinite(leverage) ? `${leverage.toFixed(1)}x` : 'n/a (EBITDA ≤ 0)', score: debt === 0 ? 1 : Number.isFinite(leverage) ? clamp01(1 - (leverage - 1) / 3) : 0 },
    { label: 'Return on capital employed', value: `${(roce * 100).toFixed(1)}%`, score: clamp01(roce / 0.2) },
    { label: 'Cash cover (months of costs)', value: `${runway.toFixed(1)}`, score: clamp01(runway / 3) },
  ];
  const score = components.reduce((a, c) => a + c.score, 0) / components.length;
  const grade = score >= 0.85 ? 'A' : score >= 0.7 ? 'B' : score >= 0.5 ? 'C' : score >= 0.3 ? 'D' : 'E';
  return { score, grade, components };
}

export interface FinalScore {
  equityValue: Pence;
  ownership: number;
  ownerStake: Pence;
  ownerDividends: Pence;
  ownerWealth: Pence;
  health: Health;
  /** Owner wealth in pounds x (0.75 + 0.5 x health). */
  score: number;
}

export function finalScore(s: GameState): FinalScore {
  const equityValue = s.status === 'insolvent' ? 0 : valuationOf(s).equityValue;
  const own = ownership(s);
  const ownerStake = Math.round(equityValue * own);
  const ownerWealth = ownerStake + s.ownerDividends;
  const health = financialHealth(s);
  const multiplier = s.status === 'insolvent' ? 0.5 : 0.75 + 0.5 * health.score;
  return {
    equityValue, ownership: own, ownerStake, ownerDividends: s.ownerDividends, ownerWealth, health,
    score: Math.round((ownerWealth / 100) * multiplier),
  };
}
