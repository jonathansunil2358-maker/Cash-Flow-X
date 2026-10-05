import { formatGBP, initiativeActive, initiativeCheck, initiativeCost, initiativesFor, optionOf, policiesFor, policyCheck, runningCost, TOPICS, RETRY_MONTHS, type GameState, type PolicyDef, type PolicyGroup } from '@cfx/engine';
import { Button } from '../components/ui';
import { useGame } from '../store';
import { Fold } from './Strategy';

const TITLES: Record<PolicyGroup, { title: string; text: string }> = {
  ops: { title: 'Operations policies', text: 'Dials for how you run things: energy, packaging, shifts, stock, returns and more. Each option has a cost or a risk.' },
  people: { title: 'People policies', text: 'How you treat and hire your team: pay, benefits, training and culture.' },
  customers: { title: 'Customer policies', text: 'How you win and keep customers: brand voice, sponsorship, samples, bundles and more.' },
  finance: { title: 'Finance policies', text: 'Supplier discounts, standby credit and tax relief.' },
};

/** A list of dials. Pick an option for each; some cost money to set up, some cost or save a little every month. */
export function PolicyGroupCard({ game, group }: { game: GameState; group: PolicyGroup }) {
  const act = useGame((s) => s.act);
  const list = policiesFor(game).filter((p) => p.group === group && !p.topic);
  if (list.length === 0) return null;
  const active = list.filter((p) => optionOf(game, p.id) > 0).length;
  const run = runningCost(game);
  return (
    <Fold id={`card-pol-${group}`} title={TITLES[group].title} summary={`${active} of ${list.length} switched on.${group === 'ops' && run !== 0 ? ` Policies cost ${formatGBP(run, { compact: true })} a month.` : ''}`}
      subtitle={`${TITLES[group].text} You can change a dial every ${3} months.`}>
      <ul className="space-y-3">
        {list.map((p) => <PolicyRow key={p.id} game={game} p={p} />)}
      </ul>
    </Fold>
  );
}

function PolicyRow({ game, p }: { game: GameState; p: PolicyDef }) {
  const act = useGame((s) => s.act);
  const now = optionOf(game, p.id);
  return (
    <li className="text-sm" data-policy={p.id}>
      <div className="font-bold">{p.name} <span className="font-normal text-xs text-ink-2">· {p.blurb}</span></div>
      <div className="mt-1 flex flex-wrap gap-1.5" role="group" aria-label={p.name}>
        {p.options.map((o, i) => {
          const chk = policyCheck(game, p.id, i);
          const running = o.monthly ? ` Costs ${o.monthly > 0 ? '' : '(saves) '}${Math.abs(o.monthly)}% of sales a month.` : '';
          return (
            <Button key={o.name} className="!min-h-8 !px-2.5 !py-1 !text-xs" variant={now === i ? 'primary' : 'secondary'} aria-pressed={now === i}
              disabled={now === i || !chk.ok || game.status !== 'playing'} title={`${o.blurb}${running}${chk.fee ? ` Set-up ${formatGBP(chk.fee, { compact: true })}.` : ''}${!chk.ok && now !== i ? ` ${chk.reason}` : ''}`}
              onClick={() => act({ type: 'policy', id: p.id, option: i }, `${p.name}: ${o.name}.`)}>{o.name}</Button>
          );
        })}
      </div>
      <p className="mt-1 text-xs text-ink-2">{p.options[now].blurb}</p>
    </li>
  );
}

/** One management topic: its dials and its timed initiatives. */
export function TopicCard({ game, topic }: { game: GameState; topic: string }) {
  const act = useGame((s) => s.act);
  const meta = TOPICS.find((t) => t.id === topic);
  const pols = policiesFor(game).filter((p) => p.topic === topic);
  const inits = initiativesFor(game).filter((p) => p.topic === topic);
  if (!meta || pols.length + inits.length === 0) return null;
  const on = pols.filter((p) => optionOf(game, p.id) > 0).length;
  const running = inits.filter((i) => initiativeActive(game, i.id)).length;
  const won = inits.filter((i) => game.play8?.proj?.done[i.id]?.result === 'won').length;
  return (
    <Fold id={`card-topic-${topic}`} title={meta.name} summary={`${pols.length} dials (${on} on) · ${inits.length} initiatives (${won} done${running ? `, ${running} under way` : ''}).`}
      subtitle={`${meta.blurb} Dials stay until you change them. Initiatives cost money now and report after a few months: they either pay off for good or fail.`}>
      {pols.length > 0 && <ul className="space-y-3">{pols.map((p) => <PolicyRow key={p.id} game={game} p={p} />)}</ul>}
      {inits.length > 0 && (
        <>
          <h3 className="mt-4 font-display text-base">Initiatives</h3>
          <ul className="mt-1 space-y-2">
            {inits.map((i) => {
              const chk = initiativeCheck(game, i.id);
              const active = initiativeActive(game, i.id);
              const d = game.play8?.proj?.done[i.id];
              const status = active ? `Under way: reports in ${Math.max(0, active.end - game.month)} months` : d?.result === 'won' ? 'Done: it paid off' : d ? `Failed ${game.month - d.month} months ago${game.month - d.month < RETRY_MONTHS ? ` (retry in ${RETRY_MONTHS - (game.month - d.month)})` : ''}` : `${i.months} months · ${i.success}% to succeed`;
              return (
                <li key={i.id} className="flex flex-wrap items-center gap-2 text-sm" data-initiative={i.id}>
                  <span className="min-w-0 flex-1"><b>{i.name}</b> <span className="text-xs text-ink-2">· {i.blurb} · {status}</span></span>
                  <Button className="!min-h-8 !px-2.5 !py-1 !text-xs" disabled={!chk.ok || game.status !== 'playing'} title={chk.reason} onClick={() => act({ type: 'initiative', id: i.id }, `${i.name} started.`)}>{d?.result === 'won' ? 'Done' : active ? 'Running' : `Start (${formatGBP(initiativeCost(game, i), { compact: true })})`}</Button>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </Fold>
  );
}
