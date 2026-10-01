/**
 * Gem economy report: how many gems a player earns, from where, and how long the shop takes to
 * clear. A simulated player logs in every day, finishes the daily quests and puzzles, and plays
 * MINUTES real minutes at the fastest speed their founder level allows (x1 = one month per 10 s).
 * Run rewards use the same rules as the app (achievements, milestones, missions, level-ups, season
 * pass, award boxes); the company is prestiged whenever it qualifies. Server prizes for top-10
 * leaderboard places are left out (most players never get them).
 * Usage: npx tsx scripts/gems.ts [minutesPerDay] [days]
 */
import {
  addBoxes, addPassPoints, awardPrestige, grantAwardBoxes, payPlayGems, payPrestigeGems, BOOSTS, claimAlbumPage, claimPass, SKINS, DAILY_REWARDS, DECOR, LEARN_REWARD_GEMS,
  levelForXp, missionStatus, newAchievements, newGame, newMilestones, newProfile, openBox, prestigeCheck, QUESTS_PER_DAY, questsForDay,
  refillMissions, STREAK_BONUS_CAP, STREAK_BONUS_GEMS, tickInPlace, unlocked, XP_REWARDS, applyActionInPlace, plSummary,
  type GameState, type Profile, type Rng,
} from '../src/index';
import { applyGrowthPolicy } from './policy';

const MINUTES = Number(process.argv[2] ?? 30);
const DAYS = Number(process.argv[3] ?? 60);
const rng: Rng = (() => { let x = 12345; return { next: () => ((x = (Math.imul(x, 1664525) + 1013904223) >>> 0) / 2 ** 32) }; })();

const income: Record<string, number> = {};
const add = (p: Profile, source: string, gems: number): Profile => {
  income[source] = (income[source] ?? 0) + gems;
  return { ...p, gems: p.gems + gems };
};

/** The app's per-month rewards (mirrors progressAfter in the web store). */
function afterMonth(p: Profile, before: GameState, after: GameState, day: Date): Profile {
  const iso = day.toISOString().slice(0, 10);
  let xp = XP_REWARDS.monthClosed;
  if (plSummary(after.history.at(-1)!.period.pl).profit > 0) xp += XP_REWARDS.profitableMonth;
  const newAwards = (after.awards?.length ?? 0) - (before.awards?.length ?? 0);
  if (newAwards > 0) p = grantAwardBoxes(p, iso, newAwards).profile;
  p = addPassPoints(p, 1, day);
  for (const a of newAchievements(after, p.achievements)) {
    p = add({ ...p, achievements: { ...p.achievements, [a.id]: 'x' } }, 'achievements', a.gems);
    xp += 25;
  }
  const ms = newMilestones(after, p.milestones);
  p = { ...p, milestones: ms.seen };
  for (let i = 0; i < ms.celebrate.length; i++) p = add(p, 'milestones', 20);
  const remaining = [];
  for (const m of refillMissions(p.missions, after, rng)) {
    if (missionStatus(m, after).done) {
      const pay = payPlayGems({ ...p, missionsCompleted: p.missionsCompleted + 1 }, iso, m.rewardGems);
      income.missions = (income.missions ?? 0) + pay.paid;
      p = addPassPoints(pay.profile, 5, day);
      xp += m.rewardXp;
    } else remaining.push(m);
  }
  p = { ...p, missions: refillMissions(remaining, after, rng) };
  const old = levelForXp(p.xp);
  p = { ...p, xp: p.xp + xp };
  for (let l = old + 1; l <= levelForXp(p.xp); l++) {
    const pay = payPlayGems(p, iso, XP_REWARDS.levelUpGemsPerLevel * l);
    income['level-ups'] = (income['level-ups'] ?? 0) + pay.paid;
    p = pay.profile;
  }
  return p;
}

let p: Profile = { ...newProfile(), gems: 0 };
let game = newGame({ companyName: 'Gem Co', industryId: 'software', seed: 'GEMS', difficulty: 'medium', equipmentFinance: 'lease' });
let streak = 0;
let prestiges = 0;
const checkpoints: { day: number; gems: number; level: number }[] = [];
const start = new Date('2026-10-01T09:00:00Z');

