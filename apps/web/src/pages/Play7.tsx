import {
  badgesOf, budgetCheck, budgetOf, COUNCIL, councilOpen, councilOptions, formatGBP, hasStock, MASCOTS, MINI_KINDS, MINI_NAMES, monthLabel, MONUMENTS, monumentsOf, outsourceCheck, OUTSOURCE,
  outsourced, play7Of, rangeCheck, rangeCost, SEASON_GEMS, SEASON_NEEDED, seasonIdOf, seasonNameOf, seasonStamps, STOCK_LEVELS, stockLevel, utcDay, type GameState,
} from '@cfx/engine';
import { useState } from 'react';
import { Button } from '../components/ui';
import { useGame } from '../store';
import { Fold } from './Strategy';

const live = (game: GameState): boolean => game.status === 'playing';
const small = (p: number): string => formatGBP(p, { compact: true });

/** Customers vote on one thing each quarter. */
export function CouncilCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const open = councilOpen(game);
  const pick = play7Of(game).councilPick;
  return (
    <Fold id="card-council" title="Customer council" summary={open ? 'A vote is open this quarter.' : 'Voted this quarter.'}
      subtitle="Each quarter a small panel of customers is shown three ideas. Choose which to follow: the effects are small but real, and what you pick shapes who buys from you.">
      <ul className="space-y-2">
        {councilOptions(game).map((o) => (
          <li key={o.id} className="flex flex-wrap items-center gap-2 text-sm">
            <span className="min-w-0 flex-1"><b>{o.name}</b>. {o.text}</span>
            <Button variant={pick === o.id && !open ? 'primary' : 'secondary'} disabled={!open || !live(game)} onClick={() => act({ type: 'council', id: o.id }, `The council chose: ${o.name}.`)}>Choose</Button>
          </li>
        ))}
      </ul>
      {!open && <p className="mt-2 text-xs text-muted">{game.month < 6 ? 'The council meets after your first six months.' : `You picked: ${COUNCIL.find((c) => c.id === pick)?.name ?? 'nothing'}. A new ballot next quarter.`}</p>}
    </Fold>
  );
}

/** Stop stock walking out of the door. */
export function StockControlCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const now = stockLevel(game);
  if (!hasStock(game)) return null;
  return (
    <Fold id="card-shrink" title="Stock control" summary={`Level: ${STOCK_LEVELS[now].name}.`}
      subtitle="Stock goes missing: lost, damaged or stolen. Controls cost money every month but cut the loss. In the middle, you often come out ahead.">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Stock control level">
        {STOCK_LEVELS.map((l, i) => <Button key={l.name} variant={now === i ? 'primary' : 'secondary'} aria-pressed={now === i} disabled={now === i || !live(game)} title={l.blurb} onClick={() => act({ type: 'stockControl', level: i }, `Stock control: ${l.name}.`)}>{l.name}</Button>)}
      </div>
      <p className="mt-2 text-xs text-ink-2">{STOCK_LEVELS[now].blurb}</p>
    </Fold>
  );
}

/** Split a yearly training budget across three departments. */
export function TrainingBudgetCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const b = budgetOf(game);
  const [v, setV] = useState({ ops: 34, rnd: 33, sales: 33 });
  const total = v.ops + v.rnd + v.sales;
  const chk = budgetCheck(game, v.ops, v.rnd, v.sales);
  const set = (k: 'ops' | 'rnd' | 'sales', n: number) => setV({ ...v, [k]: Math.max(0, Math.min(100, Math.round(n))) });
  return (
    <Fold id="card-budget" title="Training budget" summary={b ? `This year: ops ${b.ops}%, R&D ${b.rnd}%, sales ${b.sales}%.` : 'Split a yearly budget three ways.'}
      subtitle={`Share out 100 points across operations (capacity), R&D (quality) and sales (demand). Putting 70 or more in one place gets a 30% bonus there. It costs ${small(chk.fee)} once a year and lasts the year.`}>
      <div className="grid gap-2 sm:grid-cols-3">
        {(['ops', 'rnd', 'sales'] as const).map((k) => (
          <label key={k} className="block text-sm">{k === 'ops' ? 'Operations' : k === 'rnd' ? 'R&D' : 'Sales'}
            <input type="number" min={0} max={100} value={v[k]} disabled={!!b} onChange={(e) => set(k, Number(e.target.value))} aria-label={`${k} share`} className="mt-1 block w-full rounded-xl border-[3px] border-outline bg-surface-2 px-2 py-1 text-sm font-extrabold text-ink" />
          </label>
        ))}
      </div>
      <p className={`mt-2 text-xs ${total === 100 ? 'text-ink-2' : 'text-critical-text font-black'}`}>Total: {total} of 100</p>
      <Button className="mt-2" variant="primary" disabled={!chk.ok || !live(game)} onClick={() => act({ type: 'trainingBudget', ...v }, 'Training budget set.')}>Set the budget ({small(chk.fee)})</Button>
      {!chk.ok && total === 100 && <p className="mt-2 text-xs text-muted">{chk.reason}</p>}
    </Fold>
  );
}

