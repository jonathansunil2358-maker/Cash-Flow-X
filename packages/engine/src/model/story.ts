import { hashSeed } from '../rng';
import { rosterOf } from './roster';
import { logItem, yearOf, type Competitor, type GameState } from './state';

/**
 * Characters and stories: rival bosses with catchphrases, a mentor each year, and the people on
 * your team having careers. All of it is flavour that rides on the real simulation; the only numbers
 * it moves are through the events that use it.
 */
export interface Boss {
  name: string;
  catchphrase: string;
  /** What they say when you do well. */
  respect: string;
}

const BOSSES: Boss[] = [
  { name: 'Victor Crane', catchphrase: 'Everyone has a price, and mine is lower.', respect: 'Fine. You are not a fluke.' },
  { name: 'Imelda Frost', catchphrase: 'Quality is a lifestyle. Yours is a hobby.', respect: 'I notice you now. Do not let it go to your head.' },
  { name: 'Dougal Pryce', catchphrase: 'I was doing this before you had a logo.', respect: 'Well played. I might even copy that.' },
  { name: 'Saffron Bell', catchphrase: 'Customers love a bargain. Watch this.', respect: 'You have my attention, and my respect.' },
  { name: 'Marcus Vane', catchphrase: 'Growth at any cost. Keep up if you can.', respect: 'I did not expect you to last this long.' },
];
/** Each rival has a fixed boss, by its place in the sector's list. */
export const bossOf = (index: number): Boss => BOSSES[((index % BOSSES.length) + BOSSES.length) % BOSSES.length];

export interface Mentor {
  name: string;
  specialty: string;
  /** What they teach: used in the yearly mentor event. */
  lesson: string;
}
export const MENTORS: Mentor[] = [
  { name: 'Dame Harriet Cole', specialty: 'Cost control', lesson: 'Watch the pennies and the pounds look after themselves.' },
  { name: 'Raj Anand', specialty: 'Marketing', lesson: 'People buy stories before they buy products.' },
  { name: 'Prof. Lena Voss', specialty: 'Operations', lesson: 'A calm team beats a clever plan.' },
  { name: 'Old Tom Whitby', specialty: 'Cash flow', lesson: 'Cash is oxygen: never hold your breath.' },
  { name: 'Yuki Mori', specialty: 'Quality', lesson: 'Make it so good they tell their friends.' },
  { name: 'Baroness Nell Ash', specialty: 'Growth', lesson: 'Grow at the speed your customers can follow.' },
];
/** The mentor for a company year (0-based): they rotate. */
export const mentorOf = (year: number): Mentor => MENTORS[((year % MENTORS.length) + MENTORS.length) % MENTORS.length];

export const ALUMNI_SUFFIX = '& Co (founded by a former employee)';

/** Called at the start of each month: congratulations from rivals, promotions and the odd alumnus starting a rival. */
export function advanceStory(s: GameState, simulation: boolean): void {
  if (simulation) return;
  // The strongest rival's boss notices when you take a big share, once at each step.
  const share = s.history.at(-1)?.kpis.preferenceShare ?? 0;
  for (const step of [0.3, 0.45]) {
    const key = `respect${Math.round(step * 100)}`;
    if (share >= step && !s.log.some((l) => l.title === key)) {
      const i = s.competitors.reduce((best, c, idx) => (c.strength * c.quality > s.competitors[best].strength * s.competitors[best].quality ? idx : best), 0);
      const boss = bossOf(i);
      logItem(s, 'notice', key, `${boss.name} of ${s.competitors[i].name} says: "${boss.respect}" (You now hold ${Math.round(share * 100)}% of the people who prefer a brand.)`);
    }
  }
  if (s.month < 12 || s.month % 12 !== 0) return;
  const team = rosterOf(s);
  if (team.length >= 4) {
    const h = hashSeed(`${s.seedLabel}:promo:${s.month}`);
    const p = team[h % team.length];
    logItem(s, 'milestone', `${p.name} was promoted`, `${p.name} has grown into a senior ${p.title.toLowerCase()} this year. A good sign for the team.`);
  }
  // Now and then someone leaves and starts a small rival (at most one per company).
  const alumni = s.competitors.some((c) => c.name.endsWith(ALUMNI_SUFFIX));
  if (!alumni && s.month >= 24 && team.length >= 8 && hashSeed(`${s.seedLabel}:alumni:${yearOf(s.month)}`) % 4 === 0 && s.competitors.length) {
    const p = team[hashSeed(`${s.seedLabel}:alumnus`) % team.length];
    const proto = s.competitors[s.competitors.length - 1];
    const price = Math.round(proto.price * 0.95);
    const c: Competitor = { name: `${p.name.split(' ')[1]} ${ALUMNI_SUFFIX}`, quality: Math.max(20, proto.quality - 10), price, normalPrice: price, strength: proto.strength * 0.15, cutMonths: 0, lastLaunchYear: -1 };
    s.competitors.push(c);
    logItem(s, 'warning', `${p.name} has left to start a rival`, `${p.name} has founded ${c.name}, a small competitor. Keep your best people happy.`);
  }
}
