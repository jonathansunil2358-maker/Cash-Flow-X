import { formatGBP, type BridgeStep, type Pence } from '@cfx/engine';
import type { ReactNode } from 'react';
import {
  Bar, BarChart, CartesianGrid, Cell, ComposedChart, LabelList, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';

const axisTick = { fill: 'var(--muted)', fontSize: 11 };
const money = (v: number) => formatGBP(v, { compact: true });

interface TooltipRow {
  name?: string | number;
  value?: number | string | (number | string)[];
  color?: string;
  dataKey?: string | number;
  payload?: Record<string, unknown>;
}

/** Tooltip card: series swatch carries identity, text stays in ink colours. */
export function ChartTooltip({ active, payload, label, format = money, hide = [] }: {
  active?: boolean; payload?: TooltipRow[]; label?: ReactNode; format?: (v: number) => string; hide?: string[];
}) {
  if (!active || !payload?.length) return null;
  const rows = payload.filter((p) => p.value !== undefined && p.value !== null && !hide.includes(String(p.dataKey)));
  if (!rows.length) return null;
  return (
    <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
      <div className="mb-1 font-semibold text-ink">{label}</div>
      {rows.map((p) => (
        <div key={String(p.dataKey)} className="flex items-center justify-between gap-4 py-0.5">
          <span className="flex items-center gap-1.5 text-ink-2">
            <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
            {p.name}
          </span>
          <span className="tnum font-medium text-ink">{typeof p.value === 'number' ? format(p.value) : String(p.value)}</span>
        </div>
      ))}
    </div>
  );
}

const legendStyle = { fontSize: 12, color: 'var(--ink-2)', paddingTop: 6 };

export interface CashPoint {
  label: string;
  cash?: number;
  forecast?: number;
  floor?: number;
}

/** Cash balance (actual + forecast) against the overdraft floor. */
export function CashChart({ data, height = 260 }: { data: CashPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--axis)' }} minTickGap={24} />
        <YAxis tick={axisTick} tickFormatter={money} tickLine={false} axisLine={false} width={56} />
        <ReferenceLine y={0} stroke="var(--axis)" />
        <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--axis)' }} />
        <Legend wrapperStyle={legendStyle} iconType="plainline" />
        <Line type="monotone" dataKey="cash" name="Cash" stroke="var(--s1)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} connectNulls={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="forecast" name="Forecast (no changes)" stroke="var(--s1)" strokeWidth={2} strokeDasharray="5 4" dot={false} activeDot={{ r: 4 }} isAnimationActive={false} />
        <Line type="stepAfter" dataKey="floor" name="Overdraft limit" stroke="var(--critical)" strokeWidth={1.5} strokeDasharray="2 3" dot={false} activeDot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export interface PerfPoint {
  label: string;
  revenue: number;
  ebitda: number;
}

/** Monthly revenue (bars) with EBITDA (line): same unit, one axis. */
export function PerformanceChart({ data, height = 260 }: { data: PerfPoint[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <ComposedChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: 4 }} barCategoryGap={2}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--axis)' }} minTickGap={24} />
        <YAxis tick={axisTick} tickFormatter={money} tickLine={false} axisLine={false} width={56} />
        <ReferenceLine y={0} stroke="var(--axis)" />
        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'var(--surface-2)' }} />
        <Legend wrapperStyle={legendStyle} />
        <Bar dataKey="revenue" name="Revenue" fill="var(--s1)" radius={[4, 4, 0, 0]} maxBarSize={24} isAnimationActive={false} />
        <Line type="monotone" dataKey="ebitda" name="EBITDA" stroke="var(--s2)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} isAnimationActive={false} />
      </ComposedChart>
    </ResponsiveContainer>
  );
}

