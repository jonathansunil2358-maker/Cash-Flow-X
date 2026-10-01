import { describe, expect, it } from 'vitest';
import { actionText, applyActionInPlace, hearTip, lookOf, LOOK_LEAF, newGame, newProfile, nextTip, stateChecksum, theatreAt, theatreMonths, tickInPlace, tipsHeard, type GameState } from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const fresh = () => newGame({ companyName: 'F', industryId: 'ecommerce', seed: 'FEEL', difficulty: 'easy' });

describe('replay theatre', () => {
  it('has a frame for every month played, with the actions and news of that month, and changes nothing', () => {
    const s = play(fresh(), 14);
    const sum = stateChecksum(s);
    const months = theatreMonths(s);
    expect(months.length).toBeGreaterThanOrEqual(10);
    let withActions = 0;
    for (const m of months) { const f = theatreAt(s, m)!; expect(f.label.length).toBeGreaterThan(3); expect(Number.isFinite(f.revenue + f.profit + f.cash + f.value)).toBe(true); if (f.actions.length) withActions++; }
    expect(withActions).toBeGreaterThan(0);
    expect(theatreAt(s, 9999)).toBeNull();
    expect(stateChecksum(s)).toBe(sum);
  });
  it('describes any action without throwing', () => {
    for (const a of [{ type: 'hire', role: 'ops', count: 2 }, { type: 'weirdThing' }, null, undefined, 5, { type: 'setPrice', price: 1000 }]) expect(actionText(a).length).toBeGreaterThan(0);
  });
});

describe('the guide', () => {
  it('says the welcome first, each tip only once, and responds to real trouble', () => {
    const s = fresh();
    let seen: string[] = [];
    const t1 = nextTip(s, seen)!;
    expect(t1.id).toBe('welcome');
    seen = tipsHeard(hearTip(newProfile(), t1.id));
    expect(nextTip(s, [t1.id])?.id).not.toBe('welcome');
    // In the overdraft she speaks up.
    const sick = play(fresh(), 4);
    sick.ledger.balances.cash = -1;
    const t = nextTip(sick, ['welcome', 'first-month']);
    expect(t?.id).toBe('overdraft');
    // A finished game gets no tips, and heard tips are not repeated.
    sick.status = 'insolvent';
    expect(nextTip(sick, [])).toBeNull();
    const p = hearTip(hearTip(newProfile(), 'a'), 'a');
    expect(p.tips).toEqual(['a']);
    void seen;
  });
});

describe('seasonal looks', () => {
  it('cycle with the year and each has a leaf colour', () => {
    expect([0, 3, 6, 9, 12].map(lookOf)).toEqual(['winter', 'spring', 'summer', 'autumn', 'winter']);
    expect(new Set(Object.values(LOOK_LEAF)).size).toBe(4);
  });
});
