import {
  applyActionInPlace, formatGBP, INDUSTRIES, planSlotsOf, monthLabel, newGame, plansOf, plSummary, tickInPlace, type Action, type GameState,
} from '@cfx/engine';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Meter, StatusPill } from '../components/ui';
import { useAccount } from '../lib/account';
import { CardsCard, CoopCard, GuildRivalCard, SeasonBanner } from './Together';
import { api, type LeagueView, type CommunityView, type ReplayData, type RivalView, type SharedPlan, type TournamentMatch, type TournamentView } from '../lib/api';
import { CURRENCY_ICONS, iconUrl } from '../lib/icons';
import { useGame } from '../store';

// ---------------------------------------------------------------------------------------------
// Replay player: re-runs the winner's decisions in the real engine, month by month
// ---------------------------------------------------------------------------------------------

interface Frame {
  month: number;
  label: string;
  revenue: number;
  cash: number;
  decisions: string[];
}

const describe = (a: Action): string => {
  switch (a.type) {
    case 'hire': return `Hired ${a.count} (${a.role})`;
    case 'fire': return `Let ${a.count} go (${a.role})`;
    case 'setPrice': return `Set price to ${formatGBP(a.price, { pence: true })}`;
    case 'setMarketing': return `Marketing ${formatGBP(a.amount, { compact: true })} a month`;
    case 'buyUpgrade': return `Bought upgrade ${a.upgradeId}`;
    case 'takeLoan': return `Took a ${formatGBP(a.amount, { compact: true })} loan`;
    case 'startPromo': return `Promotion: ${a.discountPct}% off`;
    case 'startProject': return `Started R&D: ${a.projectId}`;
    case 'resolveEvent': return 'Answered a decision';
    case 'openSite': return 'Opened a new site';
    case 'setPay': return `Pay: ${a.level}`;
    default: return a.type.replace(/([A-Z])/g, ' $1').toLowerCase();
  }
};

/** Run a saved game's actions through the engine, collecting one frame per month. */
export function framesOf(data: ReplayData): Frame[] {
  const g: GameState = newGame({ companyName: data.game.companyName, industryId: data.game.industryId, seed: data.game.seed, scenarioId: data.game.scenarioId, difficulty: 'medium', equipmentFinance: 'buy' });
  const frames: Frame[] = [];
  let i = 0;
  while (g.status === 'playing' && g.month < data.months) {
    const decisions: string[] = [];
    while (i < data.actions.length && data.actions[i].month === g.month) {
      try { applyActionInPlace(g, data.actions[i].action); decisions.push(describe(data.actions[i].action)); } catch { /* an action that no longer applies is skipped */ }
      i++;
    }
    tickInPlace(g, { fast: true });
    const r = g.history.at(-1);
    if (r) frames.push({ month: r.month, label: monthLabel(r.month), revenue: plSummary(r.period.pl).revenue, cash: r.closing.cash, decisions });
  }
  return frames;
}