for (let d = 0; d < DAYS; d++) {
  const day = new Date(start.getTime() + d * 86_400_000);
  // Daily login reward and puzzles.
  streak = Math.min(DAILY_REWARDS.length, streak + 1);
  p = add(p, 'daily login', DAILY_REWARDS[streak - 1]);
  if (streak === DAILY_REWARDS.length) streak = 0;
  p = add(p, 'puzzles', LEARN_REWARD_GEMS * 2);
  // Daily quests: all three, plus the all-three streak bonus.
  const quests = questsForDay(day.toISOString().slice(0, 10)).slice(0, QUESTS_PER_DAY);
  p = add(p, 'quests', quests.reduce((a, q) => a + q.gems, 0));
  p = add(p, 'quest streak bonus', STREAK_BONUS_GEMS * Math.min(STREAK_BONUS_CAP, d + 1));
  // Play: months per day at the fastest unlocked speed.
  const level = levelForXp(p.xp);
  const speed = unlocked(level, 'x4') ? 4 : unlocked(level, 'x2') ? 2 : 1;
  const months = Math.round(MINUTES * 6 * speed);
  for (let i = 0; i < months; i++) {
    if (game.status !== 'playing') game = newGame({ companyName: 'Gem Co', industryId: 'software', seed: `GEMS-${d}-${i}`, difficulty: 'medium', equipmentFinance: 'lease' });
    applyGrowthPolicy(game);
    const before = structuredClone(game);
    tickInPlace(game);
    p = afterMonth(p, before, game, day);
    if (prestigeCheck(game).eligible) {
      const c = prestigeCheck(game);
      applyActionInPlace(game, { type: 'prestige' });
      prestiges += 1;
      const g0 = p.gems;
      p = payPrestigeGems(awardPrestige(p, c.points, c.stake), day.toISOString().slice(0, 10)).profile;
      income.prestige = (income.prestige ?? 0) + (p.gems - g0);
    }
  }
  // Season pass tiers, then boxes (and any album pages they finish).
  for (let r = claimPass(p, day); r; r = claimPass(p, day)) {
    p = r.profile;
    if (r.reward.kind === 'gems') p = add(p, 'season pass', r.reward.amount);
    else p = addBoxes(p, 1);
  }
  while ((p.boxes ?? 0) > 0) {
    const g0 = p.gems;
    const o = openBox(p);
    p = o.profile;
    income['mystery boxes'] = (income['mystery boxes'] ?? 0) + (p.gems - g0);
    if (o.pageDone) { const g1 = p.gems; p = claimAlbumPage(p, o.pageDone); income['sticker album'] = (income['sticker album'] ?? 0) + (p.gems - g1); }
  }
  if ([1, 7, 14, 30, 60, 90].includes(d + 1)) checkpoints.push({ day: d + 1, gems: Math.round(Object.values(income).reduce((a, b) => a + b, 0)), level: levelForXp(p.xp) });
}

const total = Object.values(income).reduce((a, b) => a + b, 0);
const shop = SKINS.reduce((a, s) => a + s.gems, 0) + DECOR.reduce((a, x) => a + x.gems, 0);
console.log(`${MINUTES} min/day for ${DAYS} days (software, Medium). Founder level at the end: ${levelForXp(p.xp)}.\n`);
console.log('Gems earned by source:');
for (const [k, v] of Object.entries(income).sort((a, b) => b[1] - a[1])) console.log(`  ${k.padEnd(20)} ${String(Math.round(v)).padStart(7)}  (${((v / total) * 100).toFixed(0)}%)`);
console.log(`  ${'TOTAL'.padEnd(20)} ${String(Math.round(total)).padStart(7)}  = ${(total / DAYS).toFixed(0)} a day\n`);
console.log(`Prestiges: ${prestiges}; boxes opened: ${p.boxesOpened ?? 0}; missions completed: ${p.missionsCompleted}`);
console.log('Cumulative:', checkpoints.map((c) => `day ${c.day}: ${c.gems} (lvl ${c.level})`).join(' · '));
console.log(`\nShop: every skin and decoration together costs ${shop} gems -> cleared after ~${(shop / (total / DAYS)).toFixed(1)} days.`);
console.log('Boosts:', Object.values(BOOSTS).map((b) => `${b.name} ${b.gems}`).join(', '), `(${(Object.values(BOOSTS)[0].gems / (total / DAYS)).toFixed(1)} days of income for the cheapest)`);
