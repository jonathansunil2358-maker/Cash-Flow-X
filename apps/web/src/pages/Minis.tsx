import {
  candidateValue, cheapestNetwork, forecastScore, hiringScore, interviewCandidates, nextMonthRevenue, routeGraphOf, routeScore, WAR_COST, WAR_PRICES, WAR_WEEKS, warProfit, warRival, warScore,
  AUCTION_STEPS, auctionOf, auctionScore, boardroomScore, CALL_BUDGET, callScore, callsOf, directorsOf, formatGBP, fraudScore, invoicesOf, miniOf, type MiniKind, MINI_GEMS, negOffer, negScore, negStart, negotiationOf, PITCH_PICKS, pitchMetrics, pitchPriorities, pitchScore, stockScore, stockTakeOf, stockWrong, tetrisBalances, tetrisOf,
  tetrisScore, utcDay, type GameState,
} from '@cfx/engine';
import { useMemo, useState } from 'react';
import { tickInPlace } from '@cfx/engine';
import { Button, Card } from '../components/ui';
import { useGame } from '../store';
import { Fold } from './Strategy';

const doneNote = (kind: MiniKind, profile: ReturnType<typeof useGame.getState>['profile'], day: string) => {
  const r = miniOf(profile, kind);
  return r && r.day === day ? `Today's game is done: ${r.points} points. A new one tomorrow.` : null;
};

/** Haggle with a seller who has a secret lowest price. */
export function NegotiationCard() {
  const { profile, finishMini } = useGame();
  const day = utcDay();
  const n = useMemo(() => negotiationOf(day), [day]);
  const [st, setSt] = useState(() => negStart(n));
  const done = doneNote('negotiate', profile, day);
  const offer = (pct: number) => {
    const next = negOffer(n, st, pct);
    setSt(next);
    if (next.status !== 'open') finishMini('negotiate', day, negScore(n, next));
  };
  return (
    <Fold id="card-negotiate" title="Negotiation duel" summary={done ?? 'Haggle with a seller. Open to play.'}
      subtitle={`Buy ${n.item}. The seller has a secret lowest price and a short temper: offer too little too often and they walk away. Pay less for a better score.`}>
      <ul className="space-y-1 text-sm">{st.log.map((l, i) => <li key={i}>{l}</li>)}</ul>
      {st.status === 'open' && !done ? (
        <div className="mt-3 flex flex-wrap items-center gap-2" role="group" aria-label="Your offer">
          <span className="text-xs text-ink-2">Patience: {'●'.repeat(Math.max(0, st.patience))}{'○'.repeat(Math.max(0, n.patience - st.patience))}</span>
          {[100, 90, 80, 70, 60].map((p) => <Button key={p} onClick={() => offer(p)}>Offer {p}% ({formatGBP(Math.round((st.ask * p) / 100 / 100_00) * 100_00, { compact: true })})</Button>)}
        </div>
      ) : <p role="status" className="mt-3 text-sm font-black">{st.status === 'deal' ? `You bought it for ${formatGBP(st.price!)}: ${negScore(n, st)} points.` : st.status === 'walked' ? 'The seller walked away: 0 points.' : done}</p>}
    </Fold>
  );
}

