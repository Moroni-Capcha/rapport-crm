import { ArrowUpDown, Search, X } from 'lucide-react';
import { SEGMENTS } from '../../data/stages';
import { cn } from '../../lib/format';
import type { Segment, SortKey } from '../../types';
import { useT } from '../../lib/i18n';

interface FilterBarProps {
  active: Set<Segment>;
  counts: Record<Segment, number>;
  total: number;
  onToggle: (s: Segment) => void;
  onClear: () => void;
  sort: SortKey;
  onSort: (s: SortKey) => void;
  query: string;
  onQuery: (q: string) => void;
}

const SORTS: { id: SortKey; label: string }[] = [
  { id: 'recent', label: 'Último contacto' },
  { id: 'value', label: 'Valor' },
  { id: 'probability', label: 'Probabilidad' },
];

export function FilterBar({ active, counts, total, onToggle, onClear, sort, onSort, query, onQuery }: FilterBarProps) {
  const none = active.size === 0;
  const t = useT();
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div role="group" aria-label={t('Filtrar por tipo de cliente o proyecto')} className="flex flex-wrap items-center gap-1.5">
        <Chip selected={none} onClick={onClear} label={t('Todos')} count={total} />
        <span aria-hidden className="mx-1 h-4 w-px bg-line-strong" />
        {SEGMENTS.map((s) => (
          <Chip key={s.id} selected={active.has(s.id)} onClick={() => onToggle(s.id)} label={t(s.label)} count={counts[s.id]} />
        ))}
        {!none && (
          <button onClick={onClear} className="ml-1 inline-flex items-center gap-1 text-xs text-fg-subtle hover:text-fg">
            <X className="size-3" /> {t('Limpiar')}
          </button>
        )}
      </div>

      <div className="flex items-center gap-2">
        {/* Búsqueda visible en pantallas donde la del top nav se oculta */}
        <label className="flex h-8 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-fg-subtle lg:hidden">
          <Search className="size-3.5" />
          <input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={t('Buscar…')}
            className="w-24 bg-transparent sm:w-32 text-[13px] text-fg outline-none placeholder:text-fg-subtle"
          />
        </label>
        <label className="relative flex h-8 items-center gap-2 rounded-lg border border-line bg-surface pl-2.5 pr-2 text-[13px] text-fg-muted hover:border-line-strong">
          <ArrowUpDown className="size-3.5 text-fg-subtle" />
          <span className="hidden text-fg-subtle sm:inline">{t('Ordenar:')}</span>
          <select
            value={sort}
            onChange={(e) => onSort(e.target.value as SortKey)}
            className="cursor-pointer appearance-none bg-transparent pr-1 font-medium text-fg outline-none"
          >
            {SORTS.map((s) => (
              <option key={s.id} value={s.id} className="bg-surface-2">
                {t(s.label)}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

function Chip({ selected, label, count, onClick }: { selected: boolean; label: string; count: number; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'inline-flex h-7 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
        selected
          ? 'border-ink/20 bg-fg text-canvas'
          : 'border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg',
      )}
    >
      {label}
      <span className={cn('tabular text-[11px]', selected ? 'text-canvas/60' : 'text-fg-subtle')}>{count}</span>
    </button>
  );
}
