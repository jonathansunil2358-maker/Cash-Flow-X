import {
  blackFridayCheck, complaintCheck, complaintCost, complaintsOf, custOf, formatGBP, happyRegulars, influencerCheck, INFLUENCERS, loyaltyCheck, loyaltyOn, LOYALTY_COST_RATE, regularsOf, type GameState,
} from '@cfx/engine';
import { Button, KeyValue } from '../components/ui';
import { useGame } from '../store';
import { Fold } from './Strategy';

const live = (g: GameState): boolean => g.status === 'playing';

export function LoyaltyCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const on = loyaltyOn(game);
  const chk = loyaltyCheck(game, !on);
  return (
    <Fold id="card-loyalty" title="Loyalty programme" summary={on ? 'Running: more demand, fewer cancellations.' : 'Points for regulars. Open for details.'}
      subtitle={`Raises demand about 3% and cuts cancellations 10%, but costs ${(LOYALTY_COST_RATE * 100).toFixed(1)}% of monthly sales in rewards, every month, for as long as it runs.`}>
      <Button disabled={!chk.ok || !live(game)} onClick={() => act({ type: 'setLoyalty', on: !on }, on ? 'Programme closed.' : 'Programme launched.')}>{on ? 'Close the programme' : 'Launch the programme'}</Button>
      {!chk.ok && <p className="mt-2 text-xs text-muted">{chk.reason}</p>}
    </Fold>
  );
}

export function ServiceDeskCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const list = complaintsOf(game);
  return (
    <Fold id="card-service" title="Service desk" summary={`${list.length} complaint${list.length === 1 ? '' : 's'} waiting. ${custOf(game).fixed ?? 0} fixed so far.`}
      subtitle={`Each month a few customers complain. Answering one costs a goodwill gesture of ${formatGBP(complaintCost(game), { compact: true })} and lifts reputation a little; complaints left for two months cost reputation.`}>
      {list.length === 0 ? <p className="text-sm text-ink-2">Nothing waiting. Quiet desk.</p> : (
        <ul className="space-y-2">
          {list.map((c) => {
            const chk = complaintCheck(game, c.id);
            return (
              <li key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
                <span className="min-w-0 flex-1">“{c.text}” <span className="text-xs text-ink-2">(from month {c.month + 1})</span></span>
                <Button disabled={!chk.ok || !live(game)} onClick={() => act({ type: 'resolveComplaint', id: c.id }, 'Complaint answered.')}>Make it right</Button>
              </li>
            );
          })}
        </ul>
      )}
    </Fold>
  );
}

export function InfluencerCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  return (
    <Fold id="card-influencer" title="Influencer deals" summary="Pay for a shout-out: a gamble." subtitle="A paid promotion lasts three months if it works. The bigger the name, the bigger the upside and the bigger the risk. One deal at a time.">
      <div className="space-y-2">
        {INFLUENCERS.map((i) => {
          const chk = influencerCheck(game, i.id);
          return (
            <div key={i.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-0 flex-1"><b>{i.name}</b> ({formatGBP(chk.cost, { compact: true })}): {i.blurb}</span>
              <Button disabled={!chk.ok || !live(game)} onClick={() => act({ type: 'influencer', tier: i.id }, 'Deal signed.')}>Sign</Button>
            </div>
          );
        })}
      </div>
    </Fold>
  );
}

export function RegularsCard({ game }: { game: GameState }) {
  const list = regularsOf(game);
  return (
    <Fold id="card-regulars" title="Your regulars" summary={`${happyRegulars(game)} of 5 are happy.`} subtitle="Five named customers who come back again and again. Each is happy while your reputation is above what they expect, and every happy regular adds half a per cent to demand.">
      <ul className="space-y-1.5 text-sm">
        {list.map((r) => {
          const happy = game.reputation >= r.needs;
          return <li key={r.name}><span aria-hidden>{happy ? '😊' : '😕'}</span> <b>{r.name}</b> {r.quirk}. <span className="text-xs text-ink-2">Needs reputation {r.needs}.</span></li>;
        })}
      </ul>
    </Fold>
  );
}

export function BlackFridayCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const chk = blackFridayCheck(game);
  return (
    <Fold id="card-blackfriday" title="Black Friday" summary="A one-month demand surge, only in November." subtitle="Once a year, in November: pay for a big campaign and demand jumps 30% for the month. If you have not got the stock or the people to serve it, you turn customers away.">
      <Button disabled={!chk.ok || !live(game)} onClick={() => act({ type: 'blackFriday' }, 'Black Friday is on!')}>Run Black Friday ({formatGBP(chk.cost, { compact: true })})</Button>
      {!chk.ok && <KeyValue rows={[['Not now', chk.reason ?? '']]} />}
    </Fold>
  );
}
