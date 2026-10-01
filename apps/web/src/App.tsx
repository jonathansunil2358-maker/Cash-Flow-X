import {
  dailyStatus, DIFFICULTIES, formatGBP, INDUSTRIES, levelForXp, monthLabel, plSummary, prestigeCheck, unlocked, upgradeOptions, xpForLevel,
  type GameState,
} from '@cfx/engine';
import { lazy, Suspense, useEffect, useState, type ReactNode } from 'react';
import { useAccount } from './lib/account';
import { ONLINE } from './lib/api';
import { useAwayCatchUp, useGameClock } from './lib/clock';
import { CURRENCY_ICONS, iconUrl } from './lib/icons';
import { readPref, writePref } from './lib/save';
import { Books, FinancePanel } from './pages/Books';
import { BuildingCard } from './pages/BuildingCard';
import { Alerts, Dashboard } from './pages/Dashboard';
import { EventModal } from './pages/EventModal';
import { GameOver } from './pages/GameOver';
import { Legacy } from './pages/Legacy';
import { SignIn } from './pages/SignIn';
import { Social } from './pages/Social';
import { Missions } from './pages/Missions';
import { Onboarding } from './pages/Onboarding';
import { Operations, UpgradesPanel } from './pages/Operations';
import { Coach } from './pages/Coach';
import { CelebrationModal, OfflineModal } from './pages/Overlays';
import { Settings } from './pages/Settings';
import { Tutorial } from './pages/Tutorial';
import { useGame, type Sheet, type Speed } from './store';

const Scene3D = lazy(() => import('./scene/Scene3D'));

function useTheme() {
  const [theme, setTheme] = useState<string>(() => readPref('theme') ?? 'system');
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') root.removeAttribute('data-theme');
    else root.setAttribute('data-theme', theme);
    writePref('theme', theme);
  }, [theme]);
  return [theme, () => setTheme((t) => (t === 'system' ? 'dark' : t === 'dark' ? 'light' : 'system'))] as const;
}

export default function App() {
  const game = useGame((s) => s.game);
  const [theme, cycleTheme] = useTheme();
  const account = useAccount((s) => s.status);
  const refreshAccount = useGame((s) => s.refreshAccount);
  const signedIn = account === 'ready' || account === 'loading';
  // Load the account on start, then keep offers, holding company level and rewards fresh.
  useEffect(() => {
    if (!signedIn) return;
    void refreshAccount();
    const id = window.setInterval(() => { if (!document.hidden) void refreshAccount(); }, 60_000);
    return () => window.clearInterval(id);
  }, [signedIn, refreshAccount]);
  return (
    <div className="min-h-screen text-ink">
      {account === 'signed-out' ? <SignIn />
        : account === 'loading' ? <div className="grid min-h-screen place-items-center font-display text-2xl text-on-sky">Loading your account…</div>
        : game ? <GameShell game={game} theme={theme} cycleTheme={cycleTheme} /> : <Onboarding theme={theme} cycleTheme={cycleTheme} />}
      <Toasts />
    </div>
  );
}