export function ReplayPlayer({ kind, keyId, rank = 1, onClose }: { kind: 'daily' | 'weekly' | 'challenge'; keyId: string; rank?: number; onClose: () => void }) {
  const [data, setData] = useState<ReplayData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [at, setAt] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [fast, setFast] = useState(false);
  useEffect(() => {
    let live = true;
    api.replay(kind, keyId, rank).then((d) => live && setData(d)).catch((e: Error) => live && setError(e.message));
    return () => { live = false; };
  }, [kind, keyId, rank]);
  const frames = useMemo(() => (data ? framesOf(data) : []), [data]);
  const timer = useRef<number | null>(null);
  useEffect(() => {
    if (!playing || !frames.length) return;
    timer.current = window.setInterval(() => setAt((a) => (a >= frames.length - 1 ? a : a + 1)), fast ? 150 : 600);
    return () => { if (timer.current) window.clearInterval(timer.current); };
  }, [playing, fast, frames.length]);
  const f = frames[Math.min(at, frames.length - 1)];
  const maxRev = Math.max(1, ...frames.map((x) => x.revenue));
  const cashs = frames.map((x) => x.cash);
  const lo = Math.min(0, ...cashs), hi = Math.max(1, ...cashs);
  const pts = (get: (x: Frame) => number, min: number, max: number) => frames.slice(0, at + 1).map((x, i) => `${(i / Math.max(1, frames.length - 1)) * 100},${28 - ((get(x) - min) / Math.max(1, max - min)) * 26}`).join(' ');
  return (
    <div className="fixed inset-0 z-[57] grid place-items-center bg-[#13324d]/70 p-3" role="dialog" aria-modal="true" aria-label="Replay">
      <div className="cfx-panel w-full max-w-[560px] !p-3.5">
        <div className="font-display text-xl">Replay: #{rank} {data ? data.name : ''}</div>
        {error && <p role="alert" className="mt-2 text-sm font-bold text-critical-text">{error}</p>}
        {!data && !error && <p className="mt-2 text-sm">Loading the replay…</p>}
        {data && f && (
          <>
            <p className="text-xs text-ink-2">{data.game.companyName} · {INDUSTRIES[data.game.industryId].name} · final stake {formatGBP(data.score, { compact: true })}</p>
            <div className="mt-2 flex items-center justify-between text-sm font-bold"><span>{f.label} (month {at + 1} of {frames.length})</span><span className="tnum">Cash {formatGBP(f.cash, { compact: true })}</span></div>
            <svg viewBox="0 0 100 30" className="mt-1 h-24 w-full" role="img" aria-label="Revenue and cash over time">
              <polyline fill="none" stroke="var(--go)" strokeWidth="1.2" points={pts((x) => x.revenue, 0, maxRev)} />
              <polyline fill="none" stroke="var(--primary)" strokeWidth="1.2" points={pts((x) => x.cash, lo, hi)} />
            </svg>
            <div className="text-[11px] text-ink-2"><span className="text-[var(--go)]">━</span> revenue · <span className="text-[var(--primary)]">━</span> cash</div>
            <ul className="mt-2 max-h-24 space-y-0.5 overflow-auto text-xs" aria-label="Decisions this month">
              {f.decisions.length === 0 ? <li className="text-ink-2">No decisions this month.</li> : f.decisions.map((d, i) => <li key={i}>▸ {d}</li>)}
            </ul>
            <input type="range" min={0} max={frames.length - 1} value={at} onChange={(e) => { setPlaying(false); setAt(Number(e.target.value)); }} aria-label="Replay position" className="mt-2 w-full accent-[var(--primary)]" />
          </>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <Button variant="primary" disabled={!frames.length} onClick={() => { if (at >= frames.length - 1) setAt(0); setPlaying(!playing); }}>{playing ? 'Pause' : 'Play'}</Button>
          <Button aria-pressed={fast} onClick={() => setFast(!fast)}>{fast ? 'Fast' : 'Normal'}</Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}

/** A "Watch the winner" button that opens the replay player. */
export function WatchWinner({ kind, keyId, label = 'Watch the winner' }: { kind: 'daily' | 'weekly' | 'challenge'; keyId: string; label?: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button onClick={() => setOpen(true)}>{label}</Button>
      {open && <ReplayPlayer kind={kind} keyId={keyId} onClose={() => setOpen(false)} />}
    </>
  );
}

// ---------------------------------------------------------------------------------------------
// The Community tab
// ---------------------------------------------------------------------------------------------

function CommunityGoal() {
  const [v, setV] = useState<CommunityView | null>(null);
  const { addGems: add, toast } = useGame();
  const load = () => api.community().then(setV).catch(() => setV(null));
  useEffect(() => { void load(); }, []);
  if (!v) return null;
  const claim = async () => { try { const r = await api.claimCommunity(); add(r.gems, 'community goal'); await load(); } catch (e) { toast('error', (e as Error).message); } };
  return (
    <Card id="card-community" title="Community goal" subtitle="Everyone's verified months this week add up. Reach the target and every contributor gets gems.">
      <Meter value={Math.min(v.months, v.target)} max={v.target} label="Community goal" tone={v.reached ? 'go' : 'xp'} text={`${v.months.toLocaleString('en-GB')} of ${v.target.toLocaleString('en-GB')} months`} />
      <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-ink-2">
        <span>{v.players} player{v.players === 1 ? '' : 's'} this week · week {v.week.split('-W')[1]}</span>
        {!v.contributed && <StatusPill kind="warn" label="Play a verified month to join in" />}
      </div>
      <Button className="mt-2" variant="go" disabled={!v.reached || !v.contributed || v.claimed} onClick={claim}>
        <span className="inline-flex items-center gap-1"><img src={CURRENCY_ICONS.gem} alt="" className="h-4 w-4" />{v.claimed ? 'Claimed' : v.reached ? `Claim ${v.gems} gems` : `${v.gems} gems at the goal`}</span>
      </Button>
    </Card>
  );
}

function RivalOfTheWeek() {
  const [v, setV] = useState<RivalView | null>(null);
  useEffect(() => { api.rival().then(setV).catch(() => setV(null)); }, []);
  if (!v) return null;
  return (
    <Card id="card-rival" title="Rival of the week" subtitle="Someone close to you in net worth, picked afresh every Monday. Try to finish the week ahead.">
      {!v.rival ? <p className="text-sm text-ink-2">No rival yet: more players need to be on the board.</p> : (
        <div className="space-y-2">
          <div className="flex items-center gap-3 rounded-lg border border-line p-3">
            <img src={iconUrl(v.rival.icon)} alt="" className="h-10 w-10" />
            <div className="min-w-0"><div className="font-display text-lg leading-tight">{v.rival.name}</div><div className="text-xs text-ink-2">{v.rival.company ?? 'No company right now'} · rank #{v.rival.rank}</div></div>
          </div>
          <div className="grid grid-cols-2 gap-2 text-center text-sm">
            <div className="rounded-lg border border-line p-2"><div className="text-xs text-muted">You</div><div className="tnum font-display text-xl">{formatGBP(v.you, { compact: true })}</div></div>
            <div className="rounded-lg border border-line p-2"><div className="text-xs text-muted">Rival</div><div className="tnum font-display text-xl">{formatGBP(v.rival.netWorth, { compact: true })}</div></div>
          </div>
          <StatusPill kind={v.you >= v.rival.netWorth ? 'good' : 'warn'} label={v.you >= v.rival.netWorth ? 'You are ahead' : `${formatGBP(v.rival.netWorth - v.you, { compact: true })} behind`} />
        </div>
      )}
    </Card>
  );
}

function MatchRow({ m }: { m: TournamentMatch }) {
  const side = (x: TournamentMatch['a'], score: number | null) => (
    <span className={`flex-1 truncate ${m.winner && x && m.winner.id === x.id ? 'font-black' : 'text-ink-2'}`}>{x ? x.name : 'bye'}{score !== null ? ` (${formatGBP(score, { compact: true })})` : ''}</span>
  );
  return <li className="flex items-center gap-2 rounded-lg border border-line px-2 py-1 text-xs">{side(m.a, m.aScore)}<span className="text-muted">vs</span>{side(m.b, m.bScore)}</li>;
}

function Tournament() {
  const [v, setV] = useState<TournamentView | null>(null);
  useEffect(() => { api.tournament().then(setV).catch(() => setV(null)); }, []);
  if (!v) return null;
  const b = v.bracket;
  return (
    <Card id="card-tournament" title="Weekend tournament" subtitle="The top eight of last week's event play a knockout: Saturday's daily score decides the quarter-finals, Sunday's the semis, the weekly score the final.">
      {!b ? <p className="text-sm text-ink-2">Not enough finishers last week for a bracket. Finish this week's event to be in next week's.</p> : (
        <div className="space-y-3">
          {b.champion && <p className="text-sm font-bold" role="status">🏆 Champion of week {v.week.split('-W')[1]}: {b.champion.name}</p>}
          <div><h3 className="mb-1 text-xs font-black text-ink-2">QUARTER-FINALS · {v.saturday}</h3><ul className="space-y-1">{b.quarters.map((m, i) => <MatchRow key={i} m={m} />)}</ul></div>
          <div><h3 className="mb-1 text-xs font-black text-ink-2">SEMI-FINALS · {v.sunday}</h3><ul className="space-y-1">{b.semis.map((m, i) => <MatchRow key={i} m={m} />)}</ul></div>
          <div><h3 className="mb-1 text-xs font-black text-ink-2">FINAL</h3><ul><MatchRow m={b.final} /></ul></div>
          {v.me && <StatusPill kind="good" label="You qualified" />}
        </div>
      )}
    </Card>
  );
}

function PlanMarket() {
  const { profile, savePlanAction, toast } = useGame();
  const [sort, setSort] = useState<'top' | 'new'>('top');
  const [plans, setPlans] = useState<SharedPlan[] | null>(null);
  const mine = plansOf(profile, 99);
  const load = () => api.plans(sort).then((r) => setPlans(r.plans)).catch(() => setPlans([]));
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [sort]);
  const like = async (id: string) => { try { await api.likePlan(id); await load(); } catch (e) { toast('error', (e as Error).message); } };
  const publish = async (p: (typeof mine)[number]) => { try { await api.publishPlan(p); toast('success', 'Shared with everyone.'); await load(); } catch (e) { toast('error', (e as Error).message); } };
  const remove = async (id: string) => { try { await api.deleteSharedPlan(id); await load(); } catch (e) { toast('error', (e as Error).message); } };
  return (
    <Card id="card-market" title="Plan marketplace" subtitle="Share a scenario plan, try other people's, and like the good ones. Plans only ever change your price, marketing and hiring, and only when you press Do it.">
      <div className="mb-2 flex gap-1.5" role="group" aria-label="Sort plans">
        <Button variant={sort === 'top' ? 'primary' : 'secondary'} aria-pressed={sort === 'top'} onClick={() => setSort('top')}>Top</Button>
        <Button variant={sort === 'new' ? 'primary' : 'secondary'} aria-pressed={sort === 'new'} onClick={() => setSort('new')}>New</Button>
      </div>
      {mine.length > 0 && (
        <div className="mb-3 rounded-lg border border-line p-2.5">
          <h3 className="mb-1 text-xs font-black text-ink-2">YOUR SAVED PLANS · share one</h3>
          <ul className="space-y-1">{mine.map((p) => <li key={p.id} className="flex items-center justify-between gap-2 text-sm"><span className="truncate">{p.name}</span><Button onClick={() => void publish(p)}>Share</Button></li>)}</ul>
        </div>
      )}
      {plans === null ? <p className="text-sm text-ink-2">Loading…</p> : plans.length === 0 ? <p className="text-sm text-ink-2">No plans shared yet. Save one on the Forecast tab and share it here.</p> : (
        <ul className="space-y-2">
          {plans.map((p) => (
            <li key={p.id} className="rounded-2xl border-[3px] border-outline p-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0"><div className="font-display text-base leading-tight">{p.name}</div><div className="text-xs text-ink-2">by {p.author} · price {p.price > 0 ? '+' : ''}{p.price}% · marketing {p.marketing}% · hire {p.hires}</div></div>
                <div className="flex gap-1.5">
                  <Button aria-pressed={p.liked} disabled={p.mine} onClick={() => void like(p.id)} aria-label={`Like ${p.name}`}>{p.liked ? '♥' : '♡'} {p.likes}</Button>
                  <Button disabled={mine.length >= planSlotsOf(profile)} onClick={() => savePlanAction({ name: p.name, price: p.price, marketing: p.marketing, hires: p.hires })}>Try it</Button>
                  {p.mine && <Button variant="danger" onClick={() => void remove(p.id)} aria-label={`Remove ${p.name}`}>Remove</Button>}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

/** This week's puzzle league: a point for each right answer to the daily puzzles, checked by the server. */
function PuzzleLeague() {
  const [v, setV] = useState<LeagueView | null>(null);
  useEffect(() => { api.league().then(setV).catch(() => setV(null)); }, []);
  if (!v) return null;
  return (
    <Card id="card-league" title="Puzzle league" subtitle={`Answer the daily Spot the mistake and Ratio detective puzzles in Missions. Each right answer is a point; the server checks them. Up to ${v.maxPoints} points a week. You have ${v.mine.points}.`}>
      {v.rows.length === 0 ? <p className="text-sm text-ink-2">Nobody has scored yet this week. Be the first.</p> : (
        <ol className="space-y-1 text-sm">
          {v.rows.map((r) => <li key={r.id} className={`flex justify-between rounded-lg border p-2 ${r.me ? 'border-[var(--go)]' : 'border-line'}`}><span>#{r.rank} {r.name}{r.me ? ' (you)' : ''}</span><b className="tnum">{r.points}</b></li>)}
        </ol>
      )}
    </Card>
  );
}

export function CommunityTab() {
  const signedIn = !!useAccount((s) => s.me);
  if (!signedIn) return <p className="text-sm text-ink-2">Sign in to join the community.</p>;
  return (
    <div className="space-y-4">
      <SeasonBanner />
      <CommunityGoal />
      <CoopCard />
      <GuildRivalCard />
      <CardsCard />
      <PuzzleLeague />
      <RivalOfTheWeek />
      <Tournament />
      <PlanMarket />
    </div>
  );
}
