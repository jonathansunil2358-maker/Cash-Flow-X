import { hasSkill, monthLabel, type GameState } from '@cfx/engine';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '../components/ui';
import { EXTRA_FILTERS, PHOTO_FILTERS, renderPhoto, sharePhoto } from '../lib/photo';
import { useGame } from '../store';

/** A camera button on the scene, and the photo studio it opens. */
export function PhotoButton({ game }: { game: GameState }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" className="cfx-icon-btn absolute bottom-1 right-1 z-[5]" aria-label="Photo mode" onClick={() => setOpen(true)}>
        <span aria-hidden className="text-lg">📷</span>
      </button>
      {open && <PhotoStudio game={game} onClose={() => setOpen(false)} />}
    </>
  );
}

function PhotoStudio({ game, onClose }: { game: GameState; onClose: () => void }) {
  const [filterId, setFilterId] = useState('none');
  const [msg, setMsg] = useState<string | null>(null);
  const toast = useGame((s) => s.toast);
  const extras = useGame((s) => hasSkill(s.profile, 'photoFilters'));
  const filters = useMemo(() => (extras ? [...PHOTO_FILTERS, ...EXTRA_FILTERS] : PHOTO_FILTERS), [extras]);
  const preview = useRef<HTMLCanvasElement>(null);
  const source = useMemo(() => document.querySelector<HTMLCanvasElement>('section[aria-label="Your business"] canvas'), []);
  const filter = filters.find((f) => f.id === filterId) ?? filters[0];
  const sky = useMemo(() => getComputedStyle(document.documentElement).getPropertyValue('--sky').trim() || '#bfe6ff', []);
  const caption = game.companyName;
  const sub = `${monthLabel(game.month)} · ${game.industryId}`;

  useEffect(() => {
    if (!source || !preview.current) return;
    const out = renderPhoto(source, { caption, sub, filter, sky });
    const c = preview.current;
    c.width = out.width;
    c.height = out.height;
    c.getContext('2d')!.drawImage(out, 0, 0);
  }, [source, filter, caption, sub, sky]);

  const share = async () => {
    if (!source) { setMsg('Turn the 3D scene on in Settings to take photos.'); return; }
    const out = renderPhoto(source, { caption, sub, filter, sky });
    const r = await sharePhoto(out, `${game.companyName.replace(/[^a-z0-9]+/gi, '-').toLowerCase() || 'island'}-${game.month}`);
    if (r === 'downloaded') toast('success', 'Photo saved. Share it anywhere.');
    else if (r === 'failed') toast('error', 'Could not make the photo on this device.');
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-[#13324d]/70 p-3" role="dialog" aria-modal="true" aria-label="Photo studio">
      <div className="cfx-panel w-full max-w-[560px] !p-3.5">
        <div className="font-display text-xl">Photo studio</div>
        {source ? <canvas ref={preview} className="mt-2 w-full rounded-xl border-[3px] border-outline" aria-label="Photo preview" /> : <p className="mt-2 text-sm font-bold">{msg ?? 'Turn the 3D scene on in Settings to take photos.'}</p>}
        <div className="mt-2 flex flex-wrap gap-1.5" role="group" aria-label="Filters">
          {filters.map((f) => <Button key={f.id} variant={filterId === f.id ? 'primary' : 'secondary'} aria-pressed={filterId === f.id} onClick={() => setFilterId(f.id)}>{f.name}</Button>)}
        </div>
        <div className="mt-3 flex gap-2">
          <Button variant="primary" disabled={!source} onClick={() => void share()}>Share or save</Button>
          <Button onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
}