/** Hand a function to a partner. */
export function OutsourceCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const now = outsourced(game);
  return (
    <Fold id="card-outsource" title="Outsourcing" summary={now.length ? `${now.length} function${now.length === 1 ? '' : 's'} outsourced.` : 'Everything is in-house.'}
      subtitle="A partner can run a function cheaper than you. You save money but give up some control. You can bring it back in-house at any time.">
      <ul className="space-y-2">
        {OUTSOURCE.map((o) => {
          const on = now.includes(o.id); const chk = outsourceCheck(game, o.id, !on);
          return (
            <li key={o.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-0 flex-1"><b>{o.name}</b>: {o.blurb}</span>
              <Button variant={on ? 'primary' : 'secondary'} aria-pressed={on} disabled={!chk.ok || !live(game)} title={chk.reason} onClick={() => act({ type: 'outsource', id: o.id, on: !on }, on ? 'Brought back in-house.' : 'Outsourced.')}>{on ? 'Bring back' : `Outsource (${small(chk.fee)})`}</Button>
            </li>
          );
        })}
      </ul>
    </Fold>
  );
}

/** A limited run: sell out for buzz, or be left with stock. */
export function RangeCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const r = play7Of(game).range;
  return (
    <Fold id="card-range" title="Limited range" summary={r ? `A ${r.size} range is on sale.` : 'A seasonal batch: sell out or mark down.'}
      subtitle="Once a quarter, launch a limited batch. A big batch costs more and gives more buzz if it sells out, but sells out less often. Leftovers are marked down at a loss. The result comes in three months.">
      {r ? <p className="text-sm">Your {r.size} batch launched in {monthLabel(r.month)}. Result in {Math.max(0, r.month + 3 - game.month)} months.</p> : (
        <div className="flex flex-wrap gap-2">
          {(['small', 'big'] as const).map((s) => { const chk = rangeCheck(game, s); return <Button key={s} disabled={!chk.ok || !live(game)} title={chk.reason} onClick={() => act({ type: 'rangeBatch', size: s }, 'Range launched.')}>{s === 'small' ? 'Small batch' : 'Big batch'} ({small(rangeCost(game, s))})</Button>; })}
        </div>
      )}
    </Fold>
  );
}

/** Landmarks you have earned by reaching real milestones. */
export function MonumentCard({ game }: { game: GameState }) {
  const got = new Set(monumentsOf(game).map((m) => m.id));
  return (
    <Fold id="card-monuments" title="Monument hall" summary={`${got.size} of ${MONUMENTS.length} monuments earned.`}
      subtitle="Reach real milestones to earn a monument. They are a record of what you have built; they do not change your numbers.">
      <ul className="grid gap-2 sm:grid-cols-2">
        {MONUMENTS.map((m) => (
          <li key={m.id} className={`flex items-center gap-3 rounded-2xl border-2 border-outline p-2 text-sm ${got.has(m.id) ? '' : 'opacity-50'}`}>
            <span className={`text-3xl ${got.has(m.id) ? '' : 'grayscale'}`} aria-hidden>{m.emoji}</span>
            <span><b>{got.has(m.id) ? m.name : '???'}</b><span className="block text-xs text-ink-2">{m.text}</span></span>
          </li>
        ))}
      </ul>
    </Fold>
  );
}

