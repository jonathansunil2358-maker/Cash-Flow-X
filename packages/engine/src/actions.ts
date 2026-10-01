import { cr, dr, post } from './ledger/journal';
import { formatGBP, type Pence } from './money';
import { completeAcquisition } from './model/acquisitions';
import { industryOf, ROLE_IDS, type RoleId } from './model/industries';
import { loanOffer, MAX_TERM, MIN_TERM, overdraftLimit, spreadFor } from './model/loans';
import { currentBalanceSheet } from './model/metrics';
import { DIFFICULTIES } from './model/difficulty';
import { GUILD_LEVELS } from './model/guild';
import { acceptInvestment, buyOutHolders, distributeDividend } from './model/investors';
import { resolvePendingEvent } from './model/events';
import { modifiersOf } from './model/modifiers';
import { BOOSTS, type BoostId } from './model/perks';
import { prestigeCheck } from './model/prestige';
import { PROMO_DISCOUNTS, PROMO_MAX_MONTHS, promoCheck } from './model/promotions';
import { logItem, newId, ownership, type GameState } from './model/state';
import { UPGRADES, upgradeCost, type UpgradeDef } from './model/upgrades';
import { valuationOf } from './model/valuation';
import { createRng } from './rng';

export type InvestmentProduct = 'deposit' | 'fund';

export type Action =
  | { type: 'hire'; role: RoleId; count: number }
  | { type: 'fire'; role: RoleId; count: number }
  | { type: 'setPrice'; price: Pence }
  | { type: 'startPromo'; discountPct: number; months: number }
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
  | { type: 'prestige' }
  | { type: 'setAway'; away: boolean }
  | { type: 'setGuildLevel'; level: number }
  | { type: 'acceptInvestment'; investmentId: string; investorId: string; investorName: string; amount: Pence; preMoney: Pence }
  | { type: 'buyOutInvestors'; holderIds: string[] }
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
export const MAX_HEADS_PER_ROLE = 400;
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
  const preMoney = Math.round(valuationOf(s).equityValue * Math.min(1, EQUITY_DISCOUNT + modifiersOf(s).equityDiscountDelta));
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
}

/** The sector's upgrades with current level, next-level cost and lock reason. */
export function upgradeOptions(s: GameState): UpgradeOption[] {
  const mult = modifiersOf(s).upgradeCostMult;
  return UPGRADES[s.industryId].map((def) => {
    const level = s.upgrades[def.id] ?? 0;
    const req = def.requires;
    const locked = req && (s.upgrades[req.id] ?? 0) < req.level
      ? `Needs ${UPGRADES[s.industryId].find((u) => u.id === req.id)?.name} level ${req.level}`
      : null;
    return { def, level, cost: upgradeCost(def, level, mult), maxed: level >= def.maxLevel, locked };
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

export function applyActionInPlace(s: GameState, action: Action): void {
  if (s.status !== 'playing') fail('The game is over.');
  const ind = industryOf(s);
  const L = s.ledger;
  const m = s.month;

  switch (action.type) {
    case 'hire': {
      if (!ROLE_IDS.includes(action.role)) fail('Unknown role.');
      if (!isCount(action.count, 50)) fail('Hire between 1 and 50 people at a time.');
      if (s.staff[action.role] + action.count > MAX_HEADS_PER_ROLE) fail(`Maximum ${MAX_HEADS_PER_ROLE} staff per role.`);
      const role = ind.roles[action.role];
      const recruitment = recruitmentFee(s, action.role) * action.count;
      const equipment = ind.equipmentPerHire * action.count;
      requireFunds(s, recruitment + equipment, 'recruitment and equipment');
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
      // Outside investors are bought out at the current valuation before the sale.
      buyOutHolders(s);
      s.status = 'prestiged';
      s.prestigeAward = check.points;
      s.endReason = `You sold ${s.companyName} with your stake valued at ${formatGBP(check.stake)} and earned ${check.points} Legacy points.`;
      logItem(s, 'milestone', 'Prestiged', s.endReason);
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
  s.actionLog.push({ month: m, action });
}
