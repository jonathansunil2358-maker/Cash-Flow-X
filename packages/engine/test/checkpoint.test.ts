import { describe, expect, it } from 'vitest';
import { applyActionInPlace, compactForServer, continueRun, newGame, stateChecksum, tickInPlace, type Action, type GameState, type IndustryId } from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };

/**
 * The server never sees the news log or the journal: it continues a run from a compact checkpoint. Anything
 * the simulation reads from the log would make the two sides disagree. This plays long games the way the
 * real client and server do, syncing every few months, and demands the same checksum at every step.
 */
describe('the server and the client stay in step across checkpoints', () => {
  const cases: [IndustryId, string, string[]][] = [
    ['software', 'CP1', []], ['ecommerce', 'CP2', ['culture-people']], ['restaurant', 'CP3', ['culture-frugal']], ['fitness', 'CP4', ['chaos-mayhem']], ['clothing', 'CP5', []],
  ];
  it.each(cases)('%s %s', (id, seed, mods) => {
    const client = newGame({ companyName: 'C', industryId: id, seed, difficulty: 'easy', modifiers: mods });
    let server = compactForServer(client);
    let synced = client.actionLog.length;
    for (let m = 0; m < 96 && client.status === 'playing'; m++) {
      answer(client); applyPolicy(client); answer(client); tickInPlace(client);
      if ((m + 1) % 5 === 0 || client.status !== 'playing') {
        answer(client);
        const batch = client.actionLog.slice(synced) as { month: number; action: Action }[];
        synced = client.actionLog.length;
        continueRun(server, batch, client.month);
        expect(stateChecksum(server), `${id} month ${client.month}`).toBe(stateChecksum(client));
        server = compactForServer(server);
      }
    }
  });
});
