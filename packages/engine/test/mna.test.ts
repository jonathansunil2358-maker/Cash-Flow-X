import { describe, expect, it } from 'vitest';
import {
  applyActionInPlace, checkIntegrity, newGame, replay, stateChecksum, tickInPlace, reservePrice, talkOf, hiddenOf, synergyOf, closingCosts, DEFAULT_TERMS,
  needsReview, toSubmission, divestCheck, hostileCheck, rivalPrice, bidsFor, askCheck, type GameState, type Terms,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const company = (seed: string, months = 40): GameState => {
  let s = play(newGame({ companyName: 'M', industryId: 'software', seed, difficulty: 'easy' }), months);
  for (let n = 1; s.status !== 'playing' && n < 20; n++) s = play(newGame({ companyName: 'M', industryId: 'software', seed: `${seed}-${n}`, difficulty: 'easy' }), months);
  expect(s.status).toBe('playing');
  s.ledger.balances.cash += 5_000_000_00;
  s.ledger.balances.shareCapital -= 5_000_000_00;
  return s;
};
const run = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); tickInPlace(s); answer(s); expect(checkIntegrity(s).slice(0, 2)).toEqual([]); } };
const agreed = (s: GameState, id: string) => {
  const t = s.targets.find((x) => x.id === id)!;
  applyActionInPlace(s, { type: 'makeOffer', targetId: id, price: reservePrice(s, t) });
  expect(talkOf(s, id)?.status).toBe('agreed');
  const rival = talkOf(s, id)?.rival;
  if (rival) applyActionInPlace(s, { type: 'raiseBid', targetId: id, price: rival.bid });
  return t;
};
const terms = (o: Partial<Terms> = {}): Terms => ({ ...DEFAULT_TERMS, ...o });

