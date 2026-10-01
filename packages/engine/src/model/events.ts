import { cr, dr, post, type CfCategory, type JournalLine } from '../ledger/journal';
import { formatGBP, type Pence } from '../money';
import { chance, intRange, neutralRng, pick, range, type Rng } from '../rng';
import { DIFFICULTIES } from './difficulty';
import { industryOf, ROLE_IDS, type RoleId } from './industries';
import { plSummary } from '../ledger/statements';
import { boostActive, perkEffects } from './perks';
import { headcount, logItem, ownership, totalCustomers, type EventEffects, type GameState, type PendingEvent } from './state';
import { valuationOf } from './valuation';
import { scheduleIntoQueue } from './workingCapital';

export type Polarity = 'good' | 'bad';
type Poster = (memo: string, lines: JournalLine[], cf?: CfCategory, cfLabel?: string) => void;

export const BASE_BAD_DEBT_RATE = 0.003;
/** Chance that any event happens in a month. */
export const EVENT_CHANCE = 0.2;
/** Of those, the share that are decisions (choice cards) rather than automatic. */
export const CHOICE_SHARE = 0.5;
/** The month every company gets its first (good-news) decision. */
export const FIRST_EVENT_MONTH = 2;

const posterFor = (s: GameState): Poster => (memo, lines, cf = 'operating', cfLabel) => {
  post(s.ledger, s.month, memo, lines, { cf, cfLabel });
};

const lastRevenue = (s: GameState): Pence => {
  const r = s.history[s.history.length - 1];
  return r ? plSummary(r.period.pl).revenue : 0;
};
/** Scale an event's money to the size of the business (a month of revenue × k, with a floor). */
const sized = (s: GameState, k: number, floor: number): Pence => Math.round(Math.max(floor, lastRevenue(s) * k) / 10000) * 10000;

function addTemporary(s: GameState, type: string, title: string, months: number, effects: EventEffects, betweenTicks: boolean): void {
  // Effects added between ticks survive the next tick's ageing step, so they last `months` full months.
  s.economy.active.push({ type, title, startMonth: s.month, remaining: months + (betweenTicks ? 1 : 0), effects });
  recomputeEconomy(s);
}

// ---------------------------------------------------------------------------------------------
// Automatic events: apply at once and show as a toast / news item
// ---------------------------------------------------------------------------------------------

interface AutoEventDef {
  type: string;
  title: string;
  polarity: Polarity;
  weight: number;
  duration: [number, number];
  effects: EventEffects;
  excludes?: string[];
  when?: (s: GameState) => boolean;
  start: (s: GameState, rng: Rng, P: Poster) => string;
}

