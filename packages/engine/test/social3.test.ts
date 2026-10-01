import { describe, expect, it } from 'vitest';
import {
  addCard, CARDS, cardCount, cardsEarnedBy, cardsOf, cleanSuggestion, collectCards, newGame, newProfile, seasonTheme, SUGGESTABLE, takeForGift, tickInPlace, applyActionInPlace, type GameState,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };

describe('season themes', () => {
  it('every month has a theme, and the same month always has the same one', () => {
    const names = new Set<string>();
    for (let m = 1; m <= 12; m++) { const t = seasonTheme(`2026-${String(m).padStart(2, '0')}`); expect(t.name.length).toBeGreaterThan(3); names.add(t.name); }
    expect(names.size).toBe(12);
    expect(seasonTheme('2027-03')).toEqual(seasonTheme('2026-03'));
  });
});

describe('co-op suggestions', () => {
  it('only whitelisted actions with sensible values get through', () => {
    expect(SUGGESTABLE.length).toBeGreaterThan(5);
    expect(cleanSuggestion({ type: 'setPrice', price: 2500 })).toEqual({ type: 'setPrice', price: 2500 });
    expect(cleanSuggestion({ type: 'setPrice', price: -5 })).toBeNull();
    expect(cleanSuggestion({ type: 'setPrice', price: 1.5 })).toBeNull();
    expect(cleanSuggestion({ type: 'hire', role: 'ops', count: 2 })).toEqual({ type: 'hire', role: 'ops', count: 2 });
    expect(cleanSuggestion({ type: 'hire', role: 'ceo', count: 2 })).toBeNull();
    expect(cleanSuggestion({ type: 'hire', role: 'ops', count: 999 })).toBeNull();
    expect(cleanSuggestion({ type: 'startPromo', discountPct: 20, months: 2 })).toEqual({ type: 'startPromo', discountPct: 20, months: 2 });
    expect(cleanSuggestion({ type: 'startPromo', discountPct: 15, months: 2 })).toBeNull();
    // Dangerous or unknown things are never accepted.
    for (const bad of [{ type: 'dividend', amount: 1 }, { type: 'raiseEquity', amount: 5 }, { type: 'prestige' }, { type: 'resolveEvent', choiceId: 'x' }, null, 'x', 7, [], {}]) expect(cleanSuggestion(bad)).toBeNull();
    // Extra fields are dropped.
    expect(cleanSuggestion({ type: 'setPay', level: 'above', evil: 'yes' })).toEqual({ type: 'setPay', level: 'above' });
  });
});

describe('trading cards', () => {
  it('has unique cards, counts duplicates, and a company hands each card out once', () => {
    expect(new Set(CARDS.map((c) => c.id)).size).toBe(CARDS.length);
    let p = newProfile();
    expect(cardCount(p)).toBe(0);
    p = addCard(p, 'mentor0');
    p = addCard(p, 'mentor0');
    p = addCard(p, 'nonsense');
    expect(cardsOf(p)).toEqual({ mentor0: 2 });
    const s = play(newGame({ companyName: 'C', industryId: 'software', seed: 'CARD', difficulty: 'easy' }), 30);
    expect(cardsEarnedBy(s).length).toBeGreaterThan(0);
    const first = collectCards(newProfile(), s);
    expect(first.gained.length).toBeGreaterThan(0);
    const again = collectCards(first.profile, s);
    expect(again.gained).toEqual([]);
    expect(again.profile).toBe(first.profile);
  });
  it('you can only gift a spare, and keep one', () => {
    let p = addCard(newProfile(), 'rival0');
    expect(() => takeForGift(p, 'rival0')).toThrow(/spare/);
    p = addCard(p, 'rival0');
    p = takeForGift(p, 'rival0');
    expect(cardsOf(p).rival0).toBe(1);
    expect(() => takeForGift(p, 'mentor1')).toThrow();
  });
});
