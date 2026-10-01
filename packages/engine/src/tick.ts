import { checkIntegrity } from './integrity';
import { ACCOUNT_IDS, isPL } from './ledger/accounts';
import { cr, dr, post, resetPeriod, type CfCategory, type JournalLine } from './ledger/journal';
import { formatGBP, formatInt, type Pence } from './money';
import { generateTargets, impairmentLoss } from './model/acquisitions';
import { runEvents } from './model/events';
import { industryOf, ROLE_IDS, type IndustryConfig } from './model/industries';
import {
  COVENANT_GRACE_MONTHS, covenantTest, currentPortion, loanRate, OVERDRAFT_MARGIN, overdraftLimit, scheduledRepayment,
} from './model/loans';
import {
  averageCompetitorQuality, capacityOf, demandFor, supplierCostMultiplier, updateCompetitors, type DemandInfo,
} from './model/market';
import { leasesCurrentPortion, processLeases } from './model/leases';
import { ytdPL } from './model/metrics';
import { modifiersOf } from './model/modifiers';
import {
  headcount, logItem, MAX_HISTORY, monthLabel, ownership, totalCustomers, WIN_EQUITY_VALUE, type GameState, type MonthKpis,
  type MonthRecord, type Valuation,
} from './model/state';
import { effectiveTaxRate, TAX_PAYMENT_LAG } from './model/tax';
import { valuationOf } from './model/valuation';
import { scheduleIntoQueue, takeDue, writeDownQueue } from './model/workingCapital';
import { advanceContracts, contractUnits, maybeOffer, serveContracts } from './model/contracts';
import { advanceListing, LISTED_MONTHLY_COST } from './model/listing';
import { premiumFor } from './model/insurance';
import { complianceCost, RENT_INFLATION, wageInflation } from './model/pressure';
import { runAutopilot } from './model/autopilot';
import { advanceStory } from './model/story';
import { advanceSurprise } from './model/surprise';
import { advanceVentures } from './model/venture';
import { advanceAwards } from './model/awards';
import { advanceBoard } from './model/board';
import { advanceSites, rentedExtraSites } from './model/sites';
import { advanceProjects } from './model/rnd';
import { advanceMorale, grossPayroll, leaverCost, moraleProductivity, rollLeavers } from './model/morale';
import { advancePromo, effectivePrice } from './model/promotions';
import { createRng, neutralRng, noise, roundProb, type Rng } from './rng';

export interface TickOptions {
  /** Forecast mode: expected values only, no random events, no new acquisition targets. */
  simulation?: boolean;
  /**
   * Replay mode for score verification: skips the per-month valuation snapshot (used only by
   * charts). Balances, statements and the final score are identical.
   */
  fast?: boolean;
}

type Poster = (memo: string, lines: JournalLine[], cf?: CfCategory, cfLabel?: string) => void;

interface Volume {
  demand: number;
  unitsSold: number;
  lostSales: number;
  newCustomers: number;
  churned: number;
}

/** Advance the game by one month. Pure: returns a new state and leaves the input untouched. */
export function advanceMonth(state: GameState, opts: TickOptions = {}): GameState {
  if (state.status !== 'playing') return state;
  if (state.pendingEvent) throw new Error('Resolve the pending event before advancing time.');
  const s = structuredClone(state);
  tickInPlace(s, opts);
  return s;
}

/**
 * The monthly close, in order:
 *  1. year-start inflation and new acquisition targets
 *  2. economy events
 *  3. covenant tests (quarterly, on the closed quarter)
 *  4. pay last month's payroll taxes and any corporation tax due
 *  5. market, competitors, quality and brand -> demand
 *  6. revenue (subscriptions or unit sales), stock purchases and cost of sales
 *  7. deferred revenue release, payroll, rent, marketing, depreciation, bad debts
 *  8. cash collected from customers, suppliers paid
 *  9. interest, loan repayments, investment income
 * 10. year-end goodwill impairment, corporation tax accrual
 * 11. close: snapshot statements, check invariants, year-end close to retained earnings,
 *     insolvency and win checks
 */
