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

import { DECOR, decorOf, DEFAULT_LOGO, LOGO_COLOURS, LOGO_SHAPES, logoOf } from '@cfx/engine';
import { LogoBadge } from '../components/LogoBadge';

/** Decorations for the island, bought with gems. */
export function DecorCard() {
  const { profile, buyDecor, toggleDecor } = useGame();
  const d = decorOf(profile);
  return (
    <Card id="card-decor" title="Island decorations" subtitle="Dress your island. Each one stands at its own spot and can be switched off. They never change a number in the game.">
      <ul className="grid gap-2 sm:grid-cols-2">
        {DECOR.map((x) => {
          const owned = d.owned.includes(x.id);
          const on = d.placed.includes(x.id);
          return (
            <li key={x.id} className={`rounded-2xl border-[3px] p-2.5 ${on ? 'border-accent bg-surface-2' : 'border-outline'}`}>
              <div className="flex items-center gap-2">
                <span className="text-3xl" aria-hidden>{x.emoji}</span>
                <div className="min-w-0 text-sm"><div className="font-display text-base leading-tight">{x.name}</div><div className="text-xs text-ink-2">{x.blurb}</div></div>
              </div>
              <div className="mt-2">
                {owned ? <Button variant={on ? 'primary' : 'secondary'} aria-pressed={on} onClick={() => toggleDecor(x.id)}>{on ? 'On the island' : 'Place it'}</Button>
                  : <Button variant="gem" disabled={profile.gems < x.gems} onClick={() => buyDecor(x.id)}><span className="inline-flex items-center gap-1"><img src={CURRENCY_ICONS.gem} alt="" className="h-4 w-4" />Buy for {x.gems}</span></Button>}
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

/** Make your company logo: a shape, two colours and your business icon. */
export function LogoCard({ icon }: { icon: string }) {
  const { profile, setLogo } = useGame();
  const logo = logoOf(profile);
  const Swatches = ({ field }: { field: 'bg' | 'fg' }) => (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={field === 'bg' ? 'Background colour' : 'Outline colour'}>
      {LOGO_COLOURS.map((c) => (
        <button key={c} type="button" aria-label={c} aria-pressed={logo[field] === c} onClick={() => setLogo({ [field]: c })}
          className={`h-7 w-7 rounded-full border-[3px] ${logo[field] === c ? 'border-accent ring-2 ring-[var(--coin)]' : 'border-outline'}`} style={{ background: c }} />
      ))}
    </div>
  );
  return (
    <Card id="card-logo" title="Company logo" subtitle="Shows in the top bar and on your pictures.">
      <div className="flex flex-wrap items-center gap-4">
        <LogoBadge logo={logo} icon={icon} size={72} />
        <div className="space-y-2">
          <div className="flex gap-1.5" role="group" aria-label="Shape">
            {LOGO_SHAPES.map((sh) => <Button key={sh} variant={logo.shape === sh ? 'primary' : 'secondary'} aria-pressed={logo.shape === sh} onClick={() => setLogo({ shape: sh })}>{sh}</Button>)}
          </div>
          <Swatches field="bg" />
          <Swatches field="fg" />
          <Button onClick={() => setLogo(DEFAULT_LOGO)}>Reset</Button>
        </div>
      </div>
    </Card>
  );
}
