import { finalScore, INDUSTRY_IDS, newGame, tickInPlace, type DifficultyId } from '/home/user/Cash-Flow-X/packages/engine/src/index';
import { applyPolicy } from '/home/user/Cash-Flow-X/packages/engine/scripts/policy';
const N = Number(process.env.N ?? 12);
const out: Record<string, { survived: number; n: number; medianScore: number; medianMonths: number }> = {};
for (const diff of ['easy', 'medium', 'hard'] as DifficultyId[]) {
  for (const id of INDUSTRY_IDS) {
    const scores: number[] = []; const months: number[] = []; let survived = 0;
    for (let i = 0; i < N; i++) {
      const s = newGame({ companyName: 'B', industryId: id, seed: `BASE-${i}`, difficulty: diff });
      while (s.status === 'playing' && s.month < 120) { applyPolicy(s); tickInPlace(s); }
      if (s.status !== 'insolvent') survived++;
      scores.push(finalScore(s).score); months.push(s.month);
    }
    scores.sort((a, b) => a - b); months.sort((a, b) => a - b);
    out[`${diff}/${id}`] = { survived, n: N, medianScore: scores[Math.floor(N / 2)], medianMonths: months[Math.floor(N / 2)] };
  }
}
console.log(JSON.stringify(out));