export function tickInPlace(s: GameState, opts: TickOptions = {}): void {
  if (s.status !== 'playing') return;
  if (s.pendingEvent && !opts.simulation) throw new Error('Resolve the pending event before advancing time.');
  const ind = industryOf(s);
  const rng = opts.simulation ? neutralRng : createRng(s);
  const L = s.ledger;
  const m = s.month;
  const P: Poster = (memo, lines, cf = 'operating', cfLabel) => {
    post(L, m, memo, lines, { cf, cfLabel });
  };

  // 0. Standing orders from the player's autopilot rules.
  if (!opts.simulation) runAutopilot(s);

  // 1. Year start
  if (m > 0 && m % 12 === 0) {
    s.salaryIndex *= 1 + wageInflation(s);
    s.rentIndex *= 1 + RENT_INFLATION;
    for (const c of s.competitors) { c.price = Math.round(c.price * 1.02); c.normalPrice = Math.round(c.normalPrice * 1.02); }
    if (!opts.simulation) {
      s.targets = generateTargets(s, rng);
      logItem(s, 'notice', 'New financial year', `Salaries rose ${Math.round(wageInflation(s) * 100)}% and rents 2% with inflation. New acquisition targets are available in the M&A tab.`);
    }
  }

  // 1b. Board meetings and annual awards look back at the closed months.
  advanceStory(s, !!opts.simulation);
  advanceBoard(s, !!opts.simulation);
  advanceAwards(s, !!opts.simulation);

  // 2. Economy
  runEvents(s, rng, !opts.simulation);

  // 3. Covenants
  if (m > 0 && m % 3 === 0) testCovenants(s, P);

  // 4. Payroll taxes and corporation tax
  const accrued = -L.balances.accruals;
  if (accrued > 0) P('PAYE, NI & pension paid', [dr('accruals', accrued), cr('cash', accrued)]);
  if (s.tax.dueMonth === m && s.tax.due > 0) {
    P('Corporation tax paid to HMRC', [dr('taxPayable', s.tax.due), cr('cash', s.tax.due)]);
    logItem(s, 'notice', 'Corporation tax paid', `Paid last year's corporation tax liability, 9 months after the year end.`);
    s.tax.due = 0;
    s.tax.dueMonth = null;
  }

  // 5. Market
  const mods = modifiersOf(s);
  s.marketSize *= 1 + ind.marketGrowth;
  updateCompetitors(s, ind, rng, s.history.at(-1)?.kpis.marketShare ?? 0);
  s.quality = Math.min(100, Math.max(1,
    s.quality + ind.founderQuality + mods.qualityPerMonth + ind.qualityPerRnd * Math.pow(s.staff.rnd, 0.85) * moraleProductivity(s.morale) - ind.qualityDecay * s.quality));
  s.brand = s.brand * 0.9 + (s.marketingBudget / ind.marketingPerBrandPoint) * mods.brandGainMult;
  const d = demandFor(s, ind);
  const capacity = capacityOf(s, ind);
  const costMult = s.economy.unitCostMult * supplierCostMultiplier(s, ind) * mods.unitCostMult;

  // 6. Revenue
  const vol = ind.model === 'subscription'
    ? runSubscription(s, ind, rng, d, capacity, costMult, P, mods.churnMult)
    : runUnits(s, ind, rng, d, capacity, costMult, P, mods.spoilageMult);

  // 7. Operating costs
  const release = s.deferredSchedule.shift() ?? 0;
  s.deferredSchedule.push(0);
  if (release) P('Deferred revenue recognised', [dr('deferredRevenue', release), cr('revenue', release)]);

  const gross = grossPayroll(s);
  if (gross > 0) {
    const total = Math.round(gross * 1.15);
    const net = Math.round(gross * 0.78);
    P('Payroll: net pay to staff, PAYE/NI/pension accrued', [dr('wages', total), cr('cash', net), cr('accruals', total - net)]);
  }

  if (s.trainingSpend > 0 && headcount(s) > 0) P('Staff training', [dr('wages', s.trainingSpend), cr('cash', s.trainingSpend)]);
  advanceMorale(s);
  for (const leaver of rollLeavers(s, rng)) {
    const cost = leaverCost(s, leaver.role) * leaver.count;
    if (cost > 0) P(`Staff turnover: ${leaver.count} × ${ind.roles[leaver.role].title} left (handover and backfill)`, [dr('recruitment', cost), cr('cash', cost)]);
    s.staff[leaver.role] -= leaver.count;
    if (!opts.simulation) logItem(s, 'warning', 'Staff have left', `${leaver.count} × ${ind.roles[leaver.role].title} resigned. Morale is ${Math.round(s.morale)}: pay, training and a calm balance sheet keep people.`);
  }

  advanceProjects(s, rng, P, !!opts.simulation);

  const rent = Math.round((ind.rentBase * (1 + rentedExtraSites(s)) + ind.rentPerHead * headcount(s)) * s.rentIndex);
  if (m % 3 === 0) P('Quarterly rent paid in advance', [dr('prepayments', rent * 3), cr('cash', rent * 3)]);
  const fromPrepaid = Math.min(rent, Math.max(0, L.balances.prepayments));
  P('Rent for the month', [dr('rent', rent), cr('prepayments', fromPrepaid), cr('cash', rent - fromPrepaid)]);

  const compliance = complianceCost(s);
  if (compliance > 0) P('Compliance, audit and legal', [dr('otherCosts', compliance), cr('cash', compliance)]);

  const premium = premiumFor(s);
  if (premium > 0) P('Insurance premium', [dr('insurance', premium), cr('cash', premium)]);

  if (s.marketingBudget > 0) {
    P('Marketing campaigns (on supplier credit)', [dr('marketing', s.marketingBudget), cr('payables', s.marketingBudget)]);
    scheduleIntoQueue(s.payablesQueue, s.marketingBudget, s.supplierDays);
  }

  let dep = 0;
  for (const a of s.ppeAssets) {
    const charge = Math.min(Math.round(a.cost / a.lifeMonths), a.cost - a.accumulated);
    a.accumulated += charge;
    dep += charge;
  }
  if (dep) P('Depreciation (straight line)', [dr('depreciation', dep), cr('accumDepreciation', dep)]);
  const retired = s.ppeAssets.filter((a) => a.accumulated >= a.cost);
  if (retired.length) {
    const c = retired.reduce((a, x) => a + x.cost, 0);
    post(L, m, 'Fully depreciated assets derecognised', [dr('accumDepreciation', c), cr('ppe', c)], { cf: 'none' });
    s.ppeAssets = s.ppeAssets.filter((a) => a.accumulated < a.cost);
  }

  if (L.balances.receivables > 0 && s.customerDays > 0) {
    const bd = writeDownQueue(s.receivablesQueue, Math.round(L.balances.receivables * s.economy.badDebtRate));
    if (bd) P('Bad debts written off', [dr('badDebts', bd), cr('receivables', bd)]);
  }

  // 8. Cash collection and supplier payments
  const collected = takeDue(s.receivablesQueue);
  if (collected) P('Cash received from customers', [dr('cash', collected), cr('receivables', collected)]);
  const paid = takeDue(s.payablesQueue);
  if (paid) P('Suppliers paid', [dr('payables', paid), cr('cash', paid)]);

  // 9. Finance
  for (const l of s.loans) {
    const interest = Math.round((l.principal * loanRate(l, s.economy)) / 12);
    if (interest) P(`Interest: ${l.label}`, [dr('interestExpense', interest), cr('cash', interest)]);
    const rep = scheduledRepayment(l);
    if (rep) P(`Repayment: ${l.label}`, [dr('loans', rep), cr('cash', rep)], 'financing', 'Repayment of borrowings');
    l.principal -= rep;
    l.monthsRemaining -= 1;
  }
  const repaid = s.loans.filter((l) => l.principal <= 0);
  for (const l of repaid) logItem(s, 'notice', 'Loan repaid', `${l.label} has been fully repaid.`);
  s.loans = s.loans.filter((l) => l.principal > 0);

  if (L.balances.cash < 0) {
    const od = Math.round((-L.balances.cash * (s.economy.baseRate + OVERDRAFT_MARGIN)) / 12);
    if (od) P('Overdraft interest', [dr('interestExpense', od), cr('cash', od)]);
  }
  processLeases(s, P);
  if (s.deposit > 0) {
    const i = Math.round((s.deposit * Math.max(0, s.economy.baseRate - 0.005)) / 12);
    if (i) P('Deposit interest received', [dr('cash', i), cr('interestIncome', i)]);
  }
  if (s.fundValue > 0) {
    const r = 0.006 + (rng.next() - 0.5) * 0.08 + (s.economy.demandMult < 1 ? -0.015 : 0);
    const change = Math.max(-s.fundValue, Math.round(s.fundValue * r));
    if (change) {
      P('Fund investments revalued to fair value', [dr('investments', change), cr('fairValueGains', change)]);
      s.fundValue += change;
    }
  }

  // 10. Year-end impairment and tax
  const yearEnd = m % 12 === 11;
  if (yearEnd) {
    const loss = impairmentLoss(s);
    if (loss > 0) {
      P('Goodwill impairment (IAS 36)', [dr('impairment', loss), cr('goodwill', loss)]);
      logItem(s, 'warning', 'Goodwill impaired',
        `The business is worth less than the carrying value of its operating assets, so �${formatGBP(loss)} of goodwill was written off. Impairment is not tax deductible.`);
    }
  }
  accrueTax(s, P, yearEnd);

  // 10b. Growth systems: new sites open, contracts run down, offers arrive, the share price moves.
  advanceSites(s, !!opts.simulation);
  advanceContracts(s, !!opts.simulation);
  if (s.listed) P('Listed company costs (compliance, auditors, investor relations)', [dr('dealCosts', LISTED_MONTHLY_COST), cr('cash', LISTED_MONTHLY_COST)]);
  advanceListing(s, rng, !!opts.simulation);
  if (!opts.simulation) maybeOffer(s, rng);
  advanceSurprise(s, rng, !!opts.simulation);
  advanceVentures(s, rng, !!opts.simulation);

  // 11. Close the month
  closeMonth(s, ind, d, capacity, vol, opts);
  advancePromo(s);
}

