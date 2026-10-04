import { cr, createLedger, dr, post, resetPeriod } from './ledger/journal';
import { formatGBP } from './money';
import { generateTargets } from './model/acquisitions';
import { DIFFICULTIES, type DifficultyId } from './model/difficulty';
import { recomputeEconomy } from './model/events';
import { INDUSTRIES, type IndustryId } from './model/industries';
import { startLease } from './model/leases';
import { perkEffects, type ActiveBoost, type PerkLevels } from './model/perks';
import { ENDLESS, logItem, newId, STATE_VERSION, type GameState } from './model/state';
import { createRng, hashSeed } from './rng';
import { cleanModifiers } from './model/modifiers-opt';
import { isFixedKind, scenarioOf } from './scenarios';
import { twistForSeed } from './fixed';

export type EquipmentFinance = 'buy' | 'lease';

export interface NewGameOptions {
  companyName: string;
  industryId: IndustryId;
  /** Shareable seed label. The same seed + the same decisions always produce the same game. */
  seed: string;
  scenarioId?: string;
  difficulty?: DifficultyId;
  /** How to pay for the sector's start-up equipment (restaurant fit-out, gym kit, workshop tooling). */
  equipmentFinance?: EquipmentFinance;
  /** From the player's profile. Ignored on Hard. */
  perks?: PerkLevels;
  boosts?: ActiveBoost[];
  prestigeLevel?: number;
  /** Optional handicaps (see OPTIONAL_MODIFIERS). Ignored on Hard and in challenges. */
  modifiers?: string[];
  /** Business icon id (cosmetic). */
  icon?: string;
}

export function randomSeedLabel(): string {
  const words = ['OAK', 'RIVER', 'LEDGER', 'COPPER', 'HARBOUR', 'FALCON', 'MAPLE', 'ORBIT', 'SUMMIT', 'VECTOR'];
  const w = words[Math.floor(Math.random() * words.length)];
  return `${w}-${Math.floor(Math.random() * 9000 + 1000)}`;
}

/** Starting cash for a difficulty after the Family money perk. */
export function startingCash(difficulty: DifficultyId, perks: PerkLevels = {}): number {
  const d = DIFFICULTIES[difficulty];
  const mult = d.perksApply ? perkEffects(perks).startingCashMult : 1;
  return Math.round((d.startingCash * mult) / 100_000) * 100_000;
}

