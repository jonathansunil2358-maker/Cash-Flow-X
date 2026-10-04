import {
  CARDS, cardDef, cardsOf, formatGBP, seasonTheme, type Action, type GameState,
} from '@cfx/engine';
import { useEffect, useState } from 'react';
import { Button, Card, Field, TextInput } from '../components/ui';
import { api, type CoopList, type CoopView, type GuildRivalView, type HallView } from '../lib/api';
import { useGame } from '../store';

const describe = (a: Action): string => {
  const x = a as unknown as Record<string, unknown>;
  switch (x.type) {
    case 'setPrice': return `Set the price to ${formatGBP(Number(x.price))}`;
    case 'setMarketing': return `Set the marketing budget to ${formatGBP(Number(x.amount), { compact: true })} a month`;
    case 'hire': return `Hire ${x.count} × ${x.role}`;
    case 'fire': return `Let go ${x.count} × ${x.role}`;
    case 'setPay': return `Set pay to ${x.level}`;
    case 'startPromo': return `Run a ${x.discountPct}% promotion for ${x.months} month(s)`;
    case 'setTraining': return `Set training to ${formatGBP(Number(x.amount), { compact: true })} a month`;
    case 'setDesign': return `Set the product to ${x.features} features`;
    case 'replyReview': return `Reply to review ${Number(x.index) + 1}`;
    case 'setSupplier': return `Switch to the ${x.supplier} supplier`;
    default: return String(x.type);
  }
};

/** The suggestions a friend can send, as simple forms. */
const KINDS: { id: string; label: string; make: (n: number, s: string) => unknown; field: string }[] = [
  { id: 'price', label: 'Set the price (pounds)', field: 'Pounds', make: (n) => ({ type: 'setPrice', price: Math.round(n) * 100 }) },
  { id: 'marketing', label: 'Set marketing (pounds a month)', field: 'Pounds', make: (n) => ({ type: 'setMarketing', amount: Math.round(n) * 100 }) },
  { id: 'hire', label: 'Hire operations staff', field: 'How many', make: (n) => ({ type: 'hire', role: 'ops', count: Math.round(n) }) },
  { id: 'promo', label: 'Run a 10% promotion (months)', field: 'Months', make: (n) => ({ type: 'startPromo', discountPct: 10, months: Math.round(n) }) },
  { id: 'design', label: 'Set product features (0 to 100)', field: 'Features', make: (n) => ({ type: 'setDesign', features: Math.round(n) }) },
];

