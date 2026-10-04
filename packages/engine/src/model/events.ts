import { cr, dr, post, type CfCategory, type JournalLine } from '../ledger/journal';
import { formatGBP, type Pence } from '../money';
import { chance, hashSeed, intRange, neutralRng, pick, range, type Rng } from '../rng';
import { DIFFICULTIES } from './difficulty';
import { industryOf, ROLE_IDS, type RoleId } from './industries';
import { plSummary } from '../ledger/statements';
import { boostActive, perkEffects } from './perks';
import { claimPayout, outageDemand } from './insurance';
import { PERSONALITIES, rosterOf } from './roster';
import { mentorOf } from './story';
import { cultureOf, eventChanceMult } from './modifiers-opt';
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

/** Post an insurance payout for a loss that was just posted (if the company is covered). */
function claim(s: GameState, P: Poster, cost: Pence, what: string): string {
  const payout = claimPayout(s, cost);
  if (payout <= 0) return '';
  P(`Insurance claim paid: ${what}`, [dr('cash', payout), cr('otherIncome', payout)]);
  return ` Your insurer paid ${formatGBP(payout)}.`;
}

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
    type: 'pandemic', title: 'A pandemic', polarity: 'bad', weight: 0.12, duration: [4, 8], effects: { demandMult: 0.75, unitCostMult: 1.1 }, when: (s) => s.month >= 12,
    start: () => 'A sudden health scare keeps people at home. Demand falls 25% and supplies cost 10% more while it lasts.',
  },
  {
    type: 'portStrike', title: 'Port strike', polarity: 'bad', weight: 0.12, duration: [3, 6], effects: { unitCostMult: 1.25 }, when: (s) => s.month >= 12,
    start: () => 'Dock workers have walked out. Imports are stuck and supplies cost 25% more until it ends.',
  },
  {
    type: 'techBreakthrough', title: 'Tech breakthrough', polarity: 'good', weight: 0.15, duration: [4, 8], effects: { demandMult: 1.15, unitCostMult: 0.95 }, when: (s) => s.month >= 12,
    start: () => 'A new technology makes everything easier. Demand +15% and supplies 5% cheaper for a while.',
  },
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
      return `Thieves broke in overnight. Repairs and replacement kit cost ${formatGBP(amount)}.${claim(s, P, amount, 'break-in')}`;
    },
  },
  {
    type: 'fire', title: 'Fire at the premises', polarity: 'bad', weight: 0.5, duration: [0, 0], effects: {}, when: (s) => s.month >= 6,
    start: (s, _rng, P) => {
      const amount = sized(s, 0.35, 4_000_00);
      P('Fire damage: clean-up and repairs', [dr('otherCosts', amount), cr('cash', amount)]);
      addTemporary(s, 'outage', 'Fire closure', 1, { demandMult: outageDemand(s) }, false);
      return `A fire closed the premises for a month. Clean-up and repairs cost ${formatGBP(amount)} and trade fell.${claim(s, P, amount, 'fire')}`;
    },
  },
  {
    type: 'cyber', title: 'Cyber attack', polarity: 'bad', weight: 0.5, duration: [0, 0], effects: {}, when: (s) => s.month >= 6,
    start: (s, _rng, P) => {
      const amount = sized(s, 0.25, 3_000_00);
      P('Cyber attack: recovery and specialists', [dr('otherCosts', amount), cr('cash', amount)]);
      s.reputation = Math.max(0, s.reputation - (s.insurance === 'full' ? 2 : 5));
      return `Criminals locked your systems. Recovery cost ${formatGBP(amount)} and customers noticed.${claim(s, P, amount, 'cyber attack')}`;
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
  /** Weight that depends on the state (overrides `weight`). */
  weightOf?: (s: GameState) => number;
  icon: string;
  when: (s: GameState) => boolean;
  setup: (s: GameState, rng: Rng) => { story: string; params: Record<string, number>; choices: ChoiceDef[] };
}

/**
 * "Once a year" memory for choice events. It lives in the state (not the news log, which the server's
 * compact checkpoints leave empty), so the client and the server always agree on what has happened.
 */
const doneOnce = (s: GameState, key: string): boolean => (s.done ?? []).includes(key);
const markOnce = (s: GameState, key: string): void => { s.done = [...(s.done ?? []), key].slice(-40); };

/** A rounded-to-pound cost shown in a label (keeps labels tidy). */
const p0 = (v: Pence): Pence => v;
const p0txt = (sue: boolean): string => (sue ? 'A good chance of winning, but court is never certain.' : 'Most likely thrown out, but you could lose.');
const roleName = (s: GameState, r: RoleId) => industryOf(s).roles[r].title.toLowerCase();

const CUSTOMERS = ['Mrs Okonkwo', 'Dr Fielding', 'The Harbour Cafe', 'Mr Lindqvist', 'Ms Abara', 'Ridgeway School', 'Councillor Pike', 'Little Jo'];

export const CHOICE_EVENTS: ChoiceEventDef[] = [
  {
    id: 'mentor', title: 'Your mentor is in town', polarity: 'good', weight: 1.5, icon: 'key',
    when: (s) => s.month >= 8 && s.month % 12 >= 4 && s.month % 12 <= 7 && !doneOnce(s, `mentor${Math.floor(s.month / 12)}`),
    setup: (s) => {
      const m = mentorOf(Math.floor(s.month / 12));
      const fee = sized(s, 0.02, 300_00);
      return {
        story: `${m.name}, who knows everything about ${m.specialty.toLowerCase()}, has an hour for you. "${m.lesson}" Which lesson do you want to take away?`,
        params: { fee },
        choices: [
          { id: 'costs', label: `Cost clinic (${formatGBP(fee)})`, hint: 'Supplies cost 3% less for six months.', impact: [{ label: 'Costs', up: true }, { label: 'Cash', up: false }],
            apply: (st, _rng, P, p) => { P('Mentor lunch', [dr('otherCosts', p.fee), cr('cash', p.fee)]); addTemporary(st, 'mentor-costs', 'Mentor: cost clinic', 6, { unitCostMult: 0.97 }, true); markOnce(st, `mentor${Math.floor(st.month / 12)}`); logItem(st, 'notice', `Mentor visit ${Math.floor(st.month / 12)}`, m.lesson); return 'You found savings in places you had stopped looking.'; } },
          { id: 'brand', label: `Story workshop (${formatGBP(fee)})`, hint: 'A lasting lift to your brand.', impact: [{ label: 'Brand', up: true }, { label: 'Cash', up: false }],
            apply: (st, _rng, P, p) => { P('Mentor lunch', [dr('otherCosts', p.fee), cr('cash', p.fee)]); st.brand *= 1.12; markOnce(st, `mentor${Math.floor(st.month / 12)}`); logItem(st, 'notice', `Mentor visit ${Math.floor(st.month / 12)}`, m.lesson); return 'Your story sharpened and word spread.'; } },
          { id: 'team', label: 'Team lunch (free)', hint: 'Morale up.', impact: [{ label: 'Morale', up: true }],
            apply: (st) => { st.morale = Math.min(100, st.morale + 6); markOnce(st, `mentor${Math.floor(st.month / 12)}`); logItem(st, 'notice', `Mentor visit ${Math.floor(st.month / 12)}`, m.lesson); return 'The team left buzzing.'; } },
        ],
      };
    },
  },
  {
    id: 'customerLetter', title: 'A letter from a customer', polarity: 'good', weight: 0.8, icon: 'heart',
    when: (s) => s.month >= 6 && lastRevenue(s) > 0,
    setup: (s, rng) => {
      const who = CUSTOMERS[Math.min(CUSTOMERS.length - 1, Math.floor(rng.next() * CUSTOMERS.length))];
      const cost = sized(s, 0.01, 150_00);
      const variant = Math.floor(rng.next() * 3);
      const story = variant === 0 ? `${who} writes that a recent order was not quite right, but they like what you do and would like to carry on.`
        : variant === 1 ? `${who} wants a small special order, a little outside your usual range, and would be a loyal customer if you can help.`
          : `${who} has posted a glowing review and asks whether there is a way to say thanks to other regulars too.`;
      return {
        story, params: { cost },
        choices: [
          { id: 'generous', label: `Go the extra mile (${formatGBP(cost)})`, hint: 'Reputation up.', impact: [{ label: 'Reputation', up: true }, { label: 'Cash', up: false }],
            apply: (st, _rng, P, p) => { P('Goodwill gesture to a customer', [dr('otherCosts', p.cost), cr('cash', p.cost)]); return `${who} tells everyone.`; } },
          { id: 'fair', label: 'A polite, standard reply', hint: 'Free. Small reputation gain.', impact: [{ label: 'Reputation', up: true }],
            apply: () => `${who} appreciates the reply.` },
          { id: 'dismiss', label: 'Ignore it', hint: 'Free, but people notice.', impact: [{ label: 'Reputation', up: false }],
            apply: () => `${who} is not impressed.` },
        ],
      };
    },
  },
  {
    id: 'press', title: 'A journalist wants an interview', polarity: 'good', weight: 0.8, icon: 'rocket',
    when: (s) => s.month >= 9 && s.reputation >= 30,
    setup: () => ({
      story: 'A business reporter is writing about your sector and wants a quote from you. A good interview is free publicity; a bad one lingers.',
      params: {},
      choices: [
        { id: 'open', label: 'Be open and bold', hint: 'About 70% a great piece, 30% an awkward one.', impact: [{ label: 'Brand', up: true }, { label: 'Risk', up: false }],
          apply: (st, rng) => { if (chance(rng, 0.7)) { st.brand *= 1.1; st.reputation = Math.min(100, st.reputation + 2); return 'The piece is a hit: your phone does not stop ringing.'; } st.reputation = Math.max(0, st.reputation - 2); return 'A line was taken out of context. A few awkward days.'; } },
        { id: 'careful', label: 'Stick to the facts', hint: 'Safe: a little brand lift.', impact: [{ label: 'Brand', up: true }],
          apply: (st) => { st.brand *= 1.03; return 'A sensible, forgettable quote. No harm done.'; } },
        { id: 'decline', label: 'No comment', hint: 'Nothing happens.', impact: [], apply: () => 'You politely decline. Your rival does not.' },
      ],
    }),
  },
  {
    id: 'founderLife', title: 'You have been working flat out', polarity: 'good', weight: 0.7, icon: 'coffee',
    when: (s) => s.month >= 10 && s.morale < 80,
    setup: (s) => {
      const fee = sized(s, 0.015, 250_00);
      return {
        story: 'Friends say you have not had a day off in months. The business could run without you for a few days, probably.',
        params: { fee },
        choices: [
          { id: 'holiday', label: 'Take a proper holiday', hint: 'Trade dips 2% for a month, morale up.', impact: [{ label: 'Revenue', up: false }, { label: 'Morale', up: true }],
            apply: (st) => { addTemporary(st, 'holiday', 'Founder on holiday', 1, { demandMult: 0.98 }, true); st.morale = Math.min(100, st.morale + 4); return 'You came back with ideas and a tan.'; } },
          { id: 'delegate', label: `Hire a deputy for the week (${formatGBP(fee)})`, hint: 'A small morale lift, no dip.', impact: [{ label: 'Cash', up: false }, { label: 'Morale', up: true }],
            apply: (st, _rng, P, p) => { P('Cover for the founder', [dr('wages', p.fee), cr('cash', p.fee)]); st.morale = Math.min(100, st.morale + 2); return 'The deputy kept things ticking.'; } },
          { id: 'work', label: 'Work through it', hint: 'A 10% chance of burnout: weaker trade for two months.', impact: [{ label: 'Risk', up: false }],
            apply: (st, rng) => { st.morale = Math.max(0, st.morale - 3); if (chance(rng, 0.1)) { addTemporary(st, 'burnout', 'Founder burnout', 2, { demandMult: 0.95 }, true); return 'You burned out. Two slow months while you recover.'; } return 'You got away with it, this time.'; } },
        ],
      };
    },
  },
  {
    id: 'bigBet', title: 'A once-in-a-lifetime bet', polarity: 'good', weight: 0.4, icon: 'diamond',
    when: (s) => s.month >= 12 && s.ledger.balances.cash >= 20_000_00,
    setup: (s) => {
      const stake = Math.round((s.ledger.balances.cash * 0.15) / 10_000) * 10_000;
      return {
        story: `A contact offers you a place in a risky one-off deal. Put in ${formatGBP(stake)} and there is a better-than-even chance of getting almost double back. Lose, and it is gone.`,
        params: { stake },
        choices: [
          { id: 'bet', label: `Bet ${formatGBP(stake)}`, hint: 'About 55% to win 80% on top, 45% to lose it all.', impact: [{ label: 'Risk', up: false }, { label: 'Cash', up: true }],
            apply: (st, rng, P, p) => {
              if (chance(rng, 0.55)) {
                const win = Math.round(p.stake * 0.8);
                P('Big bet paid off', [dr('cash', win), cr('otherIncome', win)]);
                return `It paid off! You made ${formatGBP(win)}.`;
              }
              P('Big bet lost', [dr('otherCosts', p.stake), cr('cash', p.stake)]);
              return `It went wrong and the ${formatGBP(p.stake)} is gone.`;
            } },
          { id: 'pass', label: 'Politely pass', hint: 'Nothing gained, nothing lost.', impact: [],
            apply: () => 'You kept your money and slept well.' },
        ],
      };
    },
  },
  {
    id: 'staffAsk', title: 'A team member has a request', polarity: 'good', weight: 1.2, icon: 'heart',
    when: (s) => s.month >= 6 && headcount(s) >= 3,
    setup: (s, rng) => {
      const team = rosterOf(s);
      const who = team[Math.min(team.length - 1, Math.floor(rng.next() * team.length))];
      const p = PERSONALITIES[who.personality];
      const raise = Math.round((industryOf(s).roles[who.role].salary * s.salaryIndex * 0.1) / 12 / 100) * 100;
      const bonus = sized(s, 0.03, 500_00);
      return {
        story: `${who.name}, your ${who.title.toLowerCase()} (${p.name.toLowerCase()}: ${p.blurb.toLowerCase()}) asks to talk. They would like more recognition for the work they do.`,
        params: { raise, bonus },
        choices: [
          { id: 'raise', label: `A pay rise (${formatGBP(raise)} a month)`, hint: 'Morale up and a lasting cost: all salaries rise 1%.', impact: [{ label: 'Staff costs', up: false }, { label: 'Morale', up: true }],
            apply: (st) => { st.salaryIndex *= 1.01; st.morale = Math.min(100, st.morale + 6); return `${who.name} is delighted, and word gets round. Salaries are 1% higher.`; } },
          { id: 'bonus', label: `A one-off bonus (${formatGBP(bonus)})`, hint: 'A smaller morale lift, no lasting cost.', impact: [{ label: 'Cash', up: false }, { label: 'Morale', up: true }],
            apply: (st, _rng, P, pp) => { P('Staff bonus', [dr('wages', pp.bonus), cr('cash', pp.bonus)]); st.morale = Math.min(100, st.morale + 4); return `${who.name} is happy with the thank-you.`; } },
          { id: 'timeoff', label: 'A long weekend for the whole team', hint: 'Free, but trade dips a little for a month.', impact: [{ label: 'Revenue', up: false }, { label: 'Morale', up: true }],
            apply: (st) => { addTemporary(st, 'holiday', 'Long weekend', 1, { demandMult: 0.97 }, true); st.morale = Math.min(100, st.morale + 5); return 'The team came back refreshed. Demand dips 3% this month.'; } },
          { id: 'decline', label: 'Not now', hint: 'Free, but people notice.', impact: [{ label: 'Morale', up: false }],
            apply: (st) => { st.morale = Math.max(0, st.morale - 3); return `${who.name} nods politely, but the mood in the office cools.`; } },
        ],
      };
    },
  },
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
    // Unhappy teams are easier to poach from; paying above market makes it harder.
    weightOf: (s) => (3 + Math.max(0, (60 - s.morale) / 10)) * (s.pay === 'above' ? 0.5 : 1),
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
            apply: (st) => { st.salaryIndex *= 1.02; st.morale = Math.min(100, st.morale + 5); return 'You matched the offer. Team salaries rose 2% and the team noticed you look after people.'; } },
          { id: 'shares', label: `Offer ${formatGBP(equity)} in shares`, hint: 'No cash, but a share-based payment expense (IFRS 2) and a little dilution.', impact: [{ label: 'Ownership', up: false }],
            apply: (st, _rng, P, p) => issueSharesToStaff(st, P, p.equity) },
          { id: 'let', label: 'Let them go', hint: 'Lose one person in that role and some quality.', impact: [{ label: 'Quality', up: false }],
            apply: (st, _rng, _P, p) => {
              const r = ROLE_IDS[p.role];
              st.staff[r] = Math.max(0, st.staff[r] - 1);
              st.quality = Math.max(1, st.quality - 4);
              st.morale = Math.max(0, st.morale - 5);
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
            apply: (st, _rng, P, p) => { P('Emergency repair', [dr('otherCosts', p.repair), cr('cash', p.repair)]); return `Repaired for ${formatGBP(p.repair)}.${claim(st, P, p.repair, 'repair')}`; } },
          { id: 'cheap', label: `Cheap fix (${formatGBP(Math.round(repair / 3))})`, hint: 'Might not hold: about a 50% chance it fails again.', impact: [{ label: 'Risk', up: false }],
            apply: (st, rng, P, p) => {
              const cost = Math.round(p.repair / 3);
              P('Temporary repair', [dr('otherCosts', cost), cr('cash', cost)]);
              const paid = claim(st, P, cost, 'repair');
              if (chance(rng, 0.5)) return `The ${formatGBP(cost)} fix held.${paid}`;
              addTemporary(st, 'outage', 'Outage', 1, { demandMult: outageDemand(st) }, true);
              st.brand *= 0.85;
              return 'The fix failed. Demand is down 40% for a month and your brand took a hit.';
            } },
          { id: 'wait', label: 'Wait for the warranty repair', hint: 'Free, but demand drops 40% for a month.', impact: [{ label: 'Revenue', up: false }],
            apply: (st) => { addTemporary(st, 'outage', 'Outage', 1, { demandMult: outageDemand(st) }, true); return `Demand will be ${st.insurance === 'full' ? 15 : 40}% lower this month while you wait.`; } },
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
            apply: (st, _rng, P, p) => { P('Tax adviser fees', [dr('otherCosts', p.fee), cr('cash', p.fee)]); return `The inspection closed with no changes.${claim(st, P, p.fee, 'tax adviser fees')}`; } },
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
  // ---- Batch: story and tension (takeover, culture events, trade fair, lawsuits, spies, pranks) ----
  {
    id: 'takeover', title: 'A takeover approach', polarity: 'bad', weight: 0.7, icon: 'shield',
    when: (s) => s.month >= 24 && lastRevenue(s) > 0 && !doneOnce(s, `takeover${Math.floor(s.month / 24)}`),
    setup: (s) => {
      const fee = sized(s, 0.04, 1_500_00);
      const small = Math.round(fee / 2 / 10000) * 10000;
      return {
        story: 'Harrow & Finch Capital has quietly built a small stake and now says it would like to "take a closer interest" in how you run things. The board room goes quiet. How do you respond?',
        params: { fee, small },
        choices: [
          { id: 'fight', label: `Fight it (${formatGBP(fee)})`, hint: 'Lawyers and a poison pill. Probably works, but it is a gamble.', impact: [{ label: 'Reputation', up: true }, { label: 'Cash', up: false }],
            apply: (st, rng, P, p) => {
              P('Takeover defence: advisers and legal fees', [dr('otherCosts', p.fee), cr('cash', p.fee)]);
              markOnce(st, `takeover${Math.floor(st.month / 24)}`); logItem(st, 'notice', `Takeover approach ${Math.floor(st.month / 24)}`, 'Harrow & Finch Capital made an approach.');
              if (chance(rng, 0.6)) { st.brand *= 1.05; st.morale = Math.min(100, st.morale + 4); return 'Harrow & Finch backed off. The team is proud you stood up to them.'; }
              st.morale = Math.max(0, st.morale - 6); return 'The defence was costly and the fight dragged on. The distraction hurt morale.';
            } },
          { id: 'standstill', label: `Agree a standstill (${formatGBP(p0(fee))})`, hint: 'A quiet deal: they leave you alone for a while.', impact: [{ label: 'Cash', up: false }],
            apply: (st, _rng, P, p) => {
              P('Standstill agreement with an investor', [dr('otherCosts', p.small), cr('cash', p.small)]);
              markOnce(st, `takeover${Math.floor(st.month / 24)}`); logItem(st, 'notice', `Takeover approach ${Math.floor(st.month / 24)}`, 'Harrow & Finch Capital made an approach.');
              return 'They signed the standstill and went quiet. A cheap way to get on with your business.';
            } },
          { id: 'ignore', label: 'Ignore them', hint: 'Free, but the rumour mill will not.', impact: [{ label: 'Morale', up: false }],
            apply: (st) => { markOnce(st, `takeover${Math.floor(st.month / 24)}`); logItem(st, 'notice', `Takeover approach ${Math.floor(st.month / 24)}`, 'Harrow & Finch Capital made an approach.'); st.morale = Math.max(0, st.morale - 8); st.brand *= 0.97; return 'Rumours of a sale unsettled the team and a few customers.'; } },
        ],
      };
    },
  },
  {
    id: 'cultureParty', title: 'Time for an office party?', polarity: 'good', weight: 0.8, icon: 'heart',
    weightOf: (s) => (cultureOf(s.modifiers) === 'culture-people' ? 2 : cultureOf(s.modifiers) === 'culture-frugal' ? 0.3 : 0.8),
    when: (s) => s.month >= 6 && headcount(s) >= 3 && !doneOnce(s, `party${Math.floor(s.month / 12)}`),
    setup: (s) => {
      const big = sized(s, 0.015, 400_00);
      const small = Math.round(big / 3 / 10000) * 10000 || 10000;
      return {
        story: cultureOf(s.modifiers) === 'culture-people' ? 'People first is your motto, and the team is hoping for a proper celebration this year.' : 'The team has been working hard. Someone has suggested an office party.',
        params: { big, small },
        choices: [
          { id: 'big', label: `A proper party (${formatGBP(big)})`, hint: 'Morale up a lot.', impact: [{ label: 'Morale', up: true }, { label: 'Cash', up: false }],
            apply: (st, _rng, P, p) => { P('Team party', [dr('otherCosts', p.big), cr('cash', p.big)]); st.morale = Math.min(100, st.morale + 10); markOnce(st, `party${Math.floor(st.month / 12)}`); logItem(st, 'notice', `Office party ${Math.floor(st.month / 12)}`, 'A good night was had by all.'); return 'Everyone talked about it for weeks.'; } },
          { id: 'small', label: `Pizza and drinks (${formatGBP(p0(small))})`, hint: 'A smaller boost.', impact: [{ label: 'Morale', up: true }],
            apply: (st, _rng, P, p) => { P('Team pizza night', [dr('otherCosts', p.small), cr('cash', p.small)]); st.morale = Math.min(100, st.morale + 4); markOnce(st, `party${Math.floor(st.month / 12)}`); logItem(st, 'notice', `Office party ${Math.floor(st.month / 12)}`, 'Pizza was had.'); return 'A cheerful, cheap evening.'; } },
          { id: 'skip', label: 'Not this year', hint: 'Save the money.', impact: [], apply: (st) => { markOnce(st, `party${Math.floor(st.month / 12)}`); logItem(st, 'notice', `Office party ${Math.floor(st.month / 12)}`, 'Skipped.'); return 'The team shrugged and carried on.'; } },
        ],
      };
    },
  },
  {
    id: 'strike', title: 'The team is threatening to walk out', polarity: 'bad', weight: 0.4, icon: 'shield',
    weightOf: (s) => (s.morale < 45 ? 3 : 0.3) * (cultureOf(s.modifiers) === 'culture-people' ? 0.5 : 1),
    when: (s) => headcount(s) >= 5,
    setup: (s) => {
      const raise = sized(s, 0.03, 600_00);
      return {
        story: 'A group of staff have signed a letter: they say the workload and pay are not fair and they are prepared to walk out on Friday.',
        params: { raise },
        choices: [
          { id: 'talk', label: `Talk and give a one-off bonus (${formatGBP(raise)})`, hint: 'Costs money, calms things.', impact: [{ label: 'Morale', up: true }, { label: 'Cash', up: false }],
            apply: (st, _rng, P, p) => { P('Staff bonus to settle a dispute', [dr('wages', p.raise), cr('cash', p.raise)]); st.morale = Math.min(100, st.morale + 6); return 'The letter was withdrawn. A handshake and a bonus did the trick.'; } },
          { id: 'mediate', label: 'Bring in a mediator', hint: 'A middle way: some lost time, some goodwill.', impact: [{ label: 'Output', up: false }],
            apply: (st) => { addTemporary(st, 'strike-slow', 'Dispute slows output', 2, { demandMult: 0.95 }, true); st.morale = Math.min(100, st.morale + 2); return 'It took two rocky months, but you reached a deal.'; } },
          { id: 'hold', label: 'Hold firm', hint: 'Free now, expensive later.', impact: [{ label: 'Output', up: false }, { label: 'Morale', up: false }],
            apply: (st) => { addTemporary(st, 'strike-walkout', 'Walkout', 3, { demandMult: 0.88 }, true); st.morale = Math.max(0, st.morale - 8); return 'Part of the team walked out for days. Output dipped for three months.'; } },
        ],
      };
    },
  },
  {
    id: 'fireDrill', title: 'A surprise safety inspection', polarity: 'bad', weight: 0.5, icon: 'shield',
    weightOf: (s) => (cultureOf(s.modifiers) === 'culture-frugal' ? 1.8 : 0.5),
    when: (s) => s.month >= 10 && headcount(s) >= 2,
    setup: (s) => {
      const fix = sized(s, 0.012, 300_00);
      const fine = sized(s, 0.04, 900_00);
      return {
        story: 'An inspector turns up unannounced and finds the fire exits half-blocked and the extinguishers out of date. You can fix it properly or hope for the best.',
        params: { fix, fine },
        choices: [
          { id: 'fix', label: `Fix everything now (${formatGBP(fix)})`, hint: 'Safe and sorted.', impact: [{ label: 'Cash', up: false }],
            apply: (_st, _rng, P, p) => { P('Safety improvements', [dr('otherCosts', p.fix), cr('cash', p.fix)]); return 'The inspector left satisfied.'; } },
          { id: 'gamble', label: 'Patch it up and hope', hint: 'Cheap, but a re-inspection may fine you.', impact: [{ label: 'Cash', up: false }],
            apply: (st, rng, P, p) => {
              const cheap = Math.round(p.fix / 3 / 10000) * 10000 || 10000;
              P('Quick safety patch', [dr('otherCosts', cheap), cr('cash', cheap)]);
              if (chance(rng, 0.45)) { P('Safety fine', [dr('otherCosts', p.fine), cr('cash', p.fine)]); adjustReputation(st, -2); return `A re-inspection found the patch wanting: a ${formatGBP(p.fine)} fine.`; }
              return 'The patch passed. This time.';
            } },
        ],
      };
    },
  },
  {
    id: 'tradeFair', title: 'The big trade fair', polarity: 'good', weight: 1, icon: 'rocket',
    when: (s) => s.month >= 5 && s.month % 12 >= 1 && s.month % 12 <= 6 && lastRevenue(s) > 0 && !doneOnce(s, `fair${Math.floor(s.month / 12)}`),
    setup: (s) => {
      const big = sized(s, 0.06, 1_500_00);
      const small = Math.round(big / 3 / 10000) * 10000 || 10000;
      return {
        story: 'The yearly trade fair is on. A big stand puts you in front of every buyer in your sector; a small one still gets you noticed.',
        params: { big, small },
        choices: [
          { id: 'big', label: `A big stand (${formatGBP(big)})`, hint: 'More demand for three months and a brand lift.', impact: [{ label: 'Demand', up: true }, { label: 'Brand', up: true }, { label: 'Cash', up: false }],
            apply: (st, _rng, P, p) => { P('Trade fair: large stand', [dr('marketing', p.big), cr('cash', p.big)]); addTemporary(st, 'fair-demand', 'Trade fair leads', 3, { demandMult: 1.07 }, true); st.brand *= 1.06; markOnce(st, `fair${Math.floor(st.month / 12)}`); logItem(st, 'notice', `Trade fair ${Math.floor(st.month / 12)}`, 'You exhibited at the fair.'); return 'Your stand was packed. Leads are pouring in.'; } },
          { id: 'small', label: `A small stand (${formatGBP(p0(small))})`, hint: 'A smaller lift.', impact: [{ label: 'Brand', up: true }],
            apply: (st, _rng, P, p) => { P('Trade fair: small stand', [dr('marketing', p.small), cr('cash', p.small)]); st.brand *= 1.03; markOnce(st, `fair${Math.floor(st.month / 12)}`); logItem(st, 'notice', `Trade fair ${Math.floor(st.month / 12)}`, 'You exhibited at the fair.'); return 'A few good contacts, no big splash.'; } },
          { id: 'skip', label: 'Skip it', hint: 'Save the fee.', impact: [], apply: (st) => { markOnce(st, `fair${Math.floor(st.month / 12)}`); logItem(st, 'notice', `Trade fair ${Math.floor(st.month / 12)}`, 'Skipped.'); return 'You stayed home and kept the cash.'; } },
        ],
      };
    },
  },
  {
    id: 'lawsuit', title: 'A legal letter arrives', polarity: 'bad', weight: 0.7, icon: 'shield',
    weightOf: (s) => (s.insurance === 'full' ? 0.4 : 0.8),
    when: (s) => s.month >= 18 && lastRevenue(s) > 0,
    setup: (s, rng) => {
      const settle = sized(s, 0.05, 1_000_00) * (s.insurance === 'full' ? 0.3 : 1);
      const fight = sized(s, 0.02, 400_00);
      const loss = sized(s, 0.09, 1_800_00);
      const sue = rng.next() < 0.4;
      return {
        story: sue
          ? 'A rival has copied your product almost exactly. A lawyer says you have a good case if you want to sue.'
          : 'A customer claims your product caused them losses and threatens to sue. A lawyer thinks it is weak, but court is a gamble.',
        params: { settle: Math.round(settle / 10000) * 10000, fight, loss, sue: sue ? 1 : 0 },
        choices: [
          { id: 'settle', label: sue ? 'Drop it (free)' : `Settle quietly (${formatGBP(Math.round(settle / 10000) * 10000)})`, hint: sue ? 'Nothing gained, nothing lost.' : 'A known cost.', impact: sue ? [] : [{ label: 'Cash', up: false }],
            apply: (_st, _rng, P, p) => { if (p.sue) return 'You let it go. The rival carried on.'; P('Legal settlement', [dr('otherCosts', p.settle), cr('cash', p.settle)]); return 'The claim was settled and forgotten.'; } },
          { id: 'fight', label: `Go to court (${formatGBP(fight)})`, hint: p0txt(sue), impact: [{ label: 'Reputation', up: true }, { label: 'Cash', up: false }],
            apply: (st, rng, P, p) => {
              P('Legal fees', [dr('otherCosts', p.fight), cr('cash', p.fight)]);
              if (chance(rng, p.sue ? 0.55 : 0.6)) {
                if (p.sue && st.competitors.length) { const c = st.competitors[Math.floor(rng.next() * st.competitors.length)]; c.quality = Math.max(10, c.quality - 3); }
                adjustReputation(st, 3); return p.sue ? 'You won! The judge ordered the rival to change its product.' : 'The case was thrown out. Your name is cleaner than ever.';
              }
              if (!p.sue) { P('Court costs and damages', [dr('otherCosts', p.loss), cr('cash', p.loss)]); }
              adjustReputation(st, -3); return p.sue ? 'You lost. The bills stand and the rival gloats.' : `You lost, and the damages and costs came to ${formatGBP(p.loss)}.`;
            } },
        ],
      };
    },
  },
  {
    id: 'spy', title: 'An offer to see a rival\'s plans', polarity: 'good', weight: 0.6, icon: 'key',
    when: (s) => s.month >= 9 && s.competitors.length > 0,
    setup: (s) => {
      const detective = sized(s, 0.03, 700_00);
      const report = Math.round(detective / 3 / 10000) * 10000 || 10000;
      const rival = s.competitors[0]?.name ?? 'your rival';
      return {
        story: `A contact says someone who used to work at ${rival} will tell you what they are planning, for a fee. It is a little shady. You could also just study them openly.`,
        params: { detective, report },
        choices: [
          { id: 'spy', label: `Pay the informant (${formatGBP(detective)})`, hint: 'A real edge, with a risk of being found out.', impact: [{ label: 'Demand', up: true }, { label: 'Reputation', up: false }],
            apply: (st, rng, P, p) => {
              P('Market intelligence', [dr('otherCosts', p.detective), cr('cash', p.detective)]);
              if (chance(rng, 0.25)) { adjustReputation(st, -4); return 'The informant was a plant. Someone leaked it to the press and you look shady.'; }
              addTemporary(st, 'spy-edge', 'You read the market', 3, { demandMult: 1.04 }, true); return 'You were one step ahead of them for months.';
            } },
          { id: 'report', label: `Buy an industry report (${formatGBP(p0(report))})`, hint: 'Honest and a bit useful.', impact: [{ label: 'Demand', up: true }],
            apply: (st, _rng, P, p) => { P('Industry report', [dr('otherCosts', p.report), cr('cash', p.report)]); addTemporary(st, 'spy-report', 'Industry insight', 2, { demandMult: 1.02 }, true); return 'The report confirmed some hunches and corrected others.'; } },
          { id: 'decline', label: 'No thanks', hint: 'Free.', impact: [], apply: () => 'You stuck to your own plans.' },
        ],
      };
    },
  },
  {
    id: 'prank', title: 'Bank holiday mischief', polarity: 'good', weight: 0.7, icon: 'heart',
    when: (s) => s.month >= 4 && headcount(s) >= 2,
    setup: (s) => {
      const treat = sized(s, 0.008, 200_00);
      return {
        story: 'It is the day before a bank holiday and the office is in a mood. Someone has wrapped the manager\'s desk in foil.',
        params: { treat },
        choices: [
          { id: 'join', label: 'Join in (free)', hint: 'Good for the mood, but jokes can backfire.', impact: [{ label: 'Morale', up: true }],
            apply: (st, rng) => { if (chance(rng, 0.2)) { st.morale = Math.max(0, st.morale - 3); return 'The prank went a bit far and someone was upset.'; } st.morale = Math.min(100, st.morale + 5); return 'The whole office laughed for an hour.'; } },
          { id: 'treat', label: `Treat everyone (${formatGBP(treat)})`, hint: 'A sure boost.', impact: [{ label: 'Morale', up: true }, { label: 'Cash', up: false }],
            apply: (st, _rng, P, p) => { P('Team treats', [dr('otherCosts', p.treat), cr('cash', p.treat)]); st.morale = Math.min(100, st.morale + 7); return 'Cakes appeared and the mood lifted.'; } },
          { id: 'work', label: 'Back to work', hint: 'Nothing happens.', impact: [], apply: () => 'You kept your head down. The foil stayed on the desk.' },
        ],
      };
    },
  },
  {
    id: 'ipoDay', title: 'It is IPO day', polarity: 'good', weight: 0, icon: 'diamond',
    when: () => false,
    setup: (s) => {
      const road = sized(s, 0.05, 2_000_00);
      return {
        story: 'The bell is about to ring and the market is watching. How do you want to open your first day as a listed company?',
        params: { road },
        choices: [
          { id: 'bell', label: 'Ring the bell and smile (free)', hint: 'A little hype.', impact: [{ label: 'Share price', up: true }],
            apply: (st) => { st.sentiment *= 1.04; return 'The cameras loved it. The price ticked up.'; } },
          { id: 'roadshow', label: `A flashy roadshow (${formatGBP(road)})`, hint: 'More hype and a brand lift, at a cost.', impact: [{ label: 'Share price', up: true }, { label: 'Brand', up: true }, { label: 'Cash', up: false }],
            apply: (st, _rng, P, p) => { P('IPO roadshow and publicity', [dr('marketing', p.road), cr('cash', p.road)]); st.sentiment *= 1.1; st.brand *= 1.05; return 'Investors queued to meet you. The price jumped.'; } },
          { id: 'quiet', label: 'Keep it low-key', hint: 'No fuss, no hype.', impact: [], apply: () => 'The listing happened quietly, and the price stayed put.' },
        ],
      };
    },
  },
  {
    id: 'integrationIssue', title: 'Trouble after the deal', polarity: 'bad', weight: 0, icon: 'key',
    when: () => false,
    setup: (s) => {
      const name = s.mna?.issue ?? 'the new business';
      const integ = s.mna?.integrations?.find((i) => i.name === name);
      const base = integ?.price ?? sized(s, 0.05, 20_000_00);
      const fix = Math.max(1_000_00, Math.round((base * 0.02) / 100) * 100);
      return {
        story: `Two companies, two ways of doing things. At ${name} a group of managers is pulling against yours, key customers are asking who they should call and a few people are looking at job ads.`,
        params: { fix },
        choices: [
          { id: 'fix', label: `Fund a proper fix (${formatGBP(fix)})`, hint: 'Away-days, one set of rules and a clear contact for every customer.', impact: [{ label: 'Morale', up: true }, { label: 'Cash', up: false }],
            apply: (st, _rng, P, p) => { P('Integration programme', [dr('otherCosts', p.fix), cr('cash', p.fix)]); st.morale = Math.min(100, st.morale + 4); return 'The two teams started to pull in the same direction.'; } },
          { id: 'senior', label: 'Step in yourself (free)', hint: 'Your time, not your money. It works about half the time.', impact: [{ label: 'Morale', up: true }],
            apply: (st, rng) => { if (chance(rng, 0.5)) { st.morale = Math.min(100, st.morale + 3); return 'Your presence calmed things down.'; } st.morale = Math.max(0, st.morale - 3); return 'It did not land. People felt managed rather than heard.'; } },
          { id: 'ignore', label: 'Let them sort it out', hint: 'Free, but people leave and customers drift.', impact: [{ label: 'Morale', up: false }, { label: 'Reputation', up: false }],
            apply: (st) => { st.morale = Math.max(0, st.morale - 6); st.reputation = Math.max(0, st.reputation - 2); if (integ) integ.synergy = Math.round(integ.synergy * 0.8); return 'Several good people quit and the promised savings slipped.'; } },
        ],
      };
    },
  },
  {
    id: 'whistle', title: 'You hear something troubling', polarity: 'bad', weight: 0.6, icon: 'key',
    when: (s) => s.month >= 12 && lastRevenue(s) > 0 && !doneOnce(s, 'whistle'),
    setup: (s) => {
      const fee = sized(s, 0.015, 400_00);
      return {
        story: 'A friend in the trade tells you that one of your suppliers is cutting corners on safety to keep its prices low. You could report it, quietly use that to squeeze a lower price, or look the other way.',
        params: { fee },
        choices: [
          { id: 'report', label: `Report them (${formatGBP(fee)})`, hint: 'The right thing, with a little cost and hassle.', impact: [{ label: 'Reputation', up: true }, { label: 'Cash', up: false }],
            apply: (st, _rng, P, p) => { markOnce(st, 'whistle'); P('Legal advice on reporting a supplier', [dr('otherCosts', p.fee), cr('cash', p.fee)]); return 'The regulator thanked you. Other firms noticed that you play it straight.'; } },
          { id: 'exploit', label: 'Use it to cut your costs', hint: 'Cheaper supplies for six months. Secrets have a way of coming out.', impact: [{ label: 'Costs', up: true }, { label: 'Risk', up: false }],
            apply: (st) => { markOnce(st, 'whistle'); markOnce(st, `exploit@${st.month}`); addTemporary(st, 'whistle-deal', 'A very cheap deal', 6, { unitCostMult: 0.95 }, true); return 'The supplier agreed to a bargain price. You do not ask how.'; } },
          { id: 'ignore', label: 'Look the other way', hint: 'Nothing happens, for now.', impact: [], apply: (st) => { markOnce(st, 'whistle'); return 'You told yourself it was not your business.'; } },
        ],
      };
    },
  },
  {
    id: 'scandal', title: 'The supplier scandal breaks', polarity: 'bad', weight: 6, icon: 'flame',
    when: (s) => !doneOnce(s, 'scandal') && (s.done ?? []).some((k) => { const m = /^exploit@(\d+)$/.exec(k); return !!m && s.month >= Number(m[1]) + 6; }),
    setup: (s) => {
      const fine = sized(s, 0.06, 1_200_00);
      return {
        story: 'The newspapers have found out about your supplier, and about the very cheap deal you took from them. Reporters are at the door.',
        params: { fine },
        choices: [
          { id: 'apologise', label: `Apologise and make amends (${formatGBP(fine)})`, hint: 'Costly, but it limits the damage.', impact: [{ label: 'Cash', up: false }],
            apply: (st, _rng, P, p) => { markOnce(st, 'scandal'); P('Compensation and public apology', [dr('otherCosts', p.fine), cr('cash', p.fine)]); adjustReputation(st, -4); return 'You owned up. It hurt, but people respect that.'; } },
          { id: 'deny', label: 'Deny everything', hint: 'Free, if it works. It rarely does.', impact: [{ label: 'Reputation', up: false }],
            apply: (st, rng) => { markOnce(st, 'scandal'); if (chance(rng, 0.3)) return 'The story fizzled out. You got away with it.'; adjustReputation(st, -12); st.brand *= 0.9; return 'Documents leaked and you were caught lying. Customers will remember.'; } },
        ],
      };
    },
  },
  {
    id: 'poach', title: 'A rival is poaching your star', polarity: 'bad', weight: 0.7, icon: 'star',
    when: (s) => (s.stars?.length ?? 0) > 0 && s.month >= 12 && !doneOnce(s, `poach${Math.floor(s.month / 12)}`),
    setup: (s) => {
      const star = s.stars![hashSeed(`${s.seedLabel}:poach:${s.month}`) % s.stars!.length];
      const bonus = sized(s, 0.05, 1_000_00);
      return {
        story: `A recruiter has offered ${star.name} a lot of money to join a rival. They have come to you first. Match it with a retention bonus, try a cheaper counter-offer, or let them go.`,
        params: { bonus, half: Math.round(bonus / 2 / 10000) * 10000 },
        choices: [
          { id: 'match', label: `Match the offer (${formatGBP(bonus)})`, hint: 'They stay, and the team sees you look after people.', impact: [{ label: 'Morale', up: true }, { label: 'Cash', up: false }],
            apply: (st, _rng, P, p) => { markOnce(st, `poach${Math.floor(st.month / 12)}`); P('Retention bonus for a star employee', [dr('wages', p.bonus), cr('cash', p.bonus)]); st.morale = Math.min(100, st.morale + 2); return `${star.name} stays, and tells everyone.`; } },
          { id: 'counter', label: `Counter-offer (${formatGBP(Math.round(bonus / 2 / 10000) * 10000)})`, hint: 'A coin flip: it may not be enough.', impact: [{ label: 'Risk', up: false }],
            apply: (st, rng2, P, p) => {
              markOnce(st, `poach${Math.floor(st.month / 12)}`); P('Counter-offer to a star employee', [dr('wages', p.half), cr('cash', p.half)]);
              if (chance(rng2, 0.5)) return `${star.name} accepts and stays.`;
              st.stars = (st.stars ?? []).filter((x) => x.id !== star.id); st.staff[star.role] = Math.max(0, st.staff[star.role] - 1);
              return `${star.name} took the rival's offer anyway. Their perk goes with them.`;
            } },
          { id: 'letgo', label: 'Let them go', hint: 'Free today. You lose their perk.', impact: [{ label: 'Perk', up: false }],
            apply: (st) => { markOnce(st, `poach${Math.floor(st.month / 12)}`); st.stars = (st.stars ?? []).filter((x) => x.id !== star.id); st.staff[star.role] = Math.max(0, st.staff[star.role] - 1); return `${star.name} wished you well and left.`; } },
        ],
      };
    },
  },
  {
    id: 'collab', title: 'A brand wants to team up', polarity: 'good', weight: 0.8, icon: 'star',
    when: (s) => s.month >= 10 && lastRevenue(s) > 0 && !doneOnce(s, `collab${Math.floor(s.month / 12)}`),
    setup: (s, rng) => {
      const partners = ['Maple & Co', 'Neon Labs', 'The Old Mill', 'Zest Studio', 'Harbourside'];
      const who = partners[Math.floor(rng.next() * partners.length)];
      const share = sized(s, 0.03, 600_00);
      return {
        story: `${who} has a loyal following and proposes a limited-edition collaboration with you. You can split the costs evenly, bankroll a bigger launch alone, or pass.`,
        params: { share, solo: share * 2 },
        choices: [
          { id: 'split', label: `Split the cost (${formatGBP(share)})`, hint: 'A solid boost, shared risk.', impact: [{ label: 'Demand', up: true }, { label: 'Cash', up: false }],
            apply: (st, rng2, P, p) => { markOnce(st, `collab${Math.floor(st.month / 12)}`); P('Collaboration: shared launch costs', [dr('marketing', p.share), cr('cash', p.share)]); const hit = chance(rng2, 0.7); addTemporary(st, 'collab-demand', 'Collaboration launch', 3, { demandMult: hit ? 1.06 : 1.01 }, true); st.brand *= hit ? 1.05 : 1.01; return hit ? 'The limited edition sold out in days.' : 'It was a little underwhelming, but no harm done.'; } },
          { id: 'solo', label: `Bankroll it yourself (${formatGBP(share * 2)})`, hint: 'A bigger launch, and all the risk.', impact: [{ label: 'Demand', up: true }, { label: 'Cash', up: false }],
            apply: (st, rng2, P, p) => { markOnce(st, `collab${Math.floor(st.month / 12)}`); P('Collaboration: full launch costs', [dr('marketing', p.solo), cr('cash', p.solo)]); const hit = chance(rng2, 0.55); addTemporary(st, 'collab-demand', 'Collaboration launch', 4, { demandMult: hit ? 1.1 : 0.99 }, true); st.brand *= hit ? 1.09 : 1; return hit ? 'A huge hit. Everyone wants one.' : 'The launch fell flat and the money is gone.'; } },
          { id: 'pass', label: 'Pass', hint: 'Nothing happens.', impact: [], apply: (st) => { markOnce(st, `collab${Math.floor(st.month / 12)}`); return 'You politely declined.'; } },
        ],
      };
    },
  },
  {
    id: 'recall', title: 'A product recall looms', polarity: 'bad', weight: 0.5, icon: 'flame',
    weightOf: (s) => (s.insurance === 'full' ? 0.25 : 0.6),
    when: (s) => s.month >= 14 && lastRevenue(s) > 0 && !doneOnce(s, 'recall'),
    setup: (s) => {
      const full = sized(s, 0.07, 1_500_00);
      const part = Math.round(full / 2 / 10000) * 10000;
      return {
        story: 'A batch of your products may have a fault. A few customers have complained and the press is sniffing around. Stage one: how do you respond?',
        params: { full, part },
        choices: [
          { id: 'full', label: `Recall everything (${formatGBP(s.insurance === 'full' ? Math.round(full / 2 / 10000) * 10000 : full)})`, hint: 'Expensive, but customers see you did the right thing.', impact: [{ label: 'Reputation', up: true }, { label: 'Cash', up: false }],
            apply: (st, _rng, P, p) => { markOnce(st, 'recall'); markOnce(st, 'recall.full'); const c = st.insurance === 'full' ? Math.round(p.full / 2 / 10000) * 10000 : p.full; P('Product recall', [dr('otherCosts', c), cr('cash', c)]); adjustReputation(st, 3); return 'You pulled the batch. People noticed how you handled it.'; } },
          { id: 'partial', label: `Recall the risky batch only (${formatGBP(p0(sized(s, 0.035, 750_00)))})`, hint: 'Cheaper, but a risk remains.', impact: [{ label: 'Cash', up: false }],
            apply: (st, _rng, P, p) => { markOnce(st, 'recall'); markOnce(st, `recall.part@${st.month}`); P('Partial product recall', [dr('otherCosts', p.part), cr('cash', p.part)]); return 'You recalled the worst batch. Everyone is holding their breath.'; } },
          { id: 'deny', label: 'Say it is nothing', hint: 'Free today. Risky tomorrow.', impact: [{ label: 'Risk', up: false }],
            apply: (st) => { markOnce(st, 'recall'); markOnce(st, `recall.deny@${st.month}`); return 'You issued a bland statement and hoped.'; } },
        ],
      };
    },
  },
  {
    id: 'recallFollow', title: 'The recall story is not over', polarity: 'bad', weight: 8, icon: 'flame',
    when: (s) => !doneOnce(s, 'recallFollow') && (s.done ?? []).some((k) => { const m = /^recall\.(part|deny)@(\d+)$/.exec(k); return !!m && s.month >= Number(m[2]) + 2; }),
    setup: (s) => {
      const denied = (s.done ?? []).some((k) => k.startsWith('recall.deny@'));
      const bill = sized(s, denied ? 0.1 : 0.05, 1_800_00);
      return {
        story: denied ? 'More faulty products have turned up, and the earlier statement is now being quoted back at you.' : 'A few more faulty items from an unchecked batch have turned up. Stage two: finish the job or ride it out?',
        params: { bill },
        choices: [
          { id: 'fix', label: `Finish the recall (${formatGBP(bill)})`, hint: 'Ends it properly.', impact: [{ label: 'Cash', up: false }],
            apply: (st, _rng, P, p) => { markOnce(st, 'recallFollow'); P('Completing the recall', [dr('otherCosts', p.bill), cr('cash', p.bill)]); adjustReputation(st, denied ? -3 : 1); return 'It ended there, at last.'; } },
          { id: 'ride', label: 'Ride it out', hint: 'No cost, a likely hit to your name.', impact: [{ label: 'Reputation', up: false }],
            apply: (st, rng) => { markOnce(st, 'recallFollow'); if (chance(rng, 0.4)) return 'Nothing more came of it. Lucky.'; adjustReputation(st, denied ? -12 : -7); st.brand *= 0.93; return 'A national paper ran the story. Customers drifted away.'; } },
        ],
      };
    },
  },
];

