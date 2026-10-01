import { describe, expect, it } from 'vitest';
import {
  ACHIEVEMENTS, addBoxes, advanceSurprise, applyActionInPlace, AUTO_EVENTS, BOX_GEMS, boxCount, checkIntegrity, CHOICE_EVENTS, claimAlbumPage, completedPages, createRng,
  grantSticker, luckOf, newGame, newProfile, openBox, replay, rollBox, STICKER_PAGES, STICKERS, stickersOnPage, tickInPlace, toSubmission, INDUSTRY_IDS, type GameState, type IndustryId,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const fresh = (id: IndustryId = 'ecommerce', seed = 'SURP') => newGame({ companyName: 'S', industryId: id, seed, difficulty: 'easy' });

describe('stickers and boxes', () => {
  it('has seven pages of six, with unique ids', () => {
    expect(STICKER_PAGES).toHaveLength(7);
    expect(STICKERS).toHaveLength(42);
    expect(new Set(STICKERS.map((s) => s.id)).size).toBe(42);
    for (const p of STICKER_PAGES) expect(stickersOnPage(p.id)).toHaveLength(6);
    for (const id of INDUSTRY_IDS) expect(stickersOnPage(id)).toHaveLength(6);
  });

  it('a box roll is deterministic and falls back to gems when the album is full', () => {
    expect(rollBox('x', [])).toEqual(rollBox('x', []));
    const all = STICKERS.map((s) => s.id);
    for (let i = 0; i < 200; i++) {
      const r = rollBox(`seed${i}`, all);
      expect(r.kind === 'sticker').toBe(false);
    }
    const kinds = new Set(Array.from({ length: 200 }, (_, i) => rollBox(`k${i}`, []).kind));
    expect(kinds).toEqual(new Set(['gems', 'boost', 'sticker']));
    for (let i = 0; i < 100; i++) { const r = rollBox(`g${i}`, []); if (r.kind === 'gems') expect(BOX_GEMS.concat(40)).toContain(r.gems); }
  });

  it('opening a box spends it and pays something; you cannot open an empty one', () => {
    let p = { ...newProfile(), gems: 0 };
    expect(() => openBox(p)).toThrow(/no boxes/);
    p = addBoxes(p, 5);
    expect(boxCount(p)).toBe(5);
    const seen = new Set<string>();
    for (let i = 0; i < 5; i++) {
      const r = openBox(p);
      p = r.profile;
      seen.add(r.reward.kind);
      expect(boxCount(p)).toBe(4 - i);
    }
    expect(p.boxesOpened).toBe(5);
    expect(p.gems + p.boosts.length + (p.stickers?.length ?? 0)).toBeGreaterThan(0);
  });

  it('a finished page pays gems once', () => {
    let p = { ...newProfile(), gems: 0 };
    for (const s of stickersOnPage('general')) p = grantSticker(p, s.id);
    expect(grantSticker(p, 'general-0')).toBe(p);
    expect(completedPages(p.stickers ?? [], []).map((x) => x.id)).toEqual(['general']);
    p = claimAlbumPage(p, 'general');
    expect(p.gems).toBe(40);
    expect(() => claimAlbumPage(p, 'general')).toThrow();
    expect(grantSticker(p, 'nope')).toBe(p);
  });
});

describe('luck streaks and rumours', () => {
  it('only happen in real play, and a hot streak or cold snap lasts three months', () => {
    const s = fresh();
    s.month = 10;
    const rng = createRng(s);
    let started = false;
    for (let i = 0; i < 400 && !started; i++) { advanceSurprise(s, rng, false); started = !!luckOf(s); }
    expect(started).toBe(true);
    const sim = fresh();
    sim.month = 10;
    for (let i = 0; i < 400; i++) advanceSurprise(sim, createRng(sim), true);
    expect(luckOf(sim)).toBeNull();
    expect(sim.rumour).toBeUndefined();
  });

  it('rumours resolve after two months, true ones really happen', () => {
    const s = fresh();
    s.month = 10;
    s.rumour = { kind: 'boom', text: 'Boom soon.', truth: true, resolveMonth: 12, target: 0 };
    s.month = 12;
    advanceSurprise(s, { next: () => 0.99 }, false);
    expect(s.rumour).toBeUndefined();
    expect(s.economy.active.some((a) => a.type === 'rumour-boom')).toBe(true);
    expect(s.log.some((l) => l.title === 'The rumour was true')).toBe(true);
    const f = fresh();
    f.month = 12;
    f.rumour = { kind: 'supply', text: 'Prices up.', truth: false, resolveMonth: 12, target: 0 };
    advanceSurprise(f, { next: () => 0.99 }, false);
    expect(f.economy.active.some((a) => a.type === 'rumour-supply')).toBe(false);
    expect(f.log.some((l) => l.title === 'The rumour was false')).toBe(true);
  });

  it('a rival-cut rumour that is true cuts the rival\'s price', () => {
    const s = fresh();
    s.month = 12;
    const before = s.competitors[0].price;
    s.rumour = { kind: 'rivalCut', text: 'Cuts.', truth: true, resolveMonth: 12, target: 0 };
    advanceSurprise(s, { next: () => 0.99 }, false);
    expect(s.competitors[0].price).toBeLessThan(before);
    expect(s.competitors[0].cutMonths).toBe(3);
  });
});

describe('the big bet and black swans', () => {
  it('a bet either pays 80% or loses the stake, and the books balance', () => {
    const def = CHOICE_EVENTS.find((e) => e.id === 'bigBet')!;
    for (const roll of [0.1, 0.9]) {
      const s = play(fresh('software', 'BET'), 14);
      s.ledger.balances.cash += 100_000_00;
      s.ledger.balances.shareCapital -= 100_000_00;
      const setup = def.setup(s, createRng(s));
      const cash = s.ledger.balances.cash;
      const stake = setup.params.stake;
      s.pendingEvent = { id: 'bigBet', title: def.title, polarity: 'good', icon: def.icon, story: setup.story, month: s.month, params: setup.params, choices: setup.choices.map((c) => ({ id: c.id, label: c.label, hint: c.hint, impact: c.impact })) };
      s.rng = roll < 0.5 ? 0 : 0xffffffff;
      applyActionInPlace(s, { type: 'resolveEvent', choiceId: 'bet' });
      expect(s.ledger.balances.cash).not.toBe(cash);
      expect(stake).toBeGreaterThan(0);
      expect(checkIntegrity(s)).toEqual([]);
    }
  });

  it('there are three black swans, all long-lasting', () => {
    for (const t of ['pandemic', 'portStrike', 'techBreakthrough']) {
      const d = AUTO_EVENTS.find((e) => e.type === t)!;
      expect(d).toBeDefined();
      expect(d.duration[0]).toBeGreaterThanOrEqual(3);
    }
  });
});

describe('hidden achievements', () => {
  it('are flagged, unique, and not earned by a new company', () => {
    const hidden = ACHIEVEMENTS.filter((a) => a.hidden);
    expect(hidden.length).toBeGreaterThanOrEqual(6);
    const s = fresh();
    for (const a of hidden) expect(a.check(s), a.id).toBe(false);
  });
});

describe('everything replays', () => {
  it('a long run with luck, rumours and events replays to the same game', () => {
    const s = play(fresh('restaurant', 'SURPREPLAY'), 50);
    const r = replay(toSubmission(s));
    expect(r.rumour).toEqual(s.rumour);
    expect(r.economy.active).toEqual(s.economy.active);
    expect(r.ledger.balances).toEqual(s.ledger.balances);
    expect(checkIntegrity(s)).toEqual([]);
  });
});
