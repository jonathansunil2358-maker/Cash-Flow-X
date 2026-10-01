import { hashSeed } from '../rng';
import { formatGBP, type Pence } from '../money';

/** A tiny deterministic generator, so the same day gives the same puzzle to everyone. */
function generator(seed: string): () => number {
  let a = hashSeed(seed) || 1;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pickFrom = <T,>(r: () => number, list: readonly T[]): T => list[Math.floor(r() * list.length)];
function shuffle<T>(r: () => number, list: readonly T[]): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Spot the mistake: a trial balance that does not add up.
// ---------------------------------------------------------------------------------------------
export interface PuzzleLine { id: string; name: string; debit: Pence; credit: Pence }
export interface SpotPuzzle {
  day: string;
  kind: 'wrongSide' | 'transposed';
  title: string;
  intro: string;
  lines: PuzzleLine[];
  debitTotal: Pence;
  creditTotal: Pence;
  options: { id: string; name: string }[];
  answer: string;
  explain: string;
}

const DEBITS = ['Cash at bank', 'Trade receivables', 'Inventory', 'Equipment', 'Cost of sales', 'Wages', 'Rent', 'Marketing'];
const CREDITS = ['Trade payables', 'Bank loan', 'Share capital', 'Revenue', 'Accruals'];

export function spotTheMistake(day: string): SpotPuzzle {
  for (let attempt = 0; attempt < 200; attempt++) {
    const p = tryPuzzle(day, attempt);
    if (p) return p;
  }
  throw new Error('Could not build a puzzle');
}

function tryPuzzle(day: string, attempt: number): SpotPuzzle | null {
  const r = generator(`spot|${day}|${attempt}`);
  const kind: SpotPuzzle['kind'] = r() < 0.5 ? 'wrongSide' : 'transposed';
  // Amounts are "ab00" pounds with different digits, and all different, so each answer is unique.
  const used = new Set<number>();
  const digits = new Map<number, [number, number]>();
  const amount = (): number => {
    for (let k = 0; k < 200; k++) {
      const a = 1 + Math.floor(r() * 9);
      const b = 1 + Math.floor(r() * 9);
      const v = (a * 10 + b) * 100;
      if (a !== b && !used.has(v) && !used.has((b * 10 + a) * 100)) { used.add(v); digits.set(v, [a, b]); return v; }
    }
    return 0;
  };
  const debitNames = shuffle(r, DEBITS).slice(0, 4);
  const creditNames = shuffle(r, CREDITS).slice(0, 3);
  const lines: PuzzleLine[] = [];
  let debits = 0;
  let credits = 0;
  for (const name of debitNames) { const v = amount(); if (!v) return null; debits += v; lines.push({ id: name, name, debit: v * 100, credit: 0 }); }
  for (const name of creditNames.slice(0, 2)) { const v = amount(); if (!v) return null; credits += v; lines.push({ id: name, name, debit: 0, credit: v * 100 }); }
  const balancing = debits - credits;
  if (balancing <= 0 || used.has(balancing)) return null;
  const balName = creditNames[2];
  lines.push({ id: balName, name: balName, debit: 0, credit: balancing * 100 });

  const culprit = pickFrom(r, lines.filter((l) => l.id !== balName));
  const pounds = (culprit.debit || culprit.credit) / 100;
  const side = culprit.debit > 0 ? 'debit' : 'credit';
  let explain: string;
  if (kind === 'wrongSide') {
    if (side === 'debit') { culprit.credit = culprit.debit; culprit.debit = 0; } else { culprit.debit = culprit.credit; culprit.credit = 0; }
    explain = `One account was put on the wrong side. That makes the two totals differ by exactly double its amount: half the gap is ${formatGBP(pounds * 100)}, which is ${culprit.name}. It belongs on the ${side} side.`;
  } else {
    const [a, b] = digits.get(pounds)!;
    const wrong = (b * 10 + a) * 100;
    if (side === 'debit') culprit.debit = wrong * 100; else culprit.credit = wrong * 100;
    explain = `Two digits were swapped when ${culprit.name} was typed in: ${formatGBP(pounds * 100)} became ${formatGBP(wrong * 100)}. A gap that divides exactly by 9 is the classic sign of a transposition.`;
  }
  const debitTotal = lines.reduce((x, l) => x + l.debit, 0);
  const creditTotal = lines.reduce((x, l) => x + l.credit, 0);
  if (debitTotal === creditTotal) return null;
  const decoys = shuffle(r, lines.filter((l) => l.id !== culprit.id)).slice(0, 3);
  const options = shuffle(r, [culprit, ...decoys]).map((l) => ({ id: l.id, name: l.name }));
  return {
    day, kind,
    title: 'Spot the mistake',
    intro: kind === 'wrongSide'
      ? 'The accountant says the trial balance does not balance. One account is on the wrong side. Which one?'
      : 'The trial balance does not balance, and the gap divides exactly by 9. Which account was typed in wrongly?',
    lines, debitTotal, creditTotal, options, answer: culprit.id, explain,
  };
}
