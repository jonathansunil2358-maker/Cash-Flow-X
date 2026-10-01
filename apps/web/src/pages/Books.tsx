import { levelForXp, LEVEL_UNLOCKS, unlocked, type GameState } from '@cfx/engine';
import { useState } from 'react';
import { Tabs } from '../components/ui';
import { useAccount } from '../lib/account';
import { ONLINE } from '../lib/api';
import { useGame, type BooksTab } from '../store';
import { Analysis } from './Analysis';
import { Dashboard } from './Dashboard';
import { Deals } from './Deals';
import { ListingCard } from './Growth';
import { Finance } from './Finance';
import { Financials } from './Financials';
import { ForecastPage } from './Forecast';
import { LedgerPage } from './Ledger';
import { Investors } from './Investors';
import { Market } from './Market';
import { ValuationPage } from './Valuation';

const TABS: { id: BooksTab; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'statements', label: 'Statements' },
  { id: 'analysis', label: 'Ratios' },
  { id: 'forecast', label: 'Forecast' },
  { id: 'valuation', label: 'Valuation' },
  { id: 'market', label: 'Market' },
  { id: 'ledger', label: 'Ledger' },
];

/** The Books: the full accounting behind the game, one tab per view. */
export function Books({ game }: { game: GameState }) {
  const { booksTab, setBooksTab } = useGame();
  return (
    <div className="space-y-4">
      <Tabs value={booksTab} onChange={setBooksTab} items={TABS} />
      {booksTab === 'overview' && <Dashboard game={game} />}
      {booksTab === 'statements' && <Financials game={game} />}
      {booksTab === 'analysis' && <Analysis game={game} />}
      {booksTab === 'forecast' && <ForecastPage game={game} />}
      {booksTab === 'valuation' && <ValuationPage game={game} />}
      {booksTab === 'market' && <Market game={game} />}
      {booksTab === 'ledger' && <LedgerPage game={game} />}
    </div>
  );
}

/** Finance panel: funding, and M&A once unlocked by founder level. */
export function FinancePanel({ game }: { game: GameState }) {
  const level = useGame((s) => levelForXp(s.profile.xp));
  const [tab, setTab] = useState<'funding' | 'investors' | 'deals'>('funding');
  const offers = useAccount((s) => s.me?.investments.offers.filter((o) => o.runId === game.server?.runId).length ?? 0);
  const canDeal = unlocked(level, 'acquisitions');
  const needed = LEVEL_UNLOCKS.find((u) => u.feature === 'acquisitions')!.level;
  return (
    <div className="space-y-4">
      <Tabs value={tab} onChange={setTab} items={[{ id: 'funding', label: 'Funding' }, ...(ONLINE ? [{ id: 'investors' as const, label: offers ? `Investors (${offers})` : 'Investors' }] : []), { id: 'deals', label: canDeal ? 'M&A' : `M&A (level ${needed})` }]} />
      {tab === 'funding' && <><Finance game={game} /><ListingCard game={game} /></>}
      {tab === 'investors' && <Investors game={game} />}
      {tab === 'deals' && (canDeal ? <Deals game={game} /> : (
        <p className="rounded-2xl border-[3px] border-outline bg-surface-2 p-4 text-sm">Mergers & acquisitions unlock at founder level {needed}. You are level {level}: earn XP by closing months, making decisions and completing missions.</p>
      ))}
    </div>
  );
}