/** Single-series trend with an optional target line. */
export function TrendChart({ data, dataKey, name, target, targetLabel, height = 240, format = money }: {
  data: Record<string, number | string>[]; dataKey: string; name: string; target?: number; targetLabel?: string; height?: number;
  format?: (v: number) => string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 12, right: 12, bottom: 0, left: 4 }}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="label" tick={axisTick} tickLine={false} axisLine={{ stroke: 'var(--axis)' }} minTickGap={24} />
        <YAxis tick={axisTick} tickFormatter={format} tickLine={false} axisLine={false} width={56} domain={target ? [0, (max: number) => Math.max(max, target * 1.05)] : undefined} />
        <Tooltip content={<ChartTooltip format={format} />} cursor={{ stroke: 'var(--axis)' }} />
        {target !== undefined && (
          <ReferenceLine y={target} stroke="var(--muted)" strokeDasharray="4 4" label={{ value: targetLabel, position: 'insideTopLeft', fill: 'var(--ink-2)', fontSize: 11 }} />
        )}
        <Line type="monotone" dataKey={dataKey} name={name} stroke="var(--s1)" strokeWidth={2} dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: 'var(--surface)' }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

/**
 * Profit bridge (waterfall). Polarity is encoded twice: blue up / red down, and a signed label
 * on every bar, so colour is never the only cue.
 */
export function WaterfallChart({ start, end, startLabel, endLabel, steps, height = 300 }: {
  start: Pence; end: Pence; startLabel: string; endLabel: string; steps: BridgeStep[]; height?: number;
}) {
  let running = start;
  const rows: { label: string; base: number; value: number; kind: 'total' | 'up' | 'down'; delta: number }[] = [
    { label: startLabel, base: Math.min(0, start), value: Math.abs(start), kind: 'total', delta: start },
  ];
  for (const s of steps) {
    if (s.delta === 0) continue;
    const from = running;
    running += s.delta;
    rows.push({ label: s.label, base: Math.min(from, running), value: Math.abs(s.delta), kind: s.delta > 0 ? 'up' : 'down', delta: s.delta });
  }
  rows.push({ label: endLabel, base: Math.min(0, end), value: Math.abs(end), kind: 'total', delta: end });
  const color = (k: string) => (k === 'total' ? 'var(--muted)' : k === 'up' ? 'var(--pos)' : 'var(--neg)');
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={rows} margin={{ top: 20, right: 12, bottom: 0, left: 4 }} barCategoryGap={6}>
        <CartesianGrid vertical={false} stroke="var(--grid)" />
        <XAxis dataKey="label" tick={{ ...axisTick, fontSize: 10 }} tickLine={false} axisLine={{ stroke: 'var(--axis)' }} interval={0} angle={-25} textAnchor="end" height={62} />
        <YAxis tick={axisTick} tickFormatter={money} tickLine={false} axisLine={false} width={56} />
        <ReferenceLine y={0} stroke="var(--axis)" />
        <Tooltip
          cursor={{ fill: 'var(--surface-2)' }}
          content={({ active, payload }) => {
            const row = payload?.[0]?.payload as (typeof rows)[number] | undefined;
            if (!active || !row) return null;
            return (
              <div className="rounded-lg border border-line bg-surface px-3 py-2 text-xs shadow-lg">
                <div className="font-semibold text-ink">{row.label}</div>
                <div className="tnum text-ink-2">{row.kind === 'total' ? money(row.delta) : `${row.delta > 0 ? '+' : ''}${money(row.delta)} ${row.delta > 0 ? '(helped profit)' : '(hurt profit)'}`}</div>
              </div>
            );
          }}
        />
        <Bar dataKey="base" stackId="w" fill="transparent" isAnimationActive={false} />
        <Bar dataKey="value" stackId="w" radius={[4, 4, 4, 4]} isAnimationActive={false}>
          {rows.map((r, i) => (
            <Cell key={i} fill={color(r.kind)} stroke="var(--surface)" strokeWidth={1} />
          ))}
          <LabelList
            dataKey="delta"
            content={(props) => {
              const { x, y, width, index } = props as { x?: number | string; y?: number | string; width?: number | string; index?: number };
              const row = rows[index ?? 0];
              if (!row) return null;
              const text = row.kind === 'total' ? money(row.delta) : `${row.delta > 0 ? '+' : '−'}${money(Math.abs(row.delta))}`;
              return (
                <text x={Number(x) + Number(width) / 2} y={Number(y) - 5} textAnchor="middle" fontSize={10} fill="var(--ink-2)">
                  {text}
                </text>
              );
            }}
          />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
