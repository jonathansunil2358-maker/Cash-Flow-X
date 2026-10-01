/**
 * Permanent perks (bought with Legacy points from prestiging) and timed gem boosts.
 * Both live on the player's profile and are copied into each run at start. Hard mode runs
 * ignore them.
 */

export type PerkBranch = 'operations' | 'finance' | 'growth';

export interface PerkEffects {
  recruitmentMult?: number;
  capacityMult?: number;
  startQuality?: number;
  spoilageMult?: number;
  unitCostMult?: number;
  upgradeCostMult?: number;
  loanSpreadDelta?: number;
  startingCashMult?: number;
  offlineHours?: number;
  overdraftMult?: number;
  equityDiscountDelta?: number;
  brandGainMult?: number;
  marketMult?: number;
  positiveShareDelta?: number;
  churnMult?: number;
  demandMult?: number;
}

export interface PerkDef {
  id: string;
  branch: PerkBranch;
  name: string;
  description: string;
  /** Legacy point cost of each level. */
  costs: number[];
  requires?: string;
  /** Effect of ONE level; levels stack multiplicatively (mults) or additively (deltas). */
  perLevel: PerkEffects;
}

export const PERKS: PerkDef[] = [
  { id: 'ops_hiring', branch: 'operations', name: 'Talent network', description: 'Recruitment fees 15% lower per level.', costs: [1, 2], perLevel: { recruitmentMult: 0.85 } },
  { id: 'ops_capacity', branch: 'operations', name: 'Lean operations', description: '+8% capacity per operations employee, per level.', costs: [2, 3, 4], requires: 'ops_hiring', perLevel: { capacityMult: 1.08 } },
  { id: 'ops_quality', branch: 'operations', name: 'Head start', description: 'Start each company with +8 product quality per level.', costs: [2, 3], requires: 'ops_capacity', perLevel: { startQuality: 8 } },
  { id: 'ops_stock', branch: 'operations', name: 'Tight stock control', description: 'Spoilage 25% lower and unit costs 2% lower per level.', costs: [3, 4], requires: 'ops_quality', perLevel: { spoilageMult: 0.75, unitCostMult: 0.98 } },
  { id: 'ops_builder', branch: 'operations', name: "Builder's discount", description: 'Sector upgrades cost 10% less per level.', costs: [4, 6], requires: 'ops_stock', perLevel: { upgradeCostMult: 0.9 } },

  { id: 'fin_loans', branch: 'finance', name: "Banker's friend", description: 'Loan credit spread 0.3% lower per level.', costs: [1, 2, 3], perLevel: { loanSpreadDelta: -0.003 } },
  { id: 'fin_cash', branch: 'finance', name: 'Family money', description: '+10% starting cash per level.', costs: [2, 3, 4], requires: 'fin_loans', perLevel: { startingCashMult: 1.1 } },
  { id: 'fin_offline', branch: 'finance', name: 'Night shift', description: '+2 hours of offline earnings per level.', costs: [2, 3], requires: 'fin_cash', perLevel: { offlineHours: 2 } },
  { id: 'fin_overdraft', branch: 'finance', name: 'Relationship manager', description: 'Overdraft limit 25% higher per level.', costs: [3, 4], requires: 'fin_offline', perLevel: { overdraftMult: 1.25 } },
  { id: 'fin_investors', branch: 'finance', name: 'Investor network', description: 'Equity investors take a 5% smaller discount per level.', costs: [4, 6], requires: 'fin_overdraft', perLevel: { equityDiscountDelta: 0.05 } },

  { id: 'gro_brand', branch: 'growth', name: 'Word of mouth', description: 'Marketing builds 12% more brand per level.', costs: [1, 2, 3], perLevel: { brandGainMult: 1.12 } },
  { id: 'gro_market', branch: 'growth', name: 'Bigger pond', description: 'Market 6% larger per level.', costs: [2, 3, 4], requires: 'gro_brand', perLevel: { marketMult: 1.06 } },
  { id: 'gro_luck', branch: 'growth', name: 'Lucky break', description: '+4% chance that an event is good news, per level.', costs: [3, 4], requires: 'gro_market', perLevel: { positiveShareDelta: 0.04 } },
  { id: 'gro_loyalty', branch: 'growth', name: 'Loyalty scheme', description: 'Customer churn 10% lower per level.', costs: [3, 4], requires: 'gro_luck', perLevel: { churnMult: 0.9 } },
  { id: 'gro_famous', branch: 'growth', name: 'Household name', description: '+5% demand per level.', costs: [5, 7], requires: 'gro_loyalty', perLevel: { demandMult: 1.05 } },
];

export const PERK_BY_ID: Record<string, PerkDef> = Object.fromEntries(PERKS.map((p) => [p.id, p]));

export type PerkLevels = Record<string, number>;

/** Combine perk levels into one set of effects. */
export function perkEffects(levels: PerkLevels): Required<PerkEffects> {
  const e: Required<PerkEffects> = {
    recruitmentMult: 1, capacityMult: 1, startQuality: 0, spoilageMult: 1, unitCostMult: 1, upgradeCostMult: 1,
    loanSpreadDelta: 0, startingCashMult: 1, offlineHours: 0, overdraftMult: 1, equityDiscountDelta: 0,
    brandGainMult: 1, marketMult: 1, positiveShareDelta: 0, churnMult: 1, demandMult: 1,
  };
  for (const [id, level] of Object.entries(levels)) {
    const def = PERK_BY_ID[id];
    if (!def || level <= 0) continue;
    const n = Math.min(level, def.costs.length);
    for (const [k, v] of Object.entries(def.perLevel) as [keyof PerkEffects, number][]) {
      if (k.endsWith('Mult')) e[k] *= Math.pow(v, n);
      else e[k] += v * n;
    }
  }
  return e;
}

export interface PerkPurchaseCheck {
  ok: boolean;
  cost: number;
  reason?: string;
}

export function perkPurchase(levels: PerkLevels, perkId: string, legacyPoints: number): PerkPurchaseCheck {
  const def = PERK_BY_ID[perkId];
  if (!def) return { ok: false, cost: 0, reason: 'Unknown perk.' };
  const level = levels[perkId] ?? 0;
  if (level >= def.costs.length) return { ok: false, cost: 0, reason: 'Already at maximum level.' };
  const cost = def.costs[level];
  if (def.requires && (levels[def.requires] ?? 0) < 1) return { ok: false, cost, reason: `Needs ${PERK_BY_ID[def.requires].name} first.` };
  if (legacyPoints < cost) return { ok: false, cost, reason: `Needs ${cost} Legacy points.` };
  return { ok: true, cost };
}

// ---------------------------------------------------------------------------------------------
// Gem boosts
// ---------------------------------------------------------------------------------------------

export type BoostId = 'rush' | 'shield' | 'megaphone';

export interface BoostDef {
  id: BoostId;
  name: string;
  description: string;
  gems: number;
  months: number;
}

export const BOOSTS: Record<BoostId, BoostDef> = {
  rush: { id: 'rush', name: 'Rush hour', description: '+50% demand for 6 months.', gems: 40, months: 6 },
  shield: { id: 'shield', name: 'Lucky charm', description: 'No bad-news events for 12 months.', gems: 60, months: 12 },
  megaphone: { id: 'megaphone', name: 'Megaphone', description: 'Marketing builds twice the brand for 6 months.', gems: 30, months: 6 },
};

export interface ActiveBoost {
  id: BoostId;
  monthsRemaining: number;
}

export const boostActive = (boosts: ActiveBoost[], id: BoostId): boolean => boosts.some((b) => b.id === id && b.monthsRemaining > 0);
