import {
  BOOSTS, boxCount, completedPages, formatGBP, luckOf, stickerDef, STICKER_PAGES, STICKERS, stickersOnPage, type BoxReward, type GameState,
} from '@cfx/engine';
import { useState } from 'react';
import { Button, Card, Meter } from '../components/ui';
import { CURRENCY_ICONS } from '../lib/icons';
import { useGame } from '../store';
import { Fold } from './Strategy';

const describe = (r: BoxReward): { emoji: string; title: string; text: string } => {
  if (r.kind === 'gems') return { emoji: '💎', title: `${r.gems} gems`, text: 'Added to your pile.' };
  if (r.kind === 'boost') return { emoji: '⚡', title: BOOSTS[r.boost].name, text: `${BOOSTS[r.boost].description} Banked for your next boost.` };
  const s = stickerDef(r.sticker);
  return { emoji: s?.emoji ?? '🏷️', title: `Sticker: ${s?.name ?? ''}`, text: 'Added to your album.' };
};

/** Mystery boxes earned from quests and awards. */
export function BoxesCard() {
  const { profile, openBox } = useGame();
  const [last, setLast] = useState<BoxReward | null>(null);
  const n = boxCount(profile);
  const d = last ? describe(last) : null;
  return (
    <Card id="card-boxes" title="Mystery boxes" subtitle="Earned by finishing all three daily quests and by winning awards. Each opens to gems, a boost or a sticker."
      actions={<span className="tnum rounded-[10px] border-2 border-outline bg-surface-2 px-2 py-1 text-xs font-black" aria-label={`${n} boxes`}>🎁 {n}</span>}>
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="gem" disabled={n < 1} onClick={() => { const r = openBox(); if (r) setLast(r.reward); }}>{n < 1 ? 'No boxes yet' : `Open a box (${n})`}</Button>
        {d && (
          <div className="flex items-center gap-2 rounded-2xl border-[3px] border-outline bg-surface-2 px-3 py-1.5" role="status">
            <span className="text-3xl" aria-hidden>{d.emoji}</span>
            <span className="text-sm"><b>{d.title}</b><br /><span className="text-xs text-ink-2">{d.text}</span></span>
          </div>
        )}
      </div>
    </Card>
  );
}

/** The sticker album: collect pages for gems. */
export function AlbumCard() {
  const { profile, claimAlbumPage } = useGame();
  const owned = profile.stickers ?? [];
  const ready = completedPages(owned, profile.albumClaimed ?? []).map((p) => p.id);
  return (
    <Card id="card-album" title={`Sticker album (${owned.length}/${STICKERS.length})`} subtitle="Finish a page of six for 40 gems. Stickers come from mystery boxes and some achievements.">
      <div className="space-y-3">
        {STICKER_PAGES.map((pg) => {
          const items = stickersOnPage(pg.id);
          const have = items.filter((s) => owned.includes(s.id)).length;
          const claimed = (profile.albumClaimed ?? []).includes(pg.id);
          return (
            <div key={pg.id} className="rounded-2xl border-[3px] border-outline p-2.5">
              <div className="flex items-center justify-between gap-2">
                <div className="font-display text-base leading-tight">{pg.name} <span className="text-xs font-bold text-ink-2">{have}/6</span></div>
                <Button variant="go" disabled={!ready.includes(pg.id)} onClick={() => claimAlbumPage(pg.id)}>
                  {claimed ? 'Paid' : ready.includes(pg.id) ? `Claim ${pg.gems}` : <span className="inline-flex items-center gap-1"><img src={CURRENCY_ICONS.gem} alt="" className="h-4 w-4" />{pg.gems}</span>}
                </Button>
              </div>
              <ul className="mt-1.5 grid grid-cols-6 gap-1.5" aria-label={`${pg.name} stickers`}>
                {items.map((s) => {
                  const got = owned.includes(s.id);
                  return (
                    <li key={s.id} title={got ? s.name : 'Not found yet'} className={`grid aspect-square place-items-center rounded-xl border-2 border-outline text-2xl ${got ? 'bg-surface-2' : 'opacity-40 grayscale'}`}>
                      <span aria-label={got ? s.name : 'Not found yet'}>{got ? s.emoji : '❔'}</span>
                    </li>
                  );
                })}
              </ul>
              <div className="mt-1.5"><Meter value={have} max={6} label={`${pg.name} progress`} tone="go" text={`${have} of 6`} /></div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

/** The rumour mill, and any luck streak. */
export function RumourCard({ game }: { game: GameState }) {
  const r = game.rumour;
  const luck = luckOf(game);
  const left = r ? Math.max(0, r.resolveMonth - game.month) : 0;
  return (
    <Fold id="card-rumours" title="Rumour mill"
      summary={r ? `"${r.text}" Open for details.` : luck ? `${luck.title} is on. Open for details.` : 'Quiet for now. Rumours turn up now and then.'}
      subtitle="Now and then you hear something. About two in three rumours turn out true, so act on them at your own risk.">
      <div className="space-y-3 text-sm">
        {r ? (
          <p role="status"><b>{r.text}</b><br /><span className="text-xs text-ink-2">We will know in {left} month{left === 1 ? '' : 's'}.</span></p>
        ) : <p className="text-ink-2">No rumours right now.</p>}
        {luck && <p className="rounded-lg border border-line p-2.5"><b>{luck.title}</b>: demand {luck.effects.demandMult && luck.effects.demandMult > 1 ? '+5%' : '−5%'} for about {Math.max(0, luck.remaining - 1)} more month{luck.remaining - 1 === 1 ? '' : 's'}.</p>}
        <p className="text-xs text-muted">Cash right now: {formatGBP(game.ledger.balances.cash, { compact: true })}.</p>
      </div>
    </Fold>
  );
}