export function newGame(opts: NewGameOptions): GameState {
  const scenario = scenarioOf(opts.scenarioId ?? 'standard');
  const industryId = scenario.industryId ?? opts.industryId;
  const ind = INDUSTRIES[industryId];
  if (!ind) throw new Error(`Unknown industry ${industryId}`);
  // The daily challenge is a level playing field: fixed difficulty, and no perks, boosts or prestige bonus.
  const daily = isFixedKind(scenario.kind);
  const difficulty: DifficultyId = scenario.kind === 'case-study' || daily ? 'medium' : (opts.difficulty ?? 'medium');
  const diff = DIFFICULTIES[difficulty];
  if (!diff) throw new Error(`Unknown difficulty ${difficulty}`);
  const perks = diff.perksApply && !daily ? { ...(opts.perks ?? {}) } : {};
  const boosts = diff.perksApply && !daily ? (opts.boosts ?? []).map((b) => ({ ...b })) : [];
  const effects = perkEffects(perks);
  const seed = hashSeed(opts.seed);
  const modifiers = daily || difficulty === 'hard' ? [] : cleanModifiers(opts.modifiers);

  const s: GameState = {
    version: STATE_VERSION,
    seed,
    seedLabel: opts.seed,
    rng: seed,
    month: 0,
    companyName: opts.companyName.trim().slice(0, 40),
    icon: opts.icon ?? 'rocket',
    reputation: 50,
    strain: 0,
    away: false,
    industryId,
    scenarioId: scenario.id,
    difficulty,
    status: 'playing',
    wonAtMonth: null,
    lastMonth: scenario.months ?? ENDLESS,
    ledger: createLedger(),
    history: [],
    integrityErrors: [],
    staff: { ops: 0, rnd: 0, sales: 0 },
    salaryIndex: 1,
    sites: 1,
    pendingSites: [],
    insurance: 'none',
    contracts: [],
    contractOffers: [],
    listed: false,
    listedMonth: null,
    sentiment: 1,
    priceHistory: [],
    guidance: null,
    twist: null,
    pay: 'market',
    trainingSpend: 0,
    morale: 60,
    promo: null,
    promoDipMonths: 0,
    promoCooldown: 0,
    projects: [],
    projectsDone: [],
    price: ind.basePrice,
    marketingBudget: 0,
    stockCoverMonths: ind.stockCoverDefault,
    customerDays: ind.receivableDays,
    supplierDays: ind.payableDays,
    brand: 0,
    quality: Math.min(100, ind.startQuality + effects.startQuality),
    automationSpend: 0,
    upgrades: {},
    rentIndex: 1,
    bonusDemand: 0,
    customers: 0,
    annualCohorts: [],
    deferredSchedule: new Array(12).fill(0),
    inventoryUnits: 0,
    acquiredDemand: 0,
    receivablesQueue: [],
    payablesQueue: [],
    ppeAssets: [],
    loans: [],
    leases: [],
    fundValue: 0,
    deposit: 0,
    shares: { total: 1_000_000, owner: 1_000_000 },
    ownerDividends: 0,
    lastEquityRaiseMonth: null,
    tax: { lossesCarriedForward: 0, ytdBooked: 0, due: 0, dueMonth: null },
    perks,
    guildLevel: 0,
    outsideHolders: [],
    boostActivations: {},
    prestigeLevel: daily ? 0 : opts.prestigeLevel ?? 0,
    prestigeAward: 0,
    ...(modifiers.length ? { modifiers } : {}),
    start: { equipmentFinance: opts.equipmentFinance ?? 'buy', boosts: boosts.map((b) => ({ ...b })) },
    boosts,
    pendingEvent: null,
    lastEvent: null,
    economy: { baseRate: 0.04, demandMult: 1, unitCostMult: 1, lendingAppetite: 1, badDebtRate: 0, active: [] },
    marketSize: ind.marketSize,
    competitors: ind.competitors.map((c) => {
      const price = Math.round(ind.basePrice * c.priceFactor);
      return { name: c.name, quality: c.quality, price, strength: c.strength, cutMonths: 0, normalPrice: price, lastLaunchYear: -1 };
    }),
    targets: [],
    acquisitions: [],
    log: [],
    actionLog: [],
    nextId: 1,
    objectives: [],
  };
  if (scenario.id === 'weekly') {
    // The week's twist is a long-lasting economic condition that lasts the whole game.
    const twist = twistForSeed(opts.seed);
    s.twist = twist.id;
    s.economy.active.push({ type: 'weekly-twist', title: twist.name, startMonth: 0, remaining: 100_000, effects: twist.effects });
  }
  if (modifiers.includes('tight-credit')) s.economy.active.push({ type: 'mod-credit', title: 'Tight credit', startMonth: 0, remaining: 100_000, effects: { lendingAppetite: 0.6 } });
  if (modifiers.includes('slow-market')) s.economy.active.push({ type: 'mod-slow', title: 'Slow market', startMonth: 0, remaining: 100_000, effects: { demandMult: 0.9 } });
  if (modifiers.includes('origin-marketer')) s.brand += 25;
  if (modifiers.includes('origin-banker')) s.brand = Math.max(0, s.brand - 10);
  if (modifiers.includes('origin-heir')) s.brand += 15;
  recomputeEconomy(s);

  const capital = startingCash(difficulty, perks);
  if (scenario.setup) {
    scenario.setup(s);
  } else {
    post(s.ledger, 0, 'Shares issued for cash on incorporation', [dr('cash', capital), cr('shareCapital', capital)], {
      cf: 'none', kind: 'opening',
    });
  }
  if (!s.companyName) s.companyName = 'My Company Ltd';
  resetPeriod(s.ledger);

  let equipmentNote = '';
  if (ind.startingCapex && !scenario.setup) {
    const c = ind.startingCapex;
    if ((opts.equipmentFinance ?? 'buy') === 'lease') {
      const lease = startLease(s, c.label, c.amount, c.lifeMonths);
      equipmentNote = ` Your ${c.label.toLowerCase()} is leased: a right-of-use asset and lease liability of ${formatGBP(c.amount)}, paid at ${formatGBP(lease.payment)} a month.`;
    } else {
      post(s.ledger, 0, c.label, [dr('ppe', c.amount), cr('cash', c.amount)], { cf: 'investing', cfLabel: 'Purchase of property, plant & equipment' });
      s.ppeAssets.push({ id: newId(s, 'A'), label: c.label, cost: c.amount, lifeMonths: c.lifeMonths, accumulated: 0 });
      equipmentNote = ` You bought ${formatGBP(c.amount)} of ${c.label.toLowerCase()} outright.`;
    }
  }

  s.targets = generateTargets(s, createRng(s));
  logItem(s, 'milestone', `${s.companyName} is incorporated`,
    scenario.setup
      ? scenario.summary
      : `${diff.name} difficulty. You hold 100% of the shares and ${formatGBP(s.ledger.balances.cash)} in the bank.${equipmentNote} ${ind.description}`);
  return s;
}
