/**
 * Difficulty report: plays every sector on every difficulty across many seeds with the heuristic
 * player (plus sensible upgrade buying) and reports how often runs go bankrupt and how long they
 * take to reach the first prestige stake. Usage: npx tsx scripts/difficulty.ts [seeds] [years]
 */
import {
  DIFFICULTY_IDS, FIRST_PRESTIGE_THRESHOLD, INDUSTRY_IDS, newGame, ownerStakeOf, tickInPlace, type DifficultyId, type IndustryId,
} from '../src/index';
import { applyGrowthPolicy } from './policy';

const SEEDS = Number(process.argv[2] ?? 20);
const YEARS = Number(process.argv[3] ?? 20);

interface Result { bankrupt: boolean; prestigeMonth: number | null; stake10y: number }

function run(industryId: IndustryId, difficulty: DifficultyId, seed: string): Result {
  const s = newGame({ companyName: 'Test', industryId, seed, difficulty, equipmentFinance: 'lease' });
  let prestigeMonth: number | null = null;
  let stake10y = 0;
  while (s.status === 'playing' && s.month < YEARS * 12) {
    applyGrowthPolicy(s);
    tickInPlace(s);
    if (prestigeMonth === null && ownerStakeOf(s) >= FIRST_PRESTIGE_THRESHOLD) prestigeMonth = s.month;
    if (s.month === 120) stake10y = ownerStakeOf(s);
  }
  return { bankrupt: s.status === 'insolvent', prestigeMonth, stake10y };
}

const median = (xs: number[]) => (xs.length ? [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] : NaN);
const pad = (v: string | number, n: number) => String(v).padStart(n);

console.log(`${SEEDS} seeds x ${YEARS} years per cell. "prestige" = owner stake reached £10m.\n`);
console.log(`${'sector'.padEnd(11)} ${'diff'.padEnd(6)} ${pad('bust', 5)} ${pad('prestige', 9)} ${pad('median yrs', 11)} ${pad('stake@10y', 10)}`);
for (const industryId of INDUSTRY_IDS) {
  for (const difficulty of DIFFICULTY_IDS) {
    const results = Array.from({ length: SEEDS }, (_, i) => run(industryId, difficulty, `DIFF-${i}`));
    const bust = results.filter((r) => r.bankrupt).length;
    const won = results.filter((r) => r.prestigeMonth !== null);
    const yrs = median(won.map((r) => r.prestigeMonth! / 12));
    const stake = median(results.map((r) => r.stake10y)) / 100_000_000;
    console.log(`${industryId.padEnd(11)} ${difficulty.padEnd(6)} ${pad(`${Math.round((bust / SEEDS) * 100)}%`, 5)} ${pad(`${Math.round((won.length / SEEDS) * 100)}%`, 9)} ${pad(Number.isNaN(yrs) ? '-' : yrs.toFixed(1), 11)} ${pad(`£${stake.toFixed(1)}m`, 10)}`);
  }
}
