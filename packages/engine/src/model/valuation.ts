import type { Pence } from '../money';
import { industryOf, type IndustryConfig } from './industries';
import { annualise, currentBalanceSheet, revenueGrowth, trailingPL } from './metrics';
import { loanPrincipal, type GameState, type Valuation } from './state';

export const TERMINAL_GROWTH = 0.02;
export const DCF_YEARS = 5;
/** Buyers will not pay for more than this much growth carrying on: early sprints are not forever. */
export const MAX_DCF_GROWTH = 0.35;
/** Most a buyer will pay for margins above the sector norm (as a multiple of the norm). */
export const MAX_MARGIN_PREMIUM = 1.5;

export const waccFor = (baseRate: number): number => Math.min(0.2, Math.max(0.08, baseRate + 0.075));

export interface DcfYear {
  year: number;
  revenue: Pence;
  margin: number;
  ebitda: Pence;
  tax: Pence;
  capex: Pence;
  nwcChange: Pence;
  fcf: Pence;
  discountFactor: number;
  pv: Pence;
}

export interface DcfResult {
  years: DcfYear[];
  wacc: number;
  terminalValue: Pence;
  pvTerminal: Pence;
  enterpriseValue: Pence;
}

/**
 * Five-year DCF: revenue growth fades linearly from today's rate to 2%, EBITDA margin converges
 * to the industry's mature margin, tax at 25% on EBITDA less capex (a proxy for EBIT), capex and
 * working capital as a % of revenue, Gordon-growth terminal value at 2%.
 */
export function dcf(ttmRevenue: Pence, ttmEbitda: Pence, growth: number, baseRate: number, ind: IndustryConfig): DcfResult {
  const wacc = waccFor(baseRate);
  const g0 = Math.min(MAX_DCF_GROWTH, Math.max(-0.2, growth));
  const m0 = ttmRevenue > 0 ? Math.min(0.6, Math.max(-1, ttmEbitda / ttmRevenue)) : ind.targetEbitdaMargin;
  const years: DcfYear[] = [];
  let revenue = ttmRevenue;
  let ev = 0;
  let lastFcf = 0;
  for (let t = 1; t <= DCF_YEARS; t++) {
    const g = g0 + ((TERMINAL_GROWTH - g0) * (t - 1)) / (DCF_YEARS - 1);
    const prev = revenue;
    revenue = revenue * (1 + g);
    const margin = m0 + ((ind.targetEbitdaMargin - m0) * t) / DCF_YEARS;
    const ebitda = revenue * margin;
    const capex = revenue * ind.capexPctRevenue;
    const tax = Math.max(0, ebitda - capex) * 0.25;
    const nwcChange = (revenue - prev) * ind.nwcPctRevenue;
    const fcf = ebitda - tax - capex - nwcChange;
    const discountFactor = 1 / Math.pow(1 + wacc, t);
    ev += fcf * discountFactor;
    lastFcf = fcf;
    years.push({
      year: t, revenue: Math.round(revenue), margin, ebitda: Math.round(ebitda), tax: Math.round(tax), capex: Math.round(capex),
      nwcChange: Math.round(nwcChange), fcf: Math.round(fcf), discountFactor, pv: Math.round(fcf * discountFactor),
    });
  }
  const terminalValue = (lastFcf * (1 + TERMINAL_GROWTH)) / (wacc - TERMINAL_GROWTH);
  const pvTerminal = terminalValue / Math.pow(1 + wacc, DCF_YEARS);
  ev += pvTerminal;
  return { years, wacc, terminalValue: Math.round(terminalValue), pvTerminal: Math.round(pvTerminal), enterpriseValue: Math.max(0, Math.round(ev)) };
}

export function valuationOf(s: GameState): Valuation {
  const ind = industryOf(s);
  const t = trailingPL(s, 12);
  const ttmRevenue = annualise(t.summary.revenue, t.months);
  const ttmEbitda = annualise(t.summary.ebitda, t.months);
  const ttmProfit = annualise(t.summary.profit, t.months);
  const growth = revenueGrowth(s);
  const growthAdj = 1 + Math.min(0.5, Math.max(-0.3, growth)) * 0.3;
  const margin = ttmRevenue > 0 ? ttmEbitda / ttmRevenue : 0;

  // Buyers expect unusually high margins to be competed away, so they pay for at most 1.5x the sector norm.
  const sustainableEbitda = Math.min(ttmEbitda, ttmRevenue * ind.targetEbitdaMargin * MAX_MARGIN_PREMIUM);
  const evEbitda = ttmEbitda > 0 ? Math.round(sustainableEbitda * ind.multiples.evEbitda * growthAdj) : 0;
  const evRevenue = Math.round(ttmRevenue * ind.multiples.evRevenue * growthAdj * (margin < 0 ? Math.max(0.2, 1 + margin) : 1));
  const d = ttmRevenue > 0 ? dcf(ttmRevenue, ttmEbitda, growth, s.economy.baseRate, ind) : null;
  const dcfEv = d?.enterpriseValue ?? 0;

  let enterpriseValue: Pence;
  let method: string;
  if (ttmRevenue <= 0) {
    enterpriseValue = 0;
    method = 'No trading history yet';
  } else if (ttmEbitda > 0) {
    enterpriseValue = Math.round((evEbitda + dcfEv) / 2);
    method = 'Average of EV/EBITDA multiple and DCF';
  } else {
    enterpriseValue = Math.round((evRevenue + dcfEv) / 2);
    method = 'Loss-making: average of revenue multiple and DCF';
  }

  const bs = currentBalanceSheet(s);
  const netDebt = loanPrincipal(s) + bs.leaseLiabilitiesCurrent + bs.leaseLiabilitiesNonCurrent + bs.overdraft - bs.cash - bs.investments;
  const equityValue = Math.max(0, bs.netAssets, enterpriseValue - netDebt);
  return {
    ttmRevenue, ttmEbitda, ttmProfit, revenueGrowth: growth, evEbitda, evRevenue, dcf: dcfEv, wacc: waccFor(s.economy.baseRate),
    enterpriseValue, netDebt, equityValue, method, peRatio: ttmProfit > 0 ? equityValue / ttmProfit : null,
  };
}
