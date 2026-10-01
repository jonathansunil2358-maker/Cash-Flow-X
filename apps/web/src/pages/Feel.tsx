import { formatGBP, nextTip, theatreAt, theatreMonths, tipsHeard, type GameState } from '@cfx/engine';
import { useState } from 'react';
import { Button, Card, Field } from '../components/ui';
import { readAccess, writeAccess, type Access } from '../lib/access';
import { getHapticStrength, getSoundPack, playSound, setHapticStrength, setSoundPack, SOUND_PACKS, type HapticStrength } from '../lib/sfx';
import { readPref, writePref } from '../lib/save';
import { useGame } from '../store';

export const isGuideOn = (): boolean => readPref('guide') !== 'off';
export const isSeasonLookOn = (): boolean => readPref('seasonlook') !== 'off';

/** Penny the guide: a small speech bubble on the island with one useful tip at a time. */
export function GuideBubble({ game }: { game: GameState }) {
  const { profile, hearTip } = useGame();
  const [, bump] = useState(0);
  if (!isGuideOn()) return null;
  const tip = nextTip(game, tipsHeard(profile));
  if (!tip) return null;
  return (
    <button type="button" className="cfx-guide absolute bottom-3 right-3 max-w-[60%] rounded-2xl border-[3px] border-outline bg-surface p-2 text-left text-xs font-bold shadow-[var(--edge-sm)]"
      aria-label={`Penny the guide says: ${tip.text} Tap to dismiss.`} onClick={() => { hearTip(tip.id); bump((n) => n + 1); }}>
      <span aria-hidden>🧑‍🏫 </span>{tip.text}
    </button>
  );
}

/** Settings for how the game looks, sounds and reads. */
export function FeelCard() {
  const [a, setA] = useState<Access>(readAccess());
  const [pack, setPack] = useState(getSoundPack());
  const [hap, setHap] = useState<HapticStrength>(getHapticStrength());
  const [guide, setGuide] = useState(isGuideOn());
  const [look, setLook] = useState(isSeasonLookOn());
  const update = (patch: Partial<Access>) => setA(writeAccess(patch));
  const sel = 'rounded-lg border border-line bg-page px-2.5 py-1.5 text-sm';
  return (
    <Card id="card-feel" title="Look, sound and reading" subtitle="Make the game comfortable for you. These stay on this device.">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Font">
          <select aria-label="Font" className={sel} value={a.font} onChange={(e) => update({ font: e.target.value as Access['font'] })}>
            <option value="default">Standard</option><option value="readable">Easy to read (wider spacing)</option>
          </select>
        </Field>
        <Field label="Text size">
          <select aria-label="Text size" className={sel} value={a.size} onChange={(e) => update({ size: e.target.value as Access['size'] })}>
            <option value="100">Normal</option><option value="115">Large</option><option value="130">Extra large</option>
          </select>
        </Field>
        <Field label="Colours">
          <select aria-label="Colours" className={sel} value={a.colours} onChange={(e) => update({ colours: e.target.value as Access['colours'] })}>
            <option value="default">Standard</option><option value="safe">Colour-blind friendly (blue and orange)</option>
          </select>
        </Field>
        <Field label="Sound pack">
          <select aria-label="Sound pack" className={sel} value={pack} onChange={(e) => { setSoundPack(e.target.value); setPack(e.target.value); playSound('success'); }}>
            {SOUND_PACKS.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </Field>
        <Field label="Vibration strength">
          <select aria-label="Vibration strength" className={sel} value={hap} onChange={(e) => { setHapticStrength(e.target.value as HapticStrength); setHap(e.target.value as HapticStrength); playSound('click'); }}>
            <option value="gentle">Gentle</option><option value="normal">Normal</option><option value="strong">Strong</option>
          </select>
        </Field>
      </div>
      <div className="mt-3 space-y-2 text-sm">
        <label className="flex items-center justify-between gap-3"><span className="font-extrabold">Calm mode: stop animations</span>
          <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" aria-label="Calm mode" checked={a.calm} onChange={(e) => update({ calm: e.target.checked })} /></label>
        <label className="flex items-center justify-between gap-3"><span><span className="block font-extrabold">Keyboard shortcuts</span><span className="block text-xs text-ink-2">B Business, U Upgrades, F Finance, M Missions, K Books, P Prestige, S Settings.</span></span>
          <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" aria-label="Keyboard shortcuts" checked={a.keys} onChange={(e) => update({ keys: e.target.checked })} /></label>
        <label className="flex items-center justify-between gap-3"><span><span className="block font-extrabold">Penny the guide</span><span className="block text-xs text-ink-2">A friendly bubble with one tip at a time.</span></span>
          <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" aria-label="Penny the guide" checked={guide} onChange={(e) => { writePref('guide', e.target.checked ? 'on' : 'off'); setGuide(e.target.checked); }} /></label>
        <label className="flex items-center justify-between gap-3"><span><span className="block font-extrabold">Seasonal island</span><span className="block text-xs text-ink-2">Blossom in spring, gold in autumn, snow in winter.</span></span>
          <input type="checkbox" className="h-5 w-5 accent-[var(--primary)]" aria-label="Seasonal island" checked={look} onChange={(e) => { writePref('seasonlook', e.target.checked ? 'on' : 'off'); setLook(e.target.checked); }} /></label>
      </div>
    </Card>
  );
}

/** Scrub back through your company's history, month by month. */
export function TheatreCard({ game }: { game: GameState }) {
  const months = theatreMonths(game);
  const [i, setI] = useState(Math.max(0, months.length - 1));
  const idx = Math.min(i, Math.max(0, months.length - 1));
  const f = months.length ? theatreAt(game, months[idx]) : null;
  return (
    <Card id="card-theatre" title="Replay theatre" subtitle="Scrub back through your company's history and see what happened each month.">
      {!f ? <p className="text-sm text-ink-2">Play a month first, then come back to watch it.</p> : (
        <div className="space-y-3">
          <label className="block text-xs font-black tracking-wider text-ink-2">MONTH: {f.label}
            <input type="range" min={0} max={months.length - 1} value={idx} aria-label="Month" onChange={(e) => setI(Number(e.target.value))} className="mt-1 w-full" />
          </label>
          <div className="flex gap-2"><Button disabled={idx <= 0} onClick={() => setI(idx - 1)}>Back</Button><Button disabled={idx >= months.length - 1} onClick={() => setI(idx + 1)}>Forward</Button></div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div><dt className="text-xs text-ink-2">Sales</dt><dd className="tnum font-bold">{formatGBP(f.revenue, { compact: true })}</dd></div>
            <div><dt className="text-xs text-ink-2">Profit</dt><dd className={`tnum font-bold ${f.profit < 0 ? 'text-critical-text' : 'text-good-text'}`}>{formatGBP(f.profit, { compact: true })}</dd></div>
            <div><dt className="text-xs text-ink-2">Cash at month end</dt><dd className="tnum font-bold">{formatGBP(f.cash, { compact: true })}</dd></div>
            <div><dt className="text-xs text-ink-2">Company value</dt><dd className="tnum font-bold">{formatGBP(f.value, { compact: true })}</dd></div>
          </dl>
          <div className="text-sm"><b>What you did:</b> {f.actions.length ? f.actions.join('; ') + '.' : 'Nothing special.'}</div>
          <div className="text-sm"><b>What happened:</b> {f.news.length ? f.news.join('; ') + '.' : 'A quiet month.'}</div>
        </div>
      )}
    </Card>
  );
}
