import type { Action } from '../actions';
import { formatGBP } from '../money';
import { plSummary } from '../ledger/statements';
import { industryOf } from './industries';
import { overdraftLimit } from './loans';
import { riskOf } from './risk';
import type { GameState } from './state';

/**
 * Three advisors who each look at the company through their own lens and sometimes disagree. Every
 * recommendation is a real action you can take with one tap, or ignore. Pure rules, no randomness.
 */
export type AdvisorRole = 'cfo' | 'marketing' | 'operations';
export interface Advice {
  role: AdvisorRole;
  name: string;
  headline: string;
  reason: string;
  /** The move they suggest, if there is one. */
  action?: Action;
  actionLabel?: string;
  /** Another advisor's headline that pulls the other way. */
  disagreesWith?: AdvisorRole;
}

export const ADVISOR_NAMES: Record<AdvisorRole, string> = { cfo: 'Priya, your CFO', marketing: 'Marcus, head of marketing', operations: 'Olu, head of operations' };

export function advisors(s: GameState): Advice[] {
  const ind = industryOf(s);
  const last = s.history.at(-1);
  if (!last || s.status !== 'playing') return [];
  const pl = plSummary(last.period.pl);
  const k = last.kpis;
  const cash = s.ledger.balances.cash;
  const risk = riskOf(s);
  const monthlyCosts = Math.max(1, pl.opex + pl.cogs);
  const advice: Advice[] = [];

  // The CFO worries about cash.
  let cfo: Advice;
  if (cash < 0 && overdraftLimit(s) > 0 && -cash > overdraftLimit(s) * 0.5) {
    cfo = { role: 'cfo', name: ADVISOR_NAMES.cfo, headline: 'Cut marketing and protect cash', reason: `You are well into your overdraft (${formatGBP(cash, { compact: true })}). Every pound counts until profit returns.`,
      action: { type: 'setMarketing', amount: Math.round(s.marketingBudget / 2 / 100) * 100 }, actionLabel: 'Halve marketing' };
  } else if (risk.score >= 40) {
    cfo = { role: 'cfo', name: ADVISOR_NAMES.cfo, headline: 'Hold back on spending', reason: `The risk gauge reads ${risk.score}. ${risk.factors[0]?.detail ?? ''}`, action: { type: 'setMarketing', amount: Math.round((s.marketingBudget * 0.7) / 100) * 100 }, actionLabel: 'Trim marketing 30%' };
  } else if (cash > monthlyCosts * 8 && s.deposit < cash * 0.2) {
    const amount = Math.round((cash * 0.25) / 10_000) * 10_000;
    cfo = { role: 'cfo', name: ADVISOR_NAMES.cfo, headline: 'Put idle cash to work', reason: `You hold more than eight months of costs. Part of it could earn interest.`, action: { type: 'invest', product: 'deposit', amount }, actionLabel: `Deposit ${formatGBP(amount, { compact: true })}` };
  } else {
    cfo = { role: 'cfo', name: ADVISOR_NAMES.cfo, headline: 'Cash looks comfortable', reason: 'Nothing to change on the money side this month.' };
  }
  advice.push(cfo);

  // Marketing wants growth.
  let mk: Advice;
  if (k.utilisation < 0.75 && s.marketingBudget < Math.max(500_00, pl.revenue * 0.1)) {
    const amount = Math.round(Math.max(s.marketingBudget * 1.4, 500_00) / 100) * 100;
    mk = { role: 'marketing', name: ADVISOR_NAMES.marketing, headline: 'Spend more on marketing', reason: `You are only ${Math.round(k.utilisation * 100)}% full, so extra customers are cheap to serve.`, action: { type: 'setMarketing', amount }, actionLabel: `Set ${formatGBP(amount, { compact: true })} a month` };
  } else if (k.utilisation >= 0.95) {
    mk = { role: 'marketing', name: ADVISOR_NAMES.marketing, headline: 'Raise your prices', reason: 'You are full: a small price rise earns more from the same customers.', action: { type: 'setPrice', price: Math.round((s.price * 1.05) / 100) * 100 }, actionLabel: 'Raise price 5%' };
  } else {
    mk = { role: 'marketing', name: ADVISOR_NAMES.marketing, headline: 'Keep the brand warm', reason: 'Your marketing is in proportion to your size.' };
  }
  advice.push(mk);

  // Operations wants capacity.
  let op: Advice;
  if (k.utilisation >= 0.95 && k.lostSales > Math.max(5, k.demand * 0.05)) {
    op = { role: 'operations', name: ADVISOR_NAMES.operations, headline: `Hire more ${ind.roles.ops.title.toLowerCase()}`, reason: `You turned away ${k.lostSales.toLocaleString('en-GB')} ${ind.unitPlural} last month.`, action: { type: 'hire', role: 'ops', count: 1 }, actionLabel: 'Hire one' };
  } else if (s.morale < 50) {
    op = { role: 'operations', name: ADVISOR_NAMES.operations, headline: 'Look after the team', reason: `Morale is ${Math.round(s.morale)}. People are slower and more likely to leave.`, action: { type: 'setPay', level: 'above' }, actionLabel: 'Pay above market' };
  } else if (k.utilisation < 0.5 && s.staff.ops > 2) {
    op = { role: 'operations', name: ADVISOR_NAMES.operations, headline: 'You may have too much capacity', reason: `Only ${Math.round(k.utilisation * 100)}% is being used.`, action: { type: 'fire', role: 'ops', count: 1 }, actionLabel: 'Let one go' };
  } else {
    op = { role: 'operations', name: ADVISOR_NAMES.operations, headline: 'Operations are steady', reason: 'Capacity and team look about right.' };
  }
  advice.push(op);

  // Where they pull in opposite directions, say so.
  const cuts = cfo.action?.type === 'setMarketing' && cfo.action.amount < s.marketingBudget;
  const grows = mk.action?.type === 'setMarketing' && mk.action.amount > s.marketingBudget;
  if (cuts && grows) { cfo.disagreesWith = 'marketing'; mk.disagreesWith = 'cfo'; }
  if (cfo.action?.type === 'invest' && op.action?.type === 'hire') { cfo.disagreesWith = 'operations'; op.disagreesWith = 'cfo'; }
  return advice;
}
