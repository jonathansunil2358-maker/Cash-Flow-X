import {
  cardsOf, DECOR, DIFFICULTY_IDS, formatGBP, HATS, INDUSTRIES, INDUSTRY_IDS, plSummary, type GameState,
} from '@cfx/engine';
import { useEffect, useState } from 'react';
import { Button, Card, Field, NumberInput, TextInput } from '../components/ui';
import { api, type IslandView, type LandmarkView, type MarketView, type MentorView, type ScenarioView } from '../lib/api';
import { useAccount } from '../lib/account';
import { useGame } from '../store';

const nameOf = (kind: string, item: string): string =>
  kind === 'hat' ? HATS.find((h) => h.id === item)?.name ?? item : kind === 'decor' ? DECOR.find((d) => d.id === item)?.name ?? item : item;

/** Visit a friend's island by their island code, and leave a like or a greeting. */
export function IslandVisitCard() {
  const me = useAccount((s) => s.me);
  const toast = useGame((s) => s.toast);
  const [code, setCode] = useState('');
  const [view, setView] = useState<IslandView | null>(null);
  const go = async (id = code.trim()) => { try { setView(await api.island(id)); } catch (e) { setView(null); toast('error', (e as Error).message); } };
  const GREET = ['Lovely island!', 'Great company!', 'Good luck with the next year!', 'Teach me your secrets!', 'See you in the table!', 'Keep going!'];
  return (
    <Card id="card-island" title="Visit an island" subtitle="Paste a friend's island code to see their company, leave a like or send a greeting. Your own code is below: share it.">
      <p className="mb-2 text-xs text-ink-2">Your island code: <code className="select-all rounded bg-surface-2 px-1">{me?.user?.id ?? '…'}</code></p>
      <div className="flex gap-2">
        <TextInput value={code} onChange={(e) => setCode(e.target.value)} aria-label="Island code" placeholder="Friend's island code" />
        <Button disabled={code.trim().length < 8} onClick={() => go()}>Visit</Button>
      </div>
      {view && (
        <div className="mt-3 space-y-2 text-sm" aria-label="Island visit">
          <p><span aria-hidden>🏝️</span> <b>{view.name}</b>{view.title ? `, ${view.title}` : ''} · prestige {view.prestige} · ♥ {view.likes}</p>
          {view.company ? <p>{view.company.name} ({view.company.sector ? INDUSTRIES[view.company.sector as keyof typeof INDUSTRIES]?.name ?? view.company.sector : ''}), month {view.company.month + 1}{view.company.equityValue !== null ? `, worth ${formatGBP(view.company.equityValue, { compact: true })}` : ''}</p> : <p className="text-ink-2">No company right now.</p>}
          {view.greetings.length > 0 && <ul className="text-xs text-ink-2">{view.greetings.map((g, i) => <li key={i}>“{g.text}” — {g.from}</li>)}</ul>}
          {!view.self && (
            <div className="flex flex-wrap gap-2">
              <Button disabled={view.liked} onClick={async () => { try { await api.likeIsland(view.id); await go(view.id); } catch (e) { toast('error', (e as Error).message); } }}>{view.liked ? 'Liked today' : '♥ Like'}</Button>
              {GREET.map((t, i) => <Button key={i} onClick={async () => { try { await api.greetIsland(view.id, i); await go(view.id); toast('success', 'Greeting sent.'); } catch (e) { toast('error', (e as Error).message); } }}>{t}</Button>)}
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

/** Your holding company's shared landmark, paid for from members' personal cash. */
export function LandmarkCard() {
  const toast = useGame((s) => s.toast);
  const [v, setV] = useState<LandmarkView | null>(null);
  const [amount, setAmount] = useState(1_000_00);
  useEffect(() => { api.landmark().then(setV).catch(() => setV(null)); }, []);
  if (!v?.guild) return null;
  return (
    <Card id="card-landmark" title="Holding-company landmark" subtitle="Members pay into a shared landmark from their personal cash (dividends). It grows through four levels and every member's holding company shows it off.">
      <p className="text-sm"><b>{v.name ?? 'Nothing built yet'}</b> · {formatGBP(v.funded ?? 0, { compact: true })} funded{v.next ? `. Next: ${v.next.name} at ${formatGBP(v.next.cost, { compact: true })}` : '. Fully built!'}</p>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <Field label="Gift (£)"><NumberInput value={amount / 100} onChange={(n) => setAmount(Math.round(n * 100))} aria-label="Gift amount" /></Field>
        <Button onClick={async () => { try { setV(await api.fundLandmark(amount)); toast('success', 'Thank you! The landmark grows.'); } catch (e) { toast('error', (e as Error).message); } }}>Give</Button>
        <span className="text-xs text-ink-2">You have {formatGBP(v.personalCash ?? 0, { compact: true })} personal cash.</span>
      </div>
    </Card>
  );
}

/** Swap hats, decorations and spare cards for gems. Trust-based: gems live on each player's device. */
export function MarketCard() {
  const { profile, marketTake, marketGive, addGems, toast } = useGame();
  const [v, setV] = useState<MarketView | null>(null);
  const [price, setPrice] = useState(100);
  const [pick, setPick] = useState('');
  const refresh = () => api.market().then(setV).catch(() => setV(null));
  useEffect(() => { refresh(); }, []);
  const mine: { kind: string; item: string }[] = [
    ...(profile.wardrobe?.owned ?? []).map((item) => ({ kind: 'hat', item })),
    ...(profile.decor?.owned ?? []).map((item) => ({ kind: 'decor', item })),
    ...Object.entries(cardsOf(profile)).filter(([, n]) => n >= 2).map(([item]) => ({ kind: 'card', item })),
  ];
  const sell = async () => {
    const [kind, item] = pick.split(':');
    if (!kind || !item) return;
    if (!marketTake(kind, item)) { toast('error', 'You do not have that to sell.'); return; }
    try { await api.listItem(kind, item, price); toast('success', 'Listed.'); } catch (e) { marketGive(kind, item, 0); toast('error', (e as Error).message); }
    setPick(''); refresh();
  };
  const buy = async (l: MarketView['open'][number]) => {
    if (profile.gems < l.price) { toast('error', 'Not enough gems.'); return; }
    try { const r = await api.buyListing(l.id); marketGive(r.kind, r.item, r.price); toast('success', `Bought: ${nameOf(r.kind, r.item)}.`); } catch (e) { toast('error', (e as Error).message); }
    refresh();
  };
  const collect = async () => { try { const r = await api.collectSales(); if (r.gems > 0) addGems(r.gems, 'items you sold'); else toast('info', 'Nothing to collect yet.'); } catch (e) { toast('error', (e as Error).message); } refresh(); };
  const sold = (v?.mine ?? []).filter((l) => l.status === 'sold' && !l.collected).length;
  return (
    <Card id="card-cosmetics" title="Cosmetics market" subtitle="Sell a hat, decoration or spare card to another player for gems (5% fee). It runs on trust: gems are kept on each player's device, so nothing here touches a score.">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Sell">
          <select value={pick} onChange={(e) => setPick(e.target.value)} className="rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm" aria-label="Item to sell">
            <option value="">Choose an item…</option>
            {mine.map((m) => <option key={`${m.kind}:${m.item}`} value={`${m.kind}:${m.item}`}>{m.kind}: {nameOf(m.kind, m.item)}</option>)}
          </select>
        </Field>
        <Field label="Price (gems)"><NumberInput value={price} onChange={setPrice} aria-label="Price in gems" /></Field>
        <Button disabled={!pick} onClick={sell}>List it</Button>
        <Button onClick={collect}>{sold ? `Collect sales (${sold})` : 'Collect sales'}</Button>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm">
        {(v?.open ?? []).length === 0 && <li className="text-ink-2">Nothing for sale right now.</li>}
        {(v?.open ?? []).map((l) => (
          <li key={l.id} className="flex flex-wrap items-center gap-2"><span className="min-w-0 flex-1">{l.kind}: <b>{nameOf(l.kind, l.item)}</b> from {l.seller}, {l.price} gems</span><Button onClick={() => buy(l)}>Buy</Button></li>
        ))}
      </ul>
    </Card>
  );
}

/** Veterans mentor newcomers; both earn gems when the newcomer builds a £100k company. */
export function MentorCard() {
  const { addGems, toast } = useGame();
  const [v, setV] = useState<MentorView | null>(null);
  const [code, setCode] = useState('');
  const refresh = () => api.mentor().then(setV).catch(() => setV(null));
  useEffect(() => { refresh(); }, []);
  const claim = async (c: string) => { try { const r = await api.mentorClaim(c); addGems(r.gems, 'mentoring reward'); } catch (e) { toast('error', (e as Error).message); } refresh(); };
  return (
    <Card id="card-mentor" title="Mentor and mentee" subtitle={`A player who has prestiged or finished a company can mentor a newcomer. When the newcomer's company is worth £100k, the mentor earns ${v?.gems.mentor ?? 30} gems and the newcomer ${v?.gems.mentee ?? 20}.`}>
      {v?.mentor && (
        <p className="text-sm">Your mentor is <b>{v.mentor.name}</b>: {Math.round(v.mentor.progress * 100)}% of the way. {v.mentor.claimable && <Button onClick={() => claim(v.mentor!.code)}>Claim {v.gems.mentee} gems</Button>}{v.mentor.claimed && ' Reward claimed.'}</p>
      )}
      <ul className="space-y-1 text-sm">
        {(v?.mentees ?? []).map((m) => m.waiting
          ? <li key={m.code}>Waiting for a newcomer. Share the code <code className="select-all rounded bg-surface-2 px-1">{m.code}</code></li>
          : <li key={m.code}><b>{m.name}</b>: {Math.round(m.progress * 100)}% of the way. {m.claimable && <Button onClick={() => claim(m.code)}>Claim {v!.gems.mentor} gems</Button>}{m.claimed && ' Reward claimed.'}</li>)}
      </ul>
      <div className="mt-2 flex flex-wrap items-end gap-2">
        <Button onClick={async () => { try { await api.mentorCreate(); refresh(); } catch (e) { toast('error', (e as Error).message); } }}>Offer to mentor</Button>
        {!v?.mentor && <><TextInput value={code} onChange={(e) => setCode(e.target.value)} aria-label="Mentor code" placeholder="Mentor code" /><Button disabled={code.length < 5} onClick={async () => { try { await api.mentorJoin(code); setCode(''); refresh(); } catch (e) { toast('error', (e as Error).message); } }}>Join a mentor</Button></>}
      </div>
    </Card>
  );
}

const OBJ = { worth: { label: 'Company worth (£)', def: 100_000, scale: 100 }, customers: { label: 'Customers', def: 1000, scale: 1 }, streak: { label: 'Profitable months in a row', def: 6, scale: 1 } } as const;
const progressOf = (g: GameState, kind: ScenarioView['objective']['kind']): number => {
  if (kind === 'worth') return g.history.at(-1)?.valuation?.equityValue ?? 0;
  if (kind === 'customers') return g.history.at(-1)?.kpis.customers ?? 0;
  let n = 0;
  for (let i = g.history.length - 1; i >= 0 && plSummary(g.history[i].period.pl).profit > 0; i--) n++;
  return n;
};
/** Make a shareable challenge (sector, difficulty, a goal) and play other players' scenarios. */
export function ScenarioCard({ game }: { game: GameState | null }) {
  const toast = useGame((s) => s.toast);
  const [name, setName] = useState('');
  const [sector, setSector] = useState<string>('software');
  const [diff, setDiff] = useState<string>('easy');
  const [kind, setKind] = useState<keyof typeof OBJ>('worth');
  const [value, setValue] = useState<number>(OBJ.worth.def);
  const [made, setMade] = useState('');
  const [load, setLoad] = useState('');
  const [sc, setSc] = useState<ScenarioView | null>(null);
  const create = async () => { try { const r = await api.createScenario({ name, sector, difficulty: diff, objective: { kind, value: Math.round(value * OBJ[kind].scale) } }); setMade(r.code); try { await navigator.clipboard.writeText(r.code); } catch { /* shown */ } } catch (e) { toast('error', (e as Error).message); } };
  const open = async () => { try { setSc(await api.scenarioPlayed(load)); } catch (e) { toast('error', (e as Error).message); } };
  const here = sc && game && game.industryId === sc.sector && game.seedLabel === sc.seed;
  return (
    <Card id="card-scenario" title="Scenario maker" subtitle="Pick a sector, a difficulty and a goal, and share the code. A friend starts a company with the same seed and sees how close they are. Goals are checked on their device: it is for fun, not a leaderboard.">
      <div className="flex flex-wrap items-end gap-2">
        <Field label="Name"><TextInput value={name} onChange={(e) => setName(e.target.value)} aria-label="Scenario name" placeholder="Name it" /></Field>
        <Field label="Sector"><select value={sector} onChange={(e) => setSector(e.target.value)} className="rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm" aria-label="Scenario sector">{INDUSTRY_IDS.map((id) => <option key={id} value={id}>{INDUSTRIES[id].name}</option>)}</select></Field>
        <Field label="Difficulty"><select value={diff} onChange={(e) => setDiff(e.target.value)} className="rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm" aria-label="Scenario difficulty">{DIFFICULTY_IDS.map((id) => <option key={id} value={id}>{id}</option>)}</select></Field>
        <Field label="Goal"><select value={kind} onChange={(e) => { const k = e.target.value as keyof typeof OBJ; setKind(k); setValue(OBJ[k].def); }} className="rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm" aria-label="Scenario goal">{(Object.keys(OBJ) as (keyof typeof OBJ)[]).map((k) => <option key={k} value={k}>{OBJ[k].label}</option>)}</select></Field>
        <Field label="Target"><NumberInput value={value} onChange={setValue} aria-label="Scenario target" /></Field>
        <Button variant="primary" disabled={name.trim().length < 3} onClick={create}>Create</Button>
      </div>
      {made && <p className="mt-2 text-sm">Your code: <code className="select-all rounded bg-surface-2 px-1">{made}</code> (copied). Share it!</p>}
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <TextInput value={load} onChange={(e) => setLoad(e.target.value.toUpperCase())} aria-label="Scenario code" placeholder="Scenario code" />
        <Button disabled={load.length < 6} onClick={open}>Open</Button>
      </div>
      {sc && (
        <div className="mt-2 space-y-1 text-sm">
          <p><b>{sc.name}</b> by {sc.owner}: {INDUSTRIES[sc.sector as keyof typeof INDUSTRIES]?.name} on {sc.difficulty}. Goal: {sc.objective.kind === 'worth' ? `worth ${formatGBP(sc.objective.value, { compact: true })}` : sc.objective.kind === 'customers' ? `${sc.objective.value.toLocaleString('en-GB')} customers` : `${sc.objective.value} profitable months in a row`}. Played by {sc.plays}.</p>
          <p className="text-xs text-ink-2">To play: start a new company in that sector with the seed <code className="select-all rounded bg-surface-2 px-1">{sc.seed}</code> (the seed box on the start screen).</p>
          {here && game && <p className="font-bold">Progress: {sc.objective.kind === 'worth' ? formatGBP(progressOf(game, sc.objective.kind), { compact: true }) : progressOf(game, sc.objective.kind).toLocaleString('en-GB')} of {sc.objective.kind === 'worth' ? formatGBP(sc.objective.value, { compact: true }) : sc.objective.value.toLocaleString('en-GB')}{progressOf(game, sc.objective.kind) >= sc.objective.value ? ' ✅ Goal reached!' : ''}</p>}
        </div>
      )}
    </Card>
  );
}
