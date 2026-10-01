import { describe, expect, it } from 'vitest';
import {
  AWARD_BOXES_PER_DAY, DAILY_PLAY_GEMS, grantAwardBoxes, newProfile, PAID_PRESTIGES_PER_DAY, payPlayGems, payPrestigeGems, playGemsLeft, PRESTIGE_GEMS,
} from '../src/index';

describe('gem economy: daily allowance for repeatable play', () => {
  const day = '2027-03-01';
  it('pays mission and level-up gems up to the allowance, then nothing until tomorrow', () => {
    let p = { ...newProfile(), gems: 0 };
    let r = payPlayGems(p, day, DAILY_PLAY_GEMS - 5);
    expect(r.paid).toBe(DAILY_PLAY_GEMS - 5);
    r = payPlayGems(r.profile, day, 20);
    expect(r.paid).toBe(5);
    expect(playGemsLeft(r.profile, day)).toBe(0);
    r = payPlayGems(r.profile, day, 10);
    expect(r.paid).toBe(0);
    p = r.profile;
    expect(p.gems).toBe(DAILY_PLAY_GEMS);
    r = payPlayGems(p, '2027-03-02', 10);
    expect(r.paid).toBe(10);
  });
  it('pays prestige gems for the first prestiges of the day only', () => {
    let p = { ...newProfile(), gems: 0 };
    for (let i = 0; i < PAID_PRESTIGES_PER_DAY; i++) {
      const r = payPrestigeGems(p, day);
      expect(r.paid).toBe(PRESTIGE_GEMS);
      p = r.profile;
    }
    expect(payPrestigeGems(p, day).paid).toBe(0);
    expect(payPrestigeGems(p, '2027-03-02').paid).toBe(PRESTIGE_GEMS);
  });
  it('limits mystery boxes from awards per day', () => {
    const r = grantAwardBoxes({ ...newProfile() }, day, 5);
    expect(r.granted).toBe(AWARD_BOXES_PER_DAY);
    expect(r.profile.boxes).toBe(AWARD_BOXES_PER_DAY);
    expect(grantAwardBoxes(r.profile, day, 1).granted).toBe(0);
    expect(grantAwardBoxes(r.profile, '2027-03-02', 1).granted).toBe(1);
  });
});