export const AUTO_EVENTS: AutoEventDef[] = [
  {
    type: 'boom', title: 'Economic boom', polarity: 'good', weight: 2, duration: [6, 12], effects: { demandMult: 1.12 }, excludes: ['recession'],
    start: () => 'Consumer and business spending is rising. Market demand +12% while the boom lasts.',
  },
  {
    type: 'rateCut', title: 'Interest rate cut', polarity: 'good', weight: 2, duration: [0, 0], effects: {},
    start: (s) => {
      s.economy.baseRate = Math.max(0.005, s.economy.baseRate - 0.005);
      return `Base rate falls 0.5% to ${(s.economy.baseRate * 100).toFixed(2)}%. Borrowing is cheaper and valuations rise.`;
    },
  },
  {
    type: 'viral', title: 'Viral review', polarity: 'good', weight: 3, duration: [0, 0], effects: {},
    start: (s) => {
      s.brand += 60;
      adjustReputation(s, 3);
      return 'A glowing review goes viral. Brand +60 points and reputation +3.';
    },
  },
  {
    type: 'supplierDeal', title: 'Supplier discount', polarity: 'good', weight: 2, duration: [4, 8], effects: { unitCostMult: 0.9 },
    start: () => 'A supplier is clearing capacity and cuts prices 10% for a few months. Watch your gross margin improve.',
  },
  {
    type: 'grant', title: 'Local growth grant', polarity: 'good', weight: 2, duration: [0, 0], effects: {},
    start: (s, _rng, P) => {
      const amount = sized(s, 0.15, 3_000_00);
      P('Growth grant received', [dr('cash', amount), cr('otherIncome', amount)]);
      return `The council awarded you a ${formatGBP(amount)} growth grant. It's shown as other operating income.`;
    },
  },
  {
    type: 'award', title: 'Industry award', polarity: 'good', weight: 2, duration: [0, 0], effects: {},
    start: (s) => {
      s.brand += 35;
      s.quality = Math.min(100, s.quality + 3);
      adjustReputation(s, 5);
      return 'You won "Best newcomer" at the industry awards. Brand +35, quality +3, reputation +5.';
    },
  },
  {
    type: 'recession', title: 'Recession', polarity: 'bad', weight: 2, duration: [9, 18], effects: { demandMult: 0.82, badDebtRate: 0.015, lendingAppetite: 0.7 }, excludes: ['boom'],
    start: (s) => {
      s.economy.baseRate = Math.max(0.005, s.economy.baseRate - 0.005);
      return 'Demand falls 18%, more customers fail to pay (bad debts rise) and banks lend 30% less. The central bank cuts rates by 0.5%.';
    },
  },
  {
    type: 'rateRise', title: 'Interest rate rise', polarity: 'bad', weight: 3, duration: [0, 0], effects: {},
    start: (s) => {
      s.economy.baseRate = Math.min(0.09, s.economy.baseRate + 0.0075);
      return `Base rate rises 0.75% to ${(s.economy.baseRate * 100).toFixed(2)}%. Loans, leases and overdrafts cost more, and your DCF discount rate rises.`;
    },
  },
  {
    type: 'supplyShock', title: 'Supply chain disruption', polarity: 'bad', weight: 3, duration: [4, 8], effects: { unitCostMult: 1.2 },
    start: () => 'Shipping and input costs jump. Unit costs +20% until supply recovers: watch your gross margin.',
  },
  {
    type: 'wageInflation', title: 'Wage inflation', polarity: 'bad', weight: 2, duration: [0, 0], effects: {},
    start: (s) => {
      s.salaryIndex *= 1.06;
      return 'A tight labour market pushes salaries up 6%, permanently.';
    },
  },
  {
    type: 'creditCrunch', title: 'Credit crunch', polarity: 'bad', weight: 1, duration: [6, 12], effects: { lendingAppetite: 0.3 },
    start: () => 'Banks pull back. New lending and overdraft limits are cut by 70%. Cash is king.',
  },
  {
    type: 'competitorLaunch', title: 'Competitor launches a better product', polarity: 'bad', weight: 3, duration: [0, 0], effects: {},
    start: (s, rng) => {
      const c = pick(rng, s.competitors);
      c.quality = Math.min(100, c.quality + 12);
      return `${c.name} launches a major upgrade (quality +12). Your preference share will fall unless you invest in quality or price.`;
    },
  },
  {
    type: 'theft', title: 'Break-in', polarity: 'bad', weight: 1, duration: [0, 0], effects: {}, when: (s) => s.month >= 3,
    start: (s, _rng, P) => {
      const amount = sized(s, 0.05, 1_500_00);
      P('Break-in: repairs and replacement kit', [dr('otherCosts', amount), cr('cash', amount)]);
      return `Thieves broke in overnight. Repairs and replacement kit cost ${formatGBP(amount)}.`;
    },
  },
];

// ---------------------------------------------------------------------------------------------
// Choice events: pause the game until the player decides
// ---------------------------------------------------------------------------------------------

interface ChoiceDef {
  id: string;
  label: string;
  hint: string;
  impact: { label: string; up: boolean }[];
  apply: (s: GameState, rng: Rng, P: Poster, params: Record<string, number>) => string;
}

