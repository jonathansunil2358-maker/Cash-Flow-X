import { formatGBP, listedRivals, marketCap, marketCapOf, sharePrice, stockCheck, MAX_RIVALS, type Competitor, type GameState } from '@cfx/engine';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, KeyValue } from '../components/ui';
import { MONTH_MS, useGame } from '../store';

/** A small deterministic wobble so prices visibly tick between monthly closes. Cosmetic only: trades use the closing price. */
const wobble = (id: number, tick: number): number => {
  const h = Math.imul(id * 2654435761 + tick * 40503, 2246822519) >>> 0;
  return ((h % 2000) / 2000 - 0.5) * 0.014;
};

function useTick(ms: number): number {
  const [tick, setTick] = useState(() => Math.floor(Date.now() / ms));
  useEffect(() => {
    const t = setInterval(() => setTick(Math.floor(Date.now() / ms)), ms);
    return () => clearInterval(t);
  }, [ms]);
  return tick;
}

const pct = (a: number, b: number): number => (b > 0 ? a / b - 1 : 0);
const pctText = (x: number): string => `${x >= 0 ? '▲' : '▼'} ${Math.abs(x * 100).toFixed(1)}%`;
const tone = (x: number): string => (x > 0.0005 ? 'text-good-text' : x < -0.0005 ? 'text-critical-text' : 'text-ink-2');

function Spark({ data, className = 'h-8 w-24' }: { data: number[]; className?: string }) {
  if (data.length < 2) return <svg viewBox="0 0 100 30" className={className} aria-hidden />;
  const hi = Math.max(...data), lo = Math.min(...data);
  const up = data.at(-1)! >= data[0];
  return (
    <svg viewBox="0 0 100 30" className={className} aria-hidden>
      <polyline fill="none" stroke={up ? 'var(--go)' : 'var(--danger)'} strokeWidth="2" strokeLinejoin="round"
        points={data.map((p, i) => `${(i / (data.length - 1)) * 100},${28 - ((p - lo) / Math.max(1, hi - lo)) * 26}`).join(' ')} />
    </svg>
  );
}

function Trade({ game, c }: { game: GameState; c: Competitor }) {
  const act = useGame((s) => s.act);
  const [qty, setQty] = useState(100);
  const held = game.world?.holdings[c.id!]?.shares ?? 0;
  const buy = stockCheck(game, 'buy', c.id!, qty);
  const sell = stockCheck(game, 'sell', c.id!, qty);
  return (
    <div className="mt-2 rounded-2xl border-[3px] border-outline bg-surface p-3 text-sm">
      <div className="flex flex-wrap items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-2">Shares</span>
          <input type="number" min={1} step={10} value={qty} aria-label={`Shares of ${c.name}`}
            onChange={(e) => setQty(Math.max(1, Math.floor(Number(e.target.value || 1))))}
            className="w-32 rounded-2xl border-[3px] border-outline bg-surface-2 px-3 py-2 text-sm font-extrabold text-ink tnum outline-none focus:border-accent" />
        </label>
        <Button variant="go" disabled={game.status !== 'playing' || !buy.ok || !!game.pendingEvent}
          onClick={() => act({ type: 'tradeStock', side: 'buy', rivalId: c.id!, shares: qty }, `Bought ${qty.toLocaleString('en-GB')} shares in ${c.name}.`)}>
          Buy · {formatGBP(buy.cost + buy.fee, { compact: true })}
        </Button>
        <Button disabled={game.status !== 'playing' || !sell.ok || !!game.pendingEvent}
          onClick={() => act({ type: 'tradeStock', side: 'sell', rivalId: c.id!, shares: qty }, `Sold ${qty.toLocaleString('en-GB')} shares in ${c.name}.`)}>
          Sell · {formatGBP(sell.cost - sell.fee, { compact: true })}
        </Button>
        {held > 0 && <Button onClick={() => setQty(held)}>All {held.toLocaleString('en-GB')}</Button>}
      </div>
      <p className="mt-2 text-xs text-ink-2">Trades settle at the month's closing price of {formatGBP(c.px ?? 0, { pence: true })}, with a 0.5% dealing fee. The tick-by-tick movement above is only for show. You can own up to 30% of a company.</p>
      {!buy.ok && buy.reason && <p className="mt-1 text-xs font-bold text-critical-text">{buy.reason}</p>}
    </div>
  );
}

