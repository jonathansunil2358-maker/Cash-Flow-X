import { describe, expect, it } from 'vitest';
import {
  applyActionInPlace, CAMPAIGN, campaignChapter, campaignId, checkIntegrity, CHOICE_EVENTS, cleanModifiers, createRng, documentaryOf, modifierBonus, modifiersOf, nemesisOf, nemesisTaunt, newGame,
  newProfile, ORIGINS, originOf, rememberNemesis, replay, scenarioOf, stateChecksum, tickInPlace, toSubmission, type GameState, type IndustryId,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const fresh = (mods: string[] = [], id: IndustryId = 'software', seed = 'V3A') => newGame({ companyName: 'V', industryId: id, seed, difficulty: 'easy', modifiers: mods });

describe('the campaign', () => {
  it('has ten chapters that each start balanced, run to the end, report objectives and replay', () => {
    expect(CAMPAIGN).toHaveLength(10);
    for (const c of CAMPAIGN) {
      const sc = scenarioOf(campaignId(c.n));
      expect(sc.kind).toBe('case-study');
      expect(campaignChapter(campaignId(c.n))).toBe(c);
      const s = newGame({ companyName: '', industryId: c.industryId, seed: `CH${c.n}`, scenarioId: campaignId(c.n) });
      expect(checkIntegrity(s), `ch${c.n}`).toEqual([]);
      expect(sc.objectives!(s).length).toBeGreaterThanOrEqual(2);
      play(s, c.months);
      expect(checkIntegrity(s), `ch${c.n}`).toEqual([]);
      expect(stateChecksum(replay(toSubmission(s))), `ch${c.n}`).toBe(stateChecksum(s));
    }
    expect(campaignChapter('standard')).toBeNull();
  });
});

describe('founder backstories', () => {
  it('only one is kept, they pay no bonus, and each changes the numbers its own way', () => {
    expect(cleanModifiers(['origin-banker', 'origin-engineer', 'inflation'])).toEqual(['inflation', 'origin-banker']);
    expect(originOf(['x', 'origin-dropout'])).toBe('origin-dropout');
    expect(modifierBonus(['origin-marketer'])).toBe(1);
    const base = modifiersOf(fresh());
    for (const o of ORIGINS) {
      const s = fresh([o.id]);
      expect(JSON.stringify(modifiersOf(s))).not.toBe(JSON.stringify(base));
      play(s, 20);
      expect(checkIntegrity(s)).toEqual([]);
    }
    expect(fresh(['origin-marketer']).brand).toBeGreaterThan(fresh().brand);
    expect(modifiersOf(fresh(['origin-banker'])).loanSpreadDelta).toBeLessThan(base.loanSpreadDelta);
  });

  it('replay exactly on the server', () => {
    for (const o of ['origin-banker', 'origin-engineer']) {
      const s = play(fresh([o], 'ecommerce', 'ORR'), 30);
      expect(stateChecksum(replay(toSubmission(s)))).toBe(stateChecksum(s));
    }
  });
});

describe('the whistleblower dilemma', () => {
  const start = (): GameState => { const s = play(fresh([], 'software', 'WHIS'), 20); s.pendingEvent = null; return s; };
  const ask = (s: GameState, id: string, choice: string, roll = 0.5) => {
    const def = CHOICE_EVENTS.find((e) => e.id === id)!;
    const setup = def.setup(s, createRng(s));
    s.pendingEvent = { id, title: def.title, polarity: def.polarity, icon: def.icon, story: setup.story, month: s.month, params: setup.params, choices: setup.choices.map((c) => ({ id: c.id, label: c.label, hint: c.hint, impact: c.impact })) };
    s.rng = Math.floor(roll * 0xffffffff);
    applyActionInPlace(s, { type: 'resolveEvent', choiceId: choice });
  };
  it('every choice runs and keeps the books balanced', () => {
    for (const c of ['report', 'exploit', 'ignore']) { const s = start(); ask(s, 'whistle', c); expect(checkIntegrity(s)).toEqual([]); expect(s.done).toContain('whistle'); }
  });
  it('using the secret comes back six months later as a scandal, and only then', () => {
    const def = CHOICE_EVENTS.find((e) => e.id === 'scandal')!;
    const s = start();
    expect(def.when(s)).toBe(false);
    ask(s, 'whistle', 'exploit');
    expect(def.when(s)).toBe(false);
    s.month += 6;
    expect(def.when(s)).toBe(true);
    ask(s, 'scandal', 'apologise');
    expect(checkIntegrity(s)).toEqual([]);
    expect(def.when(s)).toBe(false);
    const t = start();
    ask(t, 'whistle', 'report');
    t.month += 12;
    expect(def.when(t)).toBe(false);
  });
});

describe('documentary and nemesis', () => {
  it('the documentary reads the real company and changes nothing', () => {
    const s = play(fresh([], 'ecommerce', 'DOC'), 30);
    const sum = stateChecksum(s);
    const d = documentaryOf(s);
    expect(d.scenes.length).toBeGreaterThanOrEqual(4);
    expect(d.scenes[0].text).toContain(s.companyName);
    expect(d.scenes.at(-1)!.heading).toBe('The ending');
    expect(stateChecksum(s)).toBe(sum);
  });
  it('the nemesis is the strongest rival, remembered, and taunts until you beat your old stake', () => {
    const s = play(fresh([], 'software', 'NEM'), 6);
    let p = newProfile();
    expect(nemesisOf(p)).toBeNull();
    p = rememberNemesis(p, s, 5_000_000_00);
    const n = nemesisOf(p)!;
    expect(s.competitors.some((c) => c.name === n.name)).toBe(true);
    expect(nemesisTaunt(n, 1_000_000_00).beaten).toBe(false);
    expect(nemesisTaunt(n, 9_000_000_00).beaten).toBe(true);
  });
});
