import {
  AWARDS, coachCheck, coachFee, COACH_COOLDOWN, formatGBP, franchiseCount, franRating, labCheck, labFee, lifeStage, MAX_MANAGERS, mgrOf, monthLabel, NODES, nodeCheck, pointsLeft,
  hasNode, playOf, POP_TIERS, popCheck, popCost, productAge, promoteCheck, recapYears, REFRESH_MIN_AGE, refreshCheck, ROLE_IDS, securityOf, SECURITY_LEVELS, supplyCheck, SUPPLY_INFO,
  supplyOf, timelineOf, TRAITS, yearRecap, type GameState, type Supply,
} from '@cfx/engine';
import { Button, KeyValue } from '../components/ui';
import { useGame } from '../store';
import { Fold } from './Strategy';

const live = (game: GameState): boolean => game.status === 'playing';
const small = (p: number): string => formatGBP(p, { compact: true });

/** Where your goods come from: cheaper and riskier, or dearer and steady. */
export function SupplyChainCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const now = supplyOf(game);
  return (
    <Fold id="card-supply" title="Supply chain" summary={`Sourcing: ${SUPPLY_INFO[now].name}.`}
      subtitle="Choose how you source. Worldwide suppliers are cheapest but can be stuck at a port for a few months; local suppliers cost more and never let you down. Changing costs a fee and needs six months between switches.">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Sourcing">
        {(Object.keys(SUPPLY_INFO) as Supply[]).map((k) => {
          const chk = supplyCheck(game, k);
          return <Button key={k} variant={now === k ? 'primary' : 'secondary'} aria-pressed={now === k} disabled={now === k || !chk.ok || !live(game)} title={SUPPLY_INFO[k].blurb} onClick={() => act({ type: 'supply', to: k }, `Sourcing: ${SUPPLY_INFO[k].name}.`)}>{SUPPLY_INFO[k].name}</Button>;
        })}
      </div>
      <p className="mt-2 text-xs text-ink-2">{SUPPLY_INFO[now].blurb}</p>
      {now !== 'global' && <p className="text-xs text-muted">{supplyCheck(game, now === 'local' ? 'mixed' : 'global').reason}</p>}
    </Fold>
  );
}

/** Products age: refresh one that has been in the market a while. */
export function LifecycleCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const chk = refreshCheck(game);
  const stage = lifeStage(game);
  const names = { launch: 'Launch: still fresh', peak: 'Peak: selling well', ageing: 'Ageing: demand 2% lower', tired: 'Tired: demand 4% lower' } as const;
  return (
    <Fold id="card-lifecycle" title="Product lifecycle" summary={names[stage]}
      subtitle={`Your product is ${productAge(game)} months old. Products start fresh, peak, then age and sell a little less. A refresh costs ${small(chk.fee)}, lifts demand 6% for nine months and starts the clock again. You need ${REFRESH_MIN_AGE} months in the market first.`}>
      <Button variant="primary" disabled={!chk.ok || !live(game)} onClick={() => act({ type: 'refreshProduct' }, 'Product refreshed.')}>Refresh the product ({small(chk.fee)})</Button>
      {!chk.ok && <p className="mt-2 text-xs text-muted">{chk.reason}</p>}
    </Fold>
  );
}

/** One-off sales stalls: a month later the takings come in, and they depend on the season and your brand. */
export function PopupCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const p = playOf(game);
  return (
    <Fold id="card-popup" title="Pop-up shops" summary={p.pop ? 'A pop-up is running.' : 'Short, risky sales events.'}
      subtitle="Pay now, get the takings next month. A good season and a strong brand help; a quiet month can lose money. One at a time.">
      {p.pop ? <p className="text-sm">Your {POP_TIERS[p.pop.tier].name.toLowerCase()} opened in {monthLabel(p.pop.month)}. Takings arrive next month.</p> : (
        <div className="flex flex-wrap gap-2">
          {POP_TIERS.map((t, i) => { const chk = popCheck(game, i); return <Button key={t.name} disabled={!chk.ok || !live(game)} title={chk.reason} onClick={() => act({ type: 'popup', tier: i }, `${t.name} opened.`)}>{t.name} ({small(popCost(game, i))})</Button>; })}
        </div>
      )}
      {(p.popResults?.length ?? 0) > 0 && (
        <ul className="mt-3 space-y-1 text-xs text-ink-2" aria-label="Past pop-ups">
          {[...p.popResults!].reverse().map((r, i) => <li key={i}>{monthLabel(r.month)}: spent {small(r.cost)}, took {small(r.takings)} ({r.takings >= r.cost ? 'a profit' : 'a loss'})</li>)}
        </ul>
      )}
    </Fold>
  );
}

