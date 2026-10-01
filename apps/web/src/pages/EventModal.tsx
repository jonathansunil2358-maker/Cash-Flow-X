import { monthLabel, type GameState } from '@cfx/engine';
import { useEffect, useRef } from 'react';
import { iconUrl } from '../lib/icons';
import { useGame } from '../store';

/** A pending choice event pauses the game until the player decides (design system `EventCard`). */
export function EventModal({ game }: { game: GameState }) {
  const act = useGame((s) => s.act);
  const ev = game.pendingEvent;
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    first.current?.focus();
  }, [ev?.id, ev?.month]);
  if (!ev || game.status !== 'playing') return null;
  const good = ev.polarity === 'good';
  return (
    <div className="fixed inset-0 z-[55] flex items-end justify-center bg-[#13324d]/60 p-3 sm:items-center" role="dialog" aria-modal="true" aria-labelledby="event-title">
      <article className={`cfx-panel cfx-event cfx-anim-pop w-full ${good ? 'is-good' : 'is-bad'}`} style={{ maxWidth: 420 }}>
        <div className="cfx-event__art"><img src={iconUrl(ev.icon)} alt="" /></div>
        <div className="flex items-center gap-2">
          <span className={`cfx-tag ${good ? 'is-good' : 'is-bad'}`}>{good ? '▲ Good news' : '▼ Bad news'}</span>
          <span className="text-xs font-extrabold text-ink-2">{monthLabel(ev.month)} · paused</span>
        </div>
        <h2 id="event-title" className="cfx-event__title">{ev.title}</h2>
        <p className="cfx-event__story">{ev.story}</p>
        <div className="cfx-choices">
          {ev.choices.map((c, i) => (
            <button key={c.id} ref={i === 0 ? first : undefined} type="button" className="cfx-choice" onClick={() => act({ type: 'resolveEvent', choiceId: c.id })}>
              <span className="cfx-choice__label">{c.label}</span>
              <span className="cfx-choice__impact">
                {c.impact.map((im) => <span key={im.label} className={`cfx-delta ${im.up ? 'is-up' : 'is-down'}`}>{im.up ? '▲' : '▼'} {im.label}</span>)}
              </span>
              <span className="cfx-choice__hint">{c.hint}</span>
            </button>
          ))}
        </div>
      </article>
    </div>
  );
}
