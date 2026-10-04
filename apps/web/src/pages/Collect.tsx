import { LAND, landOf, museumOf, SOUNDTRACKS, tracksOf, TRAILS, trailProgress, trailsClaimed } from '@cfx/engine';
import { playMusic, setTrack } from '../lib/music';
import { musicMood } from '@cfx/engine';
import { Button, Card, Meter } from '../components/ui';
import { CURRENCY_ICONS } from '../lib/icons';
import { useGame } from '../store';

/** Buy extra land for the island. New land lets you build new decorations. */
export function LandCard() {
  const { profile, buyLand } = useGame();
  const owned = landOf(profile);
  return (
    <Card fold id="card-land" title="Extra land" subtitle="Buy more island. Each piece of land appears off the shore and unlocks a new decoration in the list above.">
      <div className="grid gap-2 sm:grid-cols-3">
        {LAND.map((l) => (
          <div key={l.id} className="rounded-lg border border-line p-2.5 text-sm">
            <div className="font-bold">{l.name}</div>
            {owned.includes(l.id) ? <div className="text-xs text-good-text font-black">Yours</div>
              : <Button className="mt-1" variant="gem" disabled={profile.gems < l.gems} onClick={() => buyLand(l.id)}><span className="inline-flex items-center gap-1"><img src={CURRENCY_ICONS.gem} alt="" className="h-4 w-4" />{l.gems}</span></Button>}
          </div>
        ))}
      </div>
    </Card>
  );
}

/** Chains of achievements with a bigger prize at the end. */
export function TrailsCard() {
  const { profile, claimTrail } = useGame();
  const claimed = trailsClaimed(profile);
  return (
    <Card fold id="card-trails" title="Achievement trails" subtitle="Finish every achievement on a trail for a bigger reward.">
      <ul className="space-y-3">
        {TRAILS.map((t) => {
          const p = trailProgress(profile, t);
          const got = claimed.includes(t.id);
          return (
            <li key={t.id} className="rounded-lg border border-line p-2.5">
              <div className="flex items-center justify-between gap-2"><b>{t.name}</b>
                {got ? <span className="text-xs font-black text-good-text">Claimed</span>
                  : <Button variant="gem" disabled={!p.complete} onClick={() => claimTrail(t.id)}>Claim {t.gems}</Button>}
              </div>
              <div className="text-xs text-ink-2">{t.blurb}{p.next && !got ? ` Next: ${p.next}.` : ''}</div>
              <div className="mt-1"><Meter value={p.done} max={p.total} label={`${t.name} progress`} text={`${p.done} / ${p.total}`} /></div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** More music styles to unlock. */
export function SoundtrackCard() {
  const { profile, buyTrack, selectTrack, game } = useGame();
  const t = tracksOf(profile);
  const pick = (id: string) => { selectTrack(id); setTrack(id); if (game) playMusic(musicMood(game)); };
  return (
    <Card fold id="card-tracks" title="Soundtracks" subtitle="Styles for the background music. Switch the music on above.">
      <ul className="grid gap-2 sm:grid-cols-2">
        {SOUNDTRACKS.map((s) => {
          const owned = t.owned.includes(s.id);
          return (
            <li key={s.id} className="flex items-center gap-3 rounded-lg border border-line p-2.5">
              <div className="min-w-0 flex-1"><div className="font-bold">{s.name}</div><div className="text-xs text-ink-2">{s.blurb}</div></div>
              {owned ? <Button aria-pressed={t.selected === s.id} onClick={() => pick(s.id)}>{t.selected === s.id ? 'Playing' : 'Use'}</Button>
                : <Button variant="gem" disabled={profile.gems < s.gems} onClick={() => { buyTrack(s.id); setTrack(s.id); }}>{s.gems} gems</Button>}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** A shelf with a cup for every company you have run. */
export function MuseumCard() {
  const profile = useGame((s) => s.profile);
  const shelf = museumOf(profile);
  const cup = { gold: '🏆', silver: '🥈', bronze: '🥉', ruin: '🪦' } as const;
  return (
    <Card fold id="card-museum" title="Museum of your companies" subtitle="Every company you have run gets a place on the shelf.">
      {shelf.length === 0 ? <p className="text-sm text-ink-2">Nothing here yet. Finish or sell a company and it will appear.</p> : (
        <ul className="grid gap-2 sm:grid-cols-2">
          {[...shelf].reverse().slice(0, 12).map((e, i) => (
            <li key={i} className="flex items-center gap-2 rounded-lg border border-line p-2.5 text-sm">
              <span className="text-3xl" aria-hidden>{cup[e.tier]}</span>
              <div className="min-w-0"><div className="font-bold">{e.name}</div><div className="text-xs text-ink-2">{e.emoji} {e.sector} · {e.months} months · {e.label}</div></div>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