const ICONS = {
  team: <svg viewBox="0 0 24 24" fill="#fff" stroke="#4a2c17" strokeWidth="1.8"><circle cx="9" cy="8" r="3.5" /><circle cx="17" cy="9" r="2.8" /><path d="M2.5 20c0-4 3-6.5 6.5-6.5s6.5 2.5 6.5 6.5z" /><path d="M15 14c3.5 0 6.5 2 6.5 6H17" /></svg>,
  upgrades: <svg viewBox="0 0 24 24" fill="#fff" stroke="#4a2c17" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 3l8 9h-5v9H9v-9H4z" /></svg>,
  finance: <svg viewBox="0 0 24 24" fill="#fff" stroke="#4a2c17" strokeWidth="1.8" strokeLinejoin="round"><path d="M3 9l9-6 9 6z" /><path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" /><path d="M3 20h18" /></svg>,
  missions: <svg viewBox="0 0 24 24" fill="#fff" stroke="#4a2c17" strokeWidth="1.8" strokeLinejoin="round"><path d="M12 2.5l2.9 5.9 6.5.9-4.7 4.6 1.1 6.5L12 17.3l-5.8 3.1 1.1-6.5-4.7-4.6 6.5-.9z" /></svg>,
  prestige: <svg viewBox="0 0 24 24" fill="#fff" stroke="#4a2c17" strokeWidth="1.8" strokeLinejoin="round"><path d="M3 8l4.5 4L12 4l4.5 8L21 8l-2 11H5z" /><path d="M5.5 21h13" /></svg>,
  books: <svg viewBox="0 0 24 24" fill="#fff" stroke="#4a2c17" strokeWidth="1.8" strokeLinejoin="round"><path d="M4 4h7c1.5 0 2 1 2 2v14c0-1-1-2-2-2H4z" /><path d="M20 4h-5c-1.5 0-2 1-2 2v14c0-1 1-2 2-2h5z" /></svg>,
  social: <svg viewBox="0 0 24 24" fill="#fff" stroke="#4a2c17" strokeWidth="1.8" strokeLinejoin="round"><path d="M4 21V9l8-6 8 6v12z" /><path d="M9 21v-6h6v6" /><path d="M12 8.5l.9 1.8 2 .3-1.4 1.4.3 2-1.8-1-1.8 1 .3-2-1.4-1.4 2-.3z" /></svg>,
  cog: <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6"><circle cx="12" cy="12" r="3.2" /><path d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3M5.3 5.3l2.1 2.1M16.6 16.6l2.1 2.1M5.3 18.7l2.1-2.1M16.6 7.4l2.1-2.1" /></svg>,
};

const SHEET_TITLES: Record<Sheet, string> = {
  team: 'Run the business', upgrades: 'Upgrades', finance: 'Finance', missions: 'Missions', books: 'The Books', legacy: 'Prestige & Legacy', social: 'Holding company & leaderboards', settings: 'Settings',
};

function GameShell({ game, theme, cycleTheme }: { game: GameState; theme: string; cycleTheme: () => void }) {
  const { sheet, openSheet, profile } = useGame();
  const playing = game.status === 'playing';
  useGameClock();
  useAwayCatchUp(playing);
  const syncNow = useGame((s) => s.syncNow);
  useEffect(() => {
    // Verify progress whenever the player leaves the tab.
    const onHide = () => { if (document.hidden) void syncNow(); };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [syncNow]);

  const sheetContent: Record<Sheet, ReactNode> = {
    team: <Operations game={game} />,
    upgrades: <UpgradesPanel game={game} />,
    finance: <FinancePanel game={game} />,
    missions: <Missions game={game} />,
    books: <Books game={game} />,
    legacy: <Legacy game={game} />,
    social: <Social game={game} />,
    settings: <Settings theme={theme} cycleTheme={cycleTheme} />,
  };
  const affordable = upgradeOptions(game).filter((o) => !o.maxed && !o.locked && o.cost <= game.ledger.balances.cash).length;
  const prestigeReady = prestigeCheck(game).eligible;
  const missionBadge = (dailyStatus(profile.daily, new Date().toISOString().slice(0, 10)).canClaim ? 1 : 0);

  return (
    <div className="mx-auto flex max-w-[1440px] items-start gap-5 lg:px-5">
      <main className="relative mx-auto flex w-full max-w-[480px] flex-col gap-2.5 px-3 pb-[112px] lg:mx-0 lg:max-w-[680px] lg:shrink-0 lg:pb-6" style={{ paddingTop: 'max(12px, env(safe-area-inset-top))' }}>
        <Hud game={game} />
        <XpBar />
        <SceneArea game={game} />
        {!playing && <GameOver game={game} />}
        <Alerts game={game} />
        <QuickStats game={game} />
        <Coach game={game} />
        <nav className="cfx-dock fixed inset-x-0 bottom-0 z-40 mx-auto max-w-[480px] lg:static lg:rounded-[32px] lg:shadow-[var(--edge)]" aria-label="Actions"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}>
          <DockCard tour="dock-team" label="Business" tone="" icon={ICONS.team} active={sheet === 'team'} onClick={() => openSheet(sheet === 'team' ? null : 'team')} />
          <DockCard tour="dock-upgrades" label="Upgrades" tone="is-go" icon={ICONS.upgrades} badge={affordable} active={sheet === 'upgrades'} onClick={() => openSheet(sheet === 'upgrades' ? null : 'upgrades')} />
          <DockCard tour="dock-finance" label="Finance" tone="is-coin" icon={ICONS.finance} active={sheet === 'finance'} onClick={() => openSheet(sheet === 'finance' ? null : 'finance')} />
          <DockCard tour="dock-missions" label="Missions" tone="is-gem" icon={ICONS.missions} badge={missionBadge} active={sheet === 'missions'} onClick={() => openSheet(sheet === 'missions' ? null : 'missions')} />
          <DockCard tour="dock-books" label="Books" tone="is-legacy" icon={ICONS.books} active={sheet === 'books'} onClick={() => openSheet(sheet === 'books' ? null : 'books')} />
          <DockCard tour="dock-prestige" label="Prestige" tone="is-legacy" icon={ICONS.prestige} badge={prestigeReady ? '!' : undefined} active={sheet === 'legacy'} onClick={() => openSheet(sheet === 'legacy' ? null : 'legacy')} />
        </nav>
      </main>

      {sheet ? (
        <div className="fixed inset-0 z-50 flex items-end bg-[#13324d]/50 lg:static lg:z-auto lg:flex-1 lg:bg-transparent lg:py-5" onClick={(e) => { if (e.target === e.currentTarget) openSheet(null); }}>
          <section role="dialog" aria-label={SHEET_TITLES[sheet]} data-sheet
            className="cfx-anim-sheet max-h-[90vh] w-full overflow-y-auto rounded-t-[32px] border-[3px] border-outline bg-surface p-4 shadow-[var(--lift)] lg:max-h-none lg:rounded-[32px]"
            style={{ paddingBottom: 'max(24px, env(safe-area-inset-bottom))' }}>
            <div className="sticky -top-4 z-10 -mx-4 -mt-4 mb-3 flex items-center justify-between border-b-[3px] border-outline bg-surface px-4 py-3">
              <span className="font-display text-xl">{SHEET_TITLES[sheet]}</span>
              <button type="button" className="cfx-icon-btn !h-10 !w-10 !bg-[var(--danger)]" aria-label="Close panel" onClick={() => openSheet(null)}>
                <svg viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </div>
            {sheetContent[sheet]}
          </section>
        </div>
      ) : (
        <aside className="hidden flex-1 py-5 lg:block" aria-label="Overview">
          <div className="rounded-[32px] border-[3px] border-outline bg-surface p-4 shadow-[var(--lift)]">
            <Dashboard game={game} />
          </div>
        </aside>
      )}

      <EventModal game={game} />
      <OfflineModal />
      <CelebrationModal />
      <Tutorial game={game} />
    </div>
  );
}