interface ChoiceEventDef {
  id: string;
  title: string;
  polarity: Polarity;
  weight: number;
  icon: string;
  when: (s: GameState) => boolean;
  setup: (s: GameState, rng: Rng) => { story: string; params: Record<string, number>; choices: ChoiceDef[] };
}

const roleName = (s: GameState, r: RoleId) => industryOf(s).roles[r].title.toLowerCase();

export const CHOICE_EVENTS: ChoiceEventDef[] = [
  {
    id: 'clientTerms', title: 'A key client wants longer payment terms', polarity: 'bad', weight: 3, icon: 'flame',
    when: (s) => s.customerDays > 0 && s.month >= 3 && lastRevenue(s) > 0,
    setup: (s) => ({
      story: `One of your biggest customers says they'll move to a rival unless they can pay in ${s.customerDays + 30} days instead of ${s.customerDays}.`,
      params: {},
      choices: [
        { id: 'agree', label: `Agree to ${s.customerDays + 30} days`, hint: 'Keep the customer, but more cash gets tied up in receivables.', impact: [{ label: 'Cash', up: false }],
          apply: (st) => { st.customerDays = Math.min(120, st.customerDays + 30); return `Customer terms extended to ${st.customerDays} days.`; } },
        { id: 'meet', label: `Offer ${s.customerDays + 15} days`, hint: 'Roughly a 50% chance they accept.', impact: [{ label: 'Some cash', up: false }],
          apply: (st, rng) => {
            if (chance(rng, 0.5)) { st.customerDays = Math.min(120, st.customerDays + 15); return `They accepted ${st.customerDays} days.`; }
            loseShare(st, 0.08);
            return 'They walked away. You lost about 8% of your demand.';
          } },
        { id: 'refuse', label: 'Refuse', hint: 'Likely lose a big slice of demand; your cash is protected.', impact: [{ label: 'Revenue', up: false }],
          apply: (st) => { loseShare(st, 0.12); return 'They left for a rival. You lost about 12% of your demand.'; } },
      ],
    }),
  },
  {
    id: 'poached', title: 'A rival tries to poach your best person', polarity: 'bad', weight: 3, icon: 'key',
    when: (s) => headcount(s) >= 2,
    setup: (s, rng) => {
      const staffed = ROLE_IDS.filter((r) => s.staff[r] > 0);
      const role: RoleId = staffed.length ? pick(rng, staffed) : 'ops';
      const salary = Math.round(industryOf(s).roles[role].salary * s.salaryIndex);
      const equity = Math.round(salary * 0.5 / 100_000) * 100_000;
      return {
        story: `Your best ${roleName(s, role).replace(/s$/, '')} has an offer from a competitor paying 20% more.`,
        params: { role: ROLE_IDS.indexOf(role), equity },
        choices: [
          { id: 'match', label: 'Match the offer', hint: 'Keeps them, but raises pay expectations: salaries +2% across the team.', impact: [{ label: 'Staff costs', up: false }],
            apply: (st) => { st.salaryIndex *= 1.02; return 'You matched the offer. Team salaries rose 2%.'; } },
          { id: 'shares', label: `Offer ${formatGBP(equity)} in shares`, hint: 'No cash, but a share-based payment expense (IFRS 2) and a little dilution.', impact: [{ label: 'Ownership', up: false }],
            apply: (st, _rng, P, p) => issueSharesToStaff(st, P, p.equity) },
          { id: 'let', label: 'Let them go', hint: 'Lose one person in that role and some quality.', impact: [{ label: 'Quality', up: false }],
            apply: (st, _rng, _P, p) => {
              const r = ROLE_IDS[p.role];
              st.staff[r] = Math.max(0, st.staff[r] - 1);
              st.quality = Math.max(1, st.quality - 4);
              return `They left. You have ${st.staff[r]} ${roleName(st, r)} now, and quality fell 4 points.`;
            } },
        ],
      };
    },
  },
  {
    id: 'breakdown', title: 'Critical equipment breaks down', polarity: 'bad', weight: 3, icon: 'gear',
    when: (s) => s.month >= 2,
    setup: (s) => {
      const repair = sized(s, 0.12, 2_000_00);
      return {
        story: 'Something your business depends on has failed. Customers are already noticing.',
        params: { repair },
        choices: [
          { id: 'emergency', label: `Emergency repair (${formatGBP(repair)})`, hint: 'Fixed today. No lasting damage.', impact: [{ label: 'Cash', up: false }],
            apply: (st, _rng, P, p) => { P('Emergency repair', [dr('otherCosts', p.repair), cr('cash', p.repair)]); return `Repaired for ${formatGBP(p.repair)}.`; } },
          { id: 'cheap', label: `Cheap fix (${formatGBP(Math.round(repair / 3))})`, hint: 'Might not hold: about a 50% chance it fails again.', impact: [{ label: 'Risk', up: false }],
            apply: (st, rng, P, p) => {
              const cost = Math.round(p.repair / 3);
              P('Temporary repair', [dr('otherCosts', cost), cr('cash', cost)]);
              if (chance(rng, 0.5)) return `The ${formatGBP(cost)} fix held.`;
              addTemporary(st, 'outage', 'Outage', 1, { demandMult: 0.6 }, true);
              st.brand *= 0.85;
              return 'The fix failed. Demand is down 40% for a month and your brand took a hit.';
            } },
          { id: 'wait', label: 'Wait for the warranty repair', hint: 'Free, but demand drops 40% for a month.', impact: [{ label: 'Revenue', up: false }],
            apply: (st) => { addTemporary(st, 'outage', 'Outage', 1, { demandMult: 0.6 }, true); return 'Demand will be 40% lower this month while you wait.'; } },
        ],
      };
    },
  },
  {
    id: 'inspection', title: 'HMRC opens a tax inspection', polarity: 'bad', weight: 2, icon: 'shield',
    when: (s) => s.month >= 12,
    setup: (s) => {
      const fee = sized(s, 0.06, 2_500_00);
      const penalty = fee * 3;
      return {
        story: 'HMRC has selected your company for a compliance check of last year\'s corporation tax return.',
        params: { fee, penalty },
        choices: [
          { id: 'adviser', label: `Hire a tax adviser (${formatGBP(fee)})`, hint: 'Professional fees, but no penalty.', impact: [{ label: 'Cash', up: false }],
            apply: (_st, _rng, P, p) => { P('Tax adviser fees', [dr('otherCosts', p.fee), cr('cash', p.fee)]); return 'The inspection closed with no changes.'; } },
          { id: 'diy', label: 'Handle it yourself', hint: `Free, with about a 40% chance of a ${formatGBP(penalty)} penalty.`, impact: [{ label: 'Risk', up: false }],
            apply: (_st, rng, P, p) => {
              if (!chance(rng, 0.4)) return 'You got through it. No penalty.';
              P('HMRC penalty', [dr('otherCosts', p.penalty), cr('cash', p.penalty)]);
              return `HMRC found errors and charged a ${formatGBP(p.penalty)} penalty (not tax deductible in real life; simplified here).`;
            } },
        ],
      };
    },
  },
  {
    id: 'rentReview', title: 'Your landlord wants 15% more rent', polarity: 'bad', weight: 2, icon: 'mountain',
    when: (s) => s.month >= 6,
    setup: (s) => {
      const moving = sized(s, 0.2, 5_000_00);
      return {
        story: 'Your lease is up for review and the landlord has asked for a 15% increase.',
        params: { moving },
        choices: [
          { id: 'accept', label: 'Accept the increase', hint: 'Rent +15% from now on.', impact: [{ label: 'Rent', up: false }],
            apply: (st) => { st.rentIndex *= 1.15; return 'Rent is 15% higher from next month.'; } },
          { id: 'negotiate', label: 'Negotiate', hint: 'About 50/50: +7%, or +15% plus £1,000 of legal fees.', impact: [{ label: 'Rent', up: false }],
            apply: (st, rng, P) => {
              if (chance(rng, 0.5)) { st.rentIndex *= 1.07; return 'You settled at +7%.'; }
              st.rentIndex *= 1.15;
              P('Legal fees: rent negotiation', [dr('otherCosts', 1_000_00), cr('cash', 1_000_00)]);
              return 'The landlord held firm at +15%, and you paid £1,000 in legal fees.';
            } },
          { id: 'move', label: `Move premises (${formatGBP(moving)})`, hint: 'One-off moving cost, rent 5% lower, a small dip in brand.', impact: [{ label: 'Cash', up: false }, { label: 'Rent', up: true }],
            apply: (st, _rng, P, p) => {
              P('Moving costs', [dr('otherCosts', p.moving), cr('cash', p.moving)]);
              st.rentIndex *= 0.95;
              st.brand *= 0.9;
              return `You moved for ${formatGBP(p.moving)}. Rent is 5% lower.`;
            } },
        ],
      };
    },
  },
  {
    id: 'investor', title: 'An angel investor wants in', polarity: 'good', weight: 2, icon: 'diamond',
    when: (s) => s.month >= 6 && valuationOf(s).equityValue >= 150_000_00,
    setup: (s) => {
      const value = valuationOf(s).equityValue;
      const amount = Math.round((value * 0.2) / 1_000_00) * 1_000_00;
      return {
        story: `An angel investor loves what you're building and offers ${formatGBP(amount)} for new shares at your full valuation of ${formatGBP(value)}.`,
        params: { amount, value },
        choices: [
          { id: 'accept', label: `Take ${formatGBP(amount)}`, hint: 'Cash now, no repayments; you own a little less of the company.', impact: [{ label: 'Cash', up: true }, { label: 'Ownership', up: false }],
            apply: (st, _rng, P, p) => issueSharesForCash(st, P, p.amount, p.value, 'Angel investment') },
          { id: 'negotiate', label: 'Ask for a higher valuation', hint: 'About 50/50: they pay 20% more per share, or walk away.', impact: [{ label: 'Risk', up: false }],
            apply: (st, rng, P, p) => {
              if (!chance(rng, 0.5)) return 'The investor walked away.';
              return issueSharesForCash(st, P, p.amount, Math.round(p.value * 1.2), 'Angel investment');
            } },
          { id: 'decline', label: 'Decline', hint: 'Keep 100% of the upside.', impact: [],
            apply: () => 'You politely declined.' },
        ],
      };
    },
  },
  {
    id: 'bigDeal', title: 'A big customer wants a bulk deal', polarity: 'good', weight: 3, icon: 'parcel',
    when: (s) => lastRevenue(s) > 0,
    setup: (s): ReturnType<ChoiceEventDef['setup']> => {
      const ind = industryOf(s);
      if (ind.model === 'subscription') {
        const seats = Math.max(10, Math.round(totalCustomers(s) * 0.1));
        return {
          story: `A large organisation wants ${seats} ${ind.unitPlural} on a 12-month plan, paid up front, at 20% off your price.`,
          params: { seats },
          choices: [
            { id: 'accept', label: `Sign ${seats} ${ind.unitPlural}`, hint: 'Annual invoice now. The revenue is deferred and earned monthly (IFRS 15).', impact: [{ label: 'Revenue', up: true }, { label: 'Cash', up: true }],
              apply: (st, _rng, P, p) => {
                const perMonth = Math.round(p.seats * st.price * 0.8);
                P('Enterprise contract invoiced in advance', [dr('receivables', perMonth * 12), cr('deferredRevenue', perMonth * 12)]);
                scheduleIntoQueue(st.receivablesQueue, perMonth * 12, st.customerDays);
                for (let i = 0; i < 12; i++) st.deferredSchedule[i] += perMonth;
                st.annualCohorts.push({ startMonth: st.month, customers: p.seats });
                return `Signed. ${formatGBP(perMonth * 12)} invoiced and held as deferred revenue, released ${formatGBP(perMonth)} a month.`;
              } },
            { id: 'decline', label: 'Decline', hint: 'Protect your pricing and capacity.', impact: [], apply: () => 'You passed on the deal.' },
          ],
        };
      }
      const units = Math.max(2, Math.round(((s.history.at(-1)?.kpis.unitsSold ?? 0) * 0.4)));
      return {
        story: `A national chain wants an extra ${units} ${ind.unitPlural} next month at your normal price.`,
        params: { units },
        choices: [
          { id: 'accept', label: `Take the order`, hint: 'Only worth it if you have the capacity and stock.', impact: [{ label: 'Revenue', up: true }],
            apply: (st, _rng, _P, p) => { st.bonusDemand += p.units; return `${p.units} extra ${industryOf(st).unitPlural} added to next month's demand.`; } },
          { id: 'decline', label: 'Decline', hint: 'Keep capacity for existing customers.', impact: [], apply: () => 'You passed on the order.' },
        ],
      };
    },
  },
  {
    id: 'trending', title: 'You are trending online', polarity: 'good', weight: 3, icon: 'star',
    when: () => true,
    setup: (s) => {
      const spend = sized(s, 0.1, 2_000_00);
      return {
        story: 'A post about your business is taking off. You could pour fuel on the fire.',
        params: { spend },
        choices: [
          { id: 'boost', label: `Boost it (${formatGBP(spend)})`, hint: 'A big, lasting jump in brand.', impact: [{ label: 'Brand', up: true }, { label: 'Cash', up: false }],
            apply: (st, _rng, P, p) => {
              P('Boosted social campaign', [dr('marketing', p.spend), cr('cash', p.spend)]);
              st.brand += 120;
              return 'Brand +120 points.';
            } },
          { id: 'ride', label: 'Ride it for free', hint: 'A smaller jump in brand.', impact: [{ label: 'Brand', up: true }],
            apply: (st) => { st.brand += 40; return 'Brand +40 points.'; } },
        ],
      };
    },
  },
  {
    id: 'grantApp', title: 'An innovation grant is open', polarity: 'good', weight: 2, icon: 'bolt',
    when: (s) => s.month >= 3,
    setup: (s) => {
      const fee = 1_500_00;
      const grant = sized(s, 0.3, 10_000_00);
      return {
        story: `The government is funding innovation in your sector. A bid writer can apply for up to ${formatGBP(grant)}.`,
        params: { fee, grant },
        choices: [
          { id: 'apply', label: `Apply (${formatGBP(fee)} fee)`, hint: 'About a 60% chance of winning the grant.', impact: [{ label: 'Cash', up: true }],
            apply: (_st, rng, P, p) => {
              P('Grant application fee', [dr('otherCosts', p.fee), cr('cash', p.fee)]);
              if (!chance(rng, 0.6)) return 'The bid was unsuccessful this time.';
              P('Innovation grant received', [dr('cash', p.grant), cr('otherIncome', p.grant)]);
              return `You won ${formatGBP(p.grant)}! It's recorded as other operating income.`;
            } },
          { id: 'skip', label: 'Not now', hint: 'Save the fee and the time.', impact: [], apply: () => 'You skipped the grant round.' },
        ],
      };
    },
  },
];

