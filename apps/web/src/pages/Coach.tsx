import { formatGBP, type GameState } from '@cfx/engine';
import { useMemo } from 'react';
import { adviserTip, cashBridge } from '../lib/coach';
import { iconUrl } from '../lib/icons';
import { useGame } from '../store';

const signed = (p: number) => `${p > 0 ? '+' : p < 0 ? '−' : ''}${formatGBP(Math.abs(p), { compact: true })}`;

/** Under the scoreboard: why cash moved differently from profit, and the adviser's one tip. */
export function Coach({ game }: { game: GameState }) {
  const openSheet = useGame((s) => s.openSheet);
  const setSceneFocus = useGame((s) => s.setSceneFocus);
  const bridge = useMemo(() => cashBridge(game), [game]);
  const tip = useMemo(() => adviserTip(game), [game]);
  if (!bridge) return null;
  const gap = bridge.cashChange - bridge.profit;
  return (
    <div className="space-y-2">
      <section className="cfx-panel !p-3" aria-labelledby="bridge-title">
        <h2 id="bridge-title" className="flex flex-wrap items-baseline gap-x-2 font-display text-base leading-tight">
          Last month
          <span className={bridge.profit < 0 ? 'text-critical-text' : ''}>profit {signed(bridge.profit)}</span>
          <span aria-hidden>→</span>
          <span className={bridge.cashChange < 0 ? 'text-critical-text' : ''}>cash {signed(bridge.cashChange)}</span>
        </h2>
        {Math.abs(gap) >= 100_00 && bridge.lines.length > 0 && (
          <>
            <p className="mt-0.5 text-xs text-ink-2">Cash isn't profit. The biggest differences:</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {bridge.lines.map((l) => (
                <li key={l.label} className="rounded-full border-2 border-outline bg-surface-2 px-2 py-0.5 text-xs font-extrabold">
                  {l.label} <span className={l.amount < 0 ? 'text-critical-text' : 'text-[var(--go)]'}>{signed(l.amount)}</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>
      {tip && (
        <section className="cfx-panel flex items-start gap-2.5 !p-3" aria-label="Adviser">
          <img src={iconUrl('chart')} alt="" className="h-9 w-9 shrink-0" />
          <p className="min-w-0 flex-1 text-[13px] font-bold leading-snug">{tip.text}</p>
          <button type="button" className="cfx-btn is-go is-sm shrink-0"
            onClick={() => ('upgrade' in tip.target ? setSceneFocus(tip.target.upgrade) : openSheet(tip.target.sheet, undefined, tip.target.scrollTo))}>
            {tip.action}
          </button>
        </section>
      )}
    </div>
  );
}
