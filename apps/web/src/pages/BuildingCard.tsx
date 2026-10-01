import { formatGBP, upgradeOptions, type GameState } from '@cfx/engine';
import { useEffect } from 'react';
import { useGame } from '../store';

/** The card that opens over the island when you tap an upgrade building or an empty plot. */
export function BuildingCard({ game }: { game: GameState }) {
  const id = useGame((s) => s.sceneFocus);
  const setSceneFocus = useGame((s) => s.setSceneFocus);
  const act = useGame((s) => s.act);
  const openSheet = useGame((s) => s.openSheet);
  useEffect(() => {
    if (!id) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setSceneFocus(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [id, setSceneFocus]);

  const o = id ? upgradeOptions(game).find((x) => x.def.id === id) : undefined;
  if (!o) return null;
  const shortfall = o.cost - game.ledger.balances.cash;
  const building = o.level === 0;
  const blocked = game.status !== 'playing' ? 'The company is no longer trading.'
    : o.locked ? o.locked
    : shortfall > 0 ? `You need ${formatGBP(shortfall, { compact: true })} more cash.`
    : null;
  const monthly = Math.round(o.cost / o.def.lifeMonths);

  return (
    <section role="dialog" aria-labelledby="building-title"
      className="cfx-anim-pop absolute inset-x-2 bottom-2 z-10 mx-auto max-w-[380px] rounded-[22px] border-[3px] border-outline bg-surface p-3 shadow-[var(--lift)]">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <h2 id="building-title" className="font-display text-lg leading-tight">{o.def.name}</h2>
          <p className="text-xs text-ink-2">{o.def.description}</p>
        </div>
        <button type="button" className="cfx-icon-btn !h-8 !w-8 shrink-0 !bg-[var(--danger)]" aria-label="Close" onClick={() => setSceneFocus(null)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
      <div className="mt-2 flex items-center gap-1" aria-label={`Level ${o.level} of ${o.def.maxLevel}`}>
        {Array.from({ length: o.def.maxLevel }, (_, i) => (
          <span key={i} className={`h-2.5 flex-1 rounded-full border-2 border-outline ${i < o.level ? 'bg-[var(--go)]' : 'bg-surface-2'}`} />
        ))}
        <span className="ml-1 text-xs font-black">{o.maxed ? 'MAX' : `Lv ${o.level}/${o.def.maxLevel}`}</span>
      </div>
      {o.maxed ? (
        <p className="mt-2 text-sm font-bold">Fully upgraded: this building is as good as it gets.</p>
      ) : (
        <>
          <button type="button" className="cfx-btn is-go is-sm mt-2 w-full" disabled={!!blocked}
            onClick={() => act({ type: 'buyUpgrade', upgradeId: o.def.id }, building ? `${o.def.name} built.` : `${o.def.name} upgraded to level ${o.level + 1}.`)}>
            {building ? 'Build' : `Upgrade to level ${o.level + 1}`} · {formatGBP(o.cost, { compact: true })}
          </button>
          <p className="mt-1.5 text-[11px] leading-snug text-ink-2">
            {blocked ?? `Capex: ${formatGBP(o.cost, { compact: true })} of cash now, then about ${formatGBP(monthly, { compact: true })} a month of depreciation for ${o.def.lifeMonths / 12} years.`}
          </p>
        </>
      )}
      <button type="button" className="mt-1 text-xs font-extrabold text-ink-2 underline" onClick={() => openSheet('upgrades')}>See all upgrades</button>
    </section>
  );
}
