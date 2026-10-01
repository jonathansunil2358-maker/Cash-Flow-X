/** How long does a leaderboard replay of a full 10-year game take? (Workers free tier: 10ms CPU.) */
import { replay, toSubmission, finalScore } from '../src/index';
import { playPolicy } from '../test/helpers';

const s = playPolicy('software', 'BENCH', 120);
const sub = toSubmission(s);
console.log(`Game: ${sub.months} months, ${sub.actions.length} actions, submission ${JSON.stringify(sub).length} bytes`);
for (let i = 0; i < 5; i++) replay(sub); // warm up the JIT
const runs = 20;
const t0 = performance.now();
for (let i = 0; i < runs; i++) replay(sub);
const ms = (performance.now() - t0) / runs;
console.log(`Replay: ${ms.toFixed(2)} ms per game (warm). Score ${finalScore(replay(sub)).score}`);
