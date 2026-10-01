import { describe, expect, it } from 'vitest';
import {
  ADVISOR_NAMES, advisors, applyActionInPlace, breakEven, calendarTotal, cashCalendar, checkIntegrity, cleanRules, MAX_RULES, newGame, replay, riskOf, stateChecksum,
  tickInPlace, toSubmission, continueRun, compactForServer, type GameState, type IndustryId,
} from '../src/index';
import { applyPolicy } from '../scripts/policy';

const answer = (s: GameState) => { if (s.status === 'playing' && s.pendingEvent) applyActionInPlace(s, { type: 'resolveEvent', choiceId: s.pendingEvent.choices[0].id }); };
const play = (s: GameState, months: number, policy = true) => { for (let i = 0; i < months && s.status === 'playing'; i++) { answer(s); if (policy) applyPolicy(s); answer(s); tickInPlace(s); } return s; };
const fresh = (id: IndustryId = 'ecommerce', seed = 'SMART') => newGame({ companyName: 'S', industryId: id, seed, difficulty: 'easy' });

describe('advisors', () => {
  it('say nothing before a first month closes, then give three opinions with real actions', () => {
    expect(advisors(fresh())).toEqual([]);
    const s = play(fresh(), 8);
    const a = advisors(s);
    expect(a.map((x) => x.role)).toEqual(['cfo', 'marketing', 'operations']);
    for (const x of a) { expect(x.name).toBe(ADVISOR_NAMES[x.role]); expect(x.headline.length).toBeGreaterThan(3); if (x.action) expect(x.actionLabel).toBeTruthy(); }
  });

  it('every suggested action can be applied without breaking the books, and they can disagree', () => {
    let disagreed = false;
    for (const seed of ['A1', 'A2', 'A3', 'A4', 'A5', 'A6']) {
      const s = play(fresh('restaurant', seed), 14);
      for (const x of advisors(s)) {
        if (x.disagreesWith) disagreed = true;
        if (x.action) { const t = structuredClone(s); try { applyActionInPlace(t, x.action); } catch { /* may be unaffordable */ } expect(checkIntegrity(t)).toEqual([]); }
      }
    }
    void disagreed;
  });

  it('a company in trouble hears the CFO say cut back', () => {
    const s = play(fresh('restaurant', 'TROUBLE'), 8);
    s.ledger.balances.cash = -40_000_00;
    s.ledger.balances.shareCapital += 0;
    const cfo = advisors(s).find((x) => x.role === 'cfo')!;
    expect(cfo.headline).toMatch(/Cut marketing|Hold back/);
  });
});

describe('calendar, risk and break-even', () => {
  it('the calendar lists payroll every month, rent every third month, and a loan\'s repayments', () => {
    const s = play(fresh('software', 'CAL'), 6);
    applyActionInPlace(s, { type: 'takeLoan', amount: 20_000_00, termMonths: 12 });
    const items = cashCalendar(s, 6);
    expect(items.filter((i) => i.kind === 'loan')).toHaveLength(6);
    expect(items.filter((i) => i.kind === 'rent').every((i) => i.month % 3 === 0)).toBe(true);
    expect(new Set(items.filter((i) => i.kind === 'payroll').map((i) => i.month)).size).toBe(6);
    expect(calendarTotal(items, s.month)).toBeGreaterThan(0);
  });

  it('risk rises as cash runs out, and calms when it recovers', () => {
    const s = play(fresh('restaurant', 'RISK'), 10);
    const base = riskOf(s);
    s.ledger.balances.cash = -30_000_00;
    const worse = riskOf(s);
    expect(worse.score).toBeGreaterThan(base.score);
    expect(worse.factors[0].points).toBeGreaterThan(0);
    expect(['calm', 'watch', 'danger', 'critical']).toContain(worse.level);
    expect(worse.score).toBeLessThanOrEqual(100);
  });

  it('break-even compares the customers you need with the customers you have', () => {
    expect(breakEven(fresh())).toBeNull();
    const s = play(fresh('software', 'BE'), 10);
    const b = breakEven(s)!;
    expect(b.fixedCosts).toBeGreaterThan(0);
    expect(b.marginPerUnit).toBeGreaterThan(0);
    expect(b.unitsNeeded).toBeGreaterThan(0);
    expect(b.covered).toBe(b.current >= b.unitsNeeded!);
    expect(b.gap).toBe(b.unitsNeeded! - b.current);
  });
});

