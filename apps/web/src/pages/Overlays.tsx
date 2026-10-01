import { formatGBP, monthLabel } from '@cfx/engine';
import { CURRENCY_ICONS } from '../lib/icons';
import { useGame } from '../store';

function Modal({ ribbon, tone, children, labelledBy }: { ribbon: string; tone: string; children: React.ReactNode; labelledBy: string }) {
  return (
    <div className="fixed inset-0 z-[56] flex items-end justify-center bg-[#13324d]/60 p-3 pt-10 sm:items-center" role="dialog" aria-modal="true" aria-labelledby={labelledBy}>
      <section className="cfx-panel cfx-anim-pop w-full" style={{ maxWidth: 420, paddingTop: 30 }}>
        <div className={`cfx-panel__ribbon ${tone}`}>{ribbon}</div>
        {children}
      </section>
    </div>
  );
}

/** "While you were away": the offline months the business ran on its own. */
export function OfflineModal() {
  const { offline, dismissOffline, game } = useGame();
  if (!offline || !game) return null;
  return (
    <Modal ribbon="While you were away" tone="" labelledBy="offline-title">
      <h2 id="offline-title" className="text-center text-2xl leading-tight">{offline.months} month{offline.months === 1 ? '' : 's'} went by</h2>
      <p className="mt-1 text-center text-sm text-ink-2">Your team kept things running at 75% pace, and only good news got through.</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        {[['Revenue', offline.revenue], ['Profit', offline.profit], ['Cash', offline.cashChange]].map(([label, v]) => (
          <div key={label as string} className="cfx-stat !p-2">
            <span className="cfx-stat__label">{label}</span>
            <span className={`tnum text-lg font-black ${(v as number) < 0 ? 'text-critical-text' : ''}`}>{(v as number) >= 0 && label !== 'Revenue' ? '+' : ''}{formatGBP(v as number, { compact: true })}</span>
          </div>
        ))}
      </div>
      {offline.stoppedEarly && <p className="mt-3 rounded-xl bg-[var(--danger)] p-2 text-sm font-extrabold text-white">{offline.stoppedEarly}</p>}
      {offline.news.length > 0 && (
        <ul className="mt-3 max-h-40 space-y-1 overflow-y-auto text-sm">
          {offline.news.slice(-6).map((n, i) => <li key={i}><strong>{monthLabel(n.month)} · {n.title}:</strong> <span className="text-ink-2">{n.text}</span></li>)}
        </ul>
      )}
      <button type="button" className="cfx-btn is-go mt-4 w-full" onClick={dismissOffline}>Back to work</button>
    </Modal>
  );
}

/** Level-ups, achievements and completed missions, one at a time. */
export function CelebrationModal() {
  const { celebrations, dismissCelebration } = useGame();
  const c = celebrations[0];
  if (!c) return null;
  const ribbon = c.kind === 'level' ? 'Level up!' : c.kind === 'achievement' ? 'Achievement' : 'Mission complete';
  return (
    <Modal ribbon={ribbon} tone={c.kind === 'level' ? 'is-legacy' : c.kind === 'achievement' ? 'is-gem' : 'is-go'} labelledBy="celebrate-title">
      <h2 id="celebrate-title" className="text-center text-2xl leading-tight">{c.title}</h2>
      <p className="mt-1 text-center text-sm text-ink-2">{c.text}</p>
      <div className="mt-3 flex items-center justify-center gap-2">
        <img src={CURRENCY_ICONS.gem} alt="" className="h-9 w-9" />
        <span className="cfx-coin-pop" style={{ color: 'var(--gem)', fontSize: 30 }}>+{c.gems}</span>
      </div>
      <button type="button" className="cfx-btn mt-4 w-full" onClick={dismissCelebration} autoFocus>
        {celebrations.length > 1 ? `Nice! (${celebrations.length - 1} more)` : 'Nice!'}
      </button>
    </Modal>
  );
}