function runSubscription(
  s: GameState, ind: IndustryConfig, rng: Rng, d: DemandInfo, capacity: number, costMult: number, P: Poster, churnMult: number,
): Volume {
  const m = s.month;
  // Contract seats are served first and use up capacity that other customers could have had.
  const committed = contractUnits(s);
  const servedSeats = Math.min(committed, Math.floor(capacity));
  const spotCapacity = capacity - servedSeats;
  const total0 = totalCustomers(s);
  const overload = total0 > spotCapacity ? (total0 - spotCapacity) / total0 : 0;
  const baseChurn = ind.baseChurn * Math.sqrt(averageCompetitorQuality(s) / s.quality) * Math.pow(effectivePrice(s) / ind.basePrice, 0.7);
  const churn = Math.min(0.25, Math.max(0.003, baseChurn * churnMult + overload * 0.25));

  const churned = Math.min(s.customers, roundProb(s.customers * churn, rng));
  const newCustomers = roundProb(d.demand * noise(rng, 0.05) * (overload > 0 ? 0.5 : 1), rng);
  const annualNew = Math.min(newCustomers, roundProb(newCustomers * ind.annualPrepaidShare, rng));
  s.customers += newCustomers - annualNew - churned;

  // Annual plans churn only at renewal, and less than monthly plans.
  let annualBilled = annualNew;
  let renewalsLost = 0;
  const retention = Math.pow(1 - churn * 0.6, 12);
  for (const c of s.annualCohorts) {
    if (m > c.startMonth && (m - c.startMonth) % 12 === 0) {
      const kept = Math.min(c.customers, roundProb(c.customers * retention, rng));
      renewalsLost += c.customers - kept;
      c.customers = kept;
      annualBilled += kept;
    }
  }
  s.annualCohorts = s.annualCohorts.filter((c) => c.customers > 0);
  if (annualNew > 0) s.annualCohorts.push({ startMonth: m, customers: annualNew });

  const monthly = s.customers * effectivePrice(s);
  if (monthly > 0) {
    P('Monthly subscriptions invoiced', [dr('receivables', monthly), cr('revenue', monthly)]);
    scheduleIntoQueue(s.receivablesQueue, monthly, s.customerDays);
  }
  if (annualBilled > 0) {
    const perMonth = annualBilled * effectivePrice(s);
    P('Annual subscriptions invoiced in advance', [dr('receivables', perMonth * 12), cr('deferredRevenue', perMonth * 12)]);
    scheduleIntoQueue(s.receivablesQueue, perMonth * 12, s.customerDays);
    for (let i = 0; i < 12; i++) s.deferredSchedule[i] += perMonth;
  }

  let seatsLeft = servedSeats;
  for (const c of s.contracts) {
    const served = Math.min(c.units, seatsLeft);
    seatsLeft -= served;
    if (served > 0) {
      const rev = served * c.price;
      P(`Contract seats invoiced: ${c.client}`, [dr('receivables', rev), cr('revenue', rev)]);
      scheduleIntoQueue(s.receivablesQueue, rev, c.paymentDays);
    }
    if (served < c.units) contractPenalty(s, c, c.units - served, P);
  }

  const serveCost = Math.round((totalCustomers(s) + servedSeats) * ind.unitCost * costMult);
  if (serveCost > 0) {
    P('Hosting & service delivery costs', [dr('cogs', serveCost), cr('payables', serveCost)]);
    scheduleIntoQueue(s.payablesQueue, serveCost, s.supplierDays);
  }
  return { demand: newCustomers, unitsSold: 0, lostSales: 0, newCustomers, churned: churned + renewalsLost };
}

