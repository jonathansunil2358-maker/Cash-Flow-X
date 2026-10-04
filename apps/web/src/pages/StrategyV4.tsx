import {
  boonCheck, boonOffer, boonsDue, BOONS, boonsOf, donateCheck, donationMin, esgOf, formatGBP, GREEN_STEPS, greenCheck, greenOf, INDUSTRIES, INDUSTRY_IDS, MAX_SUBS, rateOutlook,
  stanceCheck, stanceOf, STANCES, subCheck, subsOf, subStake, type GameState,
} from '@cfx/engine';
import { Button, KeyValue } from '../components/ui';
import { useGame } from '../store';
import { Fold } from './Strategy';

const live = (g: GameState): boolean => g.status === 'playing';

export function SubsidiaryCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const subs = subsOf(game);
  return (
    <Fold id="card-subs" title="Group of companies" summary={`${subs.length} of ${MAX_SUBS} subsidiaries.`}
      subtitle={`For a company worth £2m or more: put ${formatGBP(subStake(game), { compact: true })} into a business in another sector. It pays a monthly return that follows its sector's margins and seasons, and now and then has a bad month. This is the smallest version: one extra income line, not a second set of books.`}>
      {subs.length > 0 && <KeyValue rows={subs.map((x) => [INDUSTRIES[x.sector].name, `${formatGBP(x.stake, { compact: true })} stake`] as [string, string])} />}
      <div className="mt-2 flex flex-wrap gap-2">
        {INDUSTRY_IDS.filter((id) => id !== game.industryId && !subs.some((x) => x.sector === id)).map((id) => {
          const chk = subCheck(game, id);
          return <Button key={id} disabled={!chk.ok || !live(game)} onClick={() => act({ type: 'foundSub', sector: id }, `Subsidiary founded: ${INDUSTRIES[id].name}.`)}>{INDUSTRIES[id].emoji} {INDUSTRIES[id].name}</Button>;
        })}
      </div>
      {!subCheck(game, INDUSTRY_IDS.find((id) => id !== game.industryId)!).ok && <p className="mt-2 text-xs text-muted">{subCheck(game, INDUSTRY_IDS.find((id) => id !== game.industryId && !subs.some((x) => x.sector === id)) ?? INDUSTRY_IDS[0]).reason}</p>}
    </Fold>
  );
}

export function BoonsCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const due = boonsDue(game);
  return (
    <Fold id="card-boons" title="Yearly boons" summary={due > 0 ? `${due} to pick: choose one of three.` : `${boonsOf(game).length} chosen. Next one at the next year.`}
      subtitle="Each year of the company brings three random strategy cards. Pick one and keep it for good. Cards you have already taken are never offered again.">
      {boonsOf(game).length > 0 && <p className="mb-2 text-xs text-ink-2">Yours: {boonsOf(game).map((id) => BOONS.find((b) => b.id === id)?.name).join(', ')}</p>}
      {due > 0 ? (
        <ul className="space-y-2">
          {boonOffer(game).map((b) => (
            <li key={b.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-0 flex-1"><b>{b.name}</b>: {b.text}</span>
              <Button variant="primary" disabled={!boonCheck(game, b.id).ok || !live(game)} onClick={() => act({ type: 'pickBoon', id: b.id }, `Boon chosen: ${b.name}.`)}>Pick</Button>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-ink-2">Nothing to pick right now.</p>}
    </Fold>
  );
}

export function CycleCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const econ = game.economy;
  const outlook = rateOutlook(game);
  return (
    <Fold id="card-cycle" title="Economic cycle desk" summary={`Economy at ${Math.round(econ.demandMult * 100)}% demand. Stance: ${stanceOf(game)}.`}
      subtitle="Where the economy is, which way rates are leaning next quarter, and your stance. A defensive stance cushions slumps; expansion amplifies both booms and slumps. You can change stance every six months.">
      <KeyValue rows={[
        ['Economy demand', `${Math.round(econ.demandMult * 100)}% of normal`],
        ['Base rate', `${(econ.baseRate * 100).toFixed(2)}%`],
        ['Next rate decision leans', outlook === 'rise' ? 'Up' : outlook === 'fall' ? 'Down' : 'Hold'],
      ]} />
      <div className="mt-2 space-y-2">
        {STANCES.map((st) => {
          const chk = stanceCheck(game, st.id);
          return (
            <div key={st.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-0 flex-1"><b>{st.name}</b>: {st.blurb}</span>
              <Button disabled={!chk.ok || !live(game)} onClick={() => act({ type: 'setStance', stance: st.id }, `Stance: ${st.name}.`)}>{stanceOf(game) === st.id ? 'Current' : 'Choose'}</Button>
            </div>
          );
        })}
      </div>
    </Fold>
  );
}

export function GreenCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const e = esgOf(game);
  const chk0 = donateCheck(game, donationMin(game));
  return (
    <Fold id="card-green" title="Green track and ESG" summary={`ESG rating ${e.rating} (${e.score}/100).`}
      subtitle="Green steps cost money and pay back in rent, costs or reputation. Your ESG rating also counts gifts to charity, team morale and reputation; an A rating makes lenders cut 0.25% off your loans.">
      <KeyValue rows={e.parts.map(([k, v]) => [k, `${v} points`] as [string, string])} />
      <div className="mt-2 space-y-2">
        {GREEN_STEPS.map((g) => {
          const chk = greenCheck(game, g.id);
          const done = greenOf(game).includes(g.id);
          return (
            <div key={g.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-0 flex-1"><b>{g.name}</b>: {g.blurb}</span>
              <Button disabled={!chk.ok || !live(game)} onClick={() => act({ type: 'goGreen', step: g.id }, `${g.name} done.`)}>{done ? 'Done' : `Do it (${formatGBP(chk.cost, { compact: true })})`}</Button>
            </div>
          );
        })}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="min-w-0 flex-1"><b>Give to charity</b>: reputation +1.5 and ESG points, once a quarter.</span>
          <Button disabled={!chk0.ok || !live(game)} onClick={() => act({ type: 'donate', amount: donationMin(game) }, 'A gift to charity.')}>Give {formatGBP(donationMin(game), { compact: true })}</Button>
        </div>
      </div>
    </Fold>
  );
}
