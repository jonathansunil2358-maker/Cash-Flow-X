import { describe, expect, it } from 'vitest';
import { bracketFor, isoWeek, weekendOf, type Entrant } from '../src/index';

const e = (n: number): Entrant => ({ id: `u${n}`, name: `U${n}`, score: 1000 - n * 10 });

describe('the weekend tournament', () => {
  it('needs at least two entrants and seeds the best eight', () => {
    expect(bracketFor([e(1)], {}, {})).toBeNull();
    const b = bracketFor(Array.from({ length: 12 }, (_, i) => e(i + 1)), {}, {})!;
    expect(b.quarters).toHaveLength(4);
    expect(b.quarters.map((m) => [m.a!.id, m.b!.id])).toEqual([['u1', 'u8'], ['u4', 'u5'], ['u2', 'u7'], ['u3', 'u6']]);
  });

  it('is decided by Saturday, then Sunday, then the weekly score, with ties going to the higher seed', () => {
    const entrants = Array.from({ length: 8 }, (_, i) => e(i + 1));
    const sat: Record<string, number> = { u8: 50, u1: 10, u4: 10, u5: 10, u2: 5, u7: 5, u3: 9, u6: 1 };
    const sun: Record<string, number> = { u8: 1, u4: 100, u2: 7, u3: 7 };
    const b = bracketFor(entrants, sat, sun)!;
    expect(b.quarters.map((m) => m.winner!.id)).toEqual(['u8', 'u4', 'u2', 'u3']);
    expect(b.semis.map((m) => m.winner!.id)).toEqual(['u4', 'u2']);
    expect(b.final.winner!.id).toBe('u2');
    expect(b.champion!.id).toBe('u2');
  });

  it('gives byes when fewer than eight play', () => {
    const b = bracketFor([e(1), e(2), e(3)], { u2: 5, u3: 1 }, { u1: 1, u2: 1 })!;
    expect(b.quarters.some((m) => m.b === null && m.winner)).toBe(true);
    expect(b.champion).not.toBeNull();
  });

  it('finds the weekend of an ISO week', () => {
    const w = isoWeek(new Date('2026-10-07T12:00:00Z'));
    expect(w).toBe('2026-W41');
    expect(weekendOf(w)).toEqual({ saturday: '2026-10-10', sunday: '2026-10-11' });
    expect(weekendOf('2027-W01')).toEqual({ saturday: '2027-01-09', sunday: '2027-01-10' });
  });
});