function Hud({ game }: { game: GameState }) {
  const { profile, openSheet } = useGame();
  const offers = useAccount((s) => s.me?.investments.offers.filter((o) => o.runId === game.server?.runId).length ?? 0);
  const cash = game.ledger.balances.cash;
  const prestige = prestigeCheck(game);
  return (
    <header className="cfx-hud flex-col !flex-nowrap !items-stretch !gap-2 !p-2.5">
      <div className="flex items-center gap-2.5">
        <img src={iconUrl(game.icon)} alt="" className="h-11 w-11 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="cfx-hud__name">{game.companyName}</div>
          <div className="cfx-hud__date">{monthLabel(game.month)} · Year {Math.floor(game.month / 12) + 1} · {DIFFICULTIES[game.difficulty].name}{game.difficulty === 'hard' ? ' ☠' : ''}</div>
        </div>
        {ONLINE && (
          <button type="button" className="cfx-icon-btn relative !bg-[var(--gem)]" style={{ boxShadow: 'inset 0 -5px 0 0 var(--gem-edge), var(--edge-sm)' }} aria-label={`Holding company and leaderboards${offers ? `, ${offers} investment offers` : ''}`} onClick={() => openSheet('social')}>
            {ICONS.social}
            {offers > 0 && <b className="cfx-dock-card__badge" aria-hidden>{offers}</b>}
          </button>
        )}
        <button type="button" className="cfx-icon-btn" aria-label="Settings" onClick={() => openSheet('settings')}>{ICONS.cog}</button>
      </div>
      <div className="flex flex-wrap gap-2 pl-2">
        <button type="button" data-tour="cash" className="cfx-pill" onClick={() => openSheet('finance')} aria-label={`Cash ${formatGBP(cash)}. Open Finance.`}>
          <img src={CURRENCY_ICONS.coin} alt="" /><span className={cash < 0 ? 'text-critical-text' : ''}>{formatGBP(cash, { compact: Math.abs(cash) >= 1_000_000_00 })}</span>
        </button>
        <button type="button" className="cfx-pill" onClick={() => openSheet('missions')} aria-label={`${profile.gems} gems. Open Missions.`}>
          <img src={CURRENCY_ICONS.gem} alt="" />{profile.gems}<span className="cfx-pill__plus" aria-hidden>+</span>
        </button>
        <button type="button" className={`cfx-pill ${prestige.eligible ? 'ring-4 ring-[var(--legacy)]' : ''}`} onClick={() => openSheet('legacy')}
          aria-label={`${profile.legacyPoints} Legacy points. Open Legacy.${prestige.eligible ? ' Prestige is ready.' : ''}`}>
          <img src={CURRENCY_ICONS.legacy} alt="" />{profile.legacyPoints}
        </button>
      </div>
    </header>
  );
}