/** Choose three numbers about your company to show an investor who cares about two of them. */
export function PitchCard({ game }: { game: GameState }) {
  const { profile, finishMini } = useGame();
  const day = utcDay();
  const metrics = pitchMetrics(game);
  const wants = pitchPriorities(day);
  const [picked, setPicked] = useState<string[]>([]);
  const [result, setResult] = useState<{ points: number; notes: string[] } | null>(null);
  const done = doneNote('pitch', profile, day);
  const toggle = (id: string) => setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : p.length < PITCH_PICKS ? [...p, id] : p));
  const go = () => { const r = pitchScore(game, day, picked); setResult(r); finishMini('pitch', day, r.points); };
  return (
    <Fold id="card-pitch" title="Pitch day" summary={done ?? 'Pick your best numbers for an investor. Open to play.'}
      subtitle={`An investor is listening. Today they care most about ${wants.map((w) => metrics.find((m) => m.id === w)!.label.toLowerCase()).join(' and ')}. Pick ${PITCH_PICKS} of your real numbers to show them. Strong ones that they care about score most; weak ones cost you.`}>
      <div className="grid gap-2 sm:grid-cols-2" role="group" aria-label="Your numbers">
        {metrics.map((m) => (
          <button key={m.id} type="button" role="checkbox" aria-checked={picked.includes(m.id)} disabled={!!result || !!done}
            className={`cfx-tile !p-2.5 text-left ${picked.includes(m.id) ? 'ring-4 ring-[var(--coin)]' : ''}`} onClick={() => toggle(m.id)}>
            <span className="cfx-tile__name !text-base">{picked.includes(m.id) ? '✓ ' : ''}{m.label}</span>
            <span className="cfx-tile__meta">{m.value}</span>
          </button>
        ))}
      </div>
      {!result && !done && <Button className="mt-3" variant="primary" disabled={picked.length !== PITCH_PICKS} onClick={go}>Make the pitch</Button>}
      {result && <div role="status" className="mt-3 space-y-1 text-sm"><p className="font-black">The investor scored you {result.points} out of 100.</p><ul className="list-disc pl-5 text-xs text-ink-2">{result.notes.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
      {!result && done && <p role="status" className="mt-3 text-sm font-black">{done}</p>}
    </Fold>
  );
}

/** Spot the three shelves where the count on the system is wrong. */
export function StockTakeCard() {
  const { profile, finishMini } = useGame();
  const day = utcDay();
  const lines = useMemo(() => stockTakeOf(day), [day]);
  const [flagged, setFlagged] = useState<string[]>([]);
  const [result, setResult] = useState<ReturnType<typeof stockScore> | null>(null);
  const done = doneNote('stocktake', profile, day);
  const toggle = (id: string) => setFlagged((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  const submit = () => { const r = stockScore(lines, flagged); setResult(r); finishMini('stocktake', day, r.points); };
  return (
    <Fold id="card-stocktake" title="Stock-take rush" summary={done ?? 'Three shelves have the wrong count. Open to play.'}
      subtitle="Each shelf shows what the system says and what you counted. Three shelves disagree. Flag them, but every wrong flag costs you.">
      <ul className="grid gap-2 sm:grid-cols-2">
        {lines.map((l) => (
          <li key={l.id}>
            <button type="button" role="checkbox" aria-checked={flagged.includes(l.id)} disabled={!!result || !!done} aria-label={`${l.name}: system ${l.system}, counted ${l.actual}`}
              className={`cfx-tile w-full !p-2 text-left ${flagged.includes(l.id) ? 'ring-4 ring-[var(--coin)]' : ''} ${result && stockWrong(l) ? 'bg-[var(--go)]/20' : ''}`} onClick={() => toggle(l.id)}>
              <span className="cfx-tile__name !text-base">{flagged.includes(l.id) ? '⚑ ' : ''}{l.name}</span>
              <span className="cfx-tile__meta">System {l.system} · Counted {l.actual}</span>
            </button>
          </li>
        ))}
      </ul>
      {!result && !done && <Button className="mt-3" variant="primary" onClick={submit}>Hand in the count ({flagged.length} flagged)</Button>}
      {result && <p role="status" className="mt-3 text-sm font-black">You found {result.found} of 3 with {result.falseAlarms} false alarm{result.falseAlarms === 1 ? '' : 's'}: {result.points} points.</p>}
      {!result && done && <p role="status" className="mt-3 text-sm font-black">{done}</p>}
    </Fold>
  );
}

/** Place six payments in the right weeks so the bank balance never goes negative. */
export function TetrisCard() {
  const { profile, finishMini } = useGame();
  const day = utcDay();
  const t = useMemo(() => tetrisOf(day), [day]);
  const [placement, setPlacement] = useState<Record<string, number>>(() => Object.fromEntries(t.flex.map((f) => [f.id, f.from])));
  const [result, setResult] = useState<ReturnType<typeof tetrisScore> | null>(null);
  const done = doneNote('tetris', profile, day);
  const bal = tetrisBalances(t, placement);
  const submit = () => { const r = tetrisScore(t, placement); setResult(r); finishMini('tetris', day, r.points); };
  return (
    <Fold id="card-tetris" title="Cash-flow tetris" summary={done ?? 'Time six payments so you never run out. Open to play.'}
      subtitle={`You start with ${formatGBP(t.start)}. Payroll and customer receipts are fixed. Choose a week for each flexible payment, inside its window, so the balance never dips below zero.`}>
      <div className="space-y-2">
        {t.flex.map((f) => (
          <label key={f.id} className="flex items-center justify-between gap-2 text-sm">
            <span>{f.label} {formatGBP(f.amount, { compact: true })} <span className="text-xs text-ink-2">(weeks {f.from}-{f.to})</span></span>
            <select aria-label={`Week for ${f.label}`} value={placement[f.id]} disabled={!!result || !!done} onChange={(e) => setPlacement({ ...placement, [f.id]: Number(e.target.value) })} className="rounded-lg border border-line bg-page px-2 py-1">
              {Array.from({ length: f.to - f.from + 1 }, (_, i) => f.from + i).map((w) => <option key={w} value={w}>Week {w}</option>)}
            </select>
          </label>
        ))}
        <div className="flex flex-wrap gap-1 text-xs" aria-label="Balance each week">
          {bal.map((b, i) => <span key={i} className={`tnum rounded border px-1.5 py-0.5 ${b < 0 ? 'border-[var(--danger)] text-critical-text font-black' : 'border-line'}`}>W{i + 1}: {formatGBP(b, { compact: true })}</span>)}
        </div>
      </div>
      {!result && !done && <Button className="mt-3" variant="primary" onClick={submit}>Lock in the plan</Button>}
      {result && <p role="status" className="mt-3 text-sm font-black">Lowest balance {formatGBP(result.lowest, { compact: true })}: {result.points} points ({MINI_GEMS(result.points)} gems).</p>}
      {!result && done && <p role="status" className="mt-3 text-sm font-black">{done}</p>}
    </Fold>
  );
}

/** The twelve daily games together. */
export function GamesCards({ game }: { game: GameState }) {
  return (
    <>
      <Card fold id="card-games" title="Daily games" subtitle="Twelve small games a day, each paying gems for a good score. They never change your company.">
        <p className="text-xs text-ink-2">Open any of the cards below: Negotiation duel, Pitch day, Stock-take rush, Cash-flow tetris, Boardroom pitch, Crisis call centre, Auction house, Spot the fraud, Forecast challenge, Hiring interviews, Supply route planner and Price-war survival.</p>
      </Card>
      <NegotiationCard />
      <PitchCard game={game} />
      <StockTakeCard />
      <TetrisCard />
      <BoardroomCard game={game} />
      <CallCentreCard />
      <AuctionCard />
      <FraudCard />
      <ForecastCard game={game} />
      <HiringCard />
      <RoutesCard />
      <PriceWarCard />
    </>
  );
}

const pitchLabel = (id: string, game: GameState): string => pitchMetrics(game).find((m) => m.id === id)?.label ?? id;

/** Three directors, three different worries: lead with a strong number for each. */
export function BoardroomCard({ game }: { game: GameState }) {
  const { profile, finishMini } = useGame();
  const day = utcDay();
  const dirs = directorsOf(day);
  const metrics = pitchMetrics(game);
  const [picks, setPicks] = useState<string[]>(['', '', '']);
  const [result, setResult] = useState<{ points: number; notes: string[] } | null>(null);
  const done = doneNote('boardroom', profile, day);
  const go = () => { const r = boardroomScore(game, day, picks); setResult(r); finishMini('boardroom', day, r.points); };
  return (
    <Fold id="card-boardroom" title="Boardroom pitch" summary={done ?? 'Three directors, three worries. Open to play.'}
      subtitle="Each director wants to hear about a different number. Lead with a strong one for each. Their worries are written below, but they are not shy about changing the subject.">
      <ul className="space-y-3">
        {dirs.map((d, i) => (
          <li key={d.name} className="text-sm">
            <b>{d.name}</b>, {d.title}. Cares about <b>{pitchLabel(d.wants, game).toLowerCase()}</b>.
            <select aria-label={`What to tell ${d.name}`} value={picks[i]} disabled={!!result || !!done} onChange={(e) => setPicks(picks.map((p, j) => (j === i ? e.target.value : p)))} className="ml-2 rounded-lg border border-line bg-page px-2 py-1">
              <option value="">Choose…</option>
              {metrics.map((m) => <option key={m.id} value={m.id}>{m.label}: {m.value}</option>)}
            </select>
          </li>
        ))}
      </ul>
      {!result && !done && <Button className="mt-3" variant="primary" disabled={picks.some((p) => !p)} onClick={go}>Make the case</Button>}
      {result && <div role="status" className="mt-3 space-y-1 text-sm"><p className="font-black">The board scored you {result.points} out of 100.</p><ul className="list-disc pl-5 text-xs text-ink-2">{result.notes.map((x, i) => <li key={i}>{x}</li>)}</ul></div>}
      {!result && done && <p role="status" className="mt-3 text-sm font-black">{done}</p>}
    </Fold>
  );
}

/** Eight calls, one hour: handle the most urgent set you can fit. */
export function CallCentreCard() {
  const { profile, finishMini } = useGame();
  const day = utcDay();
  const calls = useMemo(() => callsOf(day), [day]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [result, setResult] = useState<ReturnType<typeof callScore> | null>(null);
  const done = doneNote('callcentre', profile, day);
  const used = calls.filter((c) => chosen.includes(c.id)).reduce((a, c) => a + c.minutes, 0);
  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const go = () => { const r = callScore(calls, chosen); setResult(r); finishMini('callcentre', day, r.points); };
  return (
    <Fold id="card-callcentre" title="Crisis call centre" summary={done ?? 'Pick the calls that fit your hour. Open to play.'}
      subtitle={`A recall has flooded the phones. You have ${CALL_BUDGET} minutes. Each call has an urgency (1 to 5 stars) and takes some minutes. Pick the set that handles the most urgency without running over.`}>
      <ul className="grid gap-2 sm:grid-cols-2">
        {calls.map((c) => (
          <li key={c.id}>
            <button type="button" role="checkbox" aria-checked={chosen.includes(c.id)} disabled={!!result || !!done} aria-label={`${c.who}: ${c.issue}, urgency ${c.urgency}, ${c.minutes} minutes`}
              className={`cfx-tile w-full !p-2 text-left ${chosen.includes(c.id) ? 'ring-4 ring-[var(--coin)]' : ''}`} onClick={() => toggle(c.id)}>
              <span className="cfx-tile__name !text-base">{chosen.includes(c.id) ? '☎ ' : ''}{c.who}</span>
              <span className="cfx-tile__meta">{c.issue} · {'★'.repeat(c.urgency)} · {c.minutes} min</span>
            </button>
          </li>
        ))}
      </ul>
      <p className={`mt-2 text-sm font-black ${used > CALL_BUDGET ? 'text-critical-text' : ''}`}>{used} of {CALL_BUDGET} minutes used</p>
      {!result && !done && <Button className="mt-2" variant="primary" onClick={go}>Take the calls</Button>}
      {result && <p role="status" className="mt-3 text-sm font-black">{result.over ? `You ran over the hour (${result.minutes} minutes): 0 points.` : `You handled ${result.urgency} stars of urgency: ${result.points} points.`}</p>}
      {!result && done && <p role="status" className="mt-3 text-sm font-black">{done}</p>}
    </Fold>
  );
}

/** Sealed bids against three hidden rivals: win each lot for less than it is worth. */
export function AuctionCard() {
  const { profile, finishMini } = useGame();
  const day = utcDay();
  const lots = useMemo(() => auctionOf(day), [day]);
  const [bids, setBids] = useState<Record<string, number>>(() => Object.fromEntries(lots.map((l) => [l.id, Math.round(l.worth * 0.7)])));
  const [result, setResult] = useState<ReturnType<typeof auctionScore> | null>(null);
  const done = doneNote('auction', profile, day);
  const go = () => { const r = auctionScore(lots, bids); setResult(r); finishMini('auction', day, r.points); };
  return (
    <Fold id="card-auction" title="Auction house" summary={done ?? 'Three lots, hidden rival bids. Open to play.'}
      subtitle="Each lot has a value to you. Three rivals have already sealed their bids. Bid more than the highest and you win it and pocket the difference; bid too much and you lose money; bid too little and someone else wins.">
      <ul className="space-y-2">
        {lots.map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="min-w-0 flex-1">Lot: {l.name}, worth <b>{formatGBP(l.worth, { compact: true })}</b></span>
            <select aria-label={`Bid for ${l.name}`} value={bids[l.id]} disabled={!!result || !!done} onChange={(e) => setBids({ ...bids, [l.id]: Number(e.target.value) })} className="rounded-lg border border-line bg-page px-2 py-1">
              {AUCTION_STEPS.map((p) => <option key={p} value={Math.round(l.worth * p)}>{Math.round(p * 100)}% ({formatGBP(Math.round(l.worth * p), { compact: true })})</option>)}
            </select>
            {result && <span className="text-xs text-ink-2">Top rival: {formatGBP(Math.max(...l.rivals), { compact: true })}</span>}
          </li>
        ))}
      </ul>
      {!result && !done && <Button className="mt-3" variant="primary" onClick={go}>Place the bids</Button>}
      {result && <p role="status" className="mt-3 text-sm font-black">You won {result.won} lot{result.won === 1 ? '' : 's'} for a profit of {formatGBP(result.profit, { compact: true })}: {result.points} points.</p>}
      {!result && done && <p role="status" className="mt-3 text-sm font-black">{done}</p>}
    </Fold>
  );
}

/** Two of twelve invoices are fake: one reuses an earlier reference number, one is a round sum dated on a weekend. */
export function FraudCard() {
  const { profile, finishMini } = useGame();
  const day = utcDay();
  const { lines } = useMemo(() => invoicesOf(day), [day]);
  const [flagged, setFlagged] = useState<string[]>([]);
  const [result, setResult] = useState<ReturnType<typeof fraudScore> | null>(null);
  const done = doneNote('fraud', profile, day);
  const toggle = (id: string) => setFlagged((f) => (f.includes(id) ? f.filter((x) => x !== id) : [...f, id]));
  const go = () => { const r = fraudScore(day, flagged); setResult(r); finishMini('fraud', day, r.points); };
  return (
    <Fold id="card-fraud" title="Spot the fraud" summary={done ?? 'Two of twelve invoices are fake. Open to play.'}
      subtitle="Two invoices are fakes. One is a later invoice that reuses an earlier reference number. The other is a round-pound sum dated on a Saturday or Sunday. Flag them; every wrong flag costs you.">
      <ul className="grid gap-2 sm:grid-cols-2">
        {lines.map((l) => (
          <li key={l.id}>
            <button type="button" role="checkbox" aria-checked={flagged.includes(l.id)} disabled={!!result || !!done} aria-label={`${l.supplier}, ${l.ref}, ${formatGBP(l.amount)}, ${l.day}`}
              className={`cfx-tile w-full !p-2 text-left ${flagged.includes(l.id) ? 'ring-4 ring-[var(--coin)]' : ''}`} onClick={() => toggle(l.id)}>
              <span className="cfx-tile__name !text-base">{flagged.includes(l.id) ? '⚑ ' : ''}{l.supplier}</span>
              <span className="cfx-tile__meta">{l.ref} · {formatGBP(l.amount)} · {l.day}</span>
            </button>
          </li>
        ))}
      </ul>
      {!result && !done && <Button className="mt-3" variant="primary" onClick={go}>Report them ({flagged.length} flagged)</Button>}
      {result && <p role="status" className="mt-3 text-sm font-black">You found {result.found} of 2 with {result.falseAlarms} false alarm{result.falseAlarms === 1 ? '' : 's'}: {result.points} points.</p>}
      {!result && done && <p role="status" className="mt-3 text-sm font-black">{done}</p>}
    </Fold>
  );
}

/** Guess next month's takings; a quiet simulated month is the answer. */
export function ForecastCard({ game }: { game: GameState }) {
  const { profile, finishMini } = useGame();
  const day = utcDay();
  const [guess, setGuess] = useState(0);
  const [result, setResult] = useState<{ points: number; actual: number } | null>(null);
  const done = doneNote('forecast', profile, day);
  const go = () => { const actual = nextMonthRevenue(game, (c) => tickInPlace(c, { simulation: true })); const points = forecastScore(Math.round(guess * 100), actual); setResult({ points, actual }); finishMini('forecast', day, points); };
  return (
    <Fold id="card-forecast" title="Forecast challenge" summary={done ?? 'Predict next month\'s revenue. Open to play.'}
      subtitle="Look at your numbers and guess next month's revenue in pounds. The closer you are to a quiet month with no surprises, the more you score.">
      <label className="block text-sm">Your guess (£)
        <input type="number" min={0} value={guess || ''} disabled={!!result || !!done} onChange={(e) => setGuess(Number(e.target.value))} aria-label="Revenue forecast in pounds"
          className="mt-1 block w-40 rounded-xl border-[3px] border-outline bg-surface-2 px-2 py-1 text-sm font-extrabold text-ink" />
      </label>
      {!result && !done && <Button className="mt-3" variant="primary" disabled={guess <= 0} onClick={go}>Lock in the forecast</Button>}
      {result && <p role="status" className="mt-3 text-sm font-black">The quiet month came to {formatGBP(result.actual, { compact: true })}: {result.points} points.</p>}
      {!result && done && <p role="status" className="mt-3 text-sm font-black">{done}</p>}
    </Fold>
  );
}

/** Four candidates, one of whom stretched the truth on their CV. */
export function HiringCard() {
  const { profile, finishMini } = useGame();
  const day = utcDay();
  const cands = useMemo(() => interviewCandidates(day), [day]);
  const [result, setResult] = useState<{ points: number; best: string } | null>(null);
  const done = doneNote('hiring', profile, day);
  const pick = (id: string) => { const r = hiringScore(cands, id); setResult(r); finishMini('hiring', day, r.points); };
  return (
    <Fold id="card-hiring" title="Hiring interviews" summary={done ?? 'Pick the best of four. Open to play.'}
      subtitle="Four people want the job. Skill counts most, attitude matters too, and one of them has exaggerated their CV. The references may help you decide.">
      <ul className="grid gap-2 sm:grid-cols-2">
        {cands.map((c) => (
          <li key={c.id}>
            <button type="button" disabled={!!result || !!done} className={`cfx-tile w-full !p-2 text-left ${result && result.best === c.id ? 'bg-[var(--go)]/20' : ''}`} onClick={() => pick(c.id)} aria-label={`Hire ${c.name}`}>
              <span className="cfx-tile__name !text-base">{c.name}</span>
              <span className="cfx-tile__meta">CV skill {c.claimed}/10 · attitude {c.attitude}/10 · asks {formatGBP(c.ask, { compact: true })}</span>
              <span className="block text-xs text-ink-2">Reference: {c.reference}</span>
              {result && <span className="block text-xs font-black">True skill {c.trueSkill}/10, worth {candidateValue(c).toFixed(1)}</span>}
            </button>
          </li>
        ))}
      </ul>
      {result && <p role="status" className="mt-3 text-sm font-black">{result.points} points.</p>}
      {!result && done && <p role="status" className="mt-3 text-sm font-black">{done}</p>}
    </Fold>
  );
}

/** Link every supplier to the warehouse for the lowest total cost. */
export function RoutesCard() {
  const { profile, finishMini } = useGame();
  const day = utcDay();
  const g = useMemo(() => routeGraphOf(day), [day]);
  const [chosen, setChosen] = useState<string[]>([]);
  const [result, setResult] = useState<ReturnType<typeof routeScore> | null>(null);
  const done = doneNote('routes', profile, day);
  const cost = g.routes.filter((r) => chosen.includes(r.id)).reduce((a, r) => a + r.cost, 0);
  const toggle = (id: string) => setChosen((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]));
  const go = () => { const r = routeScore(g, chosen); setResult(r); finishMini('routes', day, r.points); };
  return (
    <Fold id="card-routes" title="Supply route planner" summary={done ?? 'Connect every supplier cheaply. Open to play.'}
      subtitle="Pick roads so that every place is connected to the warehouse, directly or through others, for the lowest total cost. A disconnected network scores nothing.">
      <ul className="grid gap-2 sm:grid-cols-2">
        {g.routes.map((r) => (
          <li key={r.id}>
            <button type="button" role="checkbox" aria-checked={chosen.includes(r.id)} disabled={!!result || !!done} aria-label={`${g.nodes[r.a]} to ${g.nodes[r.b]}, cost ${r.cost}`}
              className={`cfx-tile w-full !p-2 text-left ${chosen.includes(r.id) ? 'ring-4 ring-[var(--coin)]' : ''}`} onClick={() => toggle(r.id)}>
              <span className="cfx-tile__name !text-base">{chosen.includes(r.id) ? '✓ ' : ''}{g.nodes[r.a]} – {g.nodes[r.b]}</span>
              <span className="cfx-tile__meta">Cost {r.cost}</span>
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-sm font-black">Total cost: {cost}</p>
      {!result && !done && <Button className="mt-2" variant="primary" onClick={go}>Build the network</Button>}
      {result && <p role="status" className="mt-3 text-sm font-black">{result.valid ? `Connected for ${result.cost}; the cheapest is ${cheapestNetwork(g)}: ${result.points} points.` : 'Some places are not connected: 0 points.'}</p>}
      {!result && done && <p role="status" className="mt-3 text-sm font-black">{done}</p>}
    </Fold>
  );
}

/** Six weeks against a rival who changes price in a three-week rhythm. */
export function PriceWarCard() {
  const { profile, finishMini } = useGame();
  const day = utcDay();
  const rival = useMemo(() => warRival(day), [day]);
  const [prices, setPrices] = useState<number[]>([]);
  const [result, setResult] = useState<ReturnType<typeof warScore> | null>(null);
  const done = doneNote('pricewar', profile, day);
  const week = prices.length;
  const choose = (p: number) => { const next = [...prices, p]; setPrices(next); if (next.length === WAR_WEEKS) { const r = warScore(day, next); setResult(r); finishMini('pricewar', day, r.points); } };
  return (
    <Fold id="card-pricewar" title="Price-war survival" summary={done ?? 'Six weeks, one rival. Open to play.'}
      subtitle={`Each week you choose a price (it costs you ${WAR_COST} to make one). The cheaper you are than the rival, the more you sell. The rival's prices follow a short pattern: you only see a week once it is over.`}>
      <ol className="space-y-1 text-sm" aria-label="Weeks so far">
        {prices.map((p, i) => <li key={i}>Week {i + 1}: you £{p}, rival £{rival[i]}, profit £{warProfit(p, rival[i])}</li>)}
      </ol>
      {!result && !done && (
        <div className="mt-2 flex flex-wrap items-center gap-2" role="group" aria-label="Price for this week">
          <span className="text-xs text-ink-2">Week {week + 1}:</span>
          {WAR_PRICES.map((p) => <Button key={p} onClick={() => choose(p)}>£{p}</Button>)}
        </div>
      )}
      {result && <p role="status" className="mt-3 text-sm font-black">Total profit £{result.profit}: {result.points} points.</p>}
      {!result && done && <p role="status" className="mt-3 text-sm font-black">{done}</p>}
    </Fold>
  );
}