/** Every listed company in your market, with moving prices, and what is happening to the companies around you. */
export function Stocks({ game }: { game: GameState }) {
  const tick = useTick(1200);
  const monthProgress = useGame((s) => s.monthProgress);
  const speed = useGame((s) => s.speed);
  const [open, setOpen] = useState<number | null>(null);
  const w = game.world;
  const listed = useMemo(() => listedRivals(game), [game]);
  const holdings = w?.holdings ?? {};
  const portfolio = Object.entries(holdings).reduce((a, [, h]) => a + h.carry, 0);
  const idx = w?.index ?? [1000];
  const idxNow = idx.at(-1)!;
  const idxPrev = idx.at(-2) ?? idxNow;
  const idxYear = idx.at(-13) ?? idx[0];
  const mood = w ? (w.mood > 0.08 ? 'Bullish' : w.mood < -0.08 ? 'Gloomy' : 'Calm') : 'Calm';
  const secsToClose = speed > 0 ? Math.max(0, Math.round(((1 - monthProgress) * MONTH_MS) / speed / 1000)) : null;
  const live = (c: Competitor): number => Math.max(1, Math.round((c.px ?? 0) * (1 + wobble(c.id ?? 0, tick))));
  const rows: { key: string; name: string; px: number; prev: number; cap: number; hist: number[]; rival?: Competitor; you?: boolean }[] = [
    ...listed.map((c) => ({ key: `r${c.id}`, name: c.name, px: live(c), prev: c.pxPrev ?? c.px ?? 0, cap: marketCapOf(c), hist: c.pxHist ?? [], rival: c })),
    ...(game.listed ? [{ key: 'you', name: `${game.companyName} (you)`, px: sharePrice(game), prev: game.priceHistory.at(-2) ?? sharePrice(game), cap: marketCap(game), hist: game.priceHistory, you: true }] : []),
  ];
  const ticker = [...rows, ...rows];
  return (
    <div className="space-y-4">
      {rows.length > 0 && (
        <div className="overflow-hidden rounded-2xl border-[3px] border-outline bg-surface-2 py-2" aria-label="Live share prices" role="marquee">
          <div className="cfx-ticker flex w-max gap-6 whitespace-nowrap px-3 text-sm font-extrabold tnum">
            {ticker.map((r, i) => (
              <span key={`${r.key}-${i}`}>{r.name.split(' ')[0]} {formatGBP(r.px, { pence: true })} <span className={tone(pct(r.px, r.prev))}>{pctText(pct(r.px, r.prev))}</span></span>
            ))}
          </div>
        </div>
      )}

      <Card title="Stock market" subtitle="Rivals that grow strong enough float on the stock market. Each share price drifts toward what its company is worth next to you, plus the market's mood. Beat a rival and its shares fall; back a winner and yours rise.">
        <KeyValue rows={[
          ['Market index', <span key="i" className="tnum">{idxNow.toFixed(1)} <span className={tone(pct(idxNow, idxPrev))}>{pctText(pct(idxNow, idxPrev))}</span> <span className="text-xs text-ink-2">· 12 months {pctText(pct(idxNow, idxYear))}</span></span>],
          ['Mood', mood],
          ['Listed companies', `${listed.length} of ${game.competitors.length} rivals${game.listed ? ' (and you)' : ''}`],
          ['Prices next close', secsToClose === null ? 'Paused' : `in about ${secsToClose}s`],
          ['Your shares in rivals', `${formatGBP(portfolio)} in ${Object.keys(holdings).length} compan${Object.keys(holdings).length === 1 ? 'y' : 'ies'}`],
        ]} />
        <div className="mt-2"><Spark data={idx} className="h-16 w-full" /></div>
      </Card>

      <Card title="Share prices" subtitle="Tap a company to buy or sell its shares with company cash. They are carried at fair value, so gains and losses hit your profit.">
        {rows.length === 0 && <p className="text-sm text-ink-2">No rival is listed yet. The strongest ones float after a year or two.</p>}
        <div className="space-y-2">
          {rows.map((r) => {
            const held = r.rival ? holdings[r.rival.id!]?.shares ?? 0 : 0;
            const month = pct(r.rival?.px ?? r.px, r.prev);
            const isOpen = !!r.rival && open === r.rival.id;
            return (
              <div key={r.key} className="rounded-2xl border-[3px] border-outline bg-surface-2 p-3 text-sm">
                <button type="button" className="flex w-full items-center gap-3 text-left" disabled={!r.rival} aria-expanded={isOpen}
                  onClick={() => r.rival && setOpen(isOpen ? null : r.rival.id!)}>
                  <div className="min-w-0 flex-1">
                    <div className="break-words font-display text-lg leading-tight">{r.name}</div>
                    <div className="text-xs text-ink-2">Value {formatGBP(r.cap, { compact: true })}{held > 0 ? ` · you own ${held.toLocaleString('en-GB')} shares` : ''}</div>
                  </div>
                  <Spark data={r.hist} className="hidden h-8 w-24 sm:block" />
                  <div className="text-right tnum">
                    <div className="font-display text-lg">{formatGBP(r.px, { pence: true })}</div>
                    <div className={`text-xs font-bold ${tone(month)}`}>{pctText(month)} this month</div>
                  </div>
                </button>
                {isOpen && r.rival && <Trade game={game} c={r.rival} />}
              </div>
            );
          })}
        </div>
      </Card>

      <Card title="Companies in your market" subtitle={`There are never more than ${MAX_RIVALS} rivals at once, but they keep changing: start-ups appear, weak firms go bust, and rivals buy each other.`}>
        <div className="space-y-1.5">
          {game.competitors.map((c) => (
            <div key={c.id ?? c.name} className="flex items-center gap-3 text-sm">
              <div className="min-w-0 flex-1 truncate font-medium">{c.name}</div>
              {c.listed ? <Badge>Listed</Badge> : <Badge className="opacity-70">Private</Badge>}
              <div className="w-24" aria-label={`Strength ${c.strength.toFixed(2)}`}>
                <div className="h-2 overflow-hidden rounded-full bg-surface"><div className="h-full rounded-full bg-accent" style={{ width: `${Math.min(100, (c.strength / 2.2) * 100)}%` }} /></div>
              </div>
              <div className="w-14 text-right text-xs tnum text-ink-2">{game.month - (c.born ?? 0)}m old</div>
            </div>
          ))}
        </div>
        {w && <p className="mt-3 text-xs text-ink-2">So far: {w.founded} start-ups founded, {w.failed} went bust, {w.mergers} takeovers, {w.ipos} floated since the game began.</p>}
      </Card>

      <Card title="Market news">
        {(!w || w.news.length === 0) && <p className="text-sm text-ink-2">Quiet so far.</p>}
        <ul className="space-y-1.5 text-sm">
          {[...(w?.news ?? [])].reverse().slice(0, 15).map((n, i) => (
            <li key={i} className="flex gap-2"><span className="w-14 shrink-0 text-xs text-ink-2 tnum">Month {n.month + 1}</span><span>{n.text}</span></li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
