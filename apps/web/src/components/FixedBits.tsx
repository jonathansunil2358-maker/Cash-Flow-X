import { formatGBP } from '@cfx/engine';
import { titleText } from '@cfx/engine';
import type { FixedEntry } from '../lib/api';
import { iconUrl } from '../lib/icons';
import { Button } from './ui';

export function countdown(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  const d = Math.floor(s / 86400);
  return `${d > 0 ? `${d}d ` : ''}${p(Math.floor((s % 86400) / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}`;
}

/** A short ranked list of finished companies. */
export function EntryList({ entries, max = 5 }: { entries: FixedEntry[]; max?: number }) {
  return (
    <ol className="space-y-1 text-sm">
      {entries.slice(0, max).map((e) => (
        <li key={e.id} className={`flex items-center gap-2 rounded-lg px-2 py-1 ${e.me ? 'bg-surface-2 font-bold' : ''}`}>
          <span className="tnum w-6 text-ink-2">#{e.rank}</span>
          <img src={iconUrl(e.icon)} alt="" className="h-6 w-6" />
          <span className="min-w-0 flex-1 truncate">
            {e.name}{e.me ? ' (you)' : ''}
            {titleText(e.title) && <span className="ml-1 text-[11px] font-bold text-ink-2">· {titleText(e.title)}</span>}
          </span>
          <span className="tnum">{formatGBP(e.score, { compact: true })}</span>
        </li>
      ))}
    </ol>
  );
}

/** "This replaces the company you are running": save first, or not. */
export function StartConfirm({ label, onGo, onCancel, ranked }: { label: string; onGo: (saveFirst: boolean) => void; onCancel: () => void; ranked: boolean }) {
  return (
    <div className="space-y-2 rounded-lg border-2 border-outline p-3" role="alertdialog" aria-label={label}>
      <p className="text-sm font-bold">This starts a new company and replaces the one you are running.</p>
      <p className="text-xs text-ink-2">{ranked ? 'Your current online company stops being verified. ' : ''}Save it to slot 3 first if you want to come back to it.</p>
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" onClick={() => onGo(true)}>Save to slot 3, then play</Button>
        <Button onClick={() => onGo(false)}>Play without saving</Button>
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
      </div>
    </div>
  );
}
