import { cr, dr, post } from './ledger/journal';
import { formatGBP, type Pence } from './money';
import { completeAcquisition } from './model/acquisitions';
import { industryOf, ROLE_IDS, type IndustryId, type RoleId } from './model/industries';
import { loanOffer, MAX_TERM, MIN_TERM, overdraftLimit, spreadFor } from './model/loans';
import { annualise, currentBalanceSheet, trailingPL } from './model/metrics';
import { DIFFICULTIES } from './model/difficulty';
import { GUILD_LEVELS } from './model/guild';
import { acceptInvestment, addOutsideHolder, buyBackFrom, buyOutHolders, distributeDividend } from './model/investors';
import { addTemporaryEffect, resolvePendingEvent, startNamedEvent } from './model/events';
import { modifiersOf } from './model/modifiers';
import { addFranchise, franchiseCheck } from './model/franchise';
import { designCheck, setDesign } from './model/design';
import { starCheck, starFeeMultiple } from './model/stars';
import { buildingCheck, buyBuilding } from './model/property';
import { marketCheck, openMarket } from './model/export';
import { replyCheck, replyToReview } from './model/reviews';
import { setSupplier, supplierCheck, type SupplierId } from './model/suppliers';
import { startVenture, ventureCheck, type VentureKind } from './model/venture';
import { boonCheck, donate, donateCheck, foundSub, goGreen, greenCheck, pickBoon, setStance, stanceCheck, subCheck } from './model/strategy';
import { blackFriday, blackFridayCheck, complaintCheck, influencerCheck, loyaltyCheck, resolveComplaint, setLoyalty, signInfluencer } from './model/customers';
import { courseCheck, headhunt, headhuntCheck, innovationCheck, innovationDay, setWorkstyle, takeCourse, workstyleCheck, type Workstyle } from './model/people';
import { initiativeCheck, policyCheck, setPolicy, startInitiative } from './model/play8';
import { budgetCheck, councilCheck, COUNCIL, outsourceCheck, outsourceFee, rangeCheck, startRange, play7Of } from './model/play7';
import { hireTemps, layoutCheck, setLayout, setMascot, tempsCheck, tierCheck, tenderCheck, tenderWon, TENDERS, MASCOTS, rivalDiscount, play6Of, TIERS } from './model/play6';
import { applyTender } from './model/play6Advance';
import { coachCheck, coachFranchises, labCheck, nodeCheck, playOf, popCheck, promote, promoteCheck, refreshCheck, runLab, securityCheck, setSecurity, setSupply, startPop, supplyCheck, takeNode, type Supply } from './model/play5';
import { acceptCounter, acceptCounterCheck, askCheck, checkCheck, closeCheck, closeDeal, divest, divestCheck, hostileBid, hostileCheck, makeOffer, mergerCheck, mergerOfEquals, offerCheck, raiseBid, raiseBidCheck, runCheck, withdraw, withdrawCheck, type CheckId, type Terms } from './model/mna';
import { acquireCheck, acquireRival, rivalPrice, bidsFor, buyHedge, crowdCheck, filePatent, hedgeCheck, patentCheck, saleCheck, startCrowd, takeVc, tradeSale, vcCheck } from './model/deals';
import { FIT_OUT_LIFE_MONTHS, premisesMove } from './model/growth';
import { BOOSTS, type BoostId } from './model/perks';
import { prestigeCheck, prestigeThreshold } from './model/prestige';
import { prestigeBonus, prestigeTitle } from './model/rank';
import { MAX_TRAINING_SPEND, PAY_LEVELS } from './model/morale';
import { monthlyProjectCost, projectCheck, projectDef } from './model/rnd';
import { PROMO_DISCOUNTS, PROMO_MAX_MONTHS, promoCheck } from './model/promotions';
import { logItem, newId, ownership, type GameState, type InsuranceTier, type PayLevel } from './model/state';

import { incomeScale, UPGRADE_CEILING, UPGRADES, upgradeCost, type UpgradeDef } from './model/upgrades';
import { valuationOf } from './model/valuation';
import { cleanRules, RULE_INFO } from './model/autopilotRules';
import { acceptCheck, signContract } from './model/contracts';
import { COVER, INSURANCE_TIERS } from './model/insurance';
import { floatCheck, listCheck, marketCap, nextGuidance } from './model/listing';
import { extraSites, openSiteCheck, siteRent, SITE_BREAK_MONTHS, SITE_LIFE_MONTHS } from './model/sites';
import { createRng } from './rng';

export type InvestmentProduct = 'deposit' | 'fund';