/** A yearly portrait of the team, drawn for you and ready to save. */
export function YearbookCard({ game }: { game: GameState }) {
  const mascot = MASCOTS.find((m) => m.id === game.play6?.mascot);
  const heads = Math.min(24, game.staff.ops + game.staff.rnd + game.staff.sales + 1);
  const year = Math.floor(game.month / 12) + 1;
  const faces = ['🙂', '😀', '😎', '🤓', '🥳', '😊'];
  const svg = (): string => {
    const cells = Array.from({ length: heads }, (_, i) => `<text x="${40 + (i % 8) * 56}" y="${150 + Math.floor(i / 8) * 56}" font-size="36">${faces[i % faces.length]}</text>`).join('');
    const esc = (t: string) => t.replace(/[<>&]/g, '');
    return `<svg xmlns="http://www.w3.org/2000/svg" width="520" height="320" viewBox="0 0 520 320"><rect width="520" height="320" rx="16" fill="#fdf6e3"/><text x="260" y="48" text-anchor="middle" font-size="26" font-family="sans-serif" font-weight="700">${esc(game.companyName)}</text><text x="260" y="78" text-anchor="middle" font-size="16" font-family="sans-serif">Yearbook · year ${year}</text>${cells}<text x="480" y="290" font-size="44" text-anchor="end">${mascot?.emoji ?? ''}</text><text x="24" y="300" font-size="13" font-family="sans-serif">${heads} people · month ${game.month + 1}</text></svg>`;
  };
  const save = () => { const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([svg()], { type: 'image/svg+xml' })); a.download = `${game.companyName}-yearbook-${year}.svg`; a.click(); URL.revokeObjectURL(a.href); };
  return (
    <Fold id="card-yearbook" title="Company yearbook" summary={`Year ${year} portrait: ${heads} people.`}
      subtitle="A group photo of your team for this year, with your mascot in the corner. Save it as a picture.">
      <div className="rounded-2xl border-2 border-outline bg-surface-2 p-3" aria-label="Yearbook portrait">
        <p className="text-center font-display text-lg">{game.companyName}</p>
        <p className="text-center text-xs text-ink-2">Year {year}</p>
        <p className="mt-2 flex flex-wrap justify-center gap-1 text-3xl" aria-hidden>{Array.from({ length: heads }, (_, i) => <span key={i}>{faces[i % faces.length]}</span>)}</p>
        {mascot && <p className="mt-2 text-right text-4xl" aria-hidden>{mascot.emoji}</p>}
      </div>
      <Button className="mt-2" onClick={save}>Save as a picture</Button>
    </Fold>
  );
}

/** Badges for strong scores in the daily games, and a seasonal stamp album. */
export function BadgesCard() {
  const { profile, claimSeasonAlbum } = useGame();
  const badges = new Set(badgesOf(profile));
  const day = utcDay();
  const stamps = seasonStamps(profile, day);
  const id = seasonIdOf(day);
  const claimed = (profile.seasonClaims ?? []).includes(id);
  return (
    <Fold id="card-badges" title="Business school" summary={`${badges.size} of ${MINI_KINDS.length} badges · season ${stamps.length}/${SEASON_NEEDED}.`}
      subtitle="Score 85 or more in a daily game to earn its badge for good. Each season (a quarter of the year) also has a stamp album: play any six different games to fill it.">
      <ul className="grid gap-2 sm:grid-cols-2" aria-label="Badges">
        {MINI_KINDS.map((k) => <li key={k} className={`rounded-xl border-2 border-outline px-2 py-1 text-sm ${badges.has(`mini-${k}`) ? '' : 'opacity-50'}`}>{badges.has(`mini-${k}`) ? '🎓' : '🔒'} {MINI_NAMES[k]}</li>)}
      </ul>
      <h3 className="mt-3 font-display text-base">{seasonNameOf(id)} album</h3>
      <p className="text-xs text-ink-2">Stamps: {stamps.length > 0 ? stamps.map((k) => MINI_NAMES[k]).join(', ') : 'none yet'}</p>
      <Button className="mt-2" variant="primary" disabled={claimed || stamps.length < SEASON_NEEDED} onClick={() => claimSeasonAlbum(day)}>{claimed ? 'Claimed' : `Claim ${SEASON_GEMS} gems`}</Button>
    </Fold>
  );
}
