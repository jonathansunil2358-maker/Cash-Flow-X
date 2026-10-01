import type { Pence } from '../money';
import { plSummary } from '../ledger/statements';
import { industryOf } from './industries';
import { modifiersOf } from './modifiers';
import { effectivePrice } from './promotions';
import { supplierCostMultiplier } from './market';
import type { GameState } from './state';

/** How many customers (or units) a month it takes to cover your fixed costs, and where you are now. */
export interface BreakEven {
  fixedCosts: Pence;
  marginPerUnit: Pence;
  unitsNeeded: number | null;
  current: number;
  gap: number | null;
  unitName: string;
  covered: boolean;
}

export function breakEven(s: GameState): BreakEven | null {
  const last = s.history.at(-1);
  if (!last) return null;
  const ind = industryOf(s);
  const pl = plSummary(last.period.pl);
  const fixedCosts = Math.max(0, pl.opex + pl.depreciation + pl.financeCosts);
  const costMult = s.economy.unitCostMult * supplierCostMultiplier(s, ind) * modifiersOf(s).unitCostMult;
  const marginPerUnit = Math.round(effectivePrice(s) - ind.unitCost * costMult);
  const current = ind.model === 'subscription' ? last.kpis.customers : last.kpis.unitsSold;
  const unitsNeeded = marginPerUnit > 0 ? Math.ceil(fixedCosts / marginPerUnit) : null;
  return {
    fixedCosts, marginPerUnit, unitsNeeded, current,
    gap: unitsNeeded === null ? null : unitsNeeded - current,
    unitName: ind.unitPlural, covered: unitsNeeded !== null && current >= unitsNeeded,
  };
}
