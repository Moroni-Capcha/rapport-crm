import { useState } from 'react';
import { cn } from '../../lib/format';
import { niceMax, useWidth } from './useWidth';

export interface BarDatum {
  key: string;
  label: string;
  value: number;
  /** Referencia por barra (ej. meta mensual), se dibuja como marca discontinua */
  target?: number;
  /** Segunda serie opcional dibujada como línea (misma unidad, mismo eje) */
  line?: number;
  highlight?: boolean;
  /** Barra "proyectada": se dibuja con trama en lugar de relleno sólido */
  projected?: boolean;
}

interface BarChartProps {
  data: BarDatum[];
  height?: number;
  format: (v: number) => string;
  formatAxis?: (v: number) => string;
  valueLabel: string;
  targetLabel?: string;
  lineLabel?: string;
}

const PAD = { top: 12, right: 8, bottom: 26, left: 52 };
const TICKS = 4;

export function BarChart({ data, height = 240, format, formatAxis = format, valueLabel, targetLabel, lineLabel }: BarChartProps) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);

  const max = niceMax(Math.max(...data.flatMap((d) => [d.value, d.target ?? 0, d.line ?? 0])), TICKS);
  const innerW = Math.max(0, width - PAD.left - PAD.right);
  const innerH = height - PAD.top - PAD.bottom;
  const band = innerW / data.length;
  const barW = Math.min(36, band * 0.56);
  const y = (v: number) => PAD.top + innerH - (v / max) * innerH;
  const cx = (i: number) => PAD.left + band * i + band / 2;

  const linePts = data.map((d, i) => (d.line != null ? `${cx(i)},${y(d.line)}` : null)).filter(Boolean).join(' ');
  const h = hover != null ? data[hover] : null;

  return (
    <div ref={ref} className="relative w-full select-none" style={{ height }} onMouseLeave={() => setHover(null)}>
      <svg width={width} height={height} role="img" aria-label={valueLabel} className="block overflow-visible">
        <defs>
          <pattern id="hatch" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill="color-mix(in oklab, var(--color-ink) 4%, transparent)" />
            <line x1="0" y1="0" x2="0" y2="5" stroke="color-mix(in oklab, var(--color-ink) 28%, transparent)" strokeWidth="1.5" />
          </pattern>
        </defs>

        {/* Grid y eje Y */}
        {Array.from({ length: TICKS + 1 }, (_, i) => {
          const v = (max / TICKS) * i;
          return (
            <g key={i}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(v)} y2={y(v)} stroke="color-mix(in oklab, var(--color-ink) 7%, transparent)" strokeDasharray={i === 0 ? undefined : '2 4'} />
              <text x={PAD.left - 10} y={y(v)} dy="0.32em" textAnchor="end" className="fill-fg-subtle tabular text-[10.5px]">
                {formatAxis(v)}
              </text>
            </g>
          );
        })}

        {data.map((d, i) => {
          const top = y(d.value);
          const barH = Math.max(0, PAD.top + innerH - top);
          const r = Math.min(4, barH / 2, barW / 2);
          const x = cx(i) - barW / 2;
          // Barra con esquinas superiores redondeadas y base plana
          const path = `M${x},${top + barH} V${top + r} Q${x},${top} ${x + r},${top} H${x + barW - r} Q${x + barW},${top} ${x + barW},${top + r} V${top + barH} Z`;
          const active = hover === i;
          return (
            <g key={d.key}>
              {active && <rect x={PAD.left + band * i + 2} y={PAD.top} width={band - 4} height={innerH} rx={6} fill="color-mix(in oklab, var(--color-ink) 4%, transparent)" />}
              <path
                d={path}
                fill={d.projected ? 'url(#hatch)' : d.highlight ? 'var(--color-fg)' : 'color-mix(in oklab, var(--color-fg) 42%, transparent)'}
                className="transition-opacity"
                opacity={hover == null || active ? 1 : 0.55}
              />
              {d.target != null && (
                <line x1={x - 5} x2={x + barW + 5} y1={y(d.target)} y2={y(d.target)} stroke="var(--color-stage-negotiation)" strokeWidth={2} strokeDasharray="3 2" strokeLinecap="round" />
              )}
              <text x={cx(i)} y={height - 8} textAnchor="middle" className={cn('text-[10.5px]', d.highlight ? 'fill-fg' : 'fill-fg-subtle')}>
                {d.label}
              </text>
              {/* Zona de hover más grande que la marca */}
              <rect x={PAD.left + band * i} y={PAD.top} width={band} height={innerH + 20} fill="transparent" onMouseEnter={() => setHover(i)} />
            </g>
          );
        })}

        {linePts && (
          <>
            <polyline points={linePts} fill="none" stroke="var(--color-stage-discovery)" strokeWidth={2} strokeLinejoin="round" pointerEvents="none" />
            {data.map((d, i) =>
              d.line != null ? (
                <circle key={d.key} cx={cx(i)} cy={y(d.line)} r={hover === i ? 5 : 3.5} fill="var(--color-stage-discovery)" stroke="var(--color-surface)" strokeWidth={2} pointerEvents="none" />
              ) : null,
            )}
          </>
        )}
      </svg>

      {h && hover != null && (
        <div
          className="pointer-events-none absolute z-10 min-w-40 rounded-lg border border-line-strong bg-surface-3/95 px-3 py-2 text-xs shadow-xl shadow-shade/40 backdrop-blur"
          style={{
            left: Math.min(Math.max(cx(hover) - 80, 0), width - 170),
            top: Math.max(0, y(Math.max(h.value, h.line ?? 0, h.target ?? 0)) - 78),
          }}
        >
          <p className="mb-1 font-medium capitalize text-fg">{h.label}</p>
          <TipRow swatch={h.projected ? 'bg-ink/40' : 'bg-fg'} label={valueLabel} value={format(h.value)} />
          {h.target != null && targetLabel && <TipRow swatch="bg-stage-negotiation" label={targetLabel} value={format(h.target)} />}
          {h.line != null && lineLabel && <TipRow swatch="bg-stage-discovery" label={lineLabel} value={format(h.line)} />}
        </div>
      )}
    </div>
  );
}

const TipRow = ({ swatch, label, value }: { swatch: string; label: string; value: string }) => (
  <p className="flex items-center gap-2 py-0.5 text-fg-muted">
    <span className={cn('size-2 rounded-sm', swatch)} />
    {label}
    <span className="tabular ml-auto pl-3 font-medium text-fg">{value}</span>
  </p>
);

export function ChartLegend({ items }: { items: { label: string; swatch: string; dashed?: boolean }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-fg-subtle">
      {items.map((it) => (
        <span key={it.label} className="flex items-center gap-1.5">
          <span className={cn(it.dashed ? 'h-0.5 w-3 rounded-full' : 'size-2 rounded-sm', it.swatch)} />
          {it.label}
        </span>
      ))}
    </div>
  );
}