const CHOICE_BY_ID = Object.fromEntries(CHOICE_EVENTS.map((e) => [e.id, e])) as Record<string, ChoiceEventDef>;

/** Add a short-lived effect from outside this file (suppliers, franchises). It lasts `months` full months. */
export function addTemporaryEffect(s: GameState, type: string, title: string, months: number, effects: EventEffects): void {
  addTemporary(s, type, title, months, effects, false);
}

/** Start a named choice event now (used for scripted moments such as IPO day). Does nothing if a decision is already waiting. */
export function startNamedEvent(s: GameState, id: string, rng: Rng): void {
  const def = CHOICE_BY_ID[id];
  if (def && !s.pendingEvent) startChoiceEvent(s, def, rng);
}

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
  'customerLetter.generous': 2, 'customerLetter.fair': 1, 'customerLetter.dismiss': -3, 'press.open': 0, 'press.careful': 0, 'press.decline': 0, 'mentor.costs': 0, 'mentor.brand': 0, 'mentor.team': 0, 'founderLife.holiday': 0, 'founderLife.delegate': 0, 'founderLife.work': 0,
  'bigBet.bet': 0, 'bigBet.pass': 0,
  'staffAsk.raise': 1, 'staffAsk.bonus': 1, 'staffAsk.timeoff': 1, 'staffAsk.decline': -1,
  'investor.accept': 2, 'investor.negotiate': 1, 'investor.decline': 0,
  'bigDeal.accept': 3, 'bigDeal.decline': -1,
  'trending.boost': 4, 'trending.ride': 1,
  'grantApp.apply': 1, 'grantApp.skip': 0,
  'takeover.fight': 0, 'takeover.standstill': 0, 'takeover.ignore': -1, 'cultureParty.big': 1, 'cultureParty.small': 0, 'cultureParty.skip': 0,
  'strike.talk': 0, 'strike.mediate': 0, 'strike.hold': -2, 'fireDrill.fix': 1, 'fireDrill.gamble': 0,
  'tradeFair.big': 1, 'tradeFair.small': 0, 'tradeFair.skip': 0, 'lawsuit.settle': -1, 'lawsuit.fight': 0,
  'collab.split': 0, 'collab.solo': 0, 'collab.pass': 0, 'recall.full': 0, 'recall.partial': 0, 'recall.deny': 0, 'recallFollow.fix': 0, 'recallFollow.ride': 0,
  'whistle.report': 4, 'whistle.exploit': 0, 'whistle.ignore': -1, 'scandal.apologise': 0, 'scandal.deny': 0,
  'integrationIssue.fix': 2, 'integrationIssue.senior': 0, 'integrationIssue.ignore': -2,
  'ipoDay.bell': 0, 'ipoDay.roadshow': 0, 'ipoDay.quiet': 0,
  'spy.spy': 0, 'spy.report': 0, 'spy.decline': 0, 'prank.join': 0, 'prank.treat': 1, 'prank.work': 0,
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
  if (enabled && !s.pendingEvent && (first || chance(rng, EVENT_CHANCE * eventChanceMult(s.modifiers)))) {
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
      const picked = !s.away && (wantChoice || autos.length === 0) ? weightedPick(rng, choices.map((def) => ({ def, weight: def.weightOf?.(s) ?? def.weight }))) : null;
      const choice = picked?.def ?? null;
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
