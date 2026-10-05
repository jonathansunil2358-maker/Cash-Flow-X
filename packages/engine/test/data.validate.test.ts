import { describe, expect, it } from 'vitest';
import { EVENTS8, POLICIES, PROJECTS8, TOPICS, type PolEff } from '../src/index';
import { EVENTS9, POLICIES9, PROJECTS9 } from '../src/model/data9';

/**
 * Rules every hand-written policy, event and initiative must follow, so that hundreds of small effects cannot
 * quietly break the balance of the game. If one of these fails, fix the data, not the test.
 */
const between = (n: number | undefined, lo: number, hi: number): boolean => n === undefined || (n >= lo && n <= hi);
const effOk = (e: PolEff, where: string): void => {
  for (const k of ['d', 'c', 'cap', 'ch'] as const) expect(between(e[k], 0.93, 1.07), `${where} ${k}`).toBe(true);
  expect(between(e.q, -0.05, 0.05), `${where} q`).toBe(true);
  expect(between(e.m, -1, 1), `${where} m`).toBe(true);
  expect(between(e.rep, -0.12, 0.12), `${where} rep`).toBe(true);
  expect(between(e.br, 0.995, 1.005), `${where} br`).toBe(true);
  expect(between(e.hire, 0.7, 1.4), `${where} hire`).toBe(true);
  expect(between(e.od, 0.7, 1.4), `${where} od`).toBe(true);
  if (e.risk && e.risk[0] > 0) { expect(e.risk[0], `${where} risk chance`).toBeLessThanOrEqual(15); expect(e.risk[1], `${where} risk cost`).toBeLessThanOrEqual(8); expect(e.risk[2].length, `${where} risk text`).toBeGreaterThan(5); }
};
const hasUpside = (e: PolEff): boolean => (e.d ?? 1) > 1 || (e.c ?? 1) < 1 || (e.cap ?? 1) > 1 || (e.ch ?? 1) < 1 || (e.q ?? 0) > 0 || (e.m ?? 0) > 0 || (e.rep ?? 0) > 0 || (e.hire ?? 1) < 1 || (e.od ?? 1) > 1 || (e.br ?? 1) > 1;
const hasDownside = (e: PolEff): boolean => (e.d ?? 1) < 1 || (e.c ?? 1) > 1 || (e.cap ?? 1) < 1 || (e.ch ?? 1) > 1 || (e.q ?? 0) < 0 || (e.m ?? 0) < 0 || (e.rep ?? 0) < 0 || (e.hire ?? 1) > 1 || (e.od ?? 1) < 1 || !!(e.risk && e.risk[0] > 0);