export type Action =
  | { type: 'hire'; role: RoleId; count: number }
  | { type: 'fire'; role: RoleId; count: number }
  | { type: 'setPrice'; price: Pence }
  | { type: 'startPromo'; discountPct: number; months: number }
  | { type: 'setPay'; level: PayLevel }
  | { type: 'startProject'; projectId: string }
  | { type: 'cancelProject'; projectId: string }
  | { type: 'setTraining'; amount: Pence }
  | { type: 'startVenture'; kind: VentureKind; amount: Pence }
  | { type: 'acquireRival'; index: number }
  | { type: 'tradeSale'; bid: string; ask?: number }
  | { type: 'policy'; id: string; option: number }
  | { type: 'initiative'; id: string }
  | { type: 'council'; id: string }
  | { type: 'stockControl'; level: number }
  | { type: 'trainingBudget'; ops: number; rnd: number; sales: number }
  | { type: 'outsource'; id: string; on: boolean }
  | { type: 'rangeBatch'; size: string }
  | { type: 'temps'; trained: boolean }
  | { type: 'tiers'; level: number }
  | { type: 'layout'; order: number[] }
  | { type: 'tender'; index: number; discount: number }
  | { type: 'mascot'; id: string }
  | { type: 'supply'; to: string }
  | { type: 'refreshProduct' }
  | { type: 'popup'; tier: number }
  | { type: 'priceLab' }
  | { type: 'coachFranchises' }
  | { type: 'promote'; role: string }
  | { type: 'skill'; id: string }
  | { type: 'security'; level: number }
  | { type: 'check'; targetId: string; kind: string }
  | { type: 'makeOffer'; targetId: string; price: number }
  | { type: 'acceptCounter'; targetId: string }
  | { type: 'raiseBid'; targetId: string; price: number }
  | { type: 'walkAway'; targetId: string }
  | { type: 'closeDeal'; targetId: string; terms: Terms }
  | { type: 'mergerOfEquals'; targetId: string }
  | { type: 'hostileBid'; index: number; premium: number }
  | { type: 'divest'; name: string }
  | { type: 'takeVc'; offer: number }
  | { type: 'startCrowd'; tier: number }
  | { type: 'hedge'; kind: 'fx' | 'cost' }
  | { type: 'filePatent' }
  | { type: 'takeCourse'; course: string }
  | { type: 'setWorkstyle'; style: Workstyle }
  | { type: 'innovationDay' }
  | { type: 'setLoyalty'; on: boolean }
  | { type: 'resolveComplaint'; id: string }
  | { type: 'influencer'; tier: string }
  | { type: 'blackFriday' }
  | { type: 'foundSub'; sector: IndustryId }
  | { type: 'pickBoon'; id: string }
  | { type: 'setStance'; stance: 'defensive' | 'neutral' | 'expansion' }
  | { type: 'goGreen'; step: string }
  | { type: 'donate'; amount: Pence }
  | { type: 'headhunt'; role: RoleId }
  | { type: 'setSupplier'; supplier: SupplierId }
  | { type: 'addFranchise' }
  | { type: 'setDesign'; features: number }
  | { type: 'hireStar'; id: string }
  | { type: 'buyBuilding' }
  | { type: 'openMarket'; market: string }
  | { type: 'replyReview'; index: number }
  | { type: 'setMarketing'; amount: Pence }
  | { type: 'setStockCover'; months: number }
  | { type: 'setCreditTerms'; customerDays: number; supplierDays: number }
  | { type: 'takeLoan'; amount: Pence; termMonths: number }
  | { type: 'repayLoan'; loanId: string; amount: Pence }
  | { type: 'raiseEquity'; amount: Pence }
  | { type: 'payDividend'; amount: Pence }
  | { type: 'invest'; product: InvestmentProduct; amount: Pence }
  | { type: 'withdraw'; product: InvestmentProduct; amount: Pence }
  | { type: 'buyAutomation'; amount: Pence }
  | { type: 'diligence'; targetId: string }
  | { type: 'acquire'; targetId: string }
  | { type: 'buyUpgrade'; upgradeId: string }
  | { type: 'resolveEvent'; choiceId: string }
  | { type: 'activateBoost'; boostId: BoostId }
  | { type: 'setRules'; rules: unknown }
  | { type: 'openSite' }
  | { type: 'closeSite' }
  | { type: 'setInsurance'; tier: InsuranceTier }
  | { type: 'acceptContract'; offerId: string }
  | { type: 'declineContract'; offerId: string }
  | { type: 'listCompany' }
  | { type: 'buyBack'; amount: Pence }
  | { type: 'prestige' }
  | { type: 'setAway'; away: boolean }
  | { type: 'setGuildLevel'; level: number }
  | { type: 'acceptInvestment'; investmentId: string; investorId: string; investorName: string; amount: Pence; preMoney: Pence }
  | { type: 'buyOutInvestors'; holderIds: string[] }
  | { type: 'buyBackShares'; holderId: string; pct: number }
  | { type: 'retire' };

export class ActionError extends Error {}

const fail = (msg: string): never => {
  throw new ActionError(msg);
};

const isWholePence = (x: unknown): x is number => typeof x === 'number' && Number.isInteger(x);
const isCount = (x: unknown, max: number): x is number => typeof x === 'number' && Number.isInteger(x) && x >= 1 && x <= max;

export const EQUITY_COOLDOWN_MONTHS = 6;
export const EQUITY_DISCOUNT = 0.85;
export const EQUITY_FEE = 0.04;
export const LOAN_ARRANGEMENT_FEE = 0.01;
/** Most people hired in one action (there is no limit on the size of the team). */
export const MAX_HIRE_AT_ONCE = 1000;
export const MAX_BOOSTS_PER_YEAR = 4;

/** Cash plus undrawn overdraft. */
export function spendable(s: GameState): Pence {
  return s.ledger.balances.cash + overdraftLimit(s);
}

function requireFunds(s: GameState, amount: Pence, what: string): void {
  if (amount > spendable(s)) {
    fail(`Not enough funds for ${what}: need ${formatGBP(amount)}, you have ${formatGBP(Math.max(0, spendable(s)))} including your overdraft.`);
  }
}

/** Equity raise terms: investors buy at a 15% discount to the current equity valuation. */
export function equityRaiseTerms(s: GameState): { preMoney: Pence; maxAmount: Pence; available: boolean; reason?: string } {
  // A listed company raises money at (almost) the market price.
  const preMoney = s.listed
    ? Math.round(marketCap(s) * 0.97)
    : Math.round(valuationOf(s).equityValue * Math.min(1, EQUITY_DISCOUNT + modifiersOf(s).equityDiscountDelta));
  if (s.lastEquityRaiseMonth !== null && s.month - s.lastEquityRaiseMonth < EQUITY_COOLDOWN_MONTHS) {
    return { preMoney, maxAmount: 0, available: false, reason: `Investors need ${EQUITY_COOLDOWN_MONTHS} months between rounds.` };
  }
  if (preMoney < 50_000_00) return { preMoney, maxAmount: 0, available: false, reason: 'Pre-money valuation below £50k: no investor interest yet.' };
  return { preMoney, maxAmount: Math.floor(preMoney / 100_000) * 100_000, available: true };
}

export interface UpgradeOption {
  def: UpgradeDef;
  level: number;
  cost: Pence;
  maxed: boolean;
  locked: string | null;
  /** How much dearer the business's income makes this upgrade (1 = list price). */
  scale: number;
}

/** The sector's upgrades with current level, next-level cost and lock reason. */
export function upgradeOptions(s: GameState): UpgradeOption[] {
  const mult = modifiersOf(s).upgradeCostMult;
  const t = trailingPL(s, 12);
  const scale = incomeScale(annualise(t.summary.revenue, t.months));
  return UPGRADES[s.industryId].map((def) => {
    const level = s.upgrades[def.id] ?? 0;
    const req = def.requires;
    const locked = req && (s.upgrades[req.id] ?? 0) < req.level
      ? `Needs ${UPGRADES[s.industryId].find((u) => u.id === req.id)?.name} level ${req.level}`
      : null;
    return { def, level, cost: upgradeCost(def, level, mult, scale), maxed: level >= UPGRADE_CEILING, locked, scale };
  });
}

/** Recruitment fee for one hire in a role, after perks. */
export function recruitmentFee(s: GameState, role: RoleId): Pence {
  return Math.round(industryOf(s).roles[role].salary * s.salaryIndex * industryOf(s).recruitmentPct * modifiersOf(s).recruitmentMult);
}

/** Distributable reserves: retained earnings plus profit for the year to date. */
export function distributableReserves(s: GameState): Pence {
  const bs = currentBalanceSheet(s);
  return bs.retainedEarnings + bs.currentYearProfit;
}

/** Apply a player action. Pure: returns a new state, throws ActionError if invalid. */
export function applyAction(state: GameState, action: Action): GameState {
  const s = structuredClone(state);
  applyActionInPlace(s, action);
  return s;
}