const CHOICE_BY_ID = Object.fromEntries(CHOICE_EVENTS.map((e) => [e.id, e])) as Record<string, ChoiceEventDef>;

/** Move founder reputation (0-100). */
export function adjustReputation(s: GameState, delta: number): void {
  s.reputation = Math.min(100, Math.max(0, s.reputation + delta));
}

/** Reputation change for each event outcome: how customers and the press see the decision. */
const REPUTATION: Record<string, number> = {
  'clientTerms.agree': 1, 'clientTerms.meet': 0, 'clientTerms.refuse': -4,
  'poached.match': 1, 'poached.shares': 2, 'poached.let': -2,
  'breakdown.emergency': 2, 'breakdown.cheap': -1, 'breakdown.wait': -3,
  'inspection.adviser': 1, 'inspection.diy': -1,
  'rentReview.accept': 0, 'rentReview.negotiate': 0, 'rentReview.move': -1,
  'investor.accept': 2, 'investor.negotiate': 1, 'investor.decline': 0,
  'bigDeal.accept': 3, 'bigDeal.decline': -1,
  'trending.boost': 4, 'trending.ride': 1,
  'grantApp.apply': 1, 'grantApp.skip': 0,
};

function loseShare(s: GameState, fraction: number): void {
  if (industryOf(s).model === 'subscription') s.customers = Math.round(s.customers * (1 - fraction));
  s.brand *= 1 - fraction * 1.5;
}

