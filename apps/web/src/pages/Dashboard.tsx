import {
  financialHealth, formatGBP, formatInt, formatPct, monthLabel, overdraftLimit, plSummary, prestigeCheck, scenarioOf, DIFFICULTIES,
  type GameState,
} from '@cfx/engine';
import { useMemo } from 'react';
import { CashChart, PerformanceChart, type CashPoint } from '../components/charts';
import { Card, Meter, Stat, StatusPill } from '../components/ui';
import { ReputationTier } from './Progress';
import { useDerived } from '../lib/derived';
import { useGame, type BooksTab, type Sheet } from '../store';

/** Map the old page names onto dock panels and Books tabs. */
function useNavigate() {
  const openSheet = useGame((s) => s.openSheet);
  return (target: 'operations' | 'forecast' | 'market' | 'finance') => {
    const map: Record<string, [Sheet, BooksTab?]> = { operations: ['team'], forecast: ['books', 'forecast'], market: ['books', 'market'], finance: ['finance'] };
    const [sheet, tab] = map[target];
    openSheet(sheet, tab);
  };
}

export function Dashboard({ game }: { game: GameState }) {
  const d = useDerived(game);
  const setView = useNavigate();
  const health = useMemo(() => financialHealth(game), [game]);
  const scenario = scenarioOf(game.scenarioId);
  const objectives = scenario.objectives?.(game);
  const od = overdraftLimit(game);
  const cash = game.ledger.balances.cash;
  const subscription = d.ind.model === 'subscription';

  const cashData = useMemo<CashPoint[]>(() => {
    const pts: CashPoint[] = game.history.slice(-36).map((r) => ({ label: monthLabel(r.month), cash: r.closing.cash, floor: -r.kpis.overdraftLimit }));
    if (pts.length) pts[pts.length - 1].forecast = pts[pts.length - 1].cash;
    else pts.push({ label: 'Start', cash, forecast: cash, floor: -od });
    for (const p of d.forecast?.points ?? []) pts.push({ label: p.label, forecast: p.cash, floor: -p.overdraftLimit });
    return pts;
  }, [game, d.forecast, cash, od]);

  const perfData = useMemo(
    () => game.history.slice(-24).map((r) => {
      const p = plSummary(r.period.pl);
      return { label: monthLabel(r.month), revenue: p.revenue, ebitda: p.ebitda };
    }),
    [game],
  );

  const recentLog = game.log.filter((l) => l.month >= game.month - 2 && l.kind !== 'action').slice(-8).reverse();
  const k = d.last?.kpis;
  const delta = (cur?: number, prev?: number) => (cur === undefined || prev === undefined || prev === 0 ? undefined : (cur - prev) / Math.abs(prev));
  const revDelta = delta(d.lastPL?.revenue, d.prevPL?.revenue);
  const prestige = prestigeCheck(game);
  const canPrestige = DIFFICULTIES[game.difficulty].canPrestige;
  const progress = Math.min(1, prestige.stake / prestige.threshold);

  return (
    <div className="space-y-5">
      {game.month === 0 && (
        <Card title="Welcome, founder" subtitle="Nothing has happened yet: make your first decisions, then close the month.">
          <ol className="list-decimal space-y-1 pl-5 text-sm text-ink-2">
            <li><button className="text-accent underline" onClick={() => setView('operations')}>Operations</button>: hire your first team and set a marketing budget. Without marketing only a few customers find you.</li>
            <li><button className="text-accent underline" onClick={() => setView('forecast')}>Forecast</button>: see what those decisions do to cash over the next 12 months.</li>
            <li>Time runs by itself: a month passes every 10 seconds at x1, and the engine posts every transaction into real accounts. Pause with <strong>II</strong> whenever you need to think.</li>
          </ol>
        </Card>
      )}

      <Alerts game={game} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Stat label="Cash" value={formatGBP(cash)} sub={`Overdraft limit ${formatGBP(od, { compact: true })}`} tone={cash < 0 ? 'bad' : 'neutral'}
          help="Bank balance. You can go overdrawn up to the facility limit (50% of receivables + 25% of inventory + £10k). Beyond it the company is insolvent." />
        <Stat label="Revenue (last month)" value={formatGBP(d.lastPL?.revenue ?? 0, { compact: true })}
          sub={revDelta === undefined ? 'No history yet' : `${revDelta >= 0 ? '▲' : '▼'} ${formatPct(Math.abs(revDelta))} vs prior month`} tone={revDelta === undefined ? 'neutral' : revDelta >= 0 ? 'good' : 'bad'} />
        <Stat label="EBITDA (last month)" value={formatGBP(d.lastPL?.ebitda ?? 0, { compact: true })}
          sub={d.lastPL && d.lastPL.revenue ? `${formatPct(d.lastPL.ebitda / d.lastPL.revenue)} margin` : '—'} tone={(d.lastPL?.ebitda ?? 0) >= 0 ? 'good' : 'bad'} />
        <Stat label="Net profit (last month)" value={formatGBP(d.lastPL?.profit ?? 0, { compact: true })} sub="After depreciation, interest and tax" tone={(d.lastPL?.profit ?? 0) >= 0 ? 'good' : 'bad'} />
        <Stat label={subscription ? `${d.ind.unitPlural[0].toUpperCase()}${d.ind.unitPlural.slice(1)}` : `${d.ind.unitPlural[0].toUpperCase()}${d.ind.unitPlural.slice(1)} sold`}
          value={formatInt(subscription ? k?.customers ?? 0 : k?.unitsSold ?? 0)}
          sub={k ? (subscription ? `+${formatInt(k.newCustomers)} new, −${formatInt(k.churned)} lost` : `${formatInt(k.lostSales)} lost to capacity/stock`) : '—'} />
        <Stat label="Capacity used" value={k ? formatPct(k.utilisation, 0) : '—'} sub={`${k?.headcount ?? 0} staff`} tone={k && k.utilisation > 1 ? 'bad' : 'neutral'}
          help="Demand you can serve with current operations staff. Over 100% means lost sales and, for subscriptions, extra churn." />
        <Stat label="Equity value" value={formatGBP(d.valuation.equityValue, { compact: true })} sub={canPrestige ? `${formatPct(progress, 0)} of the way to prestige` : 'Hard mode: no prestige'}
          help={`${d.valuation.method}. See the Valuation tab for the workings.`} />
        <Stat label="Reputation" value={<span>{Math.round(game.reputation)}</span>} sub={<ReputationTier game={game} />} help="Reputation nudges demand by up to 10%. Event decisions move it." />
        <Stat label="Financial health" value={<span>{health.grade}</span>} sub={`${Math.round(health.score * 100)}/100`} tone={health.score >= 0.6 ? 'good' : health.score < 0.35 ? 'bad' : 'neutral'}
          help="Liquidity, leverage, return on capital and cash cover. It multiplies your final score." />
      </div>

      <Card
        title={canPrestige ? `Progress to prestige (${formatGBP(prestige.threshold, { compact: true })} stake)` : 'Your stake'}
        subtitle={prestige.eligible ? `Ready! Prestiging now earns ${prestige.points} Legacy points. See the Legacy tab.` : `Your stake is worth ${formatGBP(prestige.stake, { compact: true })}.`}
      >
        <Meter value={progress} label="Progress to prestige" />
      </Card>

      {objectives && (
        <Card title="Case study objectives">
          <ul className="space-y-2">
            {objectives.map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 text-sm">
                <span className="text-ink">{o.text}</span>
                <span className="flex items-center gap-2 text-ink-2"><span className="tnum">{o.detail}</span><StatusPill kind={o.met ? 'good' : 'na'} label={o.met ? 'Met' : 'Not yet'} /></span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Cash" subtitle={d.forecast?.insolventInMonths ? `Warning: on current plans you breach your overdraft in ${d.forecast.insolventInMonths} month(s).` : 'Actual balance, then a 12-month forecast if nothing changes.'}>
          <CashChart data={cashData} />
        </Card>
        <Card title="Revenue and EBITDA" subtitle="Monthly, last 24 months">
          {perfData.length ? <PerformanceChart data={perfData} /> : <Empty />}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[2fr_1fr]">
        <Card title="News & alerts" actions={<button className="text-sm text-accent" onClick={() => setView('market')}>Full log →</button>}>
          {recentLog.length === 0 ? <p className="text-sm text-ink-2">No news yet.</p> : (
            <ul className="space-y-3">
              {recentLog.map((l, i) => (
                <li key={i} className="flex gap-3 text-sm">
                  <StatusPill kind={l.kind === 'warning' ? 'bad' : l.kind === 'milestone' ? 'good' : l.kind === 'event' ? 'warn' : 'ok'} label={l.kind} />
                  <div>
                    <div className="font-medium text-ink">{l.title} <span className="text-xs font-normal text-muted">· {monthLabel(l.month)}</span></div>
                    <div className="text-ink-2">{l.text}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Health check">
          <ul className="space-y-2.5">
            {health.components.map((c) => (
              <li key={c.label} className="text-sm">
                <div className="mb-1 flex justify-between gap-2"><span className="text-ink-2">{c.label}</span><span className="tnum font-medium">{c.value}</span></div>
                <Meter value={c.score} label={c.label} />
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}

function Empty() {
  return <p className="py-10 text-center text-sm text-ink-2">Close your first month to see results.</p>;
}

export function Alerts({ game }: { game: GameState }) {
  const d = useDerived(game);
  const setView = useNavigate();
  const alerts: { text: string; action?: [string, () => void] }[] = [];
  if (d.forecast?.insolventInMonths) {
    alerts.push({ text: `Cash forecast: you run out of funding in ${d.forecast.insolventInMonths} month(s) on current plans. Lowest point ${formatGBP(d.forecast.minCash)} in ${d.forecast.minCashMonth}.`, action: ['Open forecast', () => setView('forecast')] });
  }
  const breached = game.loans.filter((l) => l.consecutiveBreaches > 0);
  if (breached.length) alerts.push({ text: `${breached.length} loan(s) in covenant breach. Fix leverage before the next quarter end or the bank will recall.`, action: ['Finance', () => setView('finance')] });
  if (!d.balanced) alerts.push({ text: `Integrity check failed: ${game.integrityErrors[0] ?? 'balance sheet difference'}. This is an engine bug; please report it.` });
  if (!alerts.length) return null;
  return (
    <div className="space-y-2" role="alert">
      {alerts.map((a, i) => (
        <div key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-critical/50 bg-critical/5 px-4 py-3 text-sm">
          <span className="flex items-start gap-2 text-ink"><span className="text-critical-text" aria-hidden>✕</span>{a.text}</span>
          {a.action && <button className="font-medium text-accent" onClick={a.action[1]}>{a.action[0]} →</button>}
        </div>
      ))}
    </div>
  );
}
