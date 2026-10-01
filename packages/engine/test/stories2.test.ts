import { describe, expect, it } from 'vitest';
import { applyActionInPlace, checkIntegrity, CHOICE_EVENTS, createRng, newGame, replay, stateChecksum, tickInPlace, toSubmission, type GameState } from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const IDS = ['takeover', 'cultureParty', 'strike', 'fireDrill', 'tradeFair', 'lawsuit', 'spy', 'prank'];

describe('new story events', () => {
  it('exist, and every choice of every one runs, whatever the dice say, leaving the books balanced', () => {
    for (const id of IDS) {
      const def = CHOICE_EVENTS.find((e) => e.id === id);
      expect(def, id).toBeDefined();
      for (const roll of [0, 0.5, 0.999]) {
        const probe = play(newGame({ companyName: 'S', industryId: 'software', seed: `ST-${id}`, difficulty: 'easy' }), 30);
        probe.ledger.balances.cash += 200_000_00;
        probe.ledger.balances.shareCapital -= 200_000_00;
        probe.morale = 40;
        const setup = def!.setup(probe, createRng(probe));
        for (const choice of setup.choices) {
          const s = structuredClone(probe);
          s.pendingEvent = { id, title: def!.title, polarity: def!.polarity, icon: def!.icon, story: setup.story, month: s.month, params: setup.params, choices: setup.choices.map((c) => ({ id: c.id, label: c.label, hint: c.hint, impact: c.impact })) };
          s.rng = Math.floor(roll * 0xffffffff);
          applyActionInPlace(s, { type: 'resolveEvent', choiceId: choice.id });
          expect(s.pendingEvent, `${id}.${choice.id}`).toBeNull();
          expect(checkIntegrity(s).slice(0, 2), `${id}.${choice.id}`).toEqual([]);
          expect(s.reputation).toBeGreaterThanOrEqual(0);
          expect(s.reputation).toBeLessThanOrEqual(100);
          expect(s.morale).toBeGreaterThanOrEqual(0);
          expect(s.morale).toBeLessThanOrEqual(100);
        }
      }
    }
  });

  it('a company that lives through them keeps balanced books and replays on the server', () => {
    for (const culture of ['culture-people', 'culture-frugal']) {
      const s = play(newGame({ companyName: 'S', industryId: 'ecommerce', seed: `STORY-${culture}`, difficulty: 'easy', modifiers: [culture] }), 60);
      expect(checkIntegrity(s)).toEqual([]);
      expect(stateChecksum(replay(toSubmission(s)))).toBe(stateChecksum(s));
    }
  });

  it('they actually turn up over a long game', () => {
    const seen = new Set<string>();
    for (let k = 0; k < 60; k++) {
      const s = newGame({ companyName: 'S', industryId: 'software', seed: `SEEN${k}`, difficulty: 'easy', modifiers: k % 2 ? ['culture-people'] : [] });
      for (let i = 0; i < 120 && s.status === 'playing'; i++) {
        if (s.pendingEvent) { seen.add(s.pendingEvent.id); applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); }
        applyPolicy(s);
        tickInPlace(s);
      }
    }
    // The strike mostly follows unhappy teams, so a well-run test company rarely meets it.
    for (const id of IDS.filter((x) => x !== 'strike')) expect(seen.has(id), id).toBe(true);
  });
});
