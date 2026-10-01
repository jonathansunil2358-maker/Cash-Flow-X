import {
  ActionError, applyAction, AWARDS, boardTarget, DIFFICULTIES, forecast, formatGBP, formatPct, INDUSTRIES, moodOf, PERSONALITIES,
  MAX_PLANS, mentorOf, planActions, plansOf, questDef, questsOf, rosterOf, STREAK_BONUS_CAP, STREAK_BONUS_GEMS, utcDay, type Action, type GameState,
} from '@cfx/engine';
import { useMemo, useState } from 'react';
import { Button, Card, Field, KeyValue, Meter, StatusPill, TextInput } from '../components/ui';
import { CURRENCY_ICONS } from '../lib/icons';
import { shareResultCard } from '../lib/shareCard';
import { useGame } from '../store';
import { Fold } from './Strategy';
import { runCard } from './Legacy';

/** Three small goals a day, with a streak that pays a growing bonus. */
export function QuestsCard() {
  const { profile, claimQuest } = useGame();
  const day = utcDay();
  const q = questsOf(profile, day);
  const done = q.items.filter((i) => i.claimed).length;
  return (
    <Card id="card-quests" title="Daily quests"
      subtitle={`Finish and claim all three for a streak bonus (${STREAK_BONUS_GEMS} gems a day of streak, up to ${STREAK_BONUS_CAP}). Streak: ${q.streak} day${q.streak === 1 ? '' : 's'}.`}
      actions={<StatusPill kind={done === 3 ? 'good' : 'ok'} label={`${done}/3 claimed`} />}>
      <ul className="space-y-2">
        {q.items.map((it) => {
          const def = questDef(it.id);
          if (!def) return null;
          const ready = it.progress >= def.target && !it.claimed;
          return (
            <li key={it.id} className="rounded-2xl border-[3px] border-outline bg-surface-2 p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="font-display text-base leading-tight">{def.text}</div>
                <span className="flex shrink-0 items-center gap-1 text-xs font-black"><img src={CURRENCY_ICONS.gem} alt="gems" className="h-4 w-4" />{def.gems}</span>
              </div>
              <div className="mt-1.5 flex items-center gap-2">
                <div className="min-w-0 flex-1"><Meter value={it.progress} max={def.target} label={def.text} tone="go" text={`${it.progress} of ${def.target}`} /></div>
                <Button variant="go" disabled={!ready} onClick={() => claimQuest(it.id)}>{it.claimed ? 'Claimed' : 'Claim'}</Button>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-ink-2">New quests every day at midnight UTC.</p>
    </Card>
  );
}

/** The board's target for this quarter and how you are doing. */
export function BoardCard({ game }: { game: GameState }) {
  const b = game.board;
  const monthsLeft = b ? Math.max(0, b.due - game.month) : 0;
  const target = b?.target ?? boardTarget(game);
  return (
    <Fold id="card-board" title="Board meetings"
      summary={b ? `Target ${formatGBP(b.target, { compact: true })} profit by month ${b.due}. Streak ${b.streak}.` : 'The first board meeting is at month 3.'}
      subtitle="Every quarter the board asks for 5% more profit than the last. Beat it and the team and your reputation lift; miss it and the board leans on you. Four in a row earns a bonus.">
      <div className="space-y-3">
        <KeyValue rows={[
          ['This quarter\'s target', b ? `${formatGBP(target)} profit` : 'Set at month 3'],
          ['Next meeting', b ? `Month ${b.due} (${monthsLeft} month${monthsLeft === 1 ? '' : 's'})` : '—'],
          ['Last quarter', b?.last ? `${b.last === 'hit' ? 'Beat the target' : 'Missed'}: ${formatGBP(b.lastActual)}` : '—'],
          ['Record', b ? `${b.hits} beaten, ${b.misses} missed` : '—'],
          ['Streak', b ? `${b.streak} in a row` : '—'],
        ]} />
      </div>
    </Fold>
  );
}

/** The people behind the headcount. */
export function TeamCard({ game }: { game: GameState }) {
  const team = rosterOf(game);
  const mood = moodOf(game.morale);
  const total = game.staff.ops + game.staff.rnd + game.staff.sales;
  return (
    <Fold id="card-roster" title="Your team"
      summary={total ? `${total} people, ${mood.label.toLowerCase()} ${mood.face}. Open to meet them.` : 'Nobody yet. Hire your first person.'}
      subtitle="Everyone you hire has a name and a personality. They sometimes come to you with a request.">
      <p className="mb-2 text-xs text-ink-2">This year's mentor: <b>{mentorOf(Math.floor(game.month / 12)).name}</b> ({mentorOf(Math.floor(game.month / 12)).specialty}). They drop by once a year.</p>
      {team.length === 0 ? <p className="text-sm text-ink-2">Hire someone in the Team panel to meet them here.</p> : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {team.map((p) => (
            <li key={p.id} className="flex items-center gap-2 rounded-lg border border-line p-2.5">
              <span className="text-2xl" aria-hidden>{mood.face}</span>
              <div className="min-w-0">
                <div className="font-medium text-ink">{p.name}</div>
                <div className="text-xs text-ink-2">{p.title} · {PERSONALITIES[p.personality].name}</div>
                <div className="text-[11px] text-muted">{PERSONALITIES[p.personality].blurb}</div>
              </div>
            </li>
          ))}
          {total > team.length && <li className="self-center text-xs text-ink-2">…and {total - team.length} more.</li>}
        </ul>
      )}
    </Fold>
  );
}

/** Awards this company has won, and the best companies of your career. */
export function TrophyCard({ game }: { game: GameState }) {
  const { profile, toast } = useGame();
  const won = game.awards ?? [];
  const top = [...profile.runs].sort((a, b) => b.ownerStake - a.ownerStake).slice(0, 5);
  const share = async (i: number) => {
    const res = await shareResultCard(runCard(top[i]));
    if (res === 'downloaded') toast('success', 'Picture saved. Share it anywhere.');
    else if (res === 'failed') toast('error', 'Could not make the picture on this device.');
  };
  return (
    <Card id="card-trophies" title="Trophy shelf" subtitle={`Awards are given every year end. ${won.length} won by ${game.companyName} so far.`}>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {AWARDS.map((a) => {
          const wins = won.filter((w) => w.id === a.id);
          return (
            <div key={a.id} className={`rounded-2xl border-[3px] border-outline p-2.5 text-center ${wins.length ? 'bg-surface-2' : 'opacity-55'}`}>
              <div className="text-3xl" aria-hidden>{wins.length ? '🏆' : '🔒'}</div>
              <div className="font-display text-base leading-tight">{a.name}</div>
              <div className="text-[11px] text-ink-2">{wins.length ? `Won ${wins.length}× (${wins.map((w) => w.year).slice(-3).join(', ')})` : a.blurb}</div>
            </div>
          );
        })}
      </div>
      <h3 className="mt-4 text-sm font-bold">Hall of fame</h3>
      {top.length === 0 ? <p className="text-xs text-ink-2">Your best companies appear here once you have retired, gone bust or sold one.</p> : (
        <ol className="mt-1 space-y-1.5">
          {top.map((r, i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-2 text-sm">
              <span className="min-w-0 truncate">#{i + 1} {INDUSTRIES[r.industryId].emoji} {r.companyName} <span className="text-xs text-ink-2">· {DIFFICULTIES[r.difficulty].name} · {formatGBP(r.ownerStake, { compact: true })}</span></span>
              <Button onClick={() => void share(i)} aria-label={`Share ${r.companyName}`}>Share</Button>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

/** Drag a few levers and see what the next twelve months would look like, without committing. */
export function WhatIfCard({ game }: { game: GameState }) {
  const { profile, savePlanAction, deletePlanAction, act } = useGame();
  const plans = plansOf(profile);
  const [planName, setPlanName] = useState('');
  const [price, setPrice] = useState(0);
  const [marketing, setMarketing] = useState(100);
  const [hires, setHires] = useState(0);
  const base = useMemo(() => forecast(game, 12), [game]);
  const result = useMemo(() => {
    const actions: Action[] = [];
    if (price !== 0) actions.push({ type: 'setPrice', price: Math.max(100, Math.round((game.price * (100 + price)) / 100 / 100) * 100) });
    if (marketing !== 100) actions.push({ type: 'setMarketing', amount: Math.round((game.marketingBudget * marketing) / 100 / 100) * 100 });
    if (hires > 0) actions.push({ type: 'hire', role: 'ops', count: hires });
    let s = game;
    try {
      for (const a of actions) s = applyAction(s, a);
    } catch (e) {
      return { error: e instanceof ActionError ? e.message : 'Could not try that.' } as const;
    }
    const f = forecast(s, 12);
    return { f, error: null } as const;
  }, [game, price, marketing, hires]);
  const sum = (f: ReturnType<typeof forecast>, k: 'profit' | 'revenue') => f.points.reduce((a, p) => a + p[k], 0);
  const end = (f: ReturnType<typeof forecast>) => f.points.at(-1)?.cash ?? game.ledger.balances.cash;
  const delta = (a: number, b: number) => { const d = b - a; return `${d >= 0 ? '+' : '−'}${formatGBP(Math.abs(d), { compact: true })}`; };
  const changed = price !== 0 || marketing !== 100 || hires > 0;
  return (
    <Card id="card-whatif" title="What if…?" subtitle="Move the sliders to try a decision on a copy of your company. Nothing changes until you do it for real in the Business panel.">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label={`Price ${price > 0 ? '+' : ''}${price}%`}>
          <input type="range" min={-30} max={30} step={5} value={price} onChange={(e) => setPrice(Number(e.target.value))} className="w-full accent-[var(--primary)]" aria-label="Price change" />
        </Field>
        <Field label={`Marketing ${marketing}% of today`}>
          <input type="range" min={0} max={300} step={25} value={marketing} onChange={(e) => setMarketing(Number(e.target.value))} className="w-full accent-[var(--primary)]" aria-label="Marketing budget" />
        </Field>
        <Field label={`Hire ${hires} more ${INDUSTRIES[game.industryId].roles.ops.title.toLowerCase()}`}>
          <input type="range" min={0} max={8} step={1} value={hires} onChange={(e) => setHires(Number(e.target.value))} className="w-full accent-[var(--primary)]" aria-label="Extra hires" />
        </Field>
      </div>
      {result.error ? <p role="alert" className="mt-3 text-sm font-bold text-critical-text">{result.error}</p> : result.f && (
        <div className="mt-3">
          <KeyValue rows={[
            ['12-month profit', `${formatGBP(sum(result.f, 'profit'), { compact: true })} (${changed ? delta(sum(base, 'profit'), sum(result.f, 'profit')) : 'same as now'})`],
            ['12-month revenue', `${formatGBP(sum(result.f, 'revenue'), { compact: true })} (${changed ? delta(sum(base, 'revenue'), sum(result.f, 'revenue')) : 'same as now'})`],
            ['Cash in 12 months', `${formatGBP(end(result.f), { compact: true })} (${changed ? delta(end(base), end(result.f)) : 'same as now'})`],
            ['Lowest cash', formatGBP(result.f.minCash, { compact: true })],
          ]} />
          {result.f.insolventInMonths && <p className="mt-2 text-sm font-bold text-critical-text">Careful: this runs out of money in {result.f.insolventInMonths} months.</p>}
          {changed && <Button className="mt-2" onClick={() => { setPrice(0); setMarketing(100); setHires(0); }}>Reset sliders</Button>}
          {changed && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <TextInput value={planName} maxLength={30} placeholder="Name this plan" aria-label="Plan name" onChange={(e) => setPlanName(e.target.value)} className="w-44" />
              <Button disabled={!planName.trim() || plans.length >= MAX_PLANS} onClick={() => { savePlanAction({ name: planName.trim(), price, marketing, hires }); setPlanName(''); }}>Save plan</Button>
              {plans.length >= MAX_PLANS && <span className="text-xs text-muted">Delete a plan to save another.</span>}
            </div>
          )}
        </div>
      )}
      {plans.length > 0 && (
        <div className="mt-3">
          <h3 className="mb-1 text-sm font-bold">Saved plans</h3>
          <ul className="space-y-1.5">
            {plans.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line p-2 text-sm">
                <span className="min-w-0"><b>{p.name}</b> <span className="text-xs text-ink-2">price {p.price > 0 ? '+' : ''}{p.price}% · marketing {p.marketing}% · hire {p.hires}</span></span>
                <span className="flex gap-1.5">
                  <Button onClick={() => { setPrice(p.price); setMarketing(p.marketing); setHires(p.hires); }}>Preview</Button>
                  <Button variant="primary" disabled={game.status !== 'playing'} onClick={() => { for (const a of planActions(game, p)) if (!act(a)) break; }}>Do it</Button>
                  <Button variant="danger" onClick={() => deletePlanAction(p.id)} aria-label={`Delete ${p.name}`}>×</Button>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-2 text-xs text-muted">Forecasts use expected values, so real months will wobble around them. {formatPct(0.05, 0)} either way is normal.</p>
    </Card>
  );
}
