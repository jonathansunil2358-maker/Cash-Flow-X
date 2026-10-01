import { formatGBP } from '@cfx/engine';
import { useEffect, useState } from 'react';
import { api, ONLINE, type BoardEntry } from '../lib/api';
import { iconUrl } from '../lib/icons';

/** Three lines on how a run works, for the main menu. */
export function HowItWorks() {
  const steps = [
    ['rocket', 'Pick a sector and a difficulty', 'Each sector has real economics: margins, stock, and how fast cash comes in.'],
    ['chart', "Grow without running out of cash", 'Every hire, price and loan posts to real books. Profit is not cash.'],
    ['crown', 'Prestige at a £10m stake', 'Earn Legacy points for permanent perks, then build something bigger.'],
  ] as const;
  return (
    <section className="cfx-panel !pt-7">
      <div className="cfx-panel__ribbon">How it works</div>
      <ol className="space-y-2.5">
        {steps.map(([icon, title, text]) => (
          <li key={title} className="flex items-start gap-2.5">
            <img src={iconUrl(icon)} alt="" className="h-9 w-9 shrink-0" />
            <div className="min-w-0"><div className="font-display text-base leading-tight">{title}</div><div className="text-xs text-ink-2">{text}</div></div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** This season's net worth leaders and when the season ends (online builds only). */
export function SeasonPreview() {
  const [data, setData] = useState<{ entries: BoardEntry[]; season: string; seasonEnds: string } | null>(null);
  useEffect(() => {
    if (!ONLINE) return;
    let live = true;
    api.leaderboard('networth', 'season').then((d) => { if (live) setData(d); }).catch(() => { /* the menu works without it */ });
    return () => { live = false; };
  }, []);
  if (!ONLINE || !data) return null;
  const days = Math.max(0, Math.ceil((Date.parse(data.seasonEnds) - Date.now()) / 86_400_000));
  return (
    <section className="cfx-panel !pt-7">
      <div className="cfx-panel__ribbon is-gem">This season</div>
      <p className="text-center text-xs text-ink-2">Top 10 by net worth win gems · ends in {days} day{days === 1 ? '' : 's'}</p>
      {data.entries.length === 0 ? (
        <p className="mt-2 text-center text-sm font-bold">No one has a verified company yet. Be the first.</p>
      ) : (
        <ol className="mt-2 space-y-1.5">
          {data.entries.slice(0, 3).map((e, i) => (
            <li key={e.id} className={`flex items-center gap-2 rounded-2xl border-[3px] border-outline px-2 py-1 ${e.me ? 'bg-[var(--coin)] text-[#3a2210]' : 'bg-surface-2'}`}>
              <span className="w-5 text-center font-display">{i + 1}</span>
              <img src={iconUrl(e.icon)} alt="" className="h-7 w-7" />
              <span className="min-w-0 flex-1 truncate text-sm font-black">{e.name}{e.hardcore ? ' ☠' : ''}</span>
              <span className="tnum text-sm font-black">{formatGBP(e.value, { compact: true })}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
