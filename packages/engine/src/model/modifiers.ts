import { DIFFICULTIES } from './difficulty';
import { guildPerks } from './guild';
import { boostActive, perkEffects } from './perks';
import { prestigeBonus } from './rank';
import { hasModifier, rankCostMult } from './pressure';
import { projectModifiers } from './rnd';
import type { GameState } from './state';
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
const cache = new WeakMap<GameState, { key: string; mods: Modifiers }>();

function cacheKey(s: GameState): string {
  let k = s.difficulty + s.industryId;
  for (const id in s.upgrades) k += `|${id}${s.upgrades[id]}`;
  for (const id in s.perks) k += `|${id}${s.perks[id]}`;
  for (const b of s.boosts) k += `|${b.id}${b.monthsRemaining > 0 ? 1 : 0}`;
  for (const id of s.projectsDone) k += `|r${id}`;
  k += `|g${s.guildLevel ?? 0}|p${s.prestigeLevel ?? 0}`;
  return k;
}

export function modifiersOf(s: GameState): Modifiers {
  const key = cacheKey(s);
  const hit = cache.get(s);
  if (hit && hit.key === key) return hit.mods;
  const mods = computeModifiers(s);
  cache.set(s, { key, mods });
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
  return {
    capacityMult: u.capacityMult * p.capacityMult,
    marketMult: u.marketMult * p.marketMult * r.marketMult,
    reachMult: u.reachMult,
    brandGainMult: p.brandGainMult * (megaphone ? 2 : 1),
    qualityPerMonth: u.qualityPerMonth,
    unitCostMult: u.unitCostMult * p.unitCostMult * r.unitCostMult * rankCostMult(s),
    churnMult: u.churnMult * p.churnMult,
    spoilageMult: u.spoilageMult * p.spoilageMult,
    demandMult: p.demandMult * (rush ? 1.5 : 1) * (g?.demandMult ?? 1) * (perksOn ? 1 + prestigeBonus(s.prestigeLevel ?? 0) : 1),
    recruitmentMult: p.recruitmentMult,
    upgradeCostMult: p.upgradeCostMult,
    loanSpreadDelta: p.loanSpreadDelta + (g?.loanSpreadDelta ?? 0) + (hasModifier(s, 'tight-credit') ? 0.01 : 0),
    overdraftMult: p.overdraftMult,
    equityDiscountDelta: p.equityDiscountDelta,
  };
}
