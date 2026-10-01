import { hashSeed } from '../rng';

/**
 * Ratio detective: a handful of ratios and a short story. Which problem is the business really having?
 * Six cases, one a day, with the answers in a day-dependent order.
 */
export interface Diagnosis { id: string; name: string }
export const DIAGNOSES: Diagnosis[] = [
  { id: 'overtrading', name: 'Overtrading: growing faster than its cash' },
  { id: 'stock', name: 'Too much stock tying up cash' },
  { id: 'pricing', name: 'Prices are too low' },
  { id: 'debt', name: 'Too much borrowing' },
  { id: 'collections', name: 'Customers pay too slowly' },
  { id: 'overheads', name: 'Overheads are too heavy' },
];
export interface DetectiveCase {
  id: string;
  story: string;
  clues: { label: string; value: string; normal: string }[];
  answer: string;
  explain: string;
}
export const DETECTIVE_CASES: DetectiveCase[] = [
  {
    id: 'c1', answer: 'overtrading',
    story: 'Sales have doubled in a year and the business is profitable, yet the owner cannot pay suppliers on time.',
    clues: [{ label: 'Revenue growth', value: '+110%', normal: '+10%' }, { label: 'Net profit margin', value: '6%', normal: '6%' }, { label: 'Current ratio', value: '0.6x', normal: '1.5x' }, { label: 'Cash runway', value: '2 months', normal: '12 months' }],
    explain: 'Profit is healthy, but a current ratio of 0.6 and two months of cash show that growth is eating cash faster than profit makes it. Growing needs stock and wages paid before the money arrives. That is overtrading.',
  },
  {
    id: 'c2', answer: 'stock',
    story: 'A shop has good margins and sells steadily, but the bank balance keeps falling and the warehouse is full.',
    clues: [{ label: 'Gross margin', value: '44%', normal: '42%' }, { label: 'Inventory days', value: '210 days', normal: '75 days' }, { label: 'Receivable days', value: '3 days', normal: '3 days' }, { label: 'Net profit margin', value: '5%', normal: '5%' }],
    explain: 'Margins and collections are normal, but stock sits for 210 days instead of 75. Cash is trapped on the shelves. Order less, run promotions on slow lines, or negotiate sale-or-return.',
  },
  {
    id: 'c3', answer: 'pricing',
    story: 'A café is always full and the staff are run off their feet, but at the end of the month there is nothing left.',
    clues: [{ label: 'Gross margin', value: '14%', normal: '65%' }, { label: 'Capacity used', value: '98%', normal: '75%' }, { label: 'Inventory days', value: '6 days', normal: '6 days' }, { label: 'Net profit margin', value: '-4%', normal: '8%' }],
    explain: 'The place is full, and stock moves fast, yet the gross margin is only 14% against 65% normal. Each cup earns too little: prices are too low (or ingredients cost too much). More customers just means more loss.',
  },
  {
    id: 'c4', answer: 'debt',
    story: 'A firm makes a respectable operating profit, but almost all of it vanishes before it reaches the owners.',
    clues: [{ label: 'EBITDA margin', value: '14%', normal: '14%' }, { label: 'Gearing', value: '85%', normal: '40%' }, { label: 'Interest cover', value: '1.3x', normal: '4x' }, { label: 'Net profit margin', value: '1%', normal: '6%' }],
    explain: 'Operations are fine (EBITDA margin is normal) but gearing is 85% and interest cover is just 1.3x. The lenders take almost every pound of profit as interest. The business is over-borrowed.',
  },
  {
    id: 'c5', answer: 'collections',
    story: 'A wholesaler books lots of sales and shows a profit, but cash is short every month.',
    clues: [{ label: 'Receivable days', value: '96 days', normal: '45 days' }, { label: 'Inventory days', value: '70 days', normal: '75 days' }, { label: 'Net profit margin', value: '7%', normal: '6%' }, { label: 'Quick ratio', value: '0.5x', normal: '1.0x' }],
    explain: 'Customers take 96 days to pay instead of 45, so half of the sales are still owed. Profit exists on paper but not in the bank. Shorten credit terms, chase invoices, or offer a small discount for paying early.',
  },
  {
    id: 'c6', answer: 'overheads',
    story: 'A software firm has loyal customers and healthy prices, but it never seems to make money.',
    clues: [{ label: 'Gross margin', value: '88%', normal: '85%' }, { label: 'EBITDA margin', value: '-12%', normal: '20%' }, { label: 'Revenue per employee', value: '£38k', normal: '£120k' }, { label: 'Gearing', value: '10%', normal: '40%' }],
    explain: 'Gross margin is normal and borrowing is low, but EBITDA is negative and each employee brings in a third of the usual revenue. The costs of the team and offices are too heavy for the size of the business.',
  },
];

export interface DetectivePuzzle { day: string; case: DetectiveCase; options: Diagnosis[] }
export function detectiveOf(day: string): DetectivePuzzle {
  const h = hashSeed(`detective|${day}`);
  const c = DETECTIVE_CASES[h % DETECTIVE_CASES.length];
  // Always the right answer plus three wrong ones, in a day-dependent order.
  const wrong = DIAGNOSES.filter((d) => d.id !== c.answer);
  const picked = [...wrong].sort((x, y) => hashSeed(`${day}${x.id}`) - hashSeed(`${day}${y.id}`)).slice(0, 3);
  const right = DIAGNOSES.find((d) => d.id === c.answer)!;
  const options = [right, ...picked].sort((x, y) => hashSeed(`o${day}${x.id}`) - hashSeed(`o${day}${y.id}`));
  return { day, case: c, options };
}
