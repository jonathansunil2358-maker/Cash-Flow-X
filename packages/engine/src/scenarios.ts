import { cr, dr, post } from './ledger/journal';
import { gbp, formatGBP } from './money';
import { ratios } from './model/analysis';
import type { IndustryId } from './model/industries';
import { newId, type GameState } from './model/state';
import { scheduleIntoQueue } from './model/workingCapital';

export interface ObjectiveStatus {
  id: string;
  text: string;
  met: boolean;
  detail: string;
}

export interface Scenario {
  id: string;
  name: string;
  kind: 'sandbox' | 'case-study' | 'daily' | 'weekly' | 'challenge';
  industryId: IndustryId | null;
  summary: string;
  briefing: string[];
  /** Run length in months; null = endless (until prestige, retirement or bankruptcy). */
  months: number | null;
  /** Replace the default £100k opening balance sheet and settings. */
  setup?: (s: GameState) => void;
  objectives?: (s: GameState) => ObjectiveStatus[];
}

/** Scenarios where the server picks the company and the field is level (no perks, boosts or prestige). */
export const isFixedKind = (kind: Scenario['kind']): boolean => kind === 'daily' || kind === 'weekly' || kind === 'challenge';
export const isFixedScenario = (id: string | undefined): boolean => id === 'daily' || id === 'weekly' || id === 'challenge';

export const SCENARIOS: Record<string, Scenario> = {
  standard: {
    id: 'standard',
    name: 'Build a £10m company',
    kind: 'sandbox',
    industryId: null,
    summary: 'Grow a company from scratch without running out of cash. When your stake is worth £10m, prestige for Legacy points and permanent perks.',
    briefing: [
      'You own 100% of a brand-new company. Starting cash depends on difficulty.',
      'Each turn is one month. Make decisions, then close the month to see the accounts.',
      'Random events are good or bad news; big ones ask you to decide.',
      'You lose if cash falls below your overdraft limit: profitable companies go bust too.',
      'Prestige at £10m to earn Legacy points, spend them on perks, and start again stronger.',
    ],
    months: null,
  },
  daily: {
    id: 'daily',
    name: 'Daily challenge',
    kind: 'daily',
    industryId: null,
    summary: 'Everyone plays the same company for 24 months. No perks, no boosts, no prestige: just you against the day. Your stake at the end is your score.',
    briefing: [
      'Same company, same seed, same luck for every player today.',
      'You have 24 months. Your final owner stake is your score on the daily board.',
      'Perks, gem boosts and prestige bonuses are switched off so the field is level.',
      'One attempt a day for the leaderboard; practise as much as you like offline.',
    ],
    months: 24,
  },
  weekly: {
    id: 'weekly',
    name: 'Weekly event',
    kind: 'weekly',
    industryId: null,
    summary: 'A shared company with a twist in the economy that lasts the whole game. 24 months, level field: your final stake is your score.',
    briefing: [
      'Same company and same luck for every player this week, with one big twist in the economy.',
      'You have 24 months. Perks, gem boosts and prestige bonuses are switched off so the field is level.',
      'One ranked attempt a week; practise as much as you like offline.',
    ],
    months: 24,
  },
  challenge: {
    id: 'challenge',
    name: 'Friend challenge',
    kind: 'challenge',
    industryId: null,
    summary: 'A company made from a shared code. Everyone with the code plays the same 24 months, and your final stake is your score.',
    briefing: [
      'Everyone holding the code gets the same company and the same luck.',
      'You have 24 months. Perks, boosts and prestige bonuses are switched off.',
      'One ranked attempt per player; practise as much as you like offline.',
    ],
    months: 24,
  },
  'profitable-but-broke': {
    id: 'profitable-but-broke',
    name: 'Case study: Profitable but broke',
    kind: 'case-study',
    industryId: 'clothing',
    summary: 'A growing clothing brand is profitable on paper but its cash is trapped in receivables and stock. Turn it around in 18 months.',
    briefing: [
      'You have just been appointed finance director of Loom & Loop Ltd, a clothing brand selling mostly to wholesale accounts.',
      'The P&L looks healthy, but customers are on 90-day terms and the warehouse holds four months of stock.',
      'Cash is £30k, there is a £120k bank loan with covenants, and suppliers want paying in 30 days.',
      'Objectives: survive 18 months, finish with at least £75k cash, and bring the cash conversion cycle under 75 days.',
      'Levers: credit terms (Operations), stock cover, supplier terms, marketing spend, the overdraft and the bank.',
    ],
    months: 18,
    setup: (s) => {
      const L = s.ledger;
      const monthlyRevenue = gbp(90_000);
      const stockUnits = 9000;
      const unitCost = gbp(15);
      const payables = gbp(34_000);
      const ppe = gbp(40_000);
      const loan = gbp(120_000);
      const cash = gbp(30_000);
      const receivables = monthlyRevenue * 3;
      const inventory = stockUnits * unitCost;
      const shareCapital = gbp(100_000);
      const retained = cash + receivables + inventory + ppe - payables - loan - shareCapital;
      post(L, 0, 'Opening balance sheet: Loom & Loop Ltd', [
        dr('cash', cash), dr('receivables', receivables), dr('inventory', inventory), dr('ppe', ppe),
        cr('payables', payables), cr('loans', loan), cr('shareCapital', shareCapital), cr('retainedEarnings', retained),
      ], { cf: 'none', kind: 'opening' });
      s.receivablesQueue = [monthlyRevenue, monthlyRevenue, monthlyRevenue];
      s.payablesQueue = [];
      scheduleIntoQueue(s.payablesQueue, payables, 0);
      s.inventoryUnits = stockUnits;
      s.ppeAssets.push({ id: newId(s, 'A'), label: 'Warehouse racking & fit-out', cost: ppe, lifeMonths: 60, accumulated: 0 });
      s.loans.push({
        id: newId(s, 'L'), label: 'Term loan (existing)', principal: loan, original: gbp(180_000), spread: 0.04, penalty: 0,
        termMonths: 36, monthsRemaining: 24, startMonth: -12, consecutiveBreaches: 0,
      });
      s.staff = { ops: 5, rnd: 1, sales: 2 };
      s.brand = 110;
      s.quality = 50;
      s.price = gbp(40);
      s.marketingBudget = gbp(6_000);
      s.stockCoverMonths = 4;
      s.customerDays = 90;
      s.supplierDays = 30;
      s.companyName = s.companyName || 'Loom & Loop Ltd';
    },
    objectives: (s) => {
      const cash = s.ledger.balances.cash;
      const ccc = ratios(s).find((r) => r.id === 'ccc')?.value ?? null;
      const done = s.month >= 18;
      return [
        {
          id: 'survive', text: 'Survive all 18 months without going insolvent',
          met: s.status !== 'insolvent' && done,
          detail: s.status === 'insolvent' ? 'Insolvent' : `Month ${Math.min(s.month, 18)} of 18`,
        },
        { id: 'cash', text: 'Finish with at least £75,000 of cash', met: cash >= gbp(75_000), detail: `Cash ${formatGBP(cash)}` },
        {
          id: 'ccc', text: 'Cash conversion cycle below 75 days',
          met: ccc !== null && ccc < 75, detail: ccc === null ? 'Not yet measured' : `${Math.round(ccc)} days`,
        },
      ];
    },
  },
};

export const scenarioOf = (id: string): Scenario => SCENARIOS[id] ?? SCENARIOS.standard;
