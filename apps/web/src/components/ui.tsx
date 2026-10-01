import { formatGBP, type Pence } from '@cfx/engine';
import { useId, useState, type ReactNode } from 'react';

export function Card({ id, title, subtitle, actions, children, className = '' }: {
  id?: string; title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <section id={id} className={`scroll-mt-28 rounded-[26px] border-[3px] border-outline bg-surface p-4 shadow-[var(--edge)] sm:p-5 ${className}`}>
      {(title || actions) && (
        <header className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            {title && <h2 className="font-display text-xl leading-tight text-ink">{title}</h2>}
            {subtitle && <p className="mt-1 text-sm text-ink-2">{subtitle}</p>}
          </div>
          {actions}
        </header>
      )}
      {children}
    </section>
  );
}

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'go' | 'gem' | 'coin' | 'legacy';
/** Chunky 3D game button (design system `Button`); `secondary` is the soft cream variant. */
export function Button({ variant = 'secondary', className = '', ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  if (variant === 'ghost') {
    return (
      <button
        type="button"
        className={`inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-extrabold text-ink-2 transition hover:bg-surface-2 disabled:cursor-not-allowed disabled:opacity-45 ${className}`}
        {...props}
      />
    );
  }
  const cls: Record<Exclude<ButtonVariant, 'ghost'>, string> = {
    primary: '', secondary: 'is-soft', danger: 'is-danger', go: 'is-go', gem: 'is-gem', coin: 'is-coin', legacy: 'is-legacy',
  };
  return <button type="button" className={`cfx-btn is-sm ${cls[variant]} ${className}`} {...props} />;
}

/** Small ⓘ with an accessible hover/focus explanation. */
export function Info({ text, className = '' }: { text: ReactNode; className?: string }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span className={`relative inline-flex ${className}`}>
      <button
        type="button"
        aria-describedby={open ? id : undefined}
        aria-label="More information"
        className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-line text-[10px] font-semibold text-muted hover:text-ink"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
      >
        i
      </button>
      {open && (
        <span id={id} role="tooltip" className="absolute left-1/2 top-5 z-50 w-64 -translate-x-1/2 rounded-lg border border-line bg-surface p-2.5 text-left text-xs font-normal leading-relaxed text-ink-2 shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}

export function Stat({ label, value, sub, tone, help, extra }: {
  label: string; value: ReactNode; sub?: ReactNode; tone?: 'good' | 'bad' | 'neutral'; help?: ReactNode; extra?: ReactNode;
}) {
  const toneClass = tone === 'good' ? 'text-good-text' : tone === 'bad' ? 'text-critical-text' : 'text-ink-2';
  return (
    <div className="cfx-stat">
      <div className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-wider text-ink-2">
        {label}
        {help && <Info text={help} />}
        {extra}
      </div>
      <div className="tnum text-xl font-black text-ink sm:text-2xl">{value}</div>
      {sub && <div className={`text-xs font-bold ${toneClass}`}>{sub}</div>}
    </div>
  );
}

export type StatusKind = 'good' | 'ok' | 'bad' | 'na' | 'warn';
const STATUS: Record<StatusKind, { icon: string; label: string; cls: string }> = {
  good: { icon: '✓', label: 'Good', cls: 'bg-[var(--go)] text-white' },
  ok: { icon: '•', label: 'OK', cls: 'bg-surface text-ink' },
  warn: { icon: '!', label: 'Watch', cls: 'bg-[var(--coin)] text-[#3a2210]' },
  bad: { icon: '✕', label: 'Weak', cls: 'bg-[var(--danger)] text-white' },
  na: { icon: '–', label: 'n/a', cls: 'bg-surface-2 text-ink-2' },
};

/** Status never relies on colour alone: icon + label + colour (design system `Tag`). */
export function StatusPill({ kind, label }: { kind: StatusKind; label?: string }) {
  const s = STATUS[kind];
  return (
    <span className={`inline-flex items-center gap-1 rounded-[10px] border-2 border-outline px-2 py-0.5 text-[11px] font-black uppercase tracking-wide ${s.cls}`}>
      <span aria-hidden>{s.icon}</span>
      {label ?? s.label}
    </span>
  );
}

export function Field({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

const inputCls = 'w-full rounded-2xl border-[3px] border-outline bg-surface-2 px-3 py-2 text-sm font-extrabold text-ink tnum outline-none focus:border-accent';

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`${inputCls} ${props.className ?? ''}`} />;
}

/** Money entry in whole pounds; value/onChange are in pence. */
export function MoneyInput({ value, onChange, min = 0, step = 1000, ...rest }: {
  value: Pence; onChange: (p: Pence) => void; min?: number; step?: number;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'min' | 'step'>) {
  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-muted">£</span>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        step={step}
        value={Number.isFinite(value) ? Math.round(value / 100) : ''}
        onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value || 0))) * 100)}
        className={`${inputCls} pl-6`}
        {...rest}
      />
    </div>
  );
}

export function NumberInput({ value, onChange, ...rest }: {
  value: number; onChange: (n: number) => void;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'>) {
  return <input type="number" value={value} onChange={(e) => onChange(Number(e.target.value))} className={inputCls} {...rest} />;
}

export function Money({ p, compact, className = '' }: { p: Pence; compact?: boolean; className?: string }) {
  return <span className={`tnum ${className}`}>{formatGBP(p, { compact })}</span>;
}

export function Badge({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center rounded-[10px] border-2 border-outline bg-surface-2 px-1.5 py-0.5 text-[11px] font-black uppercase tracking-wide text-ink ${className}`}>{children}</span>;
}

export function KeyValue({ rows }: { rows: [ReactNode, ReactNode][] }) {
  return (
    <dl className="divide-y divide-line text-sm">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex items-baseline justify-between gap-4 py-1.5">
          <dt className="text-ink-2">{k}</dt>
          <dd className="tnum text-right font-medium text-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: string }[] }) {
  return (
    <div role="tablist" className="cfx-speed flex-wrap">
      {items.map((it) => (
        <button
          key={it.id}
          role="tab"
          type="button"
          aria-selected={value === it.id}
          aria-pressed={value === it.id}
          onClick={() => onChange(it.id)}
          className="!text-[15px]"
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function PageTitle({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="cfx-page-title mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-2xl leading-tight text-ink sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 max-w-3xl text-sm text-ink-2">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

/** Candy progress bar (design system `ProgressBar`). */
export function Meter({ value, max = 1, label, tone = 'xp', text }: {
  value: number; max?: number; label: string; tone?: 'xp' | 'coin' | 'legacy' | 'go' | 'danger'; text?: string;
}) {
  const pct = Math.max(0, Math.min(1, value / max)) * 100;
  return (
    <div className={`cfx-bar ${tone === 'xp' ? '' : `is-${tone}`}`} role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max}
      style={{ ['--value' as string]: `${pct}%` }}>
      <div className="cfx-bar__fill" style={{ borderRightWidth: pct === 0 ? 0 : undefined }} />
      {text && <div className="cfx-bar__text">{text}</div>}
    </div>
  );
}