function runUnits(
  s: GameState, ind: IndustryConfig, rng: Rng, d: DemandInfo, capacity: number, costMult: number, P: Poster, spoilageMult: number,
): Volume {
  const L = s.ledger;
  s.acquiredDemand *= 0.99;
  const demand = roundProb(d.demand * noise(rng, 0.05) + s.acquiredDemand, rng) + s.bonusDemand;
  s.bonusDemand = 0;
  // Contract units are delivered first; the spot market gets what is left.
  const cap = roundProb(capacity, rng);
  const committed = Math.min(contractUnits(s), cap);
  const sellable = Math.min(demand, cap - committed);

  const target = Math.ceil((sellable + committed) * (1 + s.stockCoverMonths));
  const buy = Math.max(0, target - s.inventoryUnits);
  if (buy > 0) {
    const cost = Math.round(buy * ind.unitCost * costMult);
    P(`Stock purchased on credit: ${formatInt(buy)} ${ind.unitPlural}`, [dr('inventory', cost), cr('payables', cost)]);
    scheduleIntoQueue(s.payablesQueue, cost, s.supplierDays);
    s.inventoryUnits += buy;
  }

  const contractSold = Math.min(committed, s.inventoryUnits);
  const spotSold = Math.min(sellable, s.inventoryUnits - contractSold);
  const sold = contractSold + spotSold;
  if (spotSold > 0) {
    const revenue = spotSold * effectivePrice(s);
    P(`Sales: ${formatInt(spotSold)} ${ind.unitPlural}`, [dr('receivables', revenue), cr('revenue', revenue)]);
    scheduleIntoQueue(s.receivablesQueue, revenue, s.customerDays);
  }
  if (s.contracts.length) {
    for (const { contract: c, units } of serveContracts(s, contractSold)) {
      if (units > 0) {
        const rev = units * c.price;
        P(`Contract sales: ${formatInt(units)} ${ind.unitPlural} to ${c.client}`, [dr('receivables', rev), cr('revenue', rev)]);
        scheduleIntoQueue(s.receivablesQueue, rev, c.paymentDays);
      }
      if (units < c.units) contractPenalty(s, c, c.units - units, P);
    }
  }
  if (sold > 0) {
    const cogs = sold === s.inventoryUnits ? L.balances.inventory : Math.round((L.balances.inventory * sold) / s.inventoryUnits);
    P('Cost of goods sold (weighted average cost)', [dr('cogs', cogs), cr('inventory', cogs)]);
    s.inventoryUnits -= sold;
  }

  const spoiled = Math.min(s.inventoryUnits, roundProb(s.inventoryUnits * ind.spoilage * spoilageMult, rng));
  if (spoiled > 0) {
    const value = spoiled === s.inventoryUnits ? L.balances.inventory : Math.round((L.balances.inventory * spoiled) / s.inventoryUnits);
    P(`Stock written off: ${spoiled} ${ind.unitPlural}`, [dr('inventoryWriteOff', value), cr('inventory', value)]);
    s.inventoryUnits -= spoiled;
  }
  return { demand, unitsSold: sold, lostSales: demand - spotSold, newCustomers: 0, churned: 0 };
}

