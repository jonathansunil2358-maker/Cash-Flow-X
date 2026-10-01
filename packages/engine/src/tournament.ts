/**
 * The weekend tournament: the top eight finishers of last week's weekly event play a knockout.
 * Quarter-finals are decided by Saturday's daily-challenge score, semi-finals by Sunday's, and the
 * final by the weekly event score. The result is a pure function of those numbers, so the server
 * and every client agree.
 */
export interface Entrant {
  id: string;
  name: string;
  /** Weekly event score: also the seeding. */
  score: number;
}

export interface Match {
  round: 'quarter' | 'semi' | 'final';
  a: Entrant | null;
  b: Entrant | null;
  /** The scores that decided it (daily Saturday, daily Sunday, or weekly). */
  aScore: number | null;
  bScore: number | null;
  winner: Entrant | null;
}

export interface Bracket {
  quarters: Match[];
  semis: Match[];
  final: Match;
  champion: Entrant | null;
}

function play(round: Match['round'], a: Entrant | null, b: Entrant | null, scores: Record<string, number>): Match {
  if (!a || !b) {
    const only = a ?? b;
    return { round, a, b, aScore: null, bScore: null, winner: only };
  }
  const as = scores[a.id] ?? 0;
  const bs = scores[b.id] ?? 0;
  // Ties go to the higher seed (a is always the higher seed in every pairing below).
  return { round, a, b, aScore: as, bScore: bs, winner: bs > as ? b : a };
}

/** Seeds 1-8 in order of weekly score. Fewer than eight entrants get byes. */
export function bracketFor(entrants: Entrant[], saturday: Record<string, number>, sunday: Record<string, number>): Bracket | null {
  const seeds = [...entrants].sort((x, y) => y.score - x.score).slice(0, 8);
  if (seeds.length < 2) return null;
  const at = (i: number): Entrant | null => seeds[i] ?? null;
  const pairs: [number, number][] = [[0, 7], [3, 4], [1, 6], [2, 5]];
  const quarters = pairs.map(([i, j]) => play('quarter', at(i), at(j), saturday));
  const higher = (m: Match, n: Match): [Entrant | null, Entrant | null] => {
    const x = m.winner, y = n.winner;
    if (!x || !y) return [x, y];
    return seeds.indexOf(x) <= seeds.indexOf(y) ? [x, y] : [y, x];
  };
  const semis = [higher(quarters[0], quarters[1]), higher(quarters[2], quarters[3])].map(([x, y]) => play('semi', x, y, sunday));
  const [fa, fb] = higher(semis[0], semis[1]);
  const weekly: Record<string, number> = Object.fromEntries(seeds.map((e) => [e.id, e.score]));
  const final = play('final', fa, fb, weekly);
  return { quarters, semis, final, champion: final.winner };
}

/** The Saturday and Sunday (UTC days, YYYY-MM-DD) that belong to an ISO week key like 2026-W40. */
export function weekendOf(week: string): { saturday: string; sunday: string } {
  const [y, w] = week.split('-W').map(Number);
  const jan4 = new Date(Date.UTC(y, 0, 4));
  const monday = Date.UTC(y, 0, 4) - ((jan4.getUTCDay() || 7) - 1) * 86_400_000 + (w - 1) * 7 * 86_400_000;
  const day = (n: number) => new Date(monday + n * 86_400_000).toISOString().slice(0, 10);
  return { saturday: day(5), sunday: day(6) };
}