function issueSharesForCash(s: GameState, P: Poster, amount: Pence, preMoney: Pence, label: string): string {
  const before = ownership(s);
  const newShares = Math.round((s.shares.total * amount) / Math.max(1, preMoney));
  P(`${label}: shares issued`, [dr('cash', amount), cr('shareCapital', amount)], 'financing', 'Proceeds from issue of shares (net of costs)');
  s.shares.total += newShares;
  return `Raised ${formatGBP(amount)}. Your ownership fell from ${(before * 100).toFixed(1)}% to ${(ownership(s) * 100).toFixed(1)}%.`;
}

function issueSharesToStaff(s: GameState, P: Poster, value: Pence): string {
  const preMoney = Math.max(100_000_00, valuationOf(s).equityValue);
  const newShares = Math.round((s.shares.total * value) / preMoney);
  P('Share-based payment to retain staff (IFRS 2)', [dr('wages', value), cr('shareCapital', value)]);
  s.shares.total += newShares;
  return `They stayed for ${formatGBP(value)} of shares: a non-cash staff cost, and your ownership is now ${(ownership(s) * 100).toFixed(1)}%.`;
}

// ---------------------------------------------------------------------------------------------
// Running events
// ---------------------------------------------------------------------------------------------

/** Recompute economy multipliers from the currently active events. */
export function recomputeEconomy(s: GameState): void {
  const e = s.economy;
  e.demandMult = 1;
  e.unitCostMult = 1;
  e.lendingAppetite = 1;
  e.badDebtRate = BASE_BAD_DEBT_RATE;
  for (const a of e.active) {
    if (a.effects.demandMult) e.demandMult *= a.effects.demandMult;
    if (a.effects.unitCostMult) e.unitCostMult *= a.effects.unitCostMult;
    if (a.effects.lendingAppetite) e.lendingAppetite = Math.min(e.lendingAppetite, a.effects.lendingAppetite);
    if (a.effects.badDebtRate) e.badDebtRate += a.effects.badDebtRate;
  }
}

