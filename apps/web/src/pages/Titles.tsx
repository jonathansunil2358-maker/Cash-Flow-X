import { TITLES } from '@cfx/engine';
import { Button, Card } from '../components/ui';
import { useGame } from '../store';

/** Founder titles: earned by achievements, worn beside your name on the leaderboards. */
export function TitlesCard() {
  const { profile, setTitle } = useGame();
  const owned = TITLES.filter((t) => profile.achievements[t.id]);
  const worn = TITLES.find((t) => t.id === profile.title);
  return (
    <Card fold id="card-titles" title="Founder titles"
      subtitle={owned.length ? `Wear one beside your name on the boards. ${owned.length} of ${TITLES.length} earned.` : `Earn achievements to unlock titles. There are ${TITLES.length} to find.`}>
      <div className="space-y-3">
        <p className="text-sm font-bold" role="status">{worn ? `You are "${worn.title}".` : 'No title chosen.'}</p>
        <ul className="grid gap-2 sm:grid-cols-2">
          {TITLES.map((t) => {
            const got = !!profile.achievements[t.id];
            const on = profile.title === t.id;
            return (
              <li key={t.id} className={`flex items-center justify-between gap-2 rounded-2xl border-[3px] border-outline p-2.5 ${got ? 'bg-surface-2' : 'opacity-60'}`}>
                <div className="min-w-0 text-sm">
                  <div className="font-display text-base leading-tight">{t.title}</div>
                  <div className="text-xs text-ink-2">{got ? t.name : `Locked: ${t.description}`}</div>
                </div>
                <Button variant={on ? 'primary' : 'secondary'} aria-pressed={on} disabled={!got} onClick={() => setTitle(on ? null : t.id)}>{on ? 'Worn' : 'Wear'}</Button>
              </li>
            );
          })}
        </ul>
      </div>
    </Card>
  );
}
