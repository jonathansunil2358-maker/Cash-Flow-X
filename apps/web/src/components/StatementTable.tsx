import { formatAccounting, type Pence } from '@cfx/engine';
import { Info } from './ui';

export interface Row {
  label: string;
  /** One value per column, natural sign. `negative` rows are shown as deductions in brackets. */
  values: (Pence | null)[];
  kind?: 'line' | 'subtotal' | 'total' | 'header' | 'spacer';
  negative?: boolean;
  indent?: boolean;
  help?: string;
}

export function StatementTable({ columns, rows, caption }: { columns: string[]; rows: Row[]; caption?: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[420px] border-collapse text-sm">
        {caption && <caption className="sr-only">{caption}</caption>}
        <thead>
          <tr className="border-b border-line text-xs text-muted">
            <th className="py-2 text-left font-medium">£</th>
            {columns.map((c) => (
              <th key={c} className="w-32 py-2 text-right font-medium">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            if (r.kind === 'spacer') return <tr key={i}><td colSpan={columns.length + 1} className="h-3" /></tr>;
            if (r.kind === 'header') {
              return (
                <tr key={i}>
                  <td colSpan={columns.length + 1} className="pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">{r.label}</td>
                </tr>
              );
            }
            const strong = r.kind === 'subtotal' || r.kind === 'total';
            return (
              <tr key={i} className={`${r.kind === 'total' ? 'border-y-2 border-double border-ink/40' : strong ? 'border-t border-line' : ''}`}>
                <td className={`py-1.5 pr-3 ${r.indent ? 'pl-4' : ''} ${strong ? 'font-semibold text-ink' : 'text-ink-2'}`}>
                  <span className="inline-flex items-center gap-1.5">
                    {r.label}
                    {r.help && <Info text={r.help} />}
                  </span>
                </td>
                {r.values.map((v, j) => (
                  <td key={j} className={`tnum py-1.5 text-right ${strong ? 'font-semibold text-ink' : 'text-ink'}`}>
                    {v === null ? '' : formatAccounting(r.negative ? -v : v)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