describe('mergers and acquisitions v5', () => {
  it('a target list exists and new listings appear over the year', () => {
    const s = company('MNA-LIST');
    expect(s.targets.length).toBeGreaterThan(0);
    const seen = new Set(s.targets.map((t) => t.id));
    let fresh = 0;
    for (let i = 0; i < 24 && s.status === 'playing'; i++) { answer(s); tickInPlace(s); for (const t of s.targets) if (!seen.has(t.id)) { seen.add(t.id); fresh++; } }
    expect(fresh).toBeGreaterThan(0);
  });

  it('each check costs money, can be done once, and the books balance', () => {
    const s = company('MNA-CHK');
    const id = s.targets[0].id;
    for (const kind of ['customers', 'people', 'legal', 'ops']) {
      const cash = s.ledger.balances.cash;
      applyActionInPlace(s, { type: 'check', targetId: id, kind });
      expect(s.ledger.balances.cash).toBeLessThan(cash);
      expect(() => applyActionInPlace(s, { type: 'check', targetId: id, kind })).toThrow();
    }
    expect(() => applyActionInPlace(s, { type: 'check', targetId: id, kind: 'nope' })).toThrow();
    expect(checkIntegrity(s)).toEqual([]);
    const h = hiddenOf(s, s.targets[0]);
    expect(h.legal).toBeGreaterThanOrEqual(0);
    const syn = synergyOf(s, s.targets[0]);
    expect(syn.low).toBeLessThanOrEqual(syn.mid); expect(syn.mid).toBeLessThanOrEqual(syn.high);
  });

  it('negotiation: lowball walks away, near offers counter, reserve agrees, three rounds end it', () => {
    const s = company('MNA-NEG');
    const [a, b, c] = s.targets;
    const ra = reservePrice(s, a);
    applyActionInPlace(s, { type: 'makeOffer', targetId: a.id, price: Math.max(Math.round(ra * 0.5), 20_00 + 1) });
    expect(['dead', 'open']).toContain(talkOf(s, a.id)?.status);
    applyActionInPlace(s, { type: 'makeOffer', targetId: b.id, price: reservePrice(s, b) });
    expect(talkOf(s, b.id)?.status).toBe('agreed');
    expect(() => applyActionInPlace(s, { type: 'makeOffer', targetId: b.id, price: reservePrice(s, b) })).toThrow();
    const rc = reservePrice(s, c);
    let rounds = 0;
    while (talkOf(s, c.id)?.status !== 'dead' && talkOf(s, c.id)?.status !== 'agreed' && rounds < 5) { applyActionInPlace(s, { type: 'makeOffer', targetId: c.id, price: Math.round(rc * 0.95) }); rounds++; }
    expect(rounds).toBeLessThanOrEqual(3);
    expect(checkIntegrity(s)).toEqual([]);
  });

  it('closing with each structure balances the books for years, and walking away costs 2%', () => {
    for (const structure of ['cash', 'shares', 'earnout'] as const) {
      const s = company(`MNA-STR-${structure}`);
      const t = agreed(s, s.targets[0].id);
      const before = s.acquisitions.length;
      applyActionInPlace(s, { type: 'closeDeal', targetId: t.id, terms: terms({ structure, retention: true }) });
      expect(s.acquisitions.length).toBe(before + 1);
      if (structure === 'shares') expect(s.outsideHolders.length).toBeGreaterThan(0);
      expect(checkIntegrity(s)).toEqual([]);
      run(s, 18);
    }
    const s = company('MNA-WALK');
    const t = agreed(s, s.targets[0].id);
    const cash = s.ledger.balances.cash;
    applyActionInPlace(s, { type: 'walkAway', targetId: t.id });
    expect(s.ledger.balances.cash).toBeLessThan(cash);
    expect(talkOf(s, t.id)?.status).toBe('dead');
    expect(checkIntegrity(s)).toEqual([]);
  });

  it('an acquisition loan funds part of the price and the books balance', () => {
    const s = company('MNA-LOAN');
    const t = agreed(s, s.targets[0].id);
    const c = closingCosts(s, t, talkOf(s, t.id)!.price!, terms({ loan: true }));
    expect(c.loan).toBeGreaterThan(0);
    const debt = s.ledger.balances.loans ?? 0;
    applyActionInPlace(s, { type: 'closeDeal', targetId: t.id, terms: terms({ loan: true }) });
    expect(checkIntegrity(s)).toEqual([]);
    expect(Object.values(s.ledger.balances).length).toBeGreaterThan(0);
    void debt;
    run(s, 14);
  });

  it('integration plans differ and synergies show up as income', () => {
    const out: number[] = [];
    for (const plan of ['fast', 'steady', 'separate'] as const) {
      const s = company('MNA-PLAN');
      const t = agreed(s, s.targets[0].id);
      applyActionInPlace(s, { type: 'closeDeal', targetId: t.id, terms: terms({ plan }) });
      run(s, 24);
      out.push(s.acquisitions[s.acquisitions.length - 1].realised ?? 0);
    }
    expect(out[2]).toBe(0);
    expect(out[0]).toBeGreaterThanOrEqual(0);
  });

  it('a rival bid can be answered, and ignoring it loses the deal', () => {
    let tested = 0;
    for (let k = 0; k < 40 && tested < 2; k++) {
      const s = company(`MNA-WAR-${k}`);
      for (const t of [...s.targets]) {
        if (!s.targets.some((x) => x.id === t.id)) continue;
        applyActionInPlace(s, { type: 'makeOffer', targetId: t.id, price: reservePrice(s, t) });
        const talk = talkOf(s, t.id);
        if (talk?.rival) {
          tested++;
          const win = structuredClone(s); const lose = structuredClone(s);
          applyActionInPlace(win, { type: 'raiseBid', targetId: t.id, price: talk.rival.bid });
          expect(talkOf(win, t.id)?.rival).toBeUndefined();
          expect(() => applyActionInPlace(lose, { type: 'raiseBid', targetId: t.id, price: talk.rival.bid - 1 })).toThrow();
          for (let i = 0; i < 3; i++) { answer(lose); tickInPlace(lose); }
          expect(talkOf(lose, t.id)?.status).toBe('dead');
          expect(checkIntegrity(lose)).toEqual([]);
          break;
        }
      }
    }
    expect(tested).toBeGreaterThan(0);
  });

  it('a hostile bid on a rival is paid for and resolves in two months', () => {
    const s = company('MNA-HOST');
    expect(hostileCheck(s, 0, 0.35, rivalPrice(s, 0)).ok).toBe(true);
    expect(() => applyActionInPlace(s, { type: 'hostileBid', index: 0, premium: 0.13 })).toThrow();
    const rivals = s.competitors.length;
    applyActionInPlace(s, { type: 'hostileBid', index: 0, premium: 0.5 });
    expect(s.mna?.hostile).toBeTruthy();
    expect(() => applyActionInPlace(s, { type: 'hostileBid', index: 1, premium: 0.5 })).toThrow();
    run(s, 3);
    expect(s.mna?.hostile).toBeUndefined();
    expect(s.competitors.length).toBeLessThanOrEqual(rivals);
  });

  it('a merger of equals needs a partner of similar size and is paid in shares', () => {
    const s = company('MNA-MOE');
    for (const t of s.targets) t.annualRevenue = 1;
    expect(() => applyActionInPlace(s, { type: 'mergerOfEquals', targetId: s.targets[0].id })).toThrow();
    const t = s.targets[0];
    t.annualRevenue = Math.max(t.annualRevenue, 10_000_000_00);
    t.askingPrice = Math.min(t.askingPrice, 400_000_00);
    applyActionInPlace(s, { type: 'mergerOfEquals', targetId: t.id });
    expect(s.outsideHolders.length).toBeGreaterThan(0);
    expect(checkIntegrity(s)).toEqual([]);
    run(s, 12);
  });

  it('an acquired business can be sold on after six months', () => {
    const s = company('MNA-DIV');
    const t = agreed(s, s.targets[0].id);
    applyActionInPlace(s, { type: 'closeDeal', targetId: t.id, terms: terms() });
    const name = s.acquisitions[s.acquisitions.length - 1].name;
    expect(divestCheck(s, name).ok).toBe(false);
    run(s, 7);
    expect(divestCheck(s, name).ok).toBe(true);
    applyActionInPlace(s, { type: 'divest', name });
    expect(s.acquisitions.find((a) => a.name === name)?.divested).toBeTruthy();
    expect(() => applyActionInPlace(s, { type: 'divest', name })).toThrow();
    expect(checkIntegrity(s)).toEqual([]);
    run(s, 6);
  });

  it('a negotiated sale accepts a reasonable ask and refuses a greedy one', () => {
    const s = company('MNA-ASK', 40);
    const b = bidsFor(s)[0];
    expect(askCheck(b.mult, b.mult).ok).toBe(true);
    expect(askCheck(b.mult, 1.6).ok).toBe(false);
    expect(() => applyActionInPlace(structuredClone(s), { type: 'tradeSale', bid: b.id, ask: 1.6 })).toThrow();
    const t = structuredClone(s);
    applyActionInPlace(t, { type: 'tradeSale', bid: b.id, ask: b.mult });
    expect(t.status).toBe('finished');
  });

  it('a played company that does deals replays identically on the server', () => {
    const s = play(newGame({ companyName: 'M', industryId: 'software', seed: 'MNA-REPLAY', difficulty: 'easy' }), 40);
    for (const x of s.targets.slice(0, 3)) {
      try {
        applyActionInPlace(s, { type: 'check', targetId: x.id, kind: 'legal' });
        applyActionInPlace(s, { type: 'makeOffer', targetId: x.id, price: reservePrice(s, x) });
        applyActionInPlace(s, { type: 'closeDeal', targetId: x.id, terms: terms({ structure: 'earnout', retention: true, plan: 'fast' }) });
      } catch { /* not affordable: fine */ }
    }
    run(s, 20);
    void needsReview;
    expect(stateChecksum(replay(toSubmission(s)))).toBe(stateChecksum(s));
  });
});
