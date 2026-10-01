import {
  advisors, calendarMonthsOf, breakEven, calendarTotal, cashCalendar, cleanRules, formatGBP, formatInt, MAX_RULES, monthLabel, riskOf, RULE_INFO, type AutoRule, type GameState,
} from '@cfx/engine';
import { useState } from 'react';
import { Button, Field, Meter, MoneyInput, StatusPill } from '../components/ui';
import { useGame } from '../store';
import { Fold } from './Strategy';

const RISK_TONE = { calm: 'go', watch: 'coin', danger: 'danger', critical: 'danger' } as const;

/** One gauge for how close the company is to trouble, with the reasons. */
export function RiskCard({ game }: { game: GameState }) {
  const r = riskOf(game);
  return (
    <Fold id="card-risk" title="Risk meter" summary={`${r.label} (${r.score}/100). ${r.factors[0] ? r.factors[0].label + '.' : 'Nothing worrying.'}`}
      subtitle="One number for how close you are to trouble, built from things you can fix: cash runway, overdraft, losses, covenants and morale.">
      <div className="space-y-3">
        <Meter value={r.score} max={100} label="Risk" tone={RISK_TONE[r.level]} text={`${r.label}: ${r.score}`} />
        {r.factors.length === 0 ? <p className="text-sm text-ink-2">Nothing is pushing the risk up right now.</p> : (
          <ul className="space-y-1.5 text-sm">
            {r.factors.map((f) => <li key={f.label} className="rounded-lg border border-line p-2"><b>{f.label}</b> <span className="text-xs text-ink-2">+{f.points}</span><br /><span className="text-xs text-ink-2">{f.detail}</span></li>)}
          </ul>
        )}
      </div>
    </Fold>
  );
}

/** How many customers it takes to cover your fixed costs. */
export function BreakEvenCard({ game }: { game: GameState }) {
  const b = breakEven(game);
  return (
    <Fold id="card-breakeven" title="Break-even"
      summary={!b ? 'Available after your first month.' : b.unitsNeeded === null ? 'Each sale loses money at today\'s price.' : `${formatInt(b.unitsNeeded)} ${b.unitName} a month to cover costs (you have ${formatInt(b.current)}).`}
      subtitle="The volume you need each month so that sales cover your fixed costs: staff, rent, marketing, insurance, compliance, depreciation and interest.">
      {!b ? <p className="text-sm text-ink-2">Close a month first.</p> : (
        <div className="space-y-3 text-sm">
          <Meter value={b.unitsNeeded ? Math.min(b.current, b.unitsNeeded) : 0} max={Math.max(1, b.unitsNeeded ?? 1)} label="Progress to break-even" tone={b.covered ? 'go' : 'coin'} text={`${formatInt(b.current)} of ${b.unitsNeeded === null ? '—' : formatInt(b.unitsNeeded)}`} />
          <ul className="space-y-1 text-xs text-ink-2">
            <li>Fixed costs last month: <b>{formatGBP(b.fixedCosts, { compact: true })}</b></li>
            <li>Profit on each sale after supplies: <b>{formatGBP(b.marginPerUnit, { pence: true })}</b></li>
            <li>{b.covered ? 'You are covering your costs: every extra sale is profit.' : b.gap !== null ? `You need ${formatInt(b.gap)} more ${b.unitName} a month.` : 'Raise your price or cut unit costs: each sale loses money.'}</li>
          </ul>
        </div>
      )}
    </Fold>
  );
}

/** Three advisors with different views, one tap to follow them. */
export function AdvisorsCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const list = advisors(game);
  const playing = game.status === 'playing';
  return (
    <Fold id="card-advisors" title="Advisors" summary={list.length ? `${list.filter((a) => a.action).length} suggestion${list.filter((a) => a.action).length === 1 ? '' : 's'} this month. Open to hear them out.` : 'Your advisors start after your first month.'}
      subtitle="Your CFO, head of marketing and head of operations each look at the company in their own way, and sometimes disagree. Follow one, split the difference, or ignore them all.">
      <ul className="space-y-2">
        {list.length === 0 && <li className="text-sm text-ink-2">Close a month first.</li>}
        {list.map((a) => (
          <li key={a.role} className="rounded-2xl border-[3px] border-outline bg-surface-2 p-2.5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs font-black text-ink-2">{a.name}</span>
              {a.disagreesWith && <StatusPill kind="warn" label="Disagrees with another advisor" />}
            </div>
            <div className="font-display text-base leading-tight">{a.headline}</div>
            <div className="text-xs text-ink-2">{a.reason}</div>
            {a.action && <Button className="mt-1.5" variant="primary" disabled={!playing} onClick={() => act(a.action!, `Done: ${a.actionLabel ?? a.headline}.`)}>{a.actionLabel}</Button>}
          </li>
        ))}
      </ul>
    </Fold>
  );
}

