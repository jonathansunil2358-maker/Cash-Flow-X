import { describe, expect, it } from 'vitest';
import { claimQuest, newProfile, QUESTS, questsForDay, questsOf, recordQuest, STREAK_BONUS_GEMS, type Profile } from '../src/index';

const finish = (p: Profile, day: string): Profile => {
  for (const q of questsForDay(day)) p = recordQuest(p, day, q.event, q.target);
  return p;
};

describe('daily quests', () => {
  it('are three, different in kind, the same for everyone on a day, and change day to day', () => {
    const a = questsForDay('2027-03-01');
    expect(a).toHaveLength(3);
    expect(new Set(a.map((q) => q.event)).size).toBe(3);
    expect(questsForDay('2027-03-01')).toEqual(a);
    const days = ['2027-03-02', '2027-03-03', '2027-03-04'].map((d) => questsForDay(d).map((q) => q.id).join());
    expect(new Set([a.map((q) => q.id).join(), ...days]).size).toBeGreaterThan(2);
    expect(QUESTS.length).toBeGreaterThanOrEqual(8);
  });

  it('count matching events, never past the target, and ignore the rest', () => {
    const day = '2027-03-01';
    let p = newProfile();
    const q = questsForDay(day)[0];
    p = recordQuest(p, day, q.event, q.target + 5);
    expect(questsOf(p, day).items.find((i) => i.id === q.id)!.progress).toBe(q.target);
    const other = QUESTS.find((x) => !questsForDay(day).some((d) => d.event === x.event))!;
    const same = recordQuest(p, day, other.event);
    expect(same).toBe(p);
  });

  it('pay gems once each, and a bonus for the third; the streak grows day by day', () => {
    let p = { ...newProfile(), gems: 0 };
    p = finish(p, '2027-03-01');
    const ids = questsForDay('2027-03-01').map((q) => q.id);
    const first = claimQuest(p, '2027-03-01', ids[0]);
    expect(first.bonus).toBe(0);
    expect(() => claimQuest(first.profile, '2027-03-01', ids[0])).toThrow(/Already/);
    const second = claimQuest(first.profile, '2027-03-01', ids[1]);
    const third = claimQuest(second.profile, '2027-03-01', ids[2]);
    expect(third.bonus).toBe(STREAK_BONUS_GEMS);
    expect(third.profile.quests!.streak).toBe(1);
    const gems = questsForDay('2027-03-01').reduce((a, q) => a + q.gems, 0) + STREAK_BONUS_GEMS;
    expect(third.profile.gems).toBe(gems);
    // The next day, and the day after: the streak climbs.
    let q = third.profile;
    q = finish(q, '2027-03-02');
    for (const id of questsForDay('2027-03-02').map((x) => x.id)) q = claimQuest(q, '2027-03-02', id).profile;
    expect(q.quests!.streak).toBe(2);
    // Miss a day and it starts again.
    q = finish(q, '2027-03-05');
    let last = q;
    let bonus = 0;
    for (const id of questsForDay('2027-03-05').map((x) => x.id)) { const r = claimQuest(last, '2027-03-05', id); last = r.profile; bonus = r.bonus; }
    expect(last.quests!.streak).toBe(1);
    expect(bonus).toBe(STREAK_BONUS_GEMS);
  });

  it('refuse unfinished or unknown quests', () => {
    const p = newProfile();
    expect(() => claimQuest(p, '2027-03-01', questsForDay('2027-03-01')[0].id)).toThrow(/Not finished/);
    expect(() => claimQuest(p, '2027-03-01', 'nope')).toThrow(/not on today/);
  });
});
