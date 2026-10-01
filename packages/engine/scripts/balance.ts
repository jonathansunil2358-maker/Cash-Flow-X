/** Balancing report: plays every industry with the heuristic policy and prints yearly figures. */
import { formatGBP, INDUSTRY_IDS, mergePeriods, newGame, plSummary, tickInPlace, finalScore, type DifficultyId } from '../src/index';
import { applyPolicy } from './policy';

const seeds = process.argv.slice(2).length ? process.argv.slice(2) : ['BALANCE-1'];
for (const seed of seeds) {
  for (const id of INDUSTRY_IDS) {
    const s = newGame({ companyName: 'Test', industryId: id, seed, difficulty: (process.env.DIFF ?? 'medium') as DifficultyId, equipmentFinance: process.env.LEASE ? 'lease' : 'buy' });
    while (s.status === 'playing' && s.month < 120) {
      applyPolicy(s);
      tickInPlace(s);
    }
    console.log(`\n=== ${id} (${seed}) — ${s.status} at month ${s.month}${s.wonAtMonth !== null ? `, WON at ${s.wonAtMonth}` : ''}`);
    for (let y = 0; y * 12 < s.history.length; y++) {
      const recs = s.history.slice(y * 12, y * 12 + 12);
      const p = plSummary(mergePeriods(recs.map((r) => r.period)).pl);
      const last = recs[recs.length - 1];
      console.log(
        `Y${y + 1}: rev ${formatGBP(p.revenue, { compact: true }).padStart(8)} GM ${((p.grossProfit / Math.max(1, p.revenue)) * 100).toFixed(0).padStart(3)}% ` +
        `EBITDA ${formatGBP(p.ebitda, { compact: true }).padStart(8)} PAT ${formatGBP(p.profit, { compact: true }).padStart(8)} ` +
        `cash ${formatGBP(last.closing.cash, { compact: true }).padStart(8)} debt ${formatGBP(-last.closing.loans, { compact: true }).padStart(7)} ` +
        `heads ${String(last.kpis.headcount).padStart(3)} vol ${String(Math.round(last.kpis.customers || last.kpis.unitsSold)).padStart(6)} ` +
        `share ${(last.kpis.preferenceShare * 100).toFixed(0)}% reach ${(last.kpis.reach * 100).toFixed(0)}% q ${last.kpis.quality.toFixed(0)} ` +
        `equity ${formatGBP(last.valuation.equityValue, { compact: true })}`,
      );
    }
    const f = finalScore(s);
    console.log(`Score ${f.score.toLocaleString()} health ${f.health.grade}; integrity errors: ${s.integrityErrors.length}`);
    if (s.integrityErrors.length) console.log(s.integrityErrors.slice(0, 5));
  }
}
