// Usage: SECTOR=bakery N=12 npx tsx scripts/sectorcheck.ts
// Plays the bot over three difficulties for one sector (default: every sector) and prints survival and median score.
import { finalScore, INDUSTRY_IDS, newGame, tickInPlace, type DifficultyId, type IndustryId } from '../src/index';
import { applyPolicy } from './policy';
const N = Number(process.env.N ?? 12);
const ids = (process.env.SECTOR ? process.env.SECTOR.split(',') : INDUSTRY_IDS) as IndustryId[];
for (const id of ids) {
  const row: string[] = [];
  for (const diff of ['easy', 'medium', 'hard'] as DifficultyId[]) {
    const scores: number[] = []; let survived = 0;
    for (let i = 0; i < N; i++) {
      const s = newGame({ companyName: 'B', industryId: id, seed: `SC-${i}`, difficulty: diff });
      while (s.status === 'playing' && s.month < 120) { applyPolicy(s); tickInPlace(s); }
      if (s.status !== 'insolvent') survived++;
      scores.push(finalScore(s).score);
    }
    scores.sort((a, b) => a - b);
    row.push(`${diff}: ${survived}/${N} survive, median score ${scores[Math.floor(N / 2)]}`);
  }
  console.log(`${id.padEnd(13)} ${row.join(' | ')}`);
}
