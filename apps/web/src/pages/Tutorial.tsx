import type { GameState } from '@cfx/engine';
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { iconUrl } from '../lib/icons';
import { tourSteps } from '../lib/tutorial';
import { useGame } from '../store';

const PAD = 6;
const GAP = 14;
/** Room the card needs beside the spotlight; below this it sits at the bottom of the screen instead. */
const CARD_ROOM = 250;

/** First-run walkthrough for the player's sector: spotlights each part of the screen in turn. */
export function Tutorial({ game }: { game: GameState }) {
  const open = useGame((s) => s.tourOpen);
  const setTourOpen = useGame((s) => s.setTourOpen);
  const prestigeCount = useGame((s) => s.profile.prestigeCount);
  const steps = useMemo(() => tourSteps(game, prestigeCount),
    // The copy depends on the run's setup, not on month-by-month state.
    [game.industryId, game.companyName, game.difficulty, prestigeCount]);
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const step = steps[Math.min(i, steps.length - 1)];
  const last = i >= steps.length - 1;

  useEffect(() => { if (open) setI(0); }, [open]);

  useLayoutEffect(() => {
    if (!open) return;
    const el = step.target ? document.querySelector<HTMLElement>(`[data-tour="${step.target}"]`) : null;
    if (!el) { setRect(null); return; }
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    const update = () => setRect(el.getBoundingClientRect());
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => { ro.disconnect(); window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [open, step]);

  useEffect(() => { if (open) nextRef.current?.focus({ preventScroll: true }); }, [open, i]);

  if (!open) return null;
  const finish = () => setTourOpen(false);
  const next = () => (last ? finish() : setI(i + 1));
  const back = () => setI(Math.max(0, i - 1));

  // Put the card on whichever side of the spotlight has more room.
  let cardPos: CSSProperties = { top: '50%', transform: 'translate(-50%, -50%)' };
  if (rect) {
    const above = rect.top - PAD;
    const below = window.innerHeight - rect.bottom - PAD;
    if (Math.max(above, below) < CARD_ROOM) cardPos = { bottom: 'max(12px, env(safe-area-inset-bottom))', transform: 'translateX(-50%)' };
    else if (below >= above) cardPos = { top: rect.bottom + PAD + GAP, transform: 'translateX(-50%)' };
    else cardPos = { bottom: window.innerHeight - rect.top + PAD + GAP, transform: 'translateX(-50%)' };
  }

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="tour-title" aria-describedby="tour-body"
      onKeyDown={(e) => {
        if (e.key === 'Escape') finish();
        else if (e.key === 'ArrowRight') next();
        else if (e.key === 'ArrowLeft') back();
      }}>
      {rect ? (
        <div className="cfx-tour-spot pointer-events-none fixed rounded-[26px]" aria-hidden
          style={{ left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 }} />
      ) : (
        <div className="fixed inset-0 bg-[#13324d]/65" aria-hidden />
      )}
      <div className="fixed left-1/2 w-[min(calc(100vw-24px),420px)]" style={cardPos}>
      <section key={i} className="cfx-panel cfx-anim-pop" style={{ paddingTop: 30 }}>
        <div className="cfx-panel__ribbon is-go">Step {i + 1} of {steps.length}</div>
        <div className="flex items-start gap-3">
          <img src={iconUrl(game.icon)} alt="" className="h-11 w-11 shrink-0" />
          <div className="min-w-0">
            <h2 id="tour-title" className="text-xl leading-tight">{step.title}</h2>
            <p id="tour-body" className="mt-1 text-sm leading-snug text-ink-2">{step.body}</p>
          </div>
        </div>
        {step.facts && (
          <div className="mt-3 grid grid-cols-3 gap-2 text-center">
            {step.facts.map((f) => (
              <div key={f.label} className="cfx-stat !gap-0.5 !p-2">
                <span className="cfx-stat__label !text-[10px]">{f.label}</span>
                <span className="text-sm font-black leading-tight">{f.value}</span>
              </div>
            ))}
          </div>
        )}
        {step.tip && (
          <p className="mt-3 rounded-2xl border-[3px] border-outline bg-[var(--coin)] px-3 py-2 text-[13px] font-bold leading-snug text-[#3a2210]">
            {step.tip}
          </p>
        )}
        <div className="mt-3 flex items-center gap-1.5" aria-hidden>
          {steps.map((_, n) => (
            <span key={n} className={`h-2 rounded-full border-2 border-outline transition-all ${n === i ? 'w-5 bg-[var(--go)]' : n < i ? 'w-2 bg-[var(--go)]' : 'w-2 bg-surface-2'}`} />
          ))}
        </div>
        <div className="mt-3 flex items-center gap-2">
          {!last && <button type="button" className="px-1 text-sm font-extrabold text-ink-2 underline" onClick={finish}>Skip tutorial</button>}
          <span className="flex-1" />
          {i > 0 && <button type="button" className="cfx-btn is-soft is-sm" onClick={back}>Back</button>}
          <button ref={nextRef} type="button" className="cfx-btn is-go is-sm" onClick={next}>{last ? "Let's go!" : i === 0 ? 'Show me' : 'Next'}</button>
        </div>
      </section>
      </div>
    </div>
  );
}