/** Probability that an event is good news, after difficulty and perks. */
export function positiveShare(s: GameState): number {
  const base = DIFFICULTIES[s.difficulty].positiveShare;
  const delta = DIFFICULTIES[s.difficulty].perksApply ? perkEffects(s.perks).positiveShareDelta : 0;
  return Math.min(0.95, base + delta);
}

function weightedPick<T extends { weight: number }>(rng: Rng, items: T[]): T | null {
  const total = items.reduce((a, i) => a + i.weight, 0);
  if (total <= 0) return null;
  let r = range(rng, 0, total);
  for (const i of items) {
    r -= i.weight;
    if (r <= 0) return i;
  }
  return items[items.length - 1];
}

/**
 * Age active events, then maybe start one new event. Good or bad is drawn from the difficulty's
 * odds (plus perks); the Lucky charm boost blocks bad news entirely.
 */
export function runEvents(s: GameState, rng: Rng, enabled: boolean): void {
  for (const a of s.economy.active) a.remaining -= 1;
  const ended = s.economy.active.filter((a) => a.remaining <= 0);
  s.economy.active = s.economy.active.filter((a) => a.remaining > 0);
  for (const a of ended) logItem(s, 'event', `${a.title} ends`, 'Conditions return to normal.');

  // Every company meets a friendly decision early, so players learn choice cards before the bad news.
  const first = s.month === FIRST_EVENT_MONTH;
  if (enabled && !s.pendingEvent && (first || chance(rng, EVENT_CHANCE))) {
    const polarity: Polarity = first || chance(rng, positiveShare(s)) ? 'good' : 'bad';
    const shielded = polarity === 'bad' && ((boostActive(s.boosts, 'shield') && DIFFICULTIES[s.difficulty].perksApply) || s.away);
    if (!shielded) {
      const activeTypes = new Set(s.economy.active.map((a) => a.type));
      // While away, nothing can wait for a decision: only automatic events happen.
      const wantChoice = (first || chance(rng, CHOICE_SHARE)) && !s.away;
      const choices = CHOICE_EVENTS.filter((e) => e.polarity === polarity && e.when(s));
      const autos = AUTO_EVENTS.filter(
        (e) => e.polarity === polarity && !activeTypes.has(e.type) && !e.excludes?.some((t) => activeTypes.has(t)) && (e.when?.(s) ?? true),
      );
      const choice = !s.away && (wantChoice || autos.length === 0) ? weightedPick(rng, choices) : null;
      if (choice) startChoiceEvent(s, choice, rng);
      else {
        const auto = weightedPick(rng, autos);
        if (auto) startAutoEvent(s, auto, rng);
      }
    }
  }
  recomputeEconomy(s);
}

