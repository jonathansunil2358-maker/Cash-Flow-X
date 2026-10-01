import { describe, expect, it } from 'vitest';
import {
  applyActionInPlace, buildingCheck, buildingPrice, candidatesOf, checkIntegrity, CHOICE_EVENTS, compactForServer, continueRun, createRng, designCheck, designDemandMult, exportMult, exportUpkeep,
  MARKETS, MAX_REPLIES_PER_MONTH, monthlyRent, newGame, ownsBuilding, replay, replyCheck, reviewsOf, starCheck, starEffects, stateChecksum, tickInPlace, toSubmission, type Action,
  type GameState, type IndustryId,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const rich = (id: IndustryId = 'software', seed = 'D3', months = 16): GameState => {
  const s = play(newGame({ companyName: 'D', industryId: id, seed, difficulty: 'easy' }), months);
  return s;
};
const topUp = (s: GameState, pence: number) => { s.ledger.balances.cash += pence; s.ledger.balances.shareCapital -= pence; };

describe('product design', () => {
  it('is validated, costs a fee, has a cooldown and moves demand and cost in opposite directions', () => {
    const s = rich();
    expect(designCheck(s, 120).ok).toBe(false);
    expect(designCheck(s, 50).ok).toBe(false);
    expect(designCheck(s, 80).ok).toBe(true);
    const cash = s.ledger.balances.cash;
    applyActionInPlace(s, { type: 'setDesign', features: 80 });
    expect(s.ledger.balances.cash).toBeLessThan(cash);
    expect(s.design).toBe(80);
    expect(designDemandMult(s)).toBeGreaterThan(1);
    expect(designCheck(s, 20).ok).toBe(false);
    play(s, 3);
    applyActionInPlace(s, { type: 'setDesign', features: 50 });
    expect(s.design).toBeUndefined();
    expect(checkIntegrity(s)).toEqual([]);
  });
});

describe('the hiring market', () => {
  it('offers the same four people to the client and the server, and a hire brings a lasting perk', () => {
    const s = rich('ecommerce', 'HM');
    const c = candidatesOf(s);
    expect(c).toHaveLength(4);
    expect(candidatesOf(s)).toEqual(c);
    expect(candidatesOf({ ...s, month: s.month + 1 } as GameState)).not.toEqual(c);
    expect(starCheck(s, 'nobody').ok).toBe(false);
    topUp(s, 50_000_00);
    const staff = s.staff[c[0].role];
    applyActionInPlace(s, { type: 'hireStar', id: c[0].id });
    expect(s.staff[c[0].role]).toBe(staff + 1);
    expect(s.stars).toHaveLength(1);
    expect(starCheck(s, c[1].id).ok).toBe(false);
    const fx = starEffects(s);
    expect(fx.capacity + fx.reach + fx.quality).toBeGreaterThan(1);
    expect(checkIntegrity(s)).toEqual([]);
  });
});

describe('real estate', () => {
  it('needs a track record, stops base rent, and the books stay balanced', () => {
    const young = newGame({ companyName: 'R', industryId: 'restaurant', seed: 'RE', difficulty: 'easy' });
    expect(buildingCheck(young).ok).toBe(false);
    const s = rich('restaurant', 'RE2');
    topUp(s, 2_000_000_00);
    const rent = monthlyRent(s);
    const price = buildingPrice(s);
    expect(buildingCheck(s).ok).toBe(true);
    applyActionInPlace(s, { type: 'buyBuilding' });
    expect(ownsBuilding(s)).toBe(true);
    expect(monthlyRent(s)).toBeLessThan(rent);
    expect(buildingCheck(s).ok).toBe(false);
    expect(price).toBeGreaterThan(0);
    play(s, 26);
    expect(checkIntegrity(s)).toEqual([]);
  });
});

describe('export markets', () => {
  it('open once, add demand that swings with the currency, and cost upkeep', () => {
    const s = rich('software', 'EX');
    topUp(s, 200_000_00);
    expect(exportMult(s)).toBe(1);
    expect(() => applyActionInPlace(s, { type: 'openMarket', market: 'mars' })).toThrow();
    applyActionInPlace(s, { type: 'openMarket', market: 'usa' });
    expect(() => applyActionInPlace(s, { type: 'openMarket', market: 'usa' })).toThrow(/already/);
    const seen = new Set<number>();
    for (let i = 0; i < 6; i++) { seen.add(Math.round(exportMult(s) * 1000)); answer(s); tickInPlace(s); }
    expect(seen.size).toBeGreaterThan(1);
    expect(exportMult(s)).toBeGreaterThan(1);
    expect(exportUpkeep(s)).toBeGreaterThan(0);
    expect(MARKETS).toHaveLength(3);
    expect(checkIntegrity(s)).toEqual([]);
  });
});

describe('customer reviews', () => {
  it('are the same for everyone, and replies move reputation, twice a month at most', () => {
    const s = rich('ecommerce', 'RV');
    const r = reviewsOf(s);
    expect(r).toHaveLength(5);
    expect(reviewsOf(s)).toEqual(r);
    expect(replyCheck(s, 9).ok).toBe(false);
    const rep = s.reputation;
    s.reputation = 50;
    applyActionInPlace(s, { type: 'replyReview', index: 0 });
    expect(s.reputation).toBeGreaterThan(50);
    expect(() => applyActionInPlace(s, { type: 'replyReview', index: 0 })).toThrow(/already/);
    applyActionInPlace(s, { type: 'replyReview', index: 1 });
    expect(() => applyActionInPlace(s, { type: 'replyReview', index: 2 })).toThrow(new RegExp(`${MAX_REPLIES_PER_MONTH}`));
    answer(s); tickInPlace(s);
    expect(replyCheck(s, 0).ok).toBe(true);
    void rep;
  });
});

describe('collaboration and recall events', () => {
  const ask = (s: GameState, id: string, choice: string, roll: number) => {
    const def = CHOICE_EVENTS.find((e) => e.id === id)!;
    const setup = def.setup(s, createRng(s));
    s.pendingEvent = { id, title: def.title, polarity: def.polarity, icon: def.icon, story: setup.story, month: s.month, params: setup.params, choices: setup.choices.map((c) => ({ id: c.id, label: c.label, hint: c.hint, impact: c.impact })) };
    s.rng = Math.floor(roll * 0xffffffff);
    applyActionInPlace(s, { type: 'resolveEvent', choiceId: choice });
  };
  it('every choice of the collaboration runs whatever the dice say', () => {
    for (const c of ['split', 'solo', 'pass']) for (const roll of [0.05, 0.95]) { const s = rich('software', 'COL', 14); topUp(s, 100_000_00); ask(s, 'collab', c, roll); expect(checkIntegrity(s)).toEqual([]); }
  });
  it('a recall has two stages: a half-hearted answer brings a follow-up, a full recall does not', () => {
    const follow = CHOICE_EVENTS.find((e) => e.id === 'recallFollow')!;
    const a = rich('software', 'REC', 20); topUp(a, 100_000_00);
    expect(follow.when(a)).toBe(false);
    ask(a, 'recall', 'partial', 0.5);
    expect(follow.when(a)).toBe(false);
    a.month += 2;
    expect(follow.when(a)).toBe(true);
    ask(a, 'recallFollow', 'fix', 0.5);
    expect(checkIntegrity(a)).toEqual([]);
    expect(follow.when(a)).toBe(false);
    const b = rich('software', 'REC2', 20); topUp(b, 100_000_00);
    ask(b, 'recall', 'full', 0.5);
    b.month += 6;
    expect(follow.when(b)).toBe(false);
    const d = rich('software', 'REC3', 20); topUp(d, 100_000_00);
    ask(d, 'recall', 'deny', 0.5);
    d.month += 2;
    for (const c of ['fix', 'ride']) for (const roll of [0.1, 0.9]) { const t = structuredClone(d); ask(t, 'recallFollow', c, roll); expect(checkIntegrity(t)).toEqual([]); }
  });
});

describe('the server replays every new action exactly', () => {
  it('a company that designs, hires stars, buys a building, exports and replies stays in step through checkpoints', () => {
    const client = rich('software', 'ALL3', 14);
    topUp(client, 3_000_000_00); // this top-up is not an action: sync from the same state so only actions differ
    let server = compactForServer(client);
    let synced = client.actionLog.length;
    const sync = () => {
      answer(client);
      const batch = client.actionLog.slice(synced) as { month: number; action: Action }[];
      synced = client.actionLog.length;
      continueRun(server, batch, client.month);
      expect(stateChecksum(server)).toBe(stateChecksum(client));
      server = compactForServer(server);
    };
    answer(client);
    applyActionInPlace(client, { type: 'setDesign', features: 70 });
    applyActionInPlace(client, { type: 'hireStar', id: candidatesOf(client)[0].id });
    applyActionInPlace(client, { type: 'replyReview', index: 0 });
    sync();
    for (let i = 0; i < 4; i++) { answer(client); applyPolicy(client); answer(client); tickInPlace(client); }
    applyActionInPlace(client, { type: 'openMarket', market: 'europe' });
    applyActionInPlace(client, { type: 'buyBuilding' });
    sync();
    for (let i = 0; i < 24; i++) { answer(client); applyPolicy(client); answer(client); tickInPlace(client); if (i % 5 === 4) sync(); }
    sync();
    expect(checkIntegrity(client)).toEqual([]);
    void replay; void toSubmission;
  });
});