describe('autopilot rules', () => {
  it('are validated: known kinds, sensible numbers, no duplicates, at most three', () => {
    expect(cleanRules([]).ok).toBe(true);
    expect(cleanRules([{ kind: 'marketingPct', pct: 8 }, { kind: 'cashFloor', floor: 5_000_00 }, { kind: 'hireWhenFull', role: 'ops' }]).rules).toHaveLength(MAX_RULES);
    for (const bad of [null, 'x', [{ kind: 'nope' }], [{ kind: 'marketingPct', pct: 99 }], [{ kind: 'marketingPct', pct: 1.5 }], [{ kind: 'cashFloor', floor: -1 }],
      [{ kind: 'hireWhenFull', role: 'rnd' }], [{ kind: 'marketingPct', pct: 5 }, { kind: 'marketingPct', pct: 6 }],
      [{ kind: 'marketingPct', pct: 1 }, { kind: 'cashFloor', floor: 1 }, { kind: 'hireWhenFull', role: 'ops' }, { kind: 'x' }]]) {
      expect(cleanRules(bad).ok, JSON.stringify(bad)).toBe(false);
    }
    expect(cleanRules([{ kind: 'cashFloor', floor: 1 }, { kind: 'marketingPct', pct: 1 }], 1).ok).toBe(false);
  });

  it('set marketing from sales each month, are not in the action log, and replay identically', () => {
    const s = play(fresh('ecommerce', 'AUTO'), 6);
    applyActionInPlace(s, { type: 'setRules', rules: [{ kind: 'marketingPct', pct: 10 }] });
    const logBefore = s.actionLog.length;
    play(s, 8, false);
    expect(s.actionLog.length).toBe(logBefore);
    const rev = s.history.at(-2)!;
    expect(s.marketingBudget).toBeGreaterThan(0);
    expect(rev).toBeDefined();
    const r = replay(toSubmission(s));
    expect(r.marketingBudget).toBe(s.marketingBudget);
    expect(r.ledger.balances).toEqual(s.ledger.balances);
    expect(checkIntegrity(s)).toEqual([]);
  });

  it('the server replay of a chunk matches (rules ride along in the checkpoint)', () => {
    const s = play(fresh('software', 'AUTOSRV'), 4);
    applyActionInPlace(s, { type: 'setRules', rules: [{ kind: 'hireWhenFull', role: 'ops' }, { kind: 'cashFloor', floor: 10_000_00 }] });
    const checkpoint = compactForServer(s);
    const fromMonth = s.month;
    const before = s.actionLog.length;
    play(s, 10);
    const server = structuredClone(checkpoint);
    continueRun(server, (s.actionLog.slice(before) as { month: number; action: never }[]).filter((a) => a.month >= fromMonth), s.month);
    expect(stateChecksum(server)).toBe(stateChecksum(s));
  });

  it('clearing the rules switches autopilot off', () => {
    const s = play(fresh('ecommerce', 'CLR'), 4);
    applyActionInPlace(s, { type: 'setRules', rules: [{ kind: 'marketingPct', pct: 5 }] });
    expect(s.rules).toHaveLength(1);
    applyActionInPlace(s, { type: 'setRules', rules: [] });
    expect(s.rules).toBeUndefined();
    expect(() => applyActionInPlace(s, { type: 'setRules', rules: [{ kind: 'bad' }] })).toThrow();
  });
});

import { deletePlan, cleanPlan, newProfile, planActions, plansOf, savePlan, MAX_PLANS } from '../src/index';

describe('scenario plans', () => {
  it('only accept small, whole, in-range numbers and a clean name', () => {
    expect(cleanPlan({ name: 'Push it', price: 10, marketing: 150, hires: 2 })).toMatchObject({ name: 'Push it', price: 10 });
    for (const bad of [null, {}, { name: '', price: 0, marketing: 100, hires: 0 }, { name: 'x', price: 31, marketing: 100, hires: 0 }, { name: 'x', price: 0, marketing: 301, hires: 0 },
      { name: 'x', price: 0, marketing: 100, hires: 9 }, { name: 'x', price: 1.5, marketing: 100, hires: 0 }, { name: 'x', price: 'a', marketing: 100, hires: 0 }]) {
      expect(cleanPlan(bad), JSON.stringify(bad)).toBeNull();
    }
    expect(cleanPlan({ name: '<script>bad</script> Plan', price: 0, marketing: 100, hires: 0 })!.name).not.toMatch(/[<>]/);
    expect(cleanPlan({ name: 'x'.repeat(80), price: 0, marketing: 100, hires: 0 })!.name).toHaveLength(30);
  });

  it('turn into real actions on any company, and can be saved up to the limit', () => {
    const s = play(fresh('ecommerce', 'PLAN'), 6);
    const plan = cleanPlan({ name: 'Grow', price: -10, marketing: 200, hires: 1 })!;
    const acts = planActions(s, plan);
    expect(acts.map((a) => a.type)).toEqual(['setPrice', 'setMarketing', 'hire']);
    for (const a of acts) applyActionInPlace(s, a);
    expect(checkIntegrity(s)).toEqual([]);
    expect(planActions(s, cleanPlan({ name: 'Same', price: 0, marketing: 100, hires: 0 })!)).toEqual([]);
    let p = newProfile();
    for (let i = 0; i < MAX_PLANS; i++) p = savePlan(p, { name: `P${i}`, price: i, marketing: 100, hires: 0 });
    expect(plansOf(p)).toHaveLength(MAX_PLANS);
    expect(() => savePlan(p, { name: 'Extra', price: 0, marketing: 100, hires: 0 })).toThrow(/Delete one/);
    p = deletePlan(p, plansOf(p)[0].id);
    expect(plansOf(p)).toHaveLength(MAX_PLANS - 1);
    expect(() => savePlan(p, { name: '', price: 0, marketing: 100, hires: 0 })).toThrow();
  });
});
