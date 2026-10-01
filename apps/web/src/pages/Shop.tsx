import { cosmeticsOf, SKINS } from '@cfx/engine';
import { Button, Card } from '../components/ui';
import { CURRENCY_ICONS } from '../lib/icons';
import { useGame } from '../store';

/** Skins for your island, bought with gems. Colours only: they never change a number in the game. */
export function ShopCard() {
  const { profile, buySkin, equipSkin } = useGame();
  const c = cosmeticsOf(profile);
  return (
    <Card id="card-shop" title="Island shop" subtitle="Change how your island looks. Skins are colours only, so they never affect a score.">
      <ul className="grid gap-2 sm:grid-cols-2">
        {SKINS.map((s) => {
          const owned = c.owned.includes(s.id);
          const on = c.skin === s.id;
          const p = s.palette;
          return (
            <li key={s.id} className={`rounded-2xl border-[3px] p-2.5 ${on ? 'border-accent bg-surface-2' : 'border-outline'}`}>
              <div className="flex items-center gap-2">
                <span className="flex shrink-0 overflow-hidden rounded-lg border-2 border-outline" aria-hidden>
                  {[p.sea, p.grass, p.leaf[0], p.leaf[2], p.sand].map((col, i) => <span key={i} className="block h-8 w-4" style={{ background: col }} />)}
                </span>
                <div className="min-w-0 text-sm">
                  <div className="font-display text-base leading-tight">{s.name}</div>
                  <div className="text-xs text-ink-2">{s.blurb}</div>
                </div>
              </div>
              <div className="mt-2">
                {owned ? (
                  <Button variant={on ? 'primary' : 'secondary'} aria-pressed={on} disabled={on} onClick={() => equipSkin(s.id)}>{on ? 'Equipped' : 'Equip'}</Button>
                ) : (
                  <Button variant="gem" disabled={profile.gems < s.gems} onClick={() => buySkin(s.id)}>
                    <span className="inline-flex items-center gap-1"><img src={CURRENCY_ICONS.gem} alt="" className="h-4 w-4" />Buy for {s.gems}</span>
                  </Button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-2 text-xs text-ink-2">You have {profile.gems} gems. Earn more from missions, the daily reward and challenges.</p>
    </Card>
  );
}