/** A client is owed units you could not deliver: pay the agreed penalty. */
function contractPenalty(s: GameState, c: { client: string; price: Pence; penaltyPct: number }, short: number, P: Poster): void {
  const fee = Math.round((short * c.price * c.penaltyPct) / 100);
  if (fee > 0) P(`Contract penalty: ${formatInt(short)} undelivered to ${c.client}`, [dr('otherCosts', fee), cr('cash', fee)]);
}

function testCovenants(s: GameState, P: Poster): void {
  const eligible = s.loans.filter((l) => s.month - l.startMonth >= COVENANT_GRACE_MONTHS);
  if (!eligible.length) return;
  const t = covenantTest(s);
  if (!t.breach) {
    for (const l of eligible) {
      if (l.consecutiveBreaches > 0) logItem(s, 'notice', 'Covenants back in compliance', `${l.label}: penalty interest removed.`);
      l.consecutiveBreaches = 0;
      l.penalty = 0;
    }
    return;
  }
  const detail = `Debt/EBITDA ${t.debtToEbitda === null ? 'n/a (EBITDA ≤ 0)' : `${t.debtToEbitda.toFixed(1)}x (max 3.5x)`}, interest cover ${t.interestCover === null ? 'n/a' : `${t.interestCover.toFixed(1)}x (min 3x)`}.`;
  for (const l of eligible) {
    l.consecutiveBreaches += 1;
    if (l.consecutiveBreaches >= 2) {
      const amt = l.principal;
      P(`${l.label} recalled after repeated covenant breach`, [dr('loans', amt), cr('cash', amt)], 'financing', 'Repayment of borrowings');
      l.principal = 0;
      logItem(s, 'warning', 'Loan recalled', `${l.label} breached covenants two quarters running and the bank demanded immediate repayment. ${detail}`);
    } else {
      l.penalty = 0.03;
      const fee = Math.round(l.principal * 0.01);
      P(`Covenant waiver fee: ${l.label}`, [dr('interestExpense', fee), cr('cash', fee)]);
      logItem(s, 'warning', 'Covenant breach',
        `${l.label}: ${detail} The bank charged a 1% waiver fee and +3% penalty interest. Fix it by next quarter or the loan will be recalled.`);
    }
  }
  s.loans = s.loans.filter((l) => l.principal > 0);
}

