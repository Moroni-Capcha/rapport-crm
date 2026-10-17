import { cn } from '../../lib/format';

export interface HBarItem {
  label: string;
  value: number;
  /** Texto a la derecha (ej. "$420K · 12 deals") */
  display: string;
  sub?: string;
  dot?: string;
}

/** Barras horizontales en HTML: legibles, con etiqueta directa y tooltip nativo */
export function HBarList({ items, max, barClass = 'bg-fg/45' }: { items: HBarItem[]; max?: number; barClass?: string }) {
  const top = max ?? Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <li key={it.label} title={`${it.label}: ${it.display}`} className="group">
          <div className="mb-1.5 flex items-baseline justify-between gap-3 text-[13px]">
            <span className="flex min-w-0 items-center gap-2 text-fg-muted group-hover:text-fg">
              {it.dot && <span className={cn('size-2 shrink-0 rounded-full', it.dot)} />}
              <span className="truncate">{it.label}</span>
              {it.sub && <span className="hidden shrink-0 text-[11px] text-fg-subtle sm:inline">{it.sub}</span>}
            </span>
            <span className="tabular shrink-0 text-xs font-medium text-fg">{it.display}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-ink/[0.05]">
            <div className={cn('h-full rounded-full transition-all duration-500 group-hover:opacity-100', barClass)} style={{ width: `${(it.value / top) * 100}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
