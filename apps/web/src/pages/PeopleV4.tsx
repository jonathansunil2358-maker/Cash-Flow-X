import {
  COURSES, courseCheck, courseCost, formatGBP, headhuntCheck, innovationCheck, MAX_STARS, peopleOf, starsOf, workstyleCheck, workstyleOf, WORKSTYLES, type GameState,
} from '@cfx/engine';
import { Button, KeyValue } from '../components/ui';
import { useGame } from '../store';
import { Fold } from './Strategy';

const live = (g: GameState): boolean => g.status === 'playing';

/** Short courses for the whole team. */
export function AcademyCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  return (
    <Fold id="card-academy" title="Training academy" summary={`${peopleOf(game).trained ?? 0} courses taken. Open to book one.`}
      subtitle={`A course costs ${formatGBP(courseCost(game), { compact: true })} for the team and each one can be repeated after six months. Every four courses taken adds half a per cent to capacity (up to 3%).`}>
      <ul className="space-y-2">
        {COURSES.map((c) => {
          const chk = courseCheck(game, c.id);
          return (
            <li key={c.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-0 flex-1"><b>{c.name}</b>: {c.blurb}</span>
              <Button disabled={!chk.ok || !live(game)} onClick={() => act({ type: 'takeCourse', course: c.id }, `${c.name} course done.`)}>Book</Button>
              {!chk.ok && <span className="basis-full text-xs text-muted">{chk.reason}</span>}
            </li>
          );
        })}
      </ul>
    </Fold>
  );
}

/** Office, hybrid or remote: rent, morale and a little quality. */
export function WorkstyleCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const cur = workstyleOf(game);
  return (
    <Fold id="card-workstyle" title="Where we work" summary={`${cur.name}. Open to change it.`} subtitle="Rent, morale and quality all move with how your team works. You can change the policy once a year.">
      <div className="space-y-2">
        {WORKSTYLES.map((w) => {
          const chk = workstyleCheck(game, w.id);
          return (
            <div key={w.id} className="flex flex-wrap items-center gap-2 text-sm">
              <span className="min-w-0 flex-1"><b>{w.name}</b>: {w.blurb}</span>
              <Button disabled={!chk.ok || !live(game)} onClick={() => act({ type: 'setWorkstyle', style: w.id }, `Policy: ${w.name}.`)}>{w.id === cur.id ? 'Current' : 'Choose'}</Button>
            </div>
          );
        })}
      </div>
    </Fold>
  );
}

/** Once a year the team downs tools for a hackathon. */
export function InnovationCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const chk = innovationCheck(game);
  return (
    <Fold id="card-innovation" title="Innovation day" summary="A yearly hackathon: sometimes a surprise product, always good for morale." subtitle={`Costs ${formatGBP(chk.cost, { compact: true })}. Most years it lifts morale; more than half the time it also produces a surprise product (quality and brand up).`}>
      <Button disabled={!chk.ok || !live(game)} onClick={() => act({ type: 'innovationDay' }, 'Innovation day!')}>Hold an innovation day</Button>
      {!chk.ok && <p className="mt-2 text-xs text-muted">{chk.reason}</p>}
    </Fold>
  );
}

/** Pay a premium to poach a three-star hire from a rival. */
export function HeadhuntCard({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const roles = ['ops', 'rnd', 'sales'] as const;
  return (
    <Fold id="card-headhunt" title="Poach a star" summary={`${starsOf(game).length} of ${MAX_STARS} stars on the team.`} subtitle="Pay a big fee to lure a three-star person from a rival. They bring a lasting perk, the rival gets a little weaker, and your own stars may be poached in return. One a year.">
      <div className="flex flex-wrap gap-2">
        {roles.map((r) => {
          const chk = headhuntCheck(game, r);
          return <Button key={r} disabled={!chk.ok || !live(game)} onClick={() => act({ type: 'headhunt', role: r }, 'A star joins.')}>{game.industryId && ({ ops: 'Operations', rnd: 'R&D', sales: 'Sales' }[r])} ({formatGBP(chk.fee, { compact: true })})</Button>;
        })}
      </div>
      <KeyValue rows={[['Why it costs so much', 'You pay the recruiter four times the usual fee.']]} />
    </Fold>
  );
}