/**
 * Monthly corporation tax accrual on a year-to-date basis at the effective rate for the
 * annualised profit, after losses brought forward. Goodwill impairment is added back
 * (not deductible). At the year end the liability is fixed and scheduled for payment.
 */
function accrueTax(s: GameState, P: Poster, yearEnd: boolean): void {
  const ytd = ytdPL(s);
  const adjusted = ytd.pbt + ytd.impairment;
  const taxable = Math.max(0, adjusted - s.tax.lossesCarriedForward);
  const monthsElapsed = (s.month % 12) + 1;
  const ytdTax = Math.round(taxable * effectiveTaxRate((taxable * 12) / monthsElapsed));
  const delta = ytdTax - s.tax.ytdBooked;
  if (delta !== 0) {
    P(delta > 0 ? 'Corporation tax accrued' : 'Corporation tax accrual released', [dr('taxExpense', delta), cr('taxPayable', delta)]);
  }
  s.tax.ytdBooked = ytdTax;
  if (yearEnd) {
    if (adjusted < 0) s.tax.lossesCarriedForward += -adjusted;
    else s.tax.lossesCarriedForward -= Math.min(s.tax.lossesCarriedForward, adjusted);
    if (ytdTax > 0) {
      s.tax.due += ytdTax;
      s.tax.dueMonth = s.month + TAX_PAYMENT_LAG;
    }
    s.tax.ytdBooked = 0;
  }
}

