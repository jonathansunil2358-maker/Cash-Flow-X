/** Cost of one server sync: unpack a checkpoint, replay 12 months, checksum, repack. */
import { gzipSync, gunzipSync } from 'node:zlib';
import { compactForServer, continueRun, stateChecksum, toSubmission, type Action } from '../src/index';
import { playPolicy } from '../test/helpers';

const full = playPolicy('software', 'BENCH', 108);
const cp = compactForServer(playPolicy('software', 'BENCH', 96));
const packed = gzipSync(JSON.stringify(cp));
const actions = toSubmission(full).actions.filter((a) => a.month >= 96) as { month: number; action: Action }[];
console.log(`checkpoint ${(JSON.stringify(cp).length / 1024).toFixed(0)} KB json, ${(packed.length / 1024).toFixed(1)} KB gzip; ${actions.length} actions`);
const run = () => {
  const s = JSON.parse(gunzipSync(packed).toString());
  continueRun(s, actions, 108);
  stateChecksum(s);
  gzipSync(JSON.stringify(compactForServer(s)));
};
for (let i = 0; i < 10; i++) run();
const t = performance.now();
for (let i = 0; i < 50; i++) run();
console.log(`sync of 12 months: ${((performance.now() - t) / 50).toFixed(2)} ms`);