/** Test a 5% price change on your customers without risking it. */
export function PriceLabCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const chk = labCheck(game);
  const lab = playOf(game).lab;
  const sign = (n: number): string => `${n >= 0 ? '+' : ''}${n}%`;
  return (
    <Fold id="card-lab" title="Pricing lab" summary={lab ? `Last test: +5% price gives ${sign(lab.up)} revenue.` : 'Test a price change before you make it.'}
      subtitle={`A small test (${small(labFee(game))}) tells you what a 5% price rise or cut would do to monthly revenue. The result is a noisy measure of how sensitive your customers are. Wait six months between tests.`}>
      <Button disabled={!chk.ok || !live(game)} onClick={() => act({ type: 'priceLab' }, 'Test complete.')}>Run a test ({small(chk.fee)})</Button>
      {lab && <KeyValue rows={[['Price +5%', `${sign(lab.up)} revenue`], ['Price −5%', `${sign(lab.down)} revenue`], ['Tested', monthLabel(lab.month)]]} />}
      {!chk.ok && <p className="mt-2 text-xs text-muted">{chk.reason}</p>}
    </Fold>
  );
}

/** How well your franchisees keep your standards. */
export function FranchiseStandardsCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const n = franchiseCount(game);
  const chk = coachCheck(game);
  return (
    <Fold id="card-standards" title="Franchise standards" summary={n ? `Rating ${franRating(game)} out of 100.` : 'No franchises yet.'}
      subtitle={`Franchisees drift. Under 40 your brand loses ground every month. A coaching visit adds 20 points for ${small(coachFee(game))} (once every ${COACH_COOLDOWN} months).`}>
      <p className="mb-2 text-sm">Rating: <b>{franRating(game)}</b> / 100</p>
      <Button disabled={!chk.ok || !live(game)} onClick={() => act({ type: 'coachFranchises' }, 'Franchisees coached.')}>Send the coaches ({small(chk.fee)})</Button>
      {!chk.ok && <p className="mt-2 text-xs text-muted">{chk.reason}</p>}
    </Fold>
  );
}

/** Promote someone into a named manager with a trait. */
export function ManagersCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const list = mgrOf(game);
  return (
    <Fold id="card-managers" title="Managers" summary={`${list.length} of ${MAX_MANAGERS} managers.`}
      subtitle="Promote a team member to manager: capacity +1.5% each, plus a trait. A manager can be lured away by a rival if morale sinks below 40.">
      {list.length > 0 && <ul className="mb-3 space-y-1 text-sm">{list.map((m) => <li key={m.name}><b>{m.name}</b>, {m.role} manager since {monthLabel(m.since)}. {TRAITS[m.trait]}</li>)}</ul>}
      <div className="flex flex-wrap gap-2">
        {ROLE_IDS.map((r) => { const chk = promoteCheck(game, r); return <Button key={r} disabled={!chk.ok || !live(game)} title={chk.reason} onClick={() => act({ type: 'promote', role: r }, `A new ${r} manager.`)}>Promote in {r} ({small(chk.fee)})</Button>; })}
      </div>
    </Fold>
  );
}

