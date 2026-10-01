import { formatGBP, formatPct, GUILD_LEVELS, INDUSTRIES, type GameState } from '@cfx/engine';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, KeyValue, Meter, MoneyInput, StatusPill, Tabs } from '../components/ui';
import { useAccount } from '../lib/account';
import { api, type Board, type BoardEntry, type GuildDetail, type GuildMember, type GuildSummary, type Visibility } from '../lib/api';
import { ICON_LABELS, ICON_ORDER, iconUrl } from '../lib/icons';
import { useGame } from '../store';

type Tab = 'guild' | 'boards' | 'portfolio';

export function Social({ game }: { game: GameState }) {
  const [tab, setTab] = useState<Tab>('guild');
  const me = useAccount((s) => s.me);
  if (!me) return <p className="text-sm text-ink-2">Sign in to join a holding company and appear on leaderboards.</p>;
  return (
    <div className="space-y-4">
      <Tabs value={tab} onChange={setTab} items={[{ id: 'guild', label: 'Holding company' }, { id: 'boards', label: 'Leaderboards' }, { id: 'portfolio', label: 'Portfolio' }]} />
      {tab === 'guild' && <Guild game={game} />}
      {tab === 'boards' && <Leaderboards />}
      {tab === 'portfolio' && <Portfolio />}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Holding company
// ---------------------------------------------------------------------------------------------

function useAsync() {
  const toast = useGame((s) => s.toast);
  const refreshAccount = useGame((s) => s.refreshAccount);
  return useCallback(async <T,>(fn: () => Promise<T>, ok?: string): Promise<T | null> => {
    try {
      const r = await fn();
      if (ok) toast('success', ok);
      await refreshAccount();
      return r;
    } catch (e) {
      toast('error', (e as Error).message);
      return null;
    }
  }, [toast, refreshAccount]);
}

function Guild({ game }: { game: GameState }) {
  const me = useAccount((s) => s.me)!;
  const [detail, setDetail] = useState<GuildDetail | null>(null);
  const [reload, setReload] = useState(0);
  const guildId = me.guild?.id;
  useEffect(() => {
    let live = true;
    if (guildId) api.guild(guildId).then((d) => live && setDetail(d)).catch(() => live && setDetail(null));
    else setDetail(null);
    return () => { live = false; };
  }, [guildId, reload]);
  if (!guildId) return <FindGuild />;
  if (!detail) return <p className="text-sm text-ink-2">Loading your holding company…</p>;
  return <GuildView detail={detail} game={game} onChange={() => setReload((x) => x + 1)} />;
}

function FindGuild() {
  const run = useAsync();
  const [q, setQ] = useState('');
  const [list, setList] = useState<GuildSummary[] | null>(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('crown');
  useEffect(() => {
    let live = true;
    const t = setTimeout(() => api.guilds(q).then((r) => live && setList(r.guilds)).catch(() => live && setList([])), 250);
    return () => { live = false; clearTimeout(t); };
  }, [q]);
  return (
    <div className="space-y-4">
      <Card title="Join a holding company" subtitle="Holding companies are groups of up to 30 founders. Members share perks from the group's combined valuation, chase weekly goals, and can invest in each other.">
        <input aria-label="Search holding companies" placeholder="Search by name…" value={q} onChange={(e) => setQ(e.target.value)}
          className="mb-3 w-full rounded-2xl border-[3px] border-outline bg-surface-2 px-3 py-2 font-extrabold text-ink" />
        {list === null && <p className="text-sm text-ink-2">Loading…</p>}
        {list?.length === 0 && <p className="text-sm text-ink-2">No holding companies found. Start one below.</p>}
        <div className="space-y-2">
          {list?.map((g) => (
            <div key={g.id} className="cfx-rank !grid-cols-[44px_1fr_auto]">
              <img src={iconUrl(g.icon)} alt="" />
              <div className="cfx-rank__who"><div className="cfx-rank__name">{g.name}</div><div className="cfx-rank__sub">{g.members}/30 members · level {g.level} · {formatGBP(g.valuation, { compact: true })}</div></div>
              <Button variant="go" disabled={g.full} onClick={() => run(() => api.joinGuild(g.id), `Joined ${g.name}.`)}>{g.full ? 'Full' : 'Join'}</Button>
            </div>
          ))}
        </div>
      </Card>
      <Card title="Start your own">
        <label className="block text-xs font-black tracking-wider text-ink-2" htmlFor="guild-name">NAME</label>
        <input id="guild-name" maxLength={30} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Northwind Holdings"
          className="mt-1 w-full rounded-2xl border-[3px] border-outline bg-surface-2 px-3 py-2 font-extrabold text-ink" />
        <div className="mt-3 grid grid-cols-8 gap-1.5" role="radiogroup" aria-label="Holding company icon">
          {ICON_ORDER.slice(0, 16).map((id) => (
            <button key={id} type="button" role="radio" aria-checked={icon === id} aria-pressed={icon === id} aria-label={ICON_LABELS[id]} className="cfx-tile !grid aspect-square place-items-center !p-1" onClick={() => setIcon(id)}>
              <img src={iconUrl(id)} alt="" />
            </button>
          ))}
        </div>
        <Button variant="primary" className="mt-3" disabled={name.trim().length < 3} onClick={() => run(() => api.createGuild(name, icon), `${name} is open for members.`)}>Create holding company</Button>
      </Card>
    </div>
  );
}

function GuildView({ detail, game, onChange }: { detail: GuildDetail; game: GameState; onChange: () => void }) {
  const me = useAccount((s) => s.me)!;
  const addGems = useGame((s) => s.addGems);
  const run = useAsync();
  const [confirmLeave, setConfirmLeave] = useState(false);
  const next = detail.nextLevel;
  const levelFrom = GUILD_LEVELS.find((l) => l.level === detail.level)!.combinedValuation;
  return (
    <div className="space-y-4">
      <section className="cfx-hud !flex-nowrap !p-3">
        <img src={iconUrl(detail.icon)} alt="" className="h-14 w-14" />
        <div className="min-w-0 flex-1">
          <div className="cfx-hud__name !text-[22px]">{detail.name}</div>
          <div className="cfx-hud__date">Level {detail.level} · {detail.members.length}/30 members · {detail.perks}</div>
        </div>
        <div className="text-right"><div className="text-[11px] font-black text-ink-2">COMBINED</div><div className="tnum text-lg font-black">{formatGBP(detail.valuation, { compact: true })}</div></div>
      </section>
      {next && (
        <Meter value={detail.valuation - levelFrom} max={next.combinedValuation - levelFrom} tone="legacy" label="Progress to next level"
          text={`Level ${next.level} at ${formatGBP(next.combinedValuation, { compact: true })}: ${next.label}`} />
      )}
      {game.difficulty === 'hard' && <p className="text-xs font-bold text-ink-2">Hard mode: holding company perks don't apply to this company.</p>}

      <Card title="Weekly goal" subtitle={`Members' combined profit this week (${detail.weekly.week}).`}>
        <Meter value={Math.max(0, detail.weekly.profit)} max={detail.weekly.target} tone="go" label="Weekly goal"
          text={`${formatGBP(detail.weekly.profit, { compact: true })} of ${formatGBP(detail.weekly.target, { compact: true })}`} />
        <Button variant="gem" className="mt-3" disabled={!detail.weekly.done || detail.weekly.claimed}
          onClick={async () => { const r = await run(() => api.claimWeekly()); if (r) { addGems(r.gems, 'weekly goal'); onChange(); } }}>
          {detail.weekly.claimed ? 'Claimed this week' : detail.weekly.done ? `Claim ${detail.weekly.gems} gems` : `${detail.weekly.gems} gems when reached`}
        </Button>
      </Card>

      <Card title="Members">
        <div className="space-y-2">
          {detail.members.map((m) => <MemberRow key={m.id} m={m} isMe={m.id === me.user.id} canInvest={m.id !== me.user.id && m.playing} onChange={onChange} />)}
        </div>
      </Card>

      <Card title="Your visibility" subtitle="What other members can see of your company.">
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Visibility">
          {(['full', 'summary', 'hidden'] as Visibility[]).map((v) => (
            <Button key={v} variant={me.user.visibility === v ? 'primary' : 'secondary'} aria-pressed={me.user.visibility === v}
              onClick={() => run(() => api.updateMe({ visibility: v }), 'Visibility updated.')}>
              {v === 'full' ? 'Full financials' : v === 'summary' ? 'Summary card' : 'Hidden'}
            </Button>
          ))}
        </div>
      </Card>

      <Card title="Leave">
        {!confirmLeave ? <Button variant="danger" onClick={() => setConfirmLeave(true)}>Leave {detail.name}</Button> : (
          <div className="space-y-2">
            <p className="text-sm">Any shares between you and other members will be bought out at the current valuation, and pending offers refunded. Leave?</p>
            <div className="flex gap-2">
              <Button variant="danger" onClick={() => run(() => api.leaveGuild(), `You left ${detail.name}.`)}>Yes, leave</Button>
              <Button onClick={() => setConfirmLeave(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function MemberRow({ m, isMe, canInvest, onChange }: { m: GuildMember; isMe: boolean; canInvest: boolean; onChange: () => void }) {
  const me = useAccount((s) => s.me)!;
  const run = useAsync();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(10_000_00);
  return (
    <div className={`rounded-2xl border-[3px] border-outline ${isMe ? 'bg-surface-2' : 'bg-surface'}`}>
      <button type="button" className="flex w-full items-center gap-3 p-2.5 text-left" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <img src={iconUrl(m.icon)} alt="" className="h-11 w-11" />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-lg leading-tight">{m.name}{isMe ? ' (you)' : ''}</span>
          <span className="block text-xs font-bold text-ink-2">
            {m.role} · {m.summary ? `${m.summary.companyName} · ${INDUSTRIES[m.summary.industryId]?.name ?? ''}` : m.playing ? 'Company hidden' : 'Between companies'}
            {m.hardcore ? ' · ☠ Hardcore' : ''}
          </span>
        </span>
        <span className="tnum font-black">{m.valuation === null ? '—' : formatGBP(m.valuation, { compact: true })}</span>
      </button>
      {open && (
        <div className="space-y-3 border-t-[3px] border-outline p-3 text-sm">
          {m.summary && (
            <KeyValue rows={[
              ['Revenue (12 months)', formatGBP(m.summary.revenue)],
              ['Profit (12 months)', formatGBP(m.summary.profit)],
              ['Staff', String(m.summary.headcount)],
              ['Owner holds', formatPct(m.summary.ownership)],
              ['Prestiges', String(m.prestiges)],
            ]} />
          )}
          {m.financials && (
            <div className="grid gap-2 sm:grid-cols-2">
              <div className="cfx-well">
                <div className="mb-1 font-display">Income statement (12m)</div>
                <KeyValue rows={[
                  ['Revenue', formatGBP(m.financials.pl.revenue)], ['Gross profit', formatGBP(m.financials.pl.grossProfit)],
                  ['EBITDA', formatGBP(m.financials.pl.ebitda)], ['Profit after tax', formatGBP(m.financials.pl.profit)],
                ]} />
              </div>
              <div className="cfx-well">
                <div className="mb-1 font-display">Balance sheet</div>
                <KeyValue rows={[
                  ['Cash', formatGBP(m.financials.bs.cash)], ['Total assets', formatGBP(m.financials.bs.totalAssets)],
                  ['Borrowings', formatGBP(m.financials.bs.borrowings)], ['Total equity', formatGBP(m.financials.bs.totalEquity)],
                ]} />
              </div>
            </div>
          )}
          {!m.summary && !isMe && <p className="text-ink-2">{m.name} keeps their company private.</p>}
          {canInvest && (
            <div className="flex flex-wrap items-end gap-2">
              <label className="block">
                <span className="mb-1 block text-xs font-black text-ink-2">INVEST FROM PERSONAL CASH ({formatGBP(me.user.personalCash)})</span>
                <MoneyInput value={amount} onChange={setAmount} step={5000} aria-label="Investment amount" />
              </label>
              <Button variant="gem" disabled={amount > me.user.personalCash || amount < 1_000_00}
                onClick={async () => { if (await run(() => api.invest(m.id, amount), `Offer sent to ${m.name}. They'll accept or decline in their game.`)) onChange(); }}>
                Offer {formatGBP(amount, { compact: true })}
              </Button>
              <p className="w-full text-xs text-ink-2">You buy new shares at their company's latest verified valuation. Outside investors can own at most 49%. You receive a share of their dividends, and are bought out at valuation if they prestige or either of you leaves.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Leaderboards
// ---------------------------------------------------------------------------------------------

const BOARD_LABELS: Record<Board, string> = { networth: 'Net worth', prestige: 'Prestige', guilds: 'Holding cos' };
const BOARD_HELP: Record<Board, string> = {
  networth: 'Your stake in your company + personal cash + stakes in other players. Season = highest this month.',
  prestige: 'Number of prestiges. Season = prestiges this month.',
  guilds: 'Combined valuation of members\' companies. Season = highest this month.',
};

function Leaderboards() {
  const me = useAccount((s) => s.me)!;
  const addGems = useGame((s) => s.addGems);
  const run = useAsync();
  const [board, setBoard] = useState<Board>('networth');
  const [period, setPeriod] = useState<'season' | 'all'>('season');
  const [data, setData] = useState<{ entries: BoardEntry[]; season: string; seasonEnds: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    setData(null);
    setError(null);
    api.leaderboard(board, period).then((d) => live && setData(d)).catch((e: Error) => live && setError(e.message));
    return () => { live = false; };
  }, [board, period]);
  const days = data ? Math.max(0, Math.ceil((Date.parse(data.seasonEnds) - Date.now()) / 86_400_000)) : 0;
  const unclaimed = me.seasonRewards.rewards.filter((r) => !r.claimed);
  const fmt = (e: BoardEntry) => (board === 'prestige' ? `${e.value} ${e.value === 1 ? 'prestige' : 'prestiges'}` : formatGBP(e.value, { compact: true }));
  return (
    <div className="space-y-3">
      {unclaimed.map((r) => (
        <div key={r.board} className="cfx-toast !max-w-none">
          <img src={iconUrl('crown')} alt="" />
          <span className="flex-1">You finished #{r.rank} on {BOARD_LABELS[r.board]} in {me.seasonRewards.season}!</span>
          <Button variant="gem" onClick={async () => { const x = await run(() => api.claimSeason(r.board)); if (x) addGems(x.gems, `season rank #${x.rank}`); }}>Claim {r.gems}</Button>
        </div>
      ))}
      <Tabs value={board} onChange={setBoard} items={(Object.keys(BOARD_LABELS) as Board[]).map((b) => ({ id: b, label: BOARD_LABELS[b] }))} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Tabs value={period} onChange={setPeriod} items={[{ id: 'season', label: 'This month' }, { id: 'all', label: 'All time' }]} />
        {period === 'season' && data && <span className="text-xs font-bold text-ink-2">Season ends in {days} day{days === 1 ? '' : 's'} · top 10 win gems</span>}
      </div>
      <p className="text-xs text-ink-2">{BOARD_HELP[board]} Every figure comes from runs the server has replayed and verified.</p>
      {error && <p className="text-sm font-bold text-critical-text">{error}</p>}
      {!data && !error && <p className="text-sm text-ink-2">Loading…</p>}
      {data?.entries.length === 0 && <p className="text-sm text-ink-2">No entries yet this season. Be the first.</p>}
      <div className="space-y-2">
        {data?.entries.map((e, i) => (
          <div key={e.id} className={`cfx-rank ${e.me ? 'is-me' : ''}`}>
            <span className={`cfx-rank__pos ${i < 3 ? `is-${i + 1}` : ''}`}>{i + 1}</span>
            <img src={iconUrl(e.icon)} alt="" />
            <div className="cfx-rank__who">
              <div className="cfx-rank__name">{e.name}{e.me ? ' (you)' : ''}</div>
              <div className="cfx-rank__sub">{e.sub ?? ' '}{e.hardcore && <span className="cfx-tag is-hard ml-1 !px-1.5 !py-0.5 !text-[10px]">☠ Hardcore</span>}</div>
            </div>
            <span className="cfx-rank__value">{fmt(e)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------------------------
// Portfolio
// ---------------------------------------------------------------------------------------------

function Portfolio() {
  const me = useAccount((s) => s.me)!;
  const stakes = me.investments.holdings;
  const stakeValue = stakes.reduce((a, h) => a + h.value, 0);
  const labels: Record<string, [string, 'good' | 'ok' | 'bad' | 'warn' | 'na']> = {
    offered: ['Offer pending', 'warn'], accepted: ['Shareholder', 'good'], 'buyout-requested': ['Being bought out', 'warn'],
    'bought-out': ['Bought out', 'ok'], declined: ['Declined', 'na'], expired: ['Expired', 'na'], 'written-off': ['Written off', 'bad'],
  };
  return (
    <div className="space-y-4">
      <Card title="Your net worth" subtitle="This is what the Net worth leaderboard ranks.">
        <KeyValue rows={[
          ['Personal cash (dividends and investment returns)', formatGBP(me.user.personalCash)],
          ['Stakes in other players\' companies', formatGBP(stakeValue)],
          ['Net worth (includes your own stake)', formatGBP(me.netWorth)],
        ]} />
        <p className="mt-2 text-xs text-ink-2">Pay yourself dividends (Finance) to build personal cash, then invest it in other members of your holding company.</p>
      </Card>
      <Card title="Your investments">
        {stakes.length === 0 && <p className="text-sm text-ink-2">No investments yet.</p>}
        <div className="space-y-2">
          {stakes.map((h) => (
            <div key={h.id} className="cfx-rank !grid-cols-[44px_1fr_auto]">
              <img src={iconUrl(h.icon)} alt="" />
              <div className="cfx-rank__who">
                <div className="cfx-rank__name">{h.companyName}</div>
                <div className="cfx-rank__sub">{h.investeeName} · invested {formatGBP(h.invested, { compact: true })} · dividends {formatGBP(h.dividends, { compact: true })}{h.buyout ? ` · paid out ${formatGBP(h.buyout, { compact: true })}` : ''}</div>
              </div>
              <div className="grid justify-items-end gap-1">
                <span className="cfx-rank__value">{h.value ? formatGBP(h.value, { compact: true }) : '—'}</span>
                <StatusPill kind={labels[h.status]?.[1] ?? 'na'} label={labels[h.status]?.[0] ?? h.status} />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
