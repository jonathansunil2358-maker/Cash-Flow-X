import { useEffect } from 'react';
import { useGame } from '../store';

const LAST_SEEN = 'cfx:lastSeen';
const readLastSeen = (): number | null => {
  try {
    const v = Number(localStorage.getItem(LAST_SEEN));
    return Number.isFinite(v) && v > 0 ? v : null;
  } catch {
    return null;
  }
};
const writeLastSeen = () => {
  try {
    localStorage.setItem(LAST_SEEN, String(Date.now()));
  } catch {
    /* ignore */
  }
};

/**
 * The real-time game clock: advances the month progress while the tab is visible. The store
 * decides whether time may pass (paused, event waiting, panel open).
 */
export function useGameClock(): void {
  const tickClock = useGame((s) => s.tickClock);
  useEffect(() => {
    let last = performance.now();
    const id = window.setInterval(() => {
      const now = performance.now();
      const elapsed = Math.min(1000, now - last);
      last = now;
      if (!document.hidden) tickClock(elapsed);
    }, 200);
    return () => window.clearInterval(id);
  }, [tickClock]);
}

/**
 * Offline progress: remembers when the player was last here and, on return (app load or the tab
 * becoming visible again), lets the business run for the time away.
 */
export function useAwayCatchUp(active: boolean): void {
  const catchUp = useGame((s) => s.catchUp);
  useEffect(() => {
    if (!active) return;
    const since = readLastSeen();
    if (since) catchUp(Date.now() - since);
    writeLastSeen();
    const beat = window.setInterval(() => {
      if (!document.hidden) writeLastSeen();
    }, 5000);
    const onVisibility = () => {
      if (document.hidden) writeLastSeen();
      else {
        const s = readLastSeen();
        if (s) catchUp(Date.now() - s);
        writeLastSeen();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', writeLastSeen);
    return () => {
      window.clearInterval(beat);
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', writeLastSeen);
    };
  }, [active, catchUp]);
}