/**
 * Apply an action. `record` is false only for the company's own autopilot, whose steps are
 * re-derived by every replay and so must not be in the action log (or they would run twice).
 */
export function applyActionInPlace(s: GameState, action: Action, record = true): void {
  if (s.status !== 'playing') fail('The game is over.');
  const ind = industryOf(s);
  const L = s.ledger;
  const m = s.month;

  switch (action.type) {
    case 'hire': {
      if (!ROLE_IDS.includes(action.role)) fail('Unknown role.');
      if (!isCount(action.count, MAX_HIRE_AT_ONCE)) fail(`Hire between 1 and ${MAX_HIRE_AT_ONCE} people at a time.`);
      const role = ind.roles[action.role];
      const recruitment = recruitmentFee(s, action.role) * action.count;
      const equipment = ind.equipmentPerHire * action.count;
      // Growing past a staff threshold means moving to bigger premises (a capitalised fit-out).
      const move = premisesMove(s, ind, action.count);
      const fitOut = move?.fitOut ?? 0;
      requireFunds(s, recruitment + equipment + fitOut, fitOut ? 'recruitment, equipment and the move to bigger premises' : 'recruitment and equipment');
      if (move && fitOut > 0) {
        post(L, m, 'Fit-out of bigger premises', [dr('ppe', fitOut), cr('cash', fitOut)], { cf: 'investing', cfLabel: 'Purchase of property, plant & equipment' });
        s.ppeAssets.push({ id: newId(s, 'A'), label: 'Premises fit-out', cost: fitOut, lifeMonths: FIT_OUT_LIFE_MONTHS, accumulated: 0 });
        logItem(s, 'notice', 'Moved to bigger premises', `Your team outgrew its space at ${move.staffLimit} staff. Fit-out ${formatGBP(fitOut)} capitalised over 7 years, and base rent rises.`);
      }
      const label = `${action.count} × ${role.title}`;
      post(L, m, `Recruitment fees: ${label}`, [dr('recruitment', recruitment), cr('cash', recruitment)], { cf: 'operating' });
      if (equipment > 0) {
        post(L, m, `Equipment for new hires: ${label}`, [dr('ppe', equipment), cr('cash', equipment)], {
          cf: 'investing', cfLabel: 'Purchase of property, plant & equipment',
        });
        s.ppeAssets.push({ id: newId(s, 'A'), label: `Equipment: ${label}`, cost: equipment, lifeMonths: ind.equipmentLifeMonths, accumulated: 0 });
      }
      s.staff[action.role] += action.count;
      logItem(s, 'action', `Hired ${label}`, `Recruitment ${formatGBP(recruitment)} expensed; equipment ${formatGBP(equipment)} capitalised.`);
      break;
    }
    case 'fire': {
      if (!ROLE_IDS.includes(action.role)) fail('Unknown role.');
      if (!isCount(action.count, s.staff[action.role])) fail('You cannot let go more people than you employ in that role.');
      const role = ind.roles[action.role];
      const cost = Math.round((role.salary * s.salaryIndex) / 12) * action.count;
      post(L, m, `Redundancy: ${action.count} × ${role.title}`, [dr('restructuring', cost), cr('cash', cost)], { cf: 'operating' });
      s.staff[action.role] -= action.count;
      logItem(s, 'action', `Made ${action.count} × ${role.title} redundant`, `Redundancy cost ${formatGBP(cost)}.`);
      break;
    }
    case 'startProject': {
      const check = projectCheck(s, action.projectId);
      if (!check.allowed) fail(check.reason!);
      const def = projectDef(action.projectId)!;
      requireFunds(s, monthlyProjectCost(def), `the first month of ${def.name}`);
      s.projects.push({ id: def.id, monthsLeft: def.months });
      logItem(s, 'action', `Started: ${def.name}`, `${def.months} months, ${formatGBP(def.cost)} in total (${formatGBP(monthlyProjectCost(def))} a month). It can fail, and the money is spent either way.`);
      break;
    }
    case 'cancelProject': {
      const i = s.projects.findIndex((p) => p.id === action.projectId);
      if (i < 0) fail('That project is not running.');
      const def = projectDef(action.projectId)!;
      s.projects.splice(i, 1);
      logItem(s, 'action', `Cancelled: ${def.name}`, 'Nothing is refunded. Your R&D team is free for something else.');
      break;
    }
    case 'setPay': {
      if (!PAY_LEVELS.includes(action.level)) fail('Choose below-market, market or above-market pay.');
      s.pay = action.level;
      logItem(s, 'action', `Pay set to ${action.level === 'market' ? 'market rate' : `${action.level} market`}`,
        action.level === 'above' ? 'The wage bill is 12% higher. Morale, productivity and loyalty rise.'
          : action.level === 'below' ? 'The wage bill is 10% lower, but morale and productivity will slip and people may leave.'
            : 'Standard pay. Morale settles at its normal level.');
      break;
    }
    case 'setSupplier': {
      const check = supplierCheck(s, action.supplier);
      if (!check.ok) fail(check.reason!);
      setSupplier(s, action.supplier);
      break;
    }
    case 'setDesign': {
      const check = designCheck(s, action.features);
      if (!check.ok) fail(check.reason!);
      requireFunds(s, check.fee, 'the redesign');
      setDesign(s, action.features);
      break;
    }
    case 'hireStar': {
      const check = starCheck(s, action.id);
      if (!check.ok) fail(check.reason!);
      const c = check.candidate!;
      const premium = recruitmentFee(s, c.role) * (starFeeMultiple(c) - 1);
      requireFunds(s, premium + recruitmentFee(s, c.role) + industryOf(s).equipmentPerHire, `hiring ${c.name}`);
      applyActionInPlace(s, { type: 'hire', role: c.role, count: 1 }, false);
      post(L, m, `Headhunter fee: ${c.name}`, [dr('recruitment', premium), cr('cash', premium)], { cf: 'operating' });
      s.stars = [...(s.stars ?? []), { id: c.id, name: c.name, role: c.role, skill: c.skill }];
      logItem(s, 'action', `${c.name} joins the team`, `A ${c.skill}-star ${industryOf(s).roles[c.role].title.toLowerCase()} who ${c.quirk}. Perk: ${c.perk}.`);
      break;
    }
    case 'buyBuilding': {
      const check = buildingCheck(s);
      if (!check.ok) fail(check.reason!);
      requireFunds(s, check.price, 'the building');
      buyBuilding(s);
      break;
    }
    case 'openMarket': {
      const check = marketCheck(s, action.market);
      if (!check.ok) fail(check.reason!);
      requireFunds(s, check.fee, 'the new market');
      openMarket(s, action.market);
      break;
    }
    case 'replyReview': {
      const check = replyCheck(s, action.index);
      if (!check.ok) fail(check.reason!);
      replyToReview(s, action.index);
      break;
    }
    case 'addFranchise': {
      const check = franchiseCheck(s);
      if (!check.ok) fail(check.reason!);
      requireFunds(s, check.fee, 'the franchise set-up');
      addFranchise(s);
      break;
    }
    case 'acquireRival': {
      const check = acquireCheck(s, action.index);
      if (!check.ok) fail(check.reason!);
      acquireRival(s, action.index);
      break;
    }
    case 'tradeSale': {
      const check = saleCheck(s);
      if (!check.ok) fail(check.reason!);
      let mult: number | undefined;
      if (action.ask !== undefined) {
        const b = bidsFor(s).find((x) => x.id === action.bid) ?? fail('Unknown bid.');
        const a = askCheck(b.mult, action.ask);
        if (!a.ok) fail(a.counter ? `They will not go that high. Their best is ${a.counter.toFixed(2)} times the valuation.` : 'Ask for between 0.8 and 1.6 times the valuation.');
        mult = action.ask;
      }
      try { tradeSale(s, action.bid, mult); } catch (e) { fail((e as Error).message); }
      break;
    }
    case 'initiative': {
      const c = initiativeCheck(s, action.id);
      if (!c.ok) fail(c.reason!);
      startInitiative(s, action.id);
      break;
    }
    case 'policy': {
      const c = policyCheck(s, action.id, action.option);
      if (!c.ok) fail(c.reason!);
      setPolicy(s, action.id, action.option);
      break;
    }
    case 'council': {
      const c = councilCheck(s, action.id);
      if (!c.ok) fail(c.reason!);
      const p = play7Of(s); p.councilQ = Math.floor(s.month / 3); p.councilPick = action.id;
      if (action.id === 'quality') s.quality = Math.min(100, s.quality + 1.5);
      if (action.id === 'service') s.reputation = Math.min(100, s.reputation + 2);
      if (action.id === 'brand') s.brand *= 1.06;
      logItem(s, 'action', `The customer council chose: ${COUNCIL.find((o) => o.id === action.id)!.name}`, COUNCIL.find((o) => o.id === action.id)!.text);
      break;
    }
    case 'stockControl': {
      if (![0, 1, 2].includes(action.level)) fail('Unknown level.');
      play7Of(s).stock = action.level as 0 | 1 | 2;
      logItem(s, 'action', 'Stock control changed', 'Shrinkage and its monthly cost changed with it.');
      break;
    }
    case 'trainingBudget': {
      const c = budgetCheck(s, action.ops, action.rnd, action.sales);
      if (!c.ok) fail(c.reason!);
      post(L, m, 'Training budget', [dr('wages', c.fee), cr('cash', c.fee)], { cf: 'operating' });
      play7Of(s).budget = { year: Math.floor(s.month / 12), ops: action.ops, rnd: action.rnd, sales: action.sales };
      s.quality = Math.min(100, s.quality + 0.03 * action.rnd);
      logItem(s, 'action', 'Training budget set', `Operations ${action.ops}%, R&D ${action.rnd}%, sales ${action.sales}%. A big focus gets a bonus.`);
      break;
    }
    case 'outsource': {
      const c = outsourceCheck(s, action.id, !!action.on);
      if (!c.ok) fail(c.reason!);
      const p = play7Of(s);
      if (action.on) { post(L, m, `Outsourcing set-up: ${action.id}`, [dr('otherCosts', outsourceFee(s)), cr('cash', outsourceFee(s))], { cf: 'operating' }); p.out = [...(p.out ?? []), action.id]; }
      else p.out = (p.out ?? []).filter((x) => x !== action.id);
      logItem(s, 'action', action.on ? `Outsourced: ${action.id}` : `Brought back in-house: ${action.id}`, 'Costs and quality change with it.');
      break;
    }
    case 'rangeBatch': {
      const c = rangeCheck(s, action.size);
      if (!c.ok) fail(c.reason!);
      startRange(s, action.size as 'small' | 'big');
      break;
    }
    case 'temps': {
      const c = tempsCheck(s, !!action.trained);
      if (!c.ok) fail(c.reason!);
      hireTemps(s, !!action.trained);
      break;
    }
    case 'tiers': {
      const c = tierCheck(s, action.level);
      if (!c.ok) fail(c.reason!);
      play6Of(s).tier = action.level as 0 | 1 | 2 | 3;
      logItem(s, 'action', `Loyalty tier: ${TIERS[action.level].name}`, TIERS[action.level].blurb);
      break;
    }
    case 'layout': {
      const c = layoutCheck(s, action.order);
      if (!c.ok) fail(c.reason!);
      setLayout(s, action.order);
      break;
    }
    case 'tender': {
      const c = tenderCheck(s, action.index, action.discount);
      if (!c.ok) fail(c.reason!);
      applyTender(s, action.index, action.discount, tenderWon(s, action.index, action.discount), c.fee, TENDERS[action.index].demand, TENDERS[action.index].name);
      void rivalDiscount;
      break;
    }
    case 'mascot': {
      if (!MASCOTS.some((m) => m.id === action.id)) fail('Unknown mascot.');
      setMascot(s, action.id);
      break;
    }
    case 'supply': {
      const c = supplyCheck(s, action.to);
      if (!c.ok) fail(c.reason!);
      setSupply(s, action.to as Supply);
      break;
    }
    case 'refreshProduct': {
      const c = refreshCheck(s);
      if (!c.ok) fail(c.reason!);
      post(L, m, 'Product refresh', [dr('otherCosts', c.fee), cr('cash', c.fee)], { cf: 'operating' });
      playOf(s).refreshed = s.month;
      addTemporaryEffect(s, 'refresh', 'Refreshed product', 9, { demandMult: 1.06 });
      s.quality = Math.min(100, s.quality + 2);
      logItem(s, 'milestone', 'You refreshed your product', 'Demand is up 6% for nine months and the product feels new again.');
      break;
    }
    case 'popup': {
      const c = popCheck(s, action.tier);
      if (!c.ok) fail(c.reason!);
      startPop(s, action.tier);
      break;
    }
    case 'priceLab': {
      const c = labCheck(s);
      if (!c.ok) fail(c.reason!);
      runLab(s);
      break;
    }
    case 'coachFranchises': {
      const c = coachCheck(s);
      if (!c.ok) fail(c.reason!);
      coachFranchises(s);
      break;
    }
    case 'promote': {
      const c = promoteCheck(s, action.role);
      if (!c.ok) fail(c.reason!);
      promote(s, action.role as RoleId);
      break;
    }
    case 'skill': {
      const c = nodeCheck(s, action.id);
      if (!c.ok) fail(c.reason!);
      takeNode(s, action.id);
      break;
    }
    case 'security': {
      const c = securityCheck(s, action.level);
      if (!c.ok) fail(c.reason!);
      setSecurity(s, action.level as 0 | 1 | 2);
      break;
    }
    case 'check': {
      const c = checkCheck(s, action.targetId, action.kind);
      if (!c.ok) fail(c.reason!);
      requireFunds(s, c.fee, 'the check');
      runCheck(s, action.targetId, action.kind as CheckId);
      break;
    }
    case 'makeOffer': {
      const c = offerCheck(s, action.targetId, action.price);
      if (!c.ok) fail(c.reason!);
      makeOffer(s, action.targetId, Math.round(action.price));
      break;
    }
    case 'acceptCounter': {
      const c = acceptCounterCheck(s, action.targetId);
      if (!c.ok) fail(c.reason!);
      acceptCounter(s, action.targetId);
      break;
    }
    case 'raiseBid': {
      const c = raiseBidCheck(s, action.targetId, action.price);
      if (!c.ok) fail(c.reason!);
      raiseBid(s, action.targetId, Math.round(action.price));
      break;
    }
    case 'walkAway': {
      const c = withdrawCheck(s, action.targetId);
      if (!c.ok) fail(c.reason!);
      withdraw(s, action.targetId);
      break;
    }
    case 'closeDeal': {
      const c = closeCheck(s, action.targetId, action.terms);
      if (!c.ok) fail(c.reason!);
      closeDeal(s, action.targetId, action.terms);
      break;
    }
    case 'mergerOfEquals': {
      const c = mergerCheck(s, action.targetId);
      if (!c.ok) fail(c.reason!);
      mergerOfEquals(s, action.targetId);
      break;
    }
    case 'hostileBid': {
      const c = hostileCheck(s, action.index, action.premium, rivalPrice(s, action.index));
      if (!c.ok) fail(c.reason!);
      hostileBid(s, action.index, action.premium, rivalPrice(s, action.index));
      break;
    }
    case 'divest': {
      const c = divestCheck(s, action.name);
      if (!c.ok) fail(c.reason!);
      divest(s, action.name);
      break;
    }
    case 'takeVc': {
      const check = vcCheck(s, action.offer);
      if (!check.ok) fail(check.reason!);
      takeVc(s, action.offer);
      break;
    }
    case 'startCrowd': {
      const check = crowdCheck(s, action.tier);
      if (!check.ok) fail(check.reason!);
      startCrowd(s, action.tier);
      break;
    }
    case 'hedge': {
      if (action.kind !== 'fx' && action.kind !== 'cost') fail('Unknown hedge.');
      const check = hedgeCheck(s, action.kind);
      if (!check.ok) fail(check.reason!);
      buyHedge(s, action.kind);
      break;
    }
    case 'takeCourse': {
      const check = courseCheck(s, action.course);
      if (!check.ok) fail(check.reason!);
      takeCourse(s, action.course);
      break;
    }
    case 'setWorkstyle': {
      const check = workstyleCheck(s, action.style);
      if (!check.ok) fail(check.reason!);
      setWorkstyle(s, action.style);
      break;
    }
    case 'setLoyalty': {
      const check = loyaltyCheck(s, !!action.on);
      if (!check.ok) fail(check.reason!);
      setLoyalty(s, !!action.on);
      break;
    }
    case 'resolveComplaint': {
      const check = complaintCheck(s, String(action.id));
      if (!check.ok) fail(check.reason!);
      resolveComplaint(s, String(action.id));
      break;
    }
    case 'influencer': {
      const check = influencerCheck(s, String(action.tier));
      if (!check.ok) fail(check.reason!);
      signInfluencer(s, String(action.tier));
      break;
    }
    case 'foundSub': {
      const check = subCheck(s, String(action.sector));
      if (!check.ok) fail(check.reason!);
      foundSub(s, action.sector);
      break;
    }
    case 'pickBoon': {
      const check = boonCheck(s, String(action.id));
      if (!check.ok) fail(check.reason!);
      pickBoon(s, String(action.id));
      break;
    }
    case 'setStance': {
      const check = stanceCheck(s, String(action.stance));
      if (!check.ok) fail(check.reason!);
      setStance(s, action.stance);
      break;
    }
    case 'goGreen': {
      const check = greenCheck(s, String(action.step));
      if (!check.ok) fail(check.reason!);
      goGreen(s, String(action.step));
      break;
    }
    case 'donate': {
      const check = donateCheck(s, action.amount);
      if (!check.ok) fail(check.reason!);
      donate(s, action.amount);
      break;
    }
    case 'blackFriday': {
      const check = blackFridayCheck(s);
      if (!check.ok) fail(check.reason!);
      blackFriday(s);
      break;
    }
    case 'innovationDay': {
      const check = innovationCheck(s);
      if (!check.ok) fail(check.reason!);
      innovationDay(s);
      break;
    }
    case 'headhunt': {
      const check = headhuntCheck(s, action.role);
      if (!check.ok) fail(check.reason!);
      applyActionInPlace(s, { type: 'hire', role: action.role, count: 1 }, false);
      const from = headhunt(s, action.role);
      logItem(s, 'milestone', `A star joins from ${from}`, 'Poached for a premium. Their perk is a lasting boost, and the rival is a little weaker.');
      break;
    }
    case 'filePatent': {
      const check = patentCheck(s);
      if (!check.ok) fail(check.reason!);
      filePatent(s);
      break;
    }
    case 'startVenture': {
      const check = ventureCheck(s, action.kind, action.amount);
      if (!check.ok) fail(check.reason!);
      startVenture(s, action.kind, action.amount);
      break;
    }
    case 'setTraining': {
      if (!isWholePence(action.amount) || action.amount < 0 || action.amount > MAX_TRAINING_SPEND) fail(`Training budget must be between £0 and ${formatGBP(MAX_TRAINING_SPEND)} a month.`);
      s.trainingSpend = action.amount;
      logItem(s, 'action', action.amount > 0 ? `Training budget ${formatGBP(action.amount)} a month` : 'Training stopped', 'Training lifts morale (up to a cap) but costs money every month you have staff.');
      break;
    }
    case 'startPromo': {
      if (!(PROMO_DISCOUNTS as readonly number[]).includes(action.discountPct)) fail('Choose a 10%, 20% or 30% discount.');
      if (!isCount(action.months, PROMO_MAX_MONTHS)) fail(`A promotion runs for 1 to ${PROMO_MAX_MONTHS} months.`);
      const check = promoCheck(s);
      if (!check.allowed) fail(check.reason!);
      requireFunds(s, check.fee, 'the promotion');
      post(L, m, `Promotion set-up: ${action.discountPct}% off for ${action.months} month${action.months === 1 ? '' : 's'}`, [dr('marketing', check.fee), cr('cash', check.fee)], { cf: 'operating' });
      s.promo = { discountPct: action.discountPct, months: action.months, monthsLeft: action.months };
      logItem(s, 'action', `Promotion: ${action.discountPct}% off`, `Running for ${action.months} month${action.months === 1 ? '' : 's'}. Set-up cost ${formatGBP(check.fee)}; expect a quiet month afterwards as customers have already bought.`);
      break;
    }
    case 'setPrice': {
      if (!isWholePence(action.price) || action.price < ind.basePrice * 0.3 || action.price > ind.basePrice * 3) {
        fail(`Price must be between ${formatGBP(Math.ceil(ind.basePrice * 0.3))} and ${formatGBP(ind.basePrice * 3)}.`);
      }
      s.price = action.price;
      break;
    }
    case 'setMarketing': {
      if (!isWholePence(action.amount) || action.amount < 0 || action.amount > 2_000_000_00) fail('Marketing must be between £0 and £2m a month.');
      s.marketingBudget = action.amount;
      break;
    }
    case 'setStockCover': {
      if (ind.model !== 'unit') fail('This business holds no inventory.');
      if (typeof action.months !== 'number' || !(action.months >= 0 && action.months <= 6)) fail('Stock cover must be 0–6 months.');
      s.stockCoverMonths = action.months;
      break;
    }
    case 'setCreditTerms': {
      const { customerDays, supplierDays } = action;
      if (!isCount(customerDays + 1, 121) || !isCount(supplierDays + 1, 121)) fail('Terms must be whole days between 0 and 120.');
      if (ind.receivableDays === 0 && customerDays !== 0) fail('Customers in this industry pay at the point of sale.');
      s.customerDays = customerDays;
      s.supplierDays = supplierDays;
      break;
    }
    case 'takeLoan': {
      const offer = loanOffer(s);
      if (!isWholePence(action.amount) || action.amount < 5_000_00) fail('Minimum loan is £5,000.');
      if (action.amount > offer.maxAmount) fail(`The bank will lend at most ${formatGBP(offer.maxAmount)} right now (${offer.basis}).`);
      if (!Number.isInteger(action.termMonths) || action.termMonths < MIN_TERM || action.termMonths > MAX_TERM) fail(`Term must be ${MIN_TERM}–${MAX_TERM} months.`);
      const spread = spreadFor(s, action.amount);
      const fee = Math.round(action.amount * LOAN_ARRANGEMENT_FEE);
      const id = newId(s, 'L');
      const label = `Term loan ${id}`;
      post(L, m, `${label} drawn down`, [dr('cash', action.amount), cr('loans', action.amount)], { cf: 'financing', cfLabel: 'Proceeds from borrowings' });
      post(L, m, `${label} arrangement fee`, [dr('interestExpense', fee), cr('cash', fee)], { cf: 'operating' });
      s.loans.push({
        id, label, principal: action.amount, original: action.amount, spread, penalty: 0, termMonths: action.termMonths,
        monthsRemaining: action.termMonths, startMonth: m, consecutiveBreaches: 0,
      });
      logItem(s, 'action', `Borrowed ${formatGBP(action.amount)}`,
        `${action.termMonths}-month amortising loan at base + ${(spread * 100).toFixed(2)}% = ${((s.economy.baseRate + spread) * 100).toFixed(2)}%. Covenants apply after 6 months: debt/EBITDA ≤ 3.5x, interest cover ≥ 3x.`);
      break;
    }
    case 'repayLoan': {
      const loan = s.loans.find((l) => l.id === action.loanId) ?? fail('Loan not found.');
      if (!isWholePence(action.amount) || action.amount <= 0 || action.amount > loan.principal) fail('Repay between £0.01 and the outstanding principal.');
      requireFunds(s, action.amount, 'the repayment');
      post(L, m, `Early repayment: ${loan.label}`, [dr('loans', action.amount), cr('cash', action.amount)], { cf: 'financing', cfLabel: 'Repayment of borrowings' });
      loan.principal -= action.amount;
      s.loans = s.loans.filter((l) => l.principal > 0);
      logItem(s, 'action', `Repaid ${formatGBP(action.amount)} early`, loan.principal > 0 ? `${formatGBP(loan.principal)} still outstanding on ${loan.label}.` : `${loan.label} is fully repaid.`);
      break;
    }
    case 'raiseEquity': {
      const terms = equityRaiseTerms(s);
      if (!terms.available) fail(terms.reason ?? 'Equity raise unavailable.');
      if (!isWholePence(action.amount) || action.amount < 25_000_00) fail('Minimum raise is £25,000.');
      if (action.amount > terms.maxAmount) fail(`Investors will put in at most ${formatGBP(terms.maxAmount)} (pre-money ${formatGBP(terms.preMoney)}).`);
      const before = ownership(s);
      const newShares = Math.round((s.shares.total * action.amount) / terms.preMoney);
      const fee = Math.round(action.amount * EQUITY_FEE);
      post(L, m, 'Shares issued to investors (net of 4% fees)', [dr('cash', action.amount - fee), cr('shareCapital', action.amount - fee)], {
        cf: 'financing', cfLabel: 'Proceeds from issue of shares (net of costs)',
      });
      s.shares.total += newShares;
      addOutsideHolder(s, action.amount < 250_000_00 ? 'Angel investors' : 'Venture investors', newShares, action.amount - fee);
      s.lastEquityRaiseMonth = m;
      logItem(s, 'action', `Raised ${formatGBP(action.amount)} of equity`,
        `Pre-money valuation ${formatGBP(terms.preMoney)}. Your ownership fell from ${(before * 100).toFixed(1)}% to ${(ownership(s) * 100).toFixed(1)}%.`);
      break;
    }
    case 'payDividend': {
      if (!isWholePence(action.amount) || action.amount <= 0) fail('Enter a dividend amount.');
      const reserves = distributableReserves(s);
      if (action.amount > reserves) fail(`Dividends are limited to distributable reserves of ${formatGBP(Math.max(0, reserves))} (Companies Act 2006, s830).`);
      if (action.amount > L.balances.cash) fail('You need the cash in the bank to pay a dividend.');
      post(L, m, 'Dividend paid to shareholders', [dr('retainedEarnings', action.amount), cr('cash', action.amount)], { cf: 'financing', cfLabel: 'Dividends paid' });
      const toOwner = Math.round(action.amount * ownership(s));
      s.ownerDividends += toOwner;
      distributeDividend(s, action.amount);
      logItem(s, 'action', `Paid a ${formatGBP(action.amount)} dividend`, `You received ${formatGBP(toOwner)} as a ${(ownership(s) * 100).toFixed(1)}% shareholder.`);
      break;
    }
    case 'invest': {
      if (action.product !== 'deposit' && action.product !== 'fund') fail('Unknown product.');
      if (!isWholePence(action.amount) || action.amount <= 0) fail('Enter an amount.');
      if (action.amount > L.balances.cash) fail('You can only invest cash you actually hold.');
      post(L, m, `Invested in ${action.product === 'deposit' ? 'deposit account' : 'equity fund'}`, [dr('investments', action.amount), cr('cash', action.amount)], {
        cf: 'investing', cfLabel: 'Net (purchase)/sale of short-term investments',
      });
      if (action.product === 'deposit') s.deposit += action.amount;
      else s.fundValue += action.amount;
      break;
    }
    case 'withdraw': {
      const held = action.product === 'deposit' ? s.deposit : action.product === 'fund' ? s.fundValue : fail('Unknown product.');
      if (!isWholePence(action.amount) || action.amount <= 0 || action.amount > held) fail('You cannot withdraw more than you hold.');
      post(L, m, `Withdrawn from ${action.product === 'deposit' ? 'deposit account' : 'equity fund'}`, [dr('cash', action.amount), cr('investments', action.amount)], {
        cf: 'investing', cfLabel: 'Net (purchase)/sale of short-term investments',
      });
      if (action.product === 'deposit') s.deposit -= action.amount;
      else s.fundValue -= action.amount;
      break;
    }
    case 'buyAutomation': {
      if (!isWholePence(action.amount) || action.amount < 5_000_00) fail('Minimum automation investment is £5,000.');
      requireFunds(s, action.amount, 'the investment');
      post(L, m, 'Automation & systems investment', [dr('ppe', action.amount), cr('cash', action.amount)], {
        cf: 'investing', cfLabel: 'Purchase of property, plant & equipment',
      });
      s.ppeAssets.push({ id: newId(s, 'A'), label: 'Automation & systems', cost: action.amount, lifeMonths: 60, accumulated: 0 });
      s.automationSpend += action.amount;
      logItem(s, 'action', `Invested ${formatGBP(action.amount)} in automation`, 'Capitalised as PP&E and depreciated over 5 years. Capacity per head increases.');
      break;
    }
    case 'diligence': {
      const t = s.targets.find((x) => x.id === action.targetId) ?? fail('Target not found.');
      if (t.diligenceDone) fail('Due diligence already completed.');
      requireFunds(s, t.diligenceFee, 'due diligence');
      post(L, m, `Due diligence: ${t.name}`, [dr('dealCosts', t.diligenceFee), cr('cash', t.diligenceFee)], { cf: 'operating' });
      t.diligenceDone = true;
      const gap = t.reportedEbitda - t.trueEbitda;
      logItem(s, 'action', `Due diligence on ${t.name}`,
        gap > 0
          ? `Red flag: reported EBITDA of ${formatGBP(t.reportedEbitda)} includes ${formatGBP(gap)} of one-off and non-recurring items. Underlying EBITDA is ${formatGBP(t.trueEbitda)}.`
          : `Clean report: EBITDA of ${formatGBP(t.trueEbitda)} is recurring.`);
      break;
    }
    case 'acquire': {
      const t = s.targets.find((x) => x.id === action.targetId) ?? fail('Target not found.');
      const integration = Math.round(t.askingPrice * 0.03);
      if (t.askingPrice + integration > L.balances.cash) {
        fail(`You need ${formatGBP(t.askingPrice + integration)} in cash (price plus 3% integration costs). Borrow or raise equity first.`);
      }
      completeAcquisition(s, t);
      break;
    }
    case 'buyUpgrade': {
      const opt = upgradeOptions(s).find((o) => o.def.id === action.upgradeId) ?? fail('Unknown upgrade.');
      if (opt.maxed) fail(`${opt.def.name} is already at its maximum level.`);
      if (opt.locked) fail(`${opt.locked}.`);
      requireFunds(s, opt.cost, opt.def.name);
      const label = `${opt.def.name} level ${opt.level + 1}`;
      post(L, m, `Upgrade: ${label}`, [dr('ppe', opt.cost), cr('cash', opt.cost)], { cf: 'investing', cfLabel: 'Purchase of property, plant & equipment' });
      s.ppeAssets.push({ id: newId(s, 'A'), label, cost: opt.cost, lifeMonths: opt.def.lifeMonths, accumulated: 0 });
      s.upgrades[opt.def.id] = opt.level + 1;
      logItem(s, 'action', `Upgraded: ${label}`, `${opt.def.description} Capitalised as PP&E (${formatGBP(opt.cost)}) and depreciated over ${opt.def.lifeMonths / 12} years.`);
      break;
    }
    case 'setRules': {
      const check = cleanRules(action.rules);
      if (!check.ok) fail(check.reason ?? 'Those rules are not allowed.');
      s.rules = check.rules.length ? check.rules : undefined;
      logItem(s, 'action', check.rules.length ? 'Autopilot rules set' : 'Autopilot rules cleared', check.rules.map((r) => RULE_INFO[r.kind].name).join(', ') || 'The company is back under your control.');
      break;
    }
    case 'openSite': {
      const check = openSiteCheck(s);
      if (!check.allowed) fail(check.reason ?? 'You cannot open another site yet.');
      requireFunds(s, check.cost, 'the fit-out');
      post(L, m, 'Fit-out of a new site', [dr('ppe', check.cost), cr('cash', check.cost)], { cf: 'investing', cfLabel: 'Purchase of property, plant & equipment' });
      s.ppeAssets.push({ id: newId(s, 'A'), label: 'New site fit-out', cost: check.cost, lifeMonths: SITE_LIFE_MONTHS, accumulated: 0 });
      s.pendingSites.push(m + 2);
      logItem(s, 'action', 'New site: fit-out started', `Fit-out cost ${formatGBP(check.cost)} (capitalised). It opens in 2 months, but the rent of ${formatGBP(check.rent)} a month starts now.`);
      break;
    }
    case 'closeSite': {
      if (s.pendingSites.length) {
        s.pendingSites.pop();
        logItem(s, 'action', 'Fit-out cancelled', 'The unfinished site was cancelled. The fit-out money is spent.');
        break;
      }
      if (extraSites(s) < 1) fail('You have no extra site to close.');
      const fee = siteRent(s, ind) * SITE_BREAK_MONTHS;
      post(L, m, 'Lease break fee: closing a site', [dr('otherCosts', fee), cr('cash', fee)], { cf: 'operating' });
      s.sites -= 1;
      logItem(s, 'action', 'Site closed', `You paid a ${formatGBP(fee)} break fee (${SITE_BREAK_MONTHS} months of rent). Capacity and reach fall back.`);
      break;
    }
    case 'setInsurance': {
      if (!INSURANCE_TIERS.includes(action.tier)) fail('Unknown cover level.');
      if (s.insurance === action.tier) fail('You already have that cover.');
      s.insurance = action.tier;
      logItem(s, 'action', `Insurance: ${COVER[action.tier].name}`, COVER[action.tier].blurb);
      break;
    }
    case 'acceptContract': {
      const check = acceptCheck(s, action.offerId);
      if (!check.allowed) fail(check.reason ?? 'You cannot take that contract.');
      const offer = s.contractOffers.find((o) => o.id === action.offerId)!;
      const c = signContract(s, offer);
      logItem(s, 'action', `Contract signed with ${c.client}`, `${c.units} a month for ${c.months} months at ${formatGBP(c.price)} each, paid in ${c.paymentDays} days. Your capacity is committed to them first.`);
      break;
    }
    case 'declineContract': {
      if (!s.contractOffers.some((o) => o.id === action.offerId)) fail('That offer has gone.');
      s.contractOffers = s.contractOffers.filter((o) => o.id !== action.offerId);
      break;
    }
    case 'listCompany': {
      const check = listCheck(s);
      if (!check.allowed) fail(check.reason ?? 'You cannot list yet.');
      const before = ownership(s);
      post(L, m, 'Shares issued in the stock market listing (net of 6% costs)', [dr('cash', check.proceeds), cr('shareCapital', check.proceeds)], {
        cf: 'financing', cfLabel: 'Proceeds from issue of shares (net of costs)',
      });
      s.shares.total += check.shares;
      s.listed = true;
      s.listedMonth = m;
      s.sentiment = 1;
      s.priceHistory = [];
      s.guidance = { month: m + 3, target: nextGuidance(s) };
      if (!s.pendingEvent) startNamedEvent(s, 'ipoDay', createRng(s));
      logItem(s, 'milestone', 'You are listed!', `${formatGBP(check.proceeds)} raised after costs. Your ownership fell from ${(before * 100).toFixed(1)}% to ${(ownership(s) * 100).toFixed(1)}%. Each quarter the market expects a profit: beat it and the price rises.`);
      break;
    }
    case 'buyBack': {
      if (!isWholePence(action.amount) || action.amount <= 0) fail('Enter an amount to spend.');
      const check = floatCheck(s, action.amount);
      if (!check.ok) fail(check.reason ?? 'You cannot buy back shares now.');
      const cost = check.shares * check.price;
      if (cost > L.balances.cash) fail('You need the cash in the bank to buy back shares.');
      if (cost > distributableReserves(s)) fail(`Buy-backs are limited to distributable reserves of ${formatGBP(Math.max(0, distributableReserves(s)))}.`);
      post(L, m, `Share buy-back: ${check.shares} shares`, [dr('retainedEarnings', cost), cr('cash', cost)], { cf: 'financing', cfLabel: 'Purchase of own shares' });
      s.shares.total -= check.shares;
      logItem(s, 'action', 'Shares bought back', `${check.shares} shares at ${formatGBP(check.price)}. Your stake rose to ${(ownership(s) * 100).toFixed(1)}%.`);
      break;
    }
    case 'resolveEvent': {
      if (!s.pendingEvent) fail('There is no decision waiting.');
      if (!s.pendingEvent!.choices.some((c) => c.id === action.choiceId)) fail('That choice is not available.');
      resolvePendingEvent(s, action.choiceId, createRng(s));
      break;
    }
    case 'activateBoost': {
      const def = BOOSTS[action.boostId] ?? fail('Unknown boost.');
      if (!DIFFICULTIES[s.difficulty].perksApply) fail('Boosts are switched off in Hard mode.');
      const year = Math.floor(m / 12);
      if ((s.boostActivations[year] ?? 0) >= MAX_BOOSTS_PER_YEAR) fail(`You can use at most ${MAX_BOOSTS_PER_YEAR} boosts per in-game year.`);
      s.boostActivations[year] = (s.boostActivations[year] ?? 0) + 1;
      const existing = s.boosts.find((b) => b.id === def.id);
      if (existing) existing.monthsRemaining += def.months;
      else s.boosts.push({ id: def.id, monthsRemaining: def.months });
      logItem(s, 'action', `Boost: ${def.name}`, def.description);
      break;
    }
    case 'prestige': {
      const check = prestigeCheck(s);
      if (!check.eligible) fail(check.reason ?? 'You cannot prestige yet.');
      // The company carries on. Prestige banks Legacy points, raises your rank (a permanent bonus that
      // applies at once) and moves the next target up.
      s.prestigeLevel = (s.prestigeLevel ?? 0) + 1;
      s.prestigeAward += check.points;
      logItem(s, 'milestone', `Prestige ${s.prestigeLevel}!`, `Your stake of ${formatGBP(check.stake)} earned ${check.points} Legacy points. You are now rank ${s.prestigeLevel} (${prestigeTitle(s.prestigeLevel)}): demand is +${Math.round(prestigeBonus(s.prestigeLevel) * 100)}% from now on, applied straight away. The company carries on; the next prestige needs ${formatGBP(prestigeThreshold(s.prestigeLevel))}.`);
      break;
    }
    case 'setGuildLevel': {
      if (!Number.isInteger(action.level) || action.level < 0 || action.level > GUILD_LEVELS.length) fail('Invalid holding company level.');
      s.guildLevel = action.level;
      break;
    }
    case 'acceptInvestment': {
      try {
        acceptInvestment(s, action);
      } catch (e) {
        fail((e as Error).message);
      }
      break;
    }
    case 'buyOutInvestors': {
      if (!Array.isArray(action.holderIds) || !action.holderIds.length) fail('Choose investors to buy out.');
      buyOutHolders(s, action.holderIds);
      break;
    }
    case 'buyBackShares': {
      try {
        buyBackFrom(s, action.holderId, action.pct);
      } catch (e) {
        fail((e as Error).message);
      }
      break;
    }
    case 'setAway': {
      if (typeof action.away !== 'boolean') fail('Invalid away flag.');
      if (action.away && s.pendingEvent) fail('Decide on the pending event first.');
      s.away = action.away;
      break;
    }
    case 'retire': {
      if (m < 12) fail('You can retire after your first year.');
      s.status = 'finished';
      s.endReason = 'You retired and exited the business.';
      logItem(s, 'milestone', 'Retired', 'Final score calculated on your stake in the company plus dividends received.');
      break;
    }
    default:
      fail('Unknown action.');
  }
  if (record) s.actionLog.push({ month: m, action });
}