describe('data files', () => {
  const topics = new Set(TOPICS.map((t) => t.id));
  it('ids are unique and use their topic prefix', () => {
    const ids = [...POLICIES.map((p) => p.id), ...EVENTS8.map((e) => e.id), ...PROJECTS8.map((p) => p.id)];
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of POLICIES9) { expect(topics.has(p.topic!), p.id).toBe(true); expect(p.id.startsWith(`${p.topic}_`), p.id).toBe(true); }
    for (const e of EVENTS9) expect(e.id.startsWith(`e9_${e.topic}_`), e.id).toBe(true);
    for (const p of PROJECTS9) expect(p.id.startsWith(`${p.topic}_`), p.id).toBe(true);
  });

  it('policies are balanced: a baseline first option, sane sizes, and no free lunches', () => {
    for (const p of POLICIES) {
      expect(p.options.length, p.id).toBeGreaterThanOrEqual(2);
      expect(p.options.length, p.id).toBeLessThanOrEqual(4);
      expect(p.name.length, p.id).toBeGreaterThan(2);
      expect(new Set(p.options.map((o) => o.name)).size, p.id).toBe(p.options.length);
      if (!(POLICIES9 as readonly unknown[]).includes(p) && !POLICIES9.some((x) => x.id === p.id)) continue;
      expect(Object.keys(p.options[0].eff), `${p.id} option 0`).toHaveLength(0);
      expect(p.options[0].monthly ?? 0, `${p.id} option 0`).toBe(0);
      expect(p.options[0].setup ?? 0, `${p.id} option 0`).toBe(0);
      for (const o of p.options) {
        effOk(o.eff, `${p.id}.${o.name}`);
        expect(between(o.monthly, -1.5, 2), `${p.id}.${o.name} monthly`).toBe(true);
        expect(between(o.setup, 0, 4), `${p.id}.${o.name} setup`).toBe(true);
        expect(o.blurb.length, `${p.id}.${o.name}`).toBeGreaterThan(5);
        if (hasUpside(o.eff)) expect((o.monthly ?? 0) > 0 || (o.setup ?? 0) > 0 || hasDownside(o.eff), `${p.id}.${o.name} is a free lunch`).toBe(true);
      }
    }
  });

  it('events are balanced: two or three choices, small effects, honest odds', () => {
    for (const e of EVENTS9) {
      expect(e.choices.length, e.id).toBeGreaterThanOrEqual(2);
      expect(e.choices.length, e.id).toBeLessThanOrEqual(3);
      expect(e.per, e.id).toBeGreaterThan(0);
      expect(e.per, e.id).toBeLessThanOrEqual(2);
      expect(e.cd, e.id).toBeGreaterThanOrEqual(8);
      expect(e.story.length, e.id).toBeGreaterThan(30);
      expect(new Set(e.choices.map((c) => c.id)).size, e.id).toBe(e.choices.length);
      for (const c of e.choices) {
        expect(c.label.length, `${e.id}.${c.id}`).toBeGreaterThan(2);
        expect(c.hint.length, `${e.id}.${c.id}`).toBeGreaterThan(5);
        expect(between(c.k, 0, 0.12), `${e.id}.${c.id} k`).toBe(true);
        expect(between(c.income, 0, 0.8), `${e.id}.${c.id} income`).toBe(true);
        const effs = [c.eff, c.gamble?.good, c.gamble?.bad];
        for (const x of effs) {
          if (!x) continue;
          for (const k of ['d', 'c'] as const) { const v = x[k]; if (v) { expect(v[0], `${e.id}.${c.id} ${k}`).toBeGreaterThanOrEqual(0.9); expect(v[0], `${e.id}.${c.id} ${k}`).toBeLessThanOrEqual(1.1); expect(v[1], `${e.id}.${c.id} ${k} months`).toBeLessThanOrEqual(12); } }
          expect(between(x.morale, -6, 6), `${e.id}.${c.id} morale`).toBe(true);
          expect(between(x.rep, -4, 4), `${e.id}.${c.id} rep`).toBe(true);
          expect(between(x.brand, 0.95, 1.06), `${e.id}.${c.id} brand`).toBe(true);
          expect(between(x.quality, -3, 3), `${e.id}.${c.id} quality`).toBe(true);
        }
        if (c.gamble) { expect(c.gamble.p, `${e.id}.${c.id}`).toBeGreaterThanOrEqual(0.1); expect(c.gamble.p, `${e.id}.${c.id}`).toBeLessThanOrEqual(0.95); expect(c.gamble.goodText.length + c.gamble.badText.length, `${e.id}.${c.id}`).toBeGreaterThan(10); }
        else expect(c.text.length, `${e.id}.${c.id} text`).toBeGreaterThan(5);
      }
    }
  });

  it('initiatives are balanced: real odds, real costs, sensible rewards', () => {
    for (const p of PROJECTS9) {
      expect(p.k, p.id).toBeGreaterThanOrEqual(0.2);
      expect(p.k, p.id).toBeLessThanOrEqual(3);
      expect(p.months, p.id).toBeGreaterThanOrEqual(2);
      expect(p.months, p.id).toBeLessThanOrEqual(18);
      expect(p.success, p.id).toBeGreaterThanOrEqual(30);
      expect(p.success, p.id).toBeLessThanOrEqual(95);
      expect(p.blurb.length, p.id).toBeGreaterThan(10);
      expect(p.win.text.length + p.lose.text.length, p.id).toBeGreaterThan(20);
      if (p.win.eff) effOk(p.win.eff, `${p.id} win`);
      expect(between(p.win.monthly, -1, 1), `${p.id} monthly`).toBe(true);
      for (const x of [p.win.now, p.lose.now]) {
        if (!x) continue;
        expect(between(x.morale, -6, 6), p.id).toBe(true);
        expect(between(x.rep, -4, 4), p.id).toBe(true);
        expect(between(x.brand, 0.95, 1.06), p.id).toBe(true);
        expect(between(x.quality, -3, 3), p.id).toBe(true);
        for (const k of ['d', 'c'] as const) { const v = x[k]; if (v) { expect(v[0], p.id).toBeGreaterThanOrEqual(0.9); expect(v[0], p.id).toBeLessThanOrEqual(1.1); expect(v[1], p.id).toBeLessThanOrEqual(12); } }
      }
    }
  });
});
