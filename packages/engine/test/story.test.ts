import { describe, expect, it } from 'vitest';
import {
  advanceStory, ALUMNI_SUFFIX, applyActionInPlace, bossOf, checkIntegrity, CHOICE_EVENTS, MENTORS, mentorOf, newGame, replay, rivalTrait, tickInPlace, toSubmission,
  type GameState, type IndustryId,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const fresh = (id: IndustryId = 'ecommerce', seed = 'STORY') => newGame({ companyName: 'S', industryId: id, seed, difficulty: 'easy' });

describe('rival bosses and mentors', () => {
  it('every rival has a fixed boss, and mentors rotate by year', () => {
    expect(bossOf(0)).toEqual(bossOf(5));
    expect(bossOf(0).name).not.toBe(bossOf(1).name);
    expect(bossOf(-1)).toBeDefined();
    expect(mentorOf(0)).toEqual(mentorOf(MENTORS.length));
    expect(new Set(Array.from({ length: 6 }, (_, i) => mentorOf(i).name)).size).toBe(6);
    expect(rivalTrait(0)).toBe('slasher');
  });

  it('a rival boss congratulates you once per step when you take a big share', () => {
    const s = play(fresh(), 4);
    s.history.at(-1)!.kpis.preferenceShare = 0.5;
    advanceStory(s, false);
    advanceStory(s, false);
    expect(s.log.filter((l) => l.title === 'respect30')).toHaveLength(1);
    expect(s.log.filter((l) => l.title === 'respect45')).toHaveLength(1);
  });

  it('a rival\'s price cut quotes its boss', () => {
    const s = fresh('ecommerce', 'BOSSCUT');
    const log = play(s, 40).log.filter((l) => /cuts prices/.test(l.title));
    if (log.length) expect(log[0].text).toMatch(/"/);
  });
});

describe('team careers', () => {
  it('a promotion is logged at year start for a team of four or more, and an alumnus can start a rival once', () => {
    const s = fresh('software', 'CAREER');
    applyActionInPlace(s, { type: 'hire', role: 'ops', count: 6 });
    applyActionInPlace(s, { type: 'hire', role: 'sales', count: 3 });
    s.month = 24;
    advanceStory(s, false);
    expect(s.log.some((l) => /was promoted/.test(l.title))).toBe(true);
    for (let m = 36; m <= 120; m += 12) { s.month = m; advanceStory(s, false); }
    expect(s.competitors.filter((c) => c.name.endsWith(ALUMNI_SUFFIX)).length).toBeLessThanOrEqual(1);
  });

  it('forecasts never see story events', () => {
    const s = fresh('software', 'CAREER2');
    applyActionInPlace(s, { type: 'hire', role: 'ops', count: 9 });
    s.month = 24;
    const n = s.competitors.length;
    advanceStory(s, true);
    expect(s.competitors.length).toBe(n);
  });
});

describe('story decisions', () => {
  const ids = ['mentor', 'customerLetter', 'press', 'founderLife'];
  it('all four exist and give at least two ways to answer', () => {
    for (const id of ids) {
      const def = CHOICE_EVENTS.find((e) => e.id === id)!;
      expect(def, id).toBeDefined();
      const s = play(fresh('software', `DEC-${id}`), 14);
      s.morale = 50;
      s.reputation = 50;
      const setup = def.setup(s, { next: () => 0.5 });
      expect(setup.choices.length, id).toBeGreaterThanOrEqual(2);
    }
  });

  it('answering every one of them keeps the books balanced', () => {
    for (const id of ids) {
      for (let c = 0; c < 3; c++) {
        const s = play(fresh('software', `ANS-${id}-${c}`), 14);
        s.morale = 50;
        const def = CHOICE_EVENTS.find((e) => e.id === id)!;
        const setup = def.setup(s, { next: () => 0.5 });
        if (c >= setup.choices.length) continue;
        s.pendingEvent = { id, title: def.title, polarity: def.polarity, icon: def.icon, story: setup.story, month: s.month, params: setup.params, choices: setup.choices.map((x) => ({ id: x.id, label: x.label, hint: x.hint, impact: x.impact })) };
        applyActionInPlace(s, { type: 'resolveEvent', choiceId: setup.choices[c].id });
        expect(checkIntegrity(s), `${id}/${c}`).toEqual([]);
        expect(s.reputation).toBeGreaterThanOrEqual(0);
        expect(s.reputation).toBeLessThanOrEqual(100);
      }
    }
  });
});

describe('everything replays', () => {
  it('a long run with stories replays identically', () => {
    const s = play(fresh('restaurant', 'STORYREPLAY'), 60);
    const r = replay(toSubmission(s));
    expect(r.competitors).toEqual(s.competitors);
    expect(r.ledger.balances).toEqual(s.ledger.balances);
  });
});