/** Standing orders the company follows by itself. */
export function AutopilotCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const rules = game.rules ?? [];
  const has = (k: AutoRule['kind']) => rules.find((r) => r.kind === k);
  const [pct, setPct] = useState(8);
  const [floor, setFloor] = useState(5_000_00);
  const playing = game.status === 'playing';
  const apply = (next: AutoRule[], msg: string) => {
    const check = cleanRules(next);
    if (!check.ok) { useGame.getState().toast('error', check.reason ?? 'Not allowed.'); return; }
    act({ type: 'setRules', rules: next }, msg);
  };
  const remove = (k: AutoRule['kind']) => apply(rules.filter((r) => r.kind !== k), 'Rule removed.');
  return (
    <Fold id="card-autopilot" title="Autopilot" summary={rules.length ? `${rules.length} rule${rules.length === 1 ? '' : 's'} running.` : 'No rules set. Open to put the boring parts on autopilot.'}
      subtitle={`Standing orders the company follows every month (up to ${MAX_RULES}). They are the same checks as when you do it yourself, and anything you cannot afford is skipped.`}>
      <div className="space-y-3">
        {rules.length > 0 && (
          <ul className="space-y-1.5">
            {rules.map((r) => (
              <li key={r.kind} className="flex items-center justify-between gap-2 rounded-lg border border-line p-2 text-sm">
                <span><b>{RULE_INFO[r.kind].name}</b><br /><span className="text-xs text-ink-2">
                  {r.kind === 'marketingPct' ? `${r.pct}% of last month's sales` : r.kind === 'cashFloor' ? `Floor ${formatGBP(r.floor, { compact: true })}` : `Hire ${r.role === 'ops' ? 'operations' : 'sales'} staff`}</span></span>
                <Button variant="danger" disabled={!playing} onClick={() => remove(r.kind)}>Remove</Button>
              </li>
            ))}
          </ul>
        )}
        {!has('marketingPct') && (
          <Field label={RULE_INFO.marketingPct.name} hint={RULE_INFO.marketingPct.blurb}>
            <div className="flex items-center gap-2">
              <input type="range" min={0} max={30} value={pct} onChange={(e) => setPct(Number(e.target.value))} aria-label="Marketing percentage" className="w-40 accent-[var(--primary)]" />
              <span className="tnum text-sm font-bold">{pct}%</span>
              <Button disabled={!playing || rules.length >= MAX_RULES} onClick={() => apply([...rules, { kind: 'marketingPct', pct }], `Autopilot: marketing ${pct}% of sales.`)}>Add</Button>
            </div>
          </Field>
        )}
        {!has('cashFloor') && (
          <Field label={RULE_INFO.cashFloor.name} hint={RULE_INFO.cashFloor.blurb}>
            <div className="flex flex-wrap items-center gap-2">
              <div className="w-36"><MoneyInput value={floor} step={1000} onChange={setFloor} aria-label="Cash floor" /></div>
              <Button disabled={!playing || rules.length >= MAX_RULES} onClick={() => apply([...rules, { kind: 'cashFloor', floor }], 'Autopilot: cash floor set.')}>Add</Button>
            </div>
          </Field>
        )}
        {!has('hireWhenFull') && (
          <Field label={RULE_INFO.hireWhenFull.name} hint={RULE_INFO.hireWhenFull.blurb}>
            <Button disabled={!playing || rules.length >= MAX_RULES} onClick={() => apply([...rules, { kind: 'hireWhenFull', role: 'ops' }], 'Autopilot: hire when full.')}>Add</Button>
          </Field>
        )}
      </div>
    </Fold>
  );
}

/** The big payments coming up, month by month. */
export function CalendarCard({ game }: { game: GameState }) {
  const profile = useGame((st) => st.profile);
  const n = calendarMonthsOf(profile);
  const items = cashCalendar(game, n);
  const months = Array.from({ length: n }, (_, i) => game.month + i);
  return (
    <Fold id="card-calendar" title="Cash-flow calendar" summary={`Next ${n} months: ${formatGBP(months.reduce((a, m) => a + calendarTotal(items, m), 0), { compact: true })} of known payments. Open for the timeline.`}
      subtitle="The payments you can already see coming: payroll, quarterly rent, insurance, loan repayments and any tax bill. It is a plan, not a promise.">
      <ol className="space-y-2">
        {months.map((m) => {
          const rows = items.filter((i) => i.month === m);
          return (
            <li key={m} className="rounded-lg border border-line p-2.5">
              <div className="flex items-center justify-between text-sm font-bold"><span>{monthLabel(m)}{m === game.month ? ' (this month)' : ''}</span><span className="tnum">{formatGBP(calendarTotal(items, m), { compact: true })}</span></div>
              <ul className="mt-1 space-y-0.5 text-xs text-ink-2">
                {rows.map((r, i) => <li key={i} className="flex justify-between gap-2"><span>{r.label}</span><span className="tnum">{formatGBP(r.amount, { compact: true })}</span></li>)}
              </ul>
            </li>
          );
        })}
      </ol>
    </Fold>
  );
}