function startAutoEvent(s: GameState, def: AutoEventDef, rng: Rng): void {
  const text = def.start(s, rng, posterFor(s));
  const duration = def.duration[1] > 0 ? intRange(rng, def.duration[0], def.duration[1]) : 0;
  if (duration > 0) s.economy.active.push({ type: def.type, title: def.title, startMonth: s.month, remaining: duration, effects: def.effects });
  logItem(s, 'event', def.title, duration > 0 ? `${text} Expected to last about ${duration} months.` : text);
  s.lastEvent = { month: s.month, title: def.title, text, polarity: def.polarity };
}

function startChoiceEvent(s: GameState, def: ChoiceEventDef, rng: Rng): void {
  const setup = def.setup(s, rng);
  const pending: PendingEvent = {
    id: def.id, title: def.title, polarity: def.polarity, icon: def.icon, story: setup.story, month: s.month, params: setup.params,
    choices: setup.choices.map((c) => ({ id: c.id, label: c.label, hint: c.hint, impact: c.impact })),
  };
  s.pendingEvent = pending;
}

/** Apply the player's choice for the pending event. Returns the outcome text. */
export function resolvePendingEvent(s: GameState, choiceId: string, rng: Rng): string {
  const pending = s.pendingEvent;
  if (!pending) throw new Error('No event is waiting for a decision.');
  const def = CHOICE_BY_ID[pending.id];
  // Rebuild the choice list with a neutral RNG (labels only; outcomes use the frozen params and
  // the game's own RNG), so resolving never shifts the random sequence.
  const choice = def?.setup(s, neutralRng).choices.find((c) => c.id === choiceId);
  if (!def || !choice) throw new Error('That choice is not available.');
  const outcome = choice.apply(s, rng, posterFor(s), pending.params);
  adjustReputation(s, REPUTATION[`${pending.id}.${choiceId}`] ?? 0);
  s.pendingEvent = null;
  logItem(s, 'event', pending.title, `You chose "${choice.label}". ${outcome}`);
  s.lastEvent = { month: s.month, title: pending.title, text: outcome, polarity: pending.polarity };
  recomputeEconomy(s);
  return outcome;
}