/** Co-op: a friend advises or watches your company; only you can act. */
export function CoopCard() {
  const { act, toast } = useGame();
  const [list, setList] = useState<CoopList | null>(null);
  const [code, setCode] = useState('');
  const [view, setView] = useState<CoopView | null>(null);
  const [kind, setKind] = useState(KINDS[0].id);
  const [num, setNum] = useState(10);
  const [note, setNote] = useState('');
  const reload = () => api.coopMine().then(setList).catch(() => setList(null));
  useEffect(() => { void reload(); }, []);
  useEffect(() => {
    if (!view) return undefined;
    const t = setInterval(() => { api.coopView(view.code).then(setView).catch(() => undefined); }, 30_000);
    return () => clearInterval(t);
  }, [view?.code]); // eslint-disable-line react-hooks/exhaustive-deps
  const run = async (f: () => Promise<unknown>) => { try { await f(); } catch (e) { toast('error', (e as Error).message); } };
  const open = (c: string) => run(async () => setView(await api.coopView(c)));
  return (
    <Card fold id="card-coop" title="Co-op" subtitle="Run a company with a friend. Give them a link: they can watch your company live, or advise you with suggestions that you apply with one tap. Only you can act on your company.">
      <div className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => run(async () => { const r = await api.coopCreate('advise'); toast('success', `Advice link ${r.code} made.`); await reload(); })}>New advice link</Button>
          <Button onClick={() => run(async () => { const r = await api.coopCreate('watch'); toast('success', `Watch link ${r.code} made.`); await reload(); })}>New watch link</Button>
        </div>
        {list && list.mine.length > 0 && (
          <ul className="space-y-1 text-sm">
            {list.mine.map((l) => (
              <li key={l.code} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-2">
                <span><b className="tnum">{l.code}</b> · {l.role === 'advise' ? 'advice' : 'watch'} · {l.members} friend{l.members === 1 ? '' : 's'}{l.open ? ` · ${l.open} to review` : ''}</span>
                <span className="flex gap-2"><Button onClick={() => open(l.code)}>Open</Button><Button variant="ghost" onClick={() => run(async () => { await api.coopRevoke(l.code); await reload(); })}>Remove</Button></span>
              </li>
            ))}
          </ul>
        )}
        <div className="flex flex-wrap items-end gap-2">
          <Field label="Join a friend's link"><TextInput aria-label="Link code" value={code} maxLength={10} className="w-36 uppercase" onChange={(e) => setCode(e.target.value.toUpperCase())} /></Field>
          <Button disabled={code.length < 6} onClick={() => run(async () => { await api.coopJoin(code); setCode(''); await reload(); toast('success', 'Joined.'); })}>Join</Button>
        </div>
        {list && list.joined.length > 0 && (
          <ul className="space-y-1 text-sm">
            {list.joined.map((l) => <li key={l.code} className="flex items-center justify-between gap-2 rounded-lg border border-line p-2"><span>{l.owner} · {l.role === 'advise' ? 'you advise' : 'you watch'}</span><Button onClick={() => open(l.code)}>Open</Button></li>)}
          </ul>
        )}
        {view && (
          <div className="rounded-lg border-2 border-line p-3" aria-label="Co-op view">
            <div className="font-display text-lg">{view.snapshot.company ?? 'No company yet'} <span className="text-xs text-ink-2">({view.snapshot.owner})</span></div>
            <p className="text-sm">{view.snapshot.status === 'none' ? 'No active company right now.' : `Month ${view.snapshot.month} · worth ${formatGBP(view.snapshot.equityValue, { compact: true })} · stake ${formatGBP(view.snapshot.ownerStake, { compact: true })} · profit to date ${formatGBP(view.snapshot.profitToDate, { compact: true })} · ${view.snapshot.status}`}</p>
            {view.suggestions.length > 0 && (
              <ul className="mt-2 space-y-1 text-sm">
                {view.suggestions.map((s) => (
                  <li key={s.id} className="flex flex-wrap items-center justify-between gap-2 rounded border border-line p-2">
                    <span><b>{s.from}</b>: {describe(s.action)}{s.note ? ` ("${s.note}")` : ''} <span className="text-xs text-ink-2">[{s.status}]</span></span>
                    {view.isOwner && s.status === 'open' && (
                      <span className="flex gap-2">
                        <Button variant="primary" onClick={() => run(async () => { act(s.action, 'Done.'); await api.coopResolve(s.id, 'done'); setView(await api.coopView(view.code)); await reload(); })}>Do it</Button>
                        <Button variant="ghost" onClick={() => run(async () => { await api.coopResolve(s.id, 'dismissed'); setView(await api.coopView(view.code)); await reload(); })}>Dismiss</Button>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
            {!view.isOwner && view.role === 'advise' && (
              <div className="mt-3 flex flex-wrap items-end gap-2">
                <Field label="Suggestion">
                  <select aria-label="Suggestion type" value={kind} onChange={(e) => setKind(e.target.value)} className="rounded-lg border border-line bg-page px-2 py-1.5 text-sm">{KINDS.map((k) => <option key={k.id} value={k.id}>{k.label}</option>)}</select>
                </Field>
                <Field label={KINDS.find((k) => k.id === kind)!.field}><TextInput aria-label="Value" type="number" value={num} className="w-24" onChange={(e) => setNum(Number(e.target.value))} /></Field>
                <Field label="Note"><TextInput aria-label="Note" value={note} maxLength={140} className="w-44" onChange={(e) => setNote(e.target.value)} /></Field>
                <Button variant="primary" onClick={() => run(async () => { await api.coopSuggest(view.code, KINDS.find((k) => k.id === kind)!.make(num, note), note); setNote(''); setView(await api.coopView(view.code)); toast('success', 'Suggestion sent.'); })}>Send</Button>
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

/** Your trading cards, and gifts to friends. */
export function CardsCard() {
  const { profile, takeSpareCard, addCardGift, toast } = useGame();
  const owned = cardsOf(profile);
  const [claim, setClaim] = useState('');
  const gift = async (id: string) => {
    if (!takeSpareCard(id)) return;
    try { const r = await api.giftCard(id); toast('success', `Gift code ${r.code}. Send it to a friend.`); try { await navigator.clipboard.writeText(r.code); } catch { /* shown in the toast */ } } catch (e) { addCardGift(id); toast('error', (e as Error).message); }
  };
  return (
    <Card fold id="card-cards" title="Trading cards" subtitle="You collect mentors and rival bosses as you meet them. Spare copies can be gifted to friends with a one-time code.">
      <ul className="grid gap-2 sm:grid-cols-2">
        {CARDS.map((c) => {
          const n = owned[c.id] ?? 0;
          return (
            <li key={c.id} className={`flex items-center gap-2 rounded-lg border p-2 text-sm ${n ? 'border-line' : 'border-dashed border-line opacity-50'}`}>
              <span className="text-2xl" aria-hidden>{n ? c.emoji : '❔'}</span>
              <div className="min-w-0 flex-1"><div className="font-bold">{n ? c.name : '???'}{n > 1 ? ` ×${n}` : ''} <span className="text-[10px] uppercase text-ink-2">{c.rarity}</span></div>{n > 0 && <div className="truncate text-xs text-ink-2">{c.text}</div>}</div>
              {n > 1 && <Button aria-label={`Gift ${c.name}`} onClick={() => gift(c.id)}>Gift</Button>}
            </li>
          );
        })}
      </ul>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <Field label="Claim a gift"><TextInput aria-label="Gift code" value={claim} maxLength={10} className="w-36 uppercase" onChange={(e) => setClaim(e.target.value.toUpperCase())} /></Field>
        <Button disabled={claim.length < 6} onClick={async () => { try { const r = await api.claimCard(claim); addCardGift(r.card); setClaim(''); } catch (e) { toast('error', (e as Error).message); } }}>Claim</Button>
      </div>
    </Card>
  );
}

/** Your holding company against the one next to it in the table. */
export function GuildRivalCard() {
  const [v, setV] = useState<GuildRivalView | null>(null);
  useEffect(() => { api.guildRival().then(setV).catch(() => setV(null)); }, []);
  if (!v?.mine) return null;
  return (
    <Card fold id="card-guild-rival" title="Holding-company rivalry" subtitle="Your holding company against its neighbour in the table, by combined value of its members' companies.">
      <p className="text-sm"><b>{v.mine.name}</b> ({formatGBP(v.mine.value, { compact: true })}, {v.mine.members} members) is {v.rank} of {v.of}.</p>
      {v.rival ? <p className="text-sm">{v.rival.above ? 'Catch up with' : 'Hold off'} <b>{v.rival.name}</b>: {formatGBP(v.rival.value, { compact: true })}, {v.rival.members} members.</p> : <p className="text-sm text-ink-2">No rival yet: you are the only holding company.</p>}
    </Card>
  );
}

/** The richest verified companies right now, drawn as a skyline. */
export function HallCard() {
  const [v, setV] = useState<HallView | null>(null);
  useEffect(() => { api.hall().then(setV).catch(() => setV(null)); }, []);
  if (!v || v.rows.length === 0) return null;
  const top = Math.max(1, ...v.rows.map((r) => r.netWorth));
  return (
    <Card fold id="card-hall" title="Hall of fame" subtitle="The richest verified companies right now. Taller towers are worth more.">
      <div className="flex h-40 items-end gap-1" role="img" aria-label="Skyline of the richest companies">
        {v.rows.map((r) => <div key={r.rank} className="flex-1 rounded-t-md bg-accent/70" style={{ height: `${Math.max(8, Math.round((r.netWorth / top) * 100))}%` }} title={`${r.company ?? r.name}: ${formatGBP(r.netWorth, { compact: true })}`} />)}
      </div>
      <ol className="mt-3 space-y-1 text-sm">
        {v.rows.map((r) => <li key={r.rank}>{r.rank}. <span aria-hidden>{r.icon}</span> <b>{r.company ?? r.name}</b> · {r.name} · {formatGBP(r.netWorth, { compact: true })}</li>)}
      </ol>
    </Card>
  );
}

/** This month's theme for the seasonal leaderboard. */
export function SeasonBanner() {
  const t = seasonTheme();
  return (
    <div className="rounded-2xl border-[3px] border-outline bg-surface-2 p-3 text-sm" role="note" aria-label="This month's season theme">
      <span className="text-2xl" aria-hidden>{t.emoji}</span> <b>{t.name}</b>: {t.blurb}
    </div>
  );
}

/** Used by Missions: shows the theme only when signed in. */
export function SeasonNote({ game }: { game: GameState }) { void game; return <SeasonBanner />; }
