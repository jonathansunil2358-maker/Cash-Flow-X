import { formatGBP } from '../money';
import { plSummary } from '../ledger/statements';
import { overdraftLimit } from './loans';
import { headcount, monthLabel, monthOfYear, type GameState } from './state';
import type { Profile } from './prestige';

/** Plain words for the actions a player takes (also used to show friends' suggestions). */
export function actionText(a: unknown): string {
  const x = (a ?? {}) as Record<string, unknown>;
  switch (x.type) {
    case 'hire': return `Hired ${x.count} × ${x.role}`;
    case 'fire': return `Let go ${x.count} × ${x.role}`;
    case 'setPrice': return `Set the price to ${formatGBP(Number(x.price))}`;
    case 'setMarketing': return `Set marketing to ${formatGBP(Number(x.amount), { compact: true })} a month`;
    case 'startPromo': return `Started a ${x.discountPct}% promotion`;
    case 'setPay': return `Set pay to ${x.level}`;
    case 'startProject': return 'Started an R&D project';
    case 'invest': return 'Invested spare cash';
    case 'borrow': return 'Took out a loan';
    case 'raiseEquity': return 'Raised money from investors';
    case 'resolveEvent': return 'Made a decision on an event';
    case 'buyBuilding': return 'Bought the headquarters';
    case 'openMarket': return `Opened the ${x.market} market`;
    case 'setSupplier': return `Switched to the ${x.supplier} supplier`;
    case 'setDesign': return `Redesigned the product (${x.features} features)`;
    case 'hireStar': return 'Hired a star from the market';
    case 'addFranchise': return 'Opened a franchise';
    case 'startVenture': return 'Backed a side venture';
    case 'replyReview': return 'Replied to a customer review';
    case 'listCompany': return 'Listed on the stock market';
    default: return String(x.type ?? 'An action').replace(/([A-Z])/g, ' $1').toLowerCase().replace(/^./, (c) => c.toUpperCase());
  }
}

// ---------------------------------------------------------------------------------------------
// Replay theatre: scrub through your company's history
// ---------------------------------------------------------------------------------------------
export interface Frame { month: number; label: string; revenue: number; profit: number; cash: number; customers: number; headcount: number; value: number; actions: string[]; news: string[] }
export function theatreMonths(s: GameState): number[] { return s.history.map((h) => h.month); }
export function theatreAt(s: GameState, month: number): Frame | null {
  const rec = s.history.find((h) => h.month === month);
  if (!rec) return null;
  const pl = plSummary(rec.period.pl);
  const actions = (s.actionLog as { month: number; action: unknown }[]).filter((a) => a.month === month).map((a) => actionText(a.action));
  const news = s.log.filter((l) => l.month === month && (l.kind === 'event' || l.kind === 'milestone' || l.kind === 'warning')).map((l) => l.title);
  return { month, label: monthLabel(month), revenue: pl.revenue, profit: pl.profit, cash: rec.closing.cash, customers: rec.kpis.customers || rec.kpis.unitsSold, headcount: rec.kpis.headcount, value: rec.valuation?.equityValue ?? 0, actions, news };
}

// ---------------------------------------------------------------------------------------------
// Penny, the friendly guide
// ---------------------------------------------------------------------------------------------
export interface Tip { id: string; text: string }
/** The next useful thing to say, or null. Each tip is said once (the ids you have heard are kept in your profile). */
export function nextTip(s: GameState, seen: readonly string[]): Tip | null {
  if (s.status !== 'playing') return null;
  const last = s.history.at(-1);
  const pl = last ? plSummary(last.period.pl) : null;
  const cash = s.ledger.balances.cash;
  const heard = new Set(seen);
  const tips: (Tip & { when: boolean })[] = [
    { id: 'welcome', text: 'Hello! I am Penny. I will pop up now and then with a tip. Tap me to hide me.', when: s.month >= 0 },
    { id: 'first-month', text: 'Your first month is done. Open Missions to see your goals and earn gems.', when: s.month >= 1 },
    { id: 'overdraft', text: `You are in your overdraft (${formatGBP(cash, { compact: true })}). That is expensive money. Collect cash, cut costs or raise funds.`, when: cash < 0 && overdraftLimit(s) > 0 },
    { id: 'no-marketing', text: 'You are spending nothing on marketing, so few people know you exist. A little goes a long way.', when: s.month >= 2 && s.marketingBudget === 0 },
    { id: 'losing', text: 'You lost money last month. Check Books, Statements to see which cost is biggest.', when: !!pl && pl.profit < 0 && s.month >= 3 },
    { id: 'first-profit', text: 'Your first profitable month! Keep an eye on cash too: profit and cash are not the same thing.', when: !!pl && pl.profit > 0 && s.month <= 12 },
    { id: 'hire', text: 'Your team looks busy. If customers are being turned away, hiring operations staff adds capacity.', when: !!last && last.kpis.utilisation > 1 && headcount(s) < 40 },
    { id: 'idle-cash', text: 'You are holding a lot of cash. The Treasury card in Finance can earn interest on it.', when: !!pl && cash > Math.max(1, pl.revenue) * 6 && s.month >= 6 },
    { id: 'board', text: 'The board sets a profit target every quarter. Beat it for a reputation boost.', when: s.board !== undefined && s.month >= 3 },
    { id: 'year-end', text: 'A new year! Check the year in review, and remember wages and rent have risen.', when: s.month > 0 && s.month % 12 === 0 },
    { id: 'season', text: `It is ${monthLabel(s.month)}. Some sectors have busy and quiet seasons: check the Promotions card.`, when: monthOfYear(s.month) === 10 },
  ];
  return tips.find((t) => t.when && !heard.has(t.id)) ?? null;
}
export const tipsHeard = (p: Pick<Profile, 'tips'>): string[] => p.tips ?? [];
export const hearTip = <T extends Pick<Profile, 'tips'>>(p: T, id: string): T => ((p.tips ?? []).includes(id) ? p : { ...p, tips: [...(p.tips ?? []), id].slice(-40) });

// ---------------------------------------------------------------------------------------------
// Seasonal island look
// ---------------------------------------------------------------------------------------------
export type Look = 'spring' | 'summer' | 'autumn' | 'winter';
export const lookOf = (month: number): Look => { const m = monthOfYear(month); return m >= 2 && m <= 4 ? 'spring' : m >= 5 && m <= 7 ? 'summer' : m >= 8 && m <= 10 ? 'autumn' : 'winter'; };
export const LOOK_LEAF: Record<Look, string> = { spring: '#f4a6c8', summer: '#4caf50', autumn: '#e8892a', winter: '#e8f1f5' };
