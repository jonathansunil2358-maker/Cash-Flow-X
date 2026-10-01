import { ACCOUNT_IDS, ACCOUNTS, formatAccounting, monthLabel, trialBalanceTotal, type GameState } from '@cfx/engine';
import { useState } from 'react';
import { Card, Info, PageTitle, StatusPill, Tabs } from '../components/ui';

export function LedgerPage({ game }: { game: GameState }) {
  const [tab, setTab] = useState<'tb' | 'journal'>('tb');
  const b = game.ledger.balances;
  const total = trialBalanceTotal(b);
  const debits = ACCOUNT_IDS.reduce((a, id) => a + Math.max(0, b[id]), 0);
  const credits = ACCOUNT_IDS.reduce((a, id) => a + Math.max(0, -b[id]), 0);
  const [query, setQuery] = useState('');
  const journal = [...game.ledger.journal].reverse().filter((e) => !query || e.memo.toLowerCase().includes(query.toLowerCase()));
  return (
    <div>
      <PageTitle title="General ledger" subtitle="The source of truth. Every figure in the game is derived from these double-entry journals." actions={<Tabs value={tab} onChange={setTab} items={[{ id: 'tb', label: 'Trial balance' }, { id: 'journal', label: 'Journal' }]} />} />
      {tab === 'tb' ? (
        <Card title={`Trial balance at ${monthLabel(game.month)}`} actions={<StatusPill kind={total === 0 ? 'good' : 'bad'} label={total === 0 ? 'Debits = credits' : `Out by ${total}p`} />}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm tnum">
              <thead><tr className="border-b border-line text-xs text-muted"><th className="py-2 text-left font-medium">Account</th><th className="py-2 text-left font-medium">Type</th><th className="py-2 text-right font-medium">Debit</th><th className="py-2 text-right font-medium">Credit</th></tr></thead>
              <tbody>
                {ACCOUNT_IDS.filter((id) => b[id] !== 0).map((id) => (
                  <tr key={id} className="border-b border-line/60">
                    <td className="py-1.5"><span className="inline-flex items-center gap-1.5">{ACCOUNTS[id].name}<Info text={ACCOUNTS[id].help} /></span></td>
                    <td className="py-1.5 capitalize text-ink-2">{ACCOUNTS[id].type}</td>
                    <td className="py-1.5 text-right">{b[id] > 0 ? formatAccounting(b[id]) : ''}</td>
                    <td className="py-1.5 text-right">{b[id] < 0 ? formatAccounting(-b[id]) : ''}</td>
                  </tr>
                ))}
                <tr className="border-y-2 border-double border-ink/40 font-semibold"><td className="py-1.5">Total</td><td /><td className="py-1.5 text-right">{formatAccounting(debits)}</td><td className="py-1.5 text-right">{formatAccounting(credits)}</td></tr>
              </tbody>
            </table>
          </div>
        </Card>
      ) : (
        <Card title="Journal" subtitle="Most recent first. Debits positive, credits in brackets."
          actions={<input aria-label="Search journal" placeholder="Search memo…" value={query} onChange={(e) => setQuery(e.target.value)} className="rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm" />}>
          <div className="space-y-3">
            {journal.slice(0, 200).map((e) => (
              <div key={e.id} className="rounded-lg border border-line p-3 text-sm">
                <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{e.memo}</span>
                  <span className="text-xs text-muted">#{e.id} · {monthLabel(e.month)} · {e.kind ?? (e.cf === 'none' ? 'non-cash' : `${e.cf}${e.cfLabel ? `: ${e.cfLabel}` : ''}`)}</span>
                </div>
                <table className="w-full tnum">
                  <tbody>
                    {e.lines.map((l) => (
                      <tr key={l.account}>
                        <td className={`py-0.5 ${l.amount < 0 ? 'pl-6 text-ink-2' : ''}`}>{l.amount > 0 ? 'Dr' : 'Cr'} {ACCOUNTS[l.account].name}</td>
                        <td className="w-28 py-0.5 text-right">{l.amount > 0 ? formatAccounting(l.amount) : ''}</td>
                        <td className="w-28 py-0.5 text-right">{l.amount < 0 ? formatAccounting(-l.amount) : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
