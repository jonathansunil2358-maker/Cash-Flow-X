/** Print a yearly P&L breakdown for one industry: npx tsx scripts/breakdown.ts automotive SEED */
import { formatGBP, mergePeriods, newGame, plSummary, tickInPlace, type IndustryId } from '../src/index';
import { applyPolicy } from './policy';

const [id = 'automotive', seed = 'BAL-1'] = process.argv.slice(2);
const s = newGame({ companyName: 'Test', industryId: id as IndustryId, seed });
while (s.status === 'playing' && s.month < 120) {
  applyPolicy(s);
  tickInPlace(s);
}
const f = (p: number) => formatGBP(p, { compact: true }).padStart(8);
for (let y = 0; y * 12 < s.history.length; y++) {
  const p = plSummary(mergePeriods(s.history.slice(y * 12, y * 12 + 12).map((r) => r.period)).pl);
  console.log(`Y${y + 1} rev${f(p.revenue)} cos${f(p.costOfSales)} staff${f(p.staff)} mkt${f(p.marketing)} rent${f(p.rent)} other${f(p.otherOpex)} dep${f(p.depreciation)} fin${f(p.financeCosts)} ebitda${f(p.ebitda)}`);
}
console.log(s.log.filter((l) => l.kind === 'warning' || l.kind === 'event').slice(-12).map((l) => `${l.month}: ${l.title}`).join('\n'));
console.log(s.endReason);