/** Spend one point a year on a branch. */
export function FocusCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const left = pointsLeft(game);
  const branches = [['finance', 'Finance office'], ['ops', 'Operations floor'], ['brand', 'Brand studio']] as const;
  return (
    <Fold id="card-focus" title="Department focus" summary={`${left} point${left === 1 ? '' : 's'} to spend.`}
      subtitle="You earn one point a year. Each branch has three steps, taken in order. These stay for the life of the company.">
      <div className="grid gap-3 sm:grid-cols-3">
        {branches.map(([b, name]) => (
          <div key={b}>
            <h3 className="font-display text-base">{name}</h3>
            <ul className="mt-1 space-y-1.5">
              {NODES.filter((n) => n.branch === b).map((n) => {
                const have = hasNode(game, n.id);
                const chk = nodeCheck(game, n.id);
                return (
                  <li key={n.id} className="text-sm">
                    <Button className="w-full" variant={have ? 'primary' : 'secondary'} disabled={have || !chk.ok || !live(game)} title={chk.reason} onClick={() => act({ type: 'skill', id: n.id }, `${n.name} learned.`)}>{have ? '✓ ' : ''}{n.name}</Button>
                    <span className="block text-xs text-ink-2">{n.text}</span>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
    </Fold>
  );
}

/** Protect yourself from hackers, for a monthly fee. */
export function SecurityCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const now = securityOf(game);
  return (
    <Fold id="card-security" title="Cyber security" summary={`Level: ${SECURITY_LEVELS[now].name}.`}
      subtitle="Better security costs a little every month and makes an attack much less likely. If one still gets through, good backups halve the cost of getting back up.">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Security level">
        {SECURITY_LEVELS.map((l, i) => <Button key={l.name} variant={now === i ? 'primary' : 'secondary'} aria-pressed={now === i} disabled={now === i || !live(game)} title={l.blurb} onClick={() => act({ type: 'security', level: i }, `Security: ${l.name}.`)}>{l.name}</Button>)}
      </div>
      <p className="mt-2 text-xs text-ink-2">{SECURITY_LEVELS[now].blurb}</p>
    </Fold>
  );
}

/** A year-by-year red-carpet recap: money, best and worst months, trophies. */
export function AwardsNightCard({ game }: { game: GameState }) {
  const years = recapYears(game);
  return (
    <Fold id="card-awardsnight" title="Awards night" summary={years.length ? `${years.length} year${years.length === 1 ? '' : 's'} to look back on.` : 'Your first year is not over yet.'}
      subtitle="Each year ends with a recap: what you earned, your best and worst month, and any trophies you won.">
      {years.length === 0 ? <p className="text-sm text-ink-2">Come back after your first full year.</p> : (
        <ul className="space-y-3">
          {[...years].reverse().map((y) => {
            const r = yearRecap(game, y)!;
            return (
              <li key={y} className="rounded-2xl border-2 border-outline p-3 text-sm">
                <div className="font-display text-lg">Year {y + 1}</div>
                <KeyValue rows={[
                  ['Revenue', small(r.revenue)], ['Profit', small(r.profit)],
                  ['Best month', `${monthLabel(r.best.month)} (${small(r.best.profit)})`], ['Worst month', `${monthLabel(r.worst.month)} (${small(r.worst.profit)})`],
                ]} />
                <p className="mt-2 text-xs">{r.awards.length ? <>🏆 {r.awards.map((a) => AWARDS.find((x) => x.id === a)?.name ?? a).join(', ')}</> : 'No trophies this year.'}</p>
              </li>
            );
          })}
        </ul>
      )}
    </Fold>
  );
}

/** The milestones of this company, newest first. */
export function TimelineCard({ game }: { game: GameState }) {
  const items = timelineOf(game);
  return (
    <Fold id="card-timeline" title="Company timeline" summary={`${items.length} milestones so far.`}
      subtitle="Every big moment of this company in one list: deals, awards, new sites and more.">
      {items.length === 0 ? <p className="text-sm text-ink-2">Nothing yet. Milestones appear as you play.</p> : (
        <ol className="space-y-2 border-l-4 border-outline pl-3 text-sm">
          {items.map((t, i) => <li key={i}><b>{monthLabel(t.month)}</b> · {t.title}<span className="block text-xs text-ink-2">{t.text}</span></li>)}
        </ol>
      )}
    </Fold>
  );
}
