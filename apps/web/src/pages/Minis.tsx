import {
  formatGBP, miniOf, MINI_GEMS, negOffer, negScore, negStart, negotiationOf, PITCH_PICKS, pitchMetrics, pitchPriorities, pitchScore, stockScore, stockTakeOf, stockWrong, tetrisBalances, tetrisOf,
  tetrisScore, utcDay, type GameState,
} from '@cfx/engine';
import { useMemo, useState } from 'react';
import { Button, Card } from '../components/ui';
import { useGame } from '../store';
import { Fold } from './Strategy';

const doneNote = (kind: 'negotiate' | 'pitch' | 'stocktake' | 'tetris', profile: ReturnType<typeof useGame.getState>['profile'], day: string) => {
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

/** The four daily games together. */
export function GamesCards({ game }: { game: GameState }) {
  return (
    <>
      <Card fold id="card-games" title="Daily games" subtitle="Four small games a day, each paying gems for a good score. They never change your company.">
        <p className="text-xs text-ink-2">Open any of the cards below: Negotiation duel, Pitch day, Stock-take rush and Cash-flow tetris.</p>
      </Card>
      <NegotiationCard />
      <PitchCard game={game} />
      <StockTakeCard />
      <TetrisCard />
    </>
  );
}
