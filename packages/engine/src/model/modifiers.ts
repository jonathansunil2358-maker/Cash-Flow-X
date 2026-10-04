import { DIFFICULTIES } from './difficulty';
import { guildPerks } from './guild';
import { boostActive, perkEffects } from './perks';
import { prestigeBonus } from './rank';
import { hasModifier, rankCostMult } from './pressure';
import { projectModifiers } from './rnd';
import type { GameState } from './state';
import { designCostMult, designDemandMult } from './design';
import { exportMult } from './export';
import { play5Key, play5Capacity, play5Churn, play5Cost, play5Demand, play5Overdraft, play5Spread } from './play5';
import { esgSpreadDelta, esgOf, hasBoon, hasGreen, stanceFactor } from './strategy';
import { happyRegulars, loyaltyOn, regularsBonus } from './loyalty';
import { academyCapacity, workstyleOf } from './people';
import { starEffects } from './stars';
import { upgradeModifiers } from './upgrades';

/** Everything that scales the business model, combined from perks, upgrades and boosts. */
export interface Modifiers {
  capacityMult: number;
  marketMult: number;
  reachMult: number;
  brandGainMult: number;
  qualityPerMonth: number;
  unitCostMult: number;
  churnMult: number;
  spoilageMult: number;
  demandMult: number;
  recruitmentMult: number;
  upgradeCostMult: number;
  loanSpreadDelta: number;
  overdraftMult: number;
  equityDiscountDelta: number;
}

// Modifiers change only when upgrades, perks or boosts change, but are read many times a month.
const cache = new WeakMap<GameState, { key: string; list: GameState['modifiers']; mods: Modifiers }>();

function cacheKey(s: GameState): string {
  let k = s.difficulty + s.industryId;
  for (const id in s.upgrades) k += `|${id}${s.upgrades[id]}`;
  for (const id in s.perks) k += `|${id}${s.perks[id]}`;
  for (const b of s.boosts) k += `|${b.id}${b.monthsRemaining > 0 ? 1 : 0}`;
  for (const id of s.projectsDone) k += `|r${id}`;
  k += `|g${s.guildLevel ?? 0}|p${s.prestigeLevel ?? 0}|d${s.design ?? 50}|s${s.stars?.length ?? 0}|a${s.people?.trained ?? 0}|w${s.people?.workstyle ?? ''}|l${s.cust?.loyalty ? 1 : 0}|h${happyRegulars(s)}|b${s.strat?.boons?.join('') ?? ''}|c${s.strat?.stance ?? ''}${Math.round(s.economy.demandMult * 100)}|g${s.strat?.green?.join('') ?? ''}|e${s.strat ? esgOf(s).rating : ''}|x${s.sandbox?.demand ?? 1}|v${play5Key(s)}`;
  if (s.markets?.length) k += `|x${s.month}:${s.markets.join()}`;
  return k;
}

export function modifiersOf(s: GameState): Modifiers {
  const key = cacheKey(s);
  const hit = cache.get(s);
  if (hit && hit.key === key && hit.list === s.modifiers) return hit.mods;
  const mods = computeModifiers(s);
  cache.set(s, { key, list: s.modifiers, mods });
  return mods;
}

function computeModifiers(s: GameState): Modifiers {
  const u = upgradeModifiers(s.industryId, s.upgrades);
  const r = projectModifiers(s.projectsDone);
  const perksOn = DIFFICULTIES[s.difficulty].perksApply;
  const p = perkEffects(perksOn ? s.perks : {});
  const g = perksOn ? guildPerks(s.guildLevel ?? 0) : null;
  const rush = perksOn && boostActive(s.boosts, 'rush');
  const megaphone = perksOn && boostActive(s.boosts, 'megaphone');
  const frugal = hasModifier(s, 'culture-frugal');
  const bold = hasModifier(s, 'culture-bold');
  const people = hasModifier(s, 'culture-people');
  const steady = hasModifier(s, 'culture-steady');
  const star = starEffects(s);
  const banker = hasModifier(s, 'origin-banker');
  const engineer = hasModifier(s, 'origin-engineer');
  const marketer = hasModifier(s, 'origin-marketer');
  const dropout = hasModifier(s, 'origin-dropout');
  const heir = hasModifier(s, 'origin-heir');
  return {
    capacityMult: u.capacityMult * p.capacityMult * (people ? 1.05 : 1) * star.capacity * academyCapacity(s) * (hasBoon(s, 'capacity') ? 1.02 : 1) * play5Capacity(s),
    marketMult: u.marketMult * p.marketMult * r.marketMult * (bold ? 1.04 : 1),
    reachMult: u.reachMult * (frugal ? 0.9 : 1) * (engineer ? 0.92 : 1) * star.reach,
    brandGainMult: p.brandGainMult * (megaphone ? 2 : 1) * (steady ? 0.95 : 1) * (marketer ? 1.15 : 1),
    qualityPerMonth: u.qualityPerMonth + (engineer ? 0.03 : 0) + star.quality + workstyleOf(s).quality + (hasBoon(s, 'quality') ? 0.03 : 0),
    unitCostMult: u.unitCostMult * p.unitCostMult * r.unitCostMult * rankCostMult(s) * (frugal ? 0.96 : 1) * (bold || people ? 1.03 : 1) * (marketer ? 1.03 : 1) * (dropout ? 0.97 : 1) * (heir ? 1.02 : 1) * (hasBoon(s, 'costs') ? 0.98 : 1) * (hasGreen(s, 'recycle') ? 0.985 : 1) * designCostMult(s) * play5Cost(s),
    churnMult: u.churnMult * p.churnMult * (loyaltyOn(s) ? 0.9 : 1) * (hasBoon(s, 'churn') ? 0.94 : 1) * play5Churn(s),
    spoilageMult: u.spoilageMult * p.spoilageMult,
    demandMult: designDemandMult(s) * exportMult(s) * (loyaltyOn(s) ? 1.03 : 1) * regularsBonus(s) * (hasBoon(s, 'demand') ? 1.02 : 1) * (hasGreen(s, 'certify') ? 1.015 : 1) * stanceFactor(s) * play5Demand(s) * (s.sandbox?.demand ?? 1) * p.demandMult * (rush ? 1.5 : 1) * (g?.demandMult ?? 1) * (perksOn ? 1 + prestigeBonus(s.prestigeLevel ?? 0) : 1),
    recruitmentMult: p.recruitmentMult * (hasBoon(s, 'hiring') ? 0.9 : 1),
    upgradeCostMult: p.upgradeCostMult,
    loanSpreadDelta: p.loanSpreadDelta + (g?.loanSpreadDelta ?? 0) + (hasModifier(s, 'tight-credit') ? 0.01 : 0) - (steady ? 0.005 : 0) - (banker ? 0.01 : 0) + (dropout ? 0.01 : 0) - (heir ? 0.005 : 0) - (hasBoon(s, 'credit') ? 0.005 : 0) + esgSpreadDelta(s) + play5Spread(s),
    overdraftMult: p.overdraftMult * (steady ? 1.25 : 1) * (banker ? 1.15 : 1) * play5Overdraft(s),
    equityDiscountDelta: p.equityDiscountDelta,
  };
}
