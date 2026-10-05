import { formatGBP, optionOf, policiesFor, policyCheck, runningCost, type GameState, type PolicyGroup } from '@cfx/engine';
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
  const list = policiesFor(game).filter((p) => p.group === group);
  if (list.length === 0) return null;
  const active = list.filter((p) => optionOf(game, p.id) > 0).length;
  const run = runningCost(game);
  return (
    <Fold id={`card-pol-${group}`} title={TITLES[group].title} summary={`${active} of ${list.length} switched on.${group === 'ops' && run !== 0 ? ` Policies cost ${formatGBP(run, { compact: true })} a month.` : ''}`}
      subtitle={`${TITLES[group].text} You can change a dial every ${3} months.`}>
      <ul className="space-y-3">
        {list.map((p) => {
          const now = optionOf(game, p.id);
          return (
            <li key={p.id} className="text-sm" data-policy={p.id}>
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
        })}
      </ul>
    </Fold>
  );
}
