import { useEffect, useState, type ReactNode } from 'react';
import { readPref, writePref } from '../lib/save';

export interface Group { id: string; label: string; blurb?: string; items: ReactNode }

/**
 * A long panel split into a few groups with a sticky tab bar, so you reach any card in one tap instead of
 * scrolling. Every group stays mounted (hidden ones just do not show), "All" shows everything, and opening
 * a card from elsewhere (a coach tip, a shortcut) switches to the group that holds it. The last tab is remembered.
 */
export function Grouped({ id, groups, gridClass = 'grid gap-5' }: { id: string; groups: Group[]; gridClass?: string }) {
  const [tab, setTab] = useState<string>(() => {
    const saved = readPref(`tab:${id}`);
    return saved && (saved === 'all' || groups.some((g) => g.id === saved)) ? saved : groups[0].id;
  });
  const pick = (t: string) => { setTab(t); writePref(`tab:${id}`, t); };
  useEffect(() => {
    const on = (e: Event) => {
      const target = (e as CustomEvent<string>).detail;
      const g = document.getElementById(target)?.closest('[data-group]')?.getAttribute('data-group');
      if (g && g.startsWith(`${id}:`)) setTab(g.slice(id.length + 1));
    };
    window.addEventListener('cfx:reveal', on);
    return () => window.removeEventListener('cfx:reveal', on);
  }, [id]);
  const tabs = [...groups.map((g) => ({ id: g.id, label: g.label })), { id: 'all', label: 'All' }];
  return (
    <div>
      <div role="tablist" aria-label="Sections" className="sticky top-[52px] z-[5] -mx-1 mb-3 flex gap-1.5 overflow-x-auto bg-surface px-1 py-1.5">
        {tabs.map((t) => (
          <button key={t.id} role="tab" type="button" aria-selected={tab === t.id} onClick={() => pick(t.id)}
            className={`cfx-btn is-sm shrink-0 !min-h-9 !px-3 !text-sm ${tab === t.id ? '' : 'is-soft'}`}>{t.label}</button>
        ))}
      </div>
      {groups.map((g) => (
        <section key={g.id} data-group={`${id}:${g.id}`} aria-label={g.label} className={tab === 'all' || tab === g.id ? 'mb-6' : 'hidden'}>
          {tab === 'all' && <h2 className="mb-2 font-display text-xl">{g.label}</h2>}
          {g.blurb && tab !== 'all' && <p className="mb-3 text-sm text-ink-2">{g.blurb}</p>}
          <div className={gridClass}>{g.items}</div>
        </section>
      ))}
    </div>
  );
}