function closeMonth(s: GameState, ind: IndustryConfig, d: DemandInfo, capacity: number, vol: Volume, opts: TickOptions): void {
  const L = s.ledger;
  const m = s.month;
  const customers = totalCustomers(s);
  const odLimit = overdraftLimit(s);
  const kpis: MonthKpis = {
    customers,
    newCustomers: vol.newCustomers,
    churned: vol.churned,
    unitsSold: vol.unitsSold,
    demand: vol.demand,
    lostSales: vol.lostSales,
    capacity,
    utilisation: capacity > 0 ? (ind.model === 'subscription' ? customers : vol.unitsSold) / capacity : 0,
    marketShare: d.potential > 0 ? (ind.model === 'subscription' ? vol.newCustomers : vol.unitsSold) / d.potential : 0,
    preferenceShare: d.preferenceShare,
    reach: d.reach,
    quality: s.quality,
    price: effectivePrice(s),
    headcount: headcount(s),
    staff: { ...s.staff },
    stockUnits: s.inventoryUnits,
    overdraftLimit: odLimit,
    baseRate: s.economy.baseRate,
    ownership: ownership(s),
  };
  const record: MonthRecord = {
    month: m,
    period: L.period,
    closing: { ...L.balances },
    loansCurrentPortion: currentPortion(s.loans),
    leasesCurrentPortion: leasesCurrentPortion(s.leases),
    kpis,
    valuation: null as unknown as Valuation, // filled in once the month is part of the history
  };
  s.history.push(record);
  // Valuation depends only on the closed history and balances, so skipping it in fast replays
  // changes nothing else; the milestone check reads it only when present.
  if (!opts.fast || m % 12 === 11) record.valuation = valuationOf(s);

  const errors = checkIntegrity(s, record);
  if (errors.length) s.integrityErrors = [...s.integrityErrors, ...errors].slice(-50);

  resetPeriod(L);
  for (const b of s.boosts) b.monthsRemaining -= 1;
  s.boosts = s.boosts.filter((b) => b.monthsRemaining > 0);
  if (s.history.length > MAX_HISTORY) s.history.splice(0, s.history.length - MAX_HISTORY);

  if (m % 12 === 11) {
    const lines: JournalLine[] = [];
    let total: Pence = 0;
    for (const id of ACCOUNT_IDS) {
      if (!isPL(id) || L.balances[id] === 0) continue;
      lines.push(cr(id, L.balances[id]));
      total += L.balances[id];
    }
    lines.push(dr('retainedEarnings', total));
    post(L, m, `Year-end close: profit for ${monthLabel(m).slice(4)} transferred to retained earnings`, lines, { cf: 'none', kind: 'closing' });
  }

  if (L.balances.cash < -odLimit) {
    s.status = 'insolvent';
    s.endReason = `Cash fell to ${formatGBP(L.balances.cash)}, beyond the ${formatGBP(odLimit)} overdraft facility. The company could not pay its debts as they fell due and entered administration.`;
    if (!opts.simulation) logItem(s, 'warning', 'Insolvent', s.endReason);
  } else if (!opts.simulation && L.balances.cash < 0 && L.balances.cash < -odLimit * 0.75) {
    logItem(s, 'warning', 'Overdraft nearly exhausted', `You have used ${Math.round((-L.balances.cash / Math.max(1, odLimit)) * 100)}% of your overdraft. Raise cash now: borrow, raise equity, cut costs or collect receivables faster.`);
  }

  if (s.wonAtMonth === null && record.valuation && record.valuation.equityValue >= WIN_EQUITY_VALUE && s.status === 'playing') {
    s.wonAtMonth = m;
    if (!opts.simulation) logItem(s, 'milestone', 'Target reached: £10m company!', 'Your company is now valued at over £10 million. Keep going to grow your score, or retire and post it to the leaderboard.');
  }

  s.month += 1;
  if (s.status === 'playing' && s.month >= s.lastMonth) {
    s.status = 'finished';
    s.endReason = 'The game period has ended.';
  }
}