function XpBar() {
  const xp = useGame((s) => s.profile.xp);
  const level = levelForXp(xp);
  const from = xpForLevel(level);
  const to = xpForLevel(level + 1);
  const pct = ((xp - from) / (to - from)) * 100;
  return (
    <div className="cfx-bar" style={{ ['--value' as string]: `${pct}%` }} role="meter" aria-label="Founder XP" aria-valuenow={xp - from} aria-valuemin={0} aria-valuemax={to - from}>
      <div className="cfx-bar__fill" />
      <div className="cfx-bar__text">Founder level {level} · {(xp - from).toLocaleString('en-GB')} / {(to - from).toLocaleString('en-GB')} XP</div>
    </div>
  );
}

function SceneArea({ game }: { game: GameState }) {
  const { speed, setSpeed, monthProgress, pops, profile, sheet, pauseOnPanels, scene3d, tourOpen } = useGame();
  const level = levelForXp(profile.xp);
  const paused = speed === 0 || !!game.pendingEvent || tourOpen || (pauseOnPanels && !!sheet);
  const speeds: { s: Speed; label: string; locked: boolean }[] = [
    { s: 0, label: 'II', locked: false },
    { s: 1, label: 'x1', locked: false },
    { s: 2, label: 'x2', locked: !unlocked(level, 'x2') },
    { s: 4, label: 'x4', locked: !unlocked(level, 'x4') },
  ];
  const r = 15;
  const circ = 2 * Math.PI * r;
  return (
    <section className="relative left-1/2 aspect-[8/5] max-h-[600px] min-h-[300px] w-[min(calc(100vw-32px),880px)] -translate-x-1/2 overflow-hidden lg:left-0 lg:w-full lg:translate-x-0 rounded-[32px] border-[3px] border-outline shadow-[var(--lift)]" aria-label="Your business" data-tour="scene">
      {scene3d ? (
        <Suspense fallback={<div className="grid h-full place-items-center font-display text-lg text-on-sky">Building your plot…</div>}>
          <Scene3D game={game} />
        </Suspense>
      ) : (
        <div className="grid h-full place-items-center rounded-[32px] border-[3px] border-outline bg-[var(--grass)]">
          <img src={iconUrl(game.icon)} alt="" className="h-28 w-28 drop-shadow-[0_6px_0_rgba(0,0,0,0.25)]" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 top-[22%] flex flex-col items-center gap-1" aria-hidden>
        {pops.slice(-2).map((p) => (
          <div key={p.id} className="cfx-anim-rise whitespace-nowrap font-display text-2xl"
            style={{ color: p.good ? '#ffc633' : '#ff7a70', WebkitTextStroke: '5px #4a2c17', paintOrder: 'stroke fill' }}>
            {p.text}
          </div>
        ))}
      </div>
      <div className="absolute left-1 top-1 flex items-center gap-2 rounded-full border-[3px] border-outline bg-surface py-1 pl-1 pr-3 shadow-[var(--edge-sm)]">
        <svg width="36" height="36" viewBox="0 0 36 36" aria-hidden>
          <circle cx="18" cy="18" r={r} fill="none" stroke="var(--panel-sunken)" strokeWidth="5" />
          <circle cx="18" cy="18" r={r} fill="none" stroke={paused ? 'var(--danger)' : 'var(--go)'} strokeWidth="5" strokeLinecap="round"
            strokeDasharray={circ} strokeDashoffset={circ * (1 - monthProgress)} transform="rotate(-90 18 18)" />
        </svg>
        {/* On narrow screens the red ring shows the pause; the word stays for screen readers. */}
        <span className="text-sm font-black" aria-live="polite">{monthLabel(game.month)}{paused && game.status === 'playing' && <span className="max-[420px]:sr-only"> · paused</span>}</span>
      </div>
      <div className="cfx-speed absolute right-1 top-1" data-tour="clock" role="group" aria-label="Game speed">
        {speeds.map((o) => (
          <button key={o.s} type="button" className={o.s === 0 ? 'is-pause' : ''} aria-pressed={speed === o.s} disabled={o.locked || game.status !== 'playing'}
            title={o.locked ? `Unlocks at founder level ${o.s === 2 ? 2 : 5}` : undefined} onClick={() => setSpeed(o.s)}
            aria-label={o.locked ? `${o.label} (locked)` : undefined} style={o.locked ? { opacity: 0.35 } : undefined}>
            {o.label}
          </button>
        ))}
      </div>
      <BuildingCard game={game} />
    </section>
  );
}

function QuickStats({ game }: { game: GameState }) {
  const last = game.history.at(-1);
  const pl = last ? plSummary(last.period.pl) : null;
  const k = last?.kpis;
  const subscription = INDUSTRIES[game.industryId].model === 'subscription';
  const cells = [
    { label: 'Revenue / mo', value: pl ? formatGBP(pl.revenue, { compact: true }) : '—' },
    { label: 'Profit / mo', value: pl ? formatGBP(pl.profit, { compact: true }) : '—', bad: (pl?.profit ?? 0) < 0 },
    { label: subscription ? 'Customers' : 'Sold / mo', value: k ? (subscription ? k.customers : k.unitsSold).toLocaleString('en-GB') : '—' },
  ];
  return (
    <div className="grid grid-cols-3 gap-2" data-tour="stats">
      {cells.map((c) => (
        <div key={c.label} className="cfx-stat !gap-0.5 !px-2.5 !py-2">
          <span className="cfx-stat__label !text-[10px]">{c.label}</span>
          <span className={`tnum text-lg font-black ${c.bad ? 'text-critical-text' : ''}`}>{c.value}</span>
        </div>
      ))}
    </div>
  );
}

function DockCard({ tour, label, tone, icon, badge, active, onClick }: { tour: string; label: string; tone: string; icon: ReactNode; badge?: number | string; active: boolean; onClick: () => void }) {
  return (
    <button type="button" data-tour={tour} className={`cfx-dock-card ${tone}`} onClick={onClick} aria-pressed={active} style={active ? { transform: 'translateY(3px)', boxShadow: 'inset 0 -3px 0 0 var(--edge-c), var(--edge-pressed)' } : undefined}>
      {icon}
      <span>{label}</span>
      {!!badge && badge !== 0 && <b className="cfx-dock-card__badge" aria-label={badge === '!' ? 'Prestige is ready' : `${badge} new`}>{badge}</b>}
    </button>
  );
}

function Toasts() {
  const { toasts, dismissToast, sheet } = useGame();
  const where = sheet ? 'top-[max(12px,env(safe-area-inset-top))]' : 'bottom-[calc(env(safe-area-inset-bottom)+112px)] lg:bottom-6';
  return (
    <div className={`pointer-events-none fixed left-1/2 z-[60] flex w-[min(94vw,440px)] -translate-x-1/2 flex-col gap-2 ${where}`} aria-live="polite">
      {toasts.map((t) => {
        const icon = t.kind === 'good' ? CURRENCY_ICONS.coin : t.kind === 'bad' || t.kind === 'error' ? iconUrl('flame') : t.kind === 'success' ? iconUrl('star') : CURRENCY_ICONS.xp;
        return (
          <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'} className="cfx-toast cfx-anim-pop pointer-events-auto !max-w-none !rounded-[22px]">
            <img src={icon} alt="" />
            <span className="flex-1 text-[13px] leading-snug">{t.text}</span>
            <button type="button" className="px-1 text-lg font-black text-ink-2" aria-label="Dismiss" onClick={() => dismissToast(t.id)}>×</button>
          </div>
        );
      })}
    </div>
  );
}
