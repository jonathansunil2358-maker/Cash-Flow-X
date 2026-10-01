import { describe, expect, it } from 'vitest';
import {
  advanceAudit, applyActionInPlace, auditOf, checkIntegrity, DETECTIVE_CASES, detectiveOf, DIAGNOSES, newGame, replay, scenarioOf, spotTheMistake, stateChecksum, TERMS,
  tickInPlace, toSubmission, type GameState,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const days = Array.from({ length: 120 }, (_, i) => `2026-${String(1 + Math.floor(i / 28)).padStart(2, '0')}-${String(1 + (i % 28)).padStart(2, '0')}`);

describe('spot the mistake', () => {
  it('is the same for everyone on a day, never balances, and has exactly one answer among the options', () => {
    const kinds = new Set<string>();
    for (const d of days) {
      const p = spotTheMistake(d);
      expect(spotTheMistake(d)).toEqual(p);
      kinds.add(p.kind);
      expect(p.debitTotal).not.toBe(p.creditTotal);
      expect(p.options).toHaveLength(4);
      expect(new Set(p.options.map((o) => o.id)).size).toBe(4);
      expect(p.options.filter((o) => o.id === p.answer)).toHaveLength(1);
      const gap = Math.abs(p.debitTotal - p.creditTotal);
      if (p.kind === 'wrongSide') {
        // Half the gap is exactly the amount of the culprit.
        const c = p.lines.find((l) => l.id === p.answer)!;
        expect(gap).toBe(2 * (c.debit || c.credit));
      } else {
        expect((gap / 100) % 9).toBe(0);
      }
      for (const l of p.lines) expect(l.debit * l.credit).toBe(0);
    }
    expect(kinds).toEqual(new Set(['wrongSide', 'transposed']));
  });
});

describe('ratio detective', () => {
  it('has six cases whose answers are among the four options, and varies by day', () => {
    expect(DETECTIVE_CASES).toHaveLength(6);
    const seen = new Set<string>();
    for (const d of days) {
      const p = detectiveOf(d);
      expect(detectiveOf(d)).toEqual(p);
      seen.add(p.case.id);
      expect(p.options).toHaveLength(4);
      expect(new Set(p.options.map((o) => o.id)).size).toBe(4);
      expect(p.options.some((o) => o.id === p.case.answer)).toBe(true);
      for (const o of p.options) expect(DIAGNOSES.some((x) => x.id === o.id)).toBe(true);
    }
    expect(seen.size).toBe(6);
  });
});

describe('glossary', () => {
  it('every term gives an example from a real company without throwing', () => {
    const s = play(newGame({ companyName: 'G', industryId: 'ecommerce', seed: 'GLOSS', difficulty: 'easy' }), 14);
    for (const t of TERMS) {
      expect(t.plain.length).toBeGreaterThan(20);
      expect(t.example(s).length).toBeGreaterThan(5);
    }
    expect(new Set(TERMS.map((t) => t.id)).size).toBe(TERMS.length);
  });
});

describe('audit day', () => {
  it('a healthy company is clean; trouble is named; the year-end audit moves reputation deterministically', () => {
    const s = play(newGame({ companyName: 'A', industryId: 'ecommerce', seed: 'AUDIT', difficulty: 'easy' }), 6);
    expect(auditOf(s).every((f) => f.title.length > 0 && f.fix.length > 0)).toBe(true);
    const sick = play(newGame({ companyName: 'B', industryId: 'ecommerce', seed: 'AUDIT2', difficulty: 'easy' }), 3);
    sick.ledger.balances.cash = -1;
    expect(auditOf(sick).some((f) => f.id === 'overdraft')).toBe(true);
    // Audit at a new year changes reputation and is recorded.
    const t = play(newGame({ companyName: 'C', industryId: 'ecommerce', seed: 'AUDIT3', difficulty: 'easy' }), 25);
    expect(t.audits?.length).toBeGreaterThanOrEqual(1);
    expect(t.reputation).toBeGreaterThanOrEqual(0);
    expect(t.reputation).toBeLessThanOrEqual(100);
    // Not at other times, and forecasts do not log.
    const u = newGame({ companyName: 'D', industryId: 'ecommerce', seed: 'AUDIT4', difficulty: 'easy' });
    const before = u.reputation;
    advanceAudit(u, false);
    expect(u.reputation).toBe(before);
    expect(u.audits).toBeUndefined();
  });

  it('audited companies replay exactly on the server', () => {
    const s = play(newGame({ companyName: 'R', industryId: 'software', seed: 'AUDITR', difficulty: 'medium' }), 26);
    expect(stateChecksum(replay(toSubmission(s)))).toBe(stateChecksum(s));
  });
});

describe('more case studies', () => {
  it.each(['cash-crunch', 'growth-trap', 'price-war'])('%s starts balanced, runs to its end and reports its objectives', (id) => {
    const sc = scenarioOf(id);
    expect(sc.kind).toBe('case-study');
    const s = newGame({ companyName: '', industryId: sc.industryId!, seed: 'CS', scenarioId: id });
    expect(checkIntegrity(s)).toEqual([]);
    expect(sc.objectives!(s)).toHaveLength(3);
    play(s, sc.months!);
    expect(checkIntegrity(s)).toEqual([]);
    expect(sc.objectives!(s).every((o) => typeof o.met === 'boolean' && o.detail.length > 0)).toBe(true);
    expect(stateChecksum(replay(toSubmission(s)))).toBe(stateChecksum(s));
  });
});

describe('learning progress', () => {
  it('pays the first right answer of the day once, and records terms once', async () => {
    const { newProfile, recordAnswer, answeredToday, seeTerm, termSeen, learnOf, LEARN_REWARD_GEMS } = await import('../src/index');
    let p = { ...newProfile(), gems: 0 };
    expect(answeredToday(p, 'spot', '2026-10-01').done).toBe(false);
    let r = recordAnswer(p, 'spot', '2026-10-01', true);
    expect(r.gems).toBe(LEARN_REWARD_GEMS);
    p = r.profile;
    expect(p.gems).toBe(LEARN_REWARD_GEMS);
    r = recordAnswer(p, 'spot', '2026-10-01', true);
    expect(r.gems).toBe(0);
    expect(r.profile).toBe(p);
    // A wrong first answer uses up the day's try; the other puzzle and the next day are separate.
    r = recordAnswer(p, 'detective', '2026-10-01', false);
    expect(r.gems).toBe(0);
    expect(answeredToday(r.profile, 'detective', '2026-10-01')).toEqual({ done: true, right: false });
    expect(recordAnswer(r.profile, 'spot', '2026-10-02', true).gems).toBe(LEARN_REWARD_GEMS);
    expect(learnOf(r.profile).solved).toBe(1);
    // Terms
    expect(termSeen(p, 'ebitda')).toBe(false);
    p = seeTerm(p, 'ebitda');
    expect(termSeen(p, 'ebitda')).toBe(true);
    expect(seeTerm(p, 'ebitda')).toBe(p);
    expect(seeTerm(p, 'nonsense')).toBe(p);
  });
});
