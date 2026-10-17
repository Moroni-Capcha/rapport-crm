import { X } from 'lucide-react';
import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/format';
import { IconButton } from './primitives';
import { useT } from '../../lib/i18n';

/* ── Contenedor de vista con scroll propio ─────────────────────────── */
export function Page({ children }: { children: ReactNode }) {
  return (
    <div className="scroll-thin h-full overflow-y-auto">
      <div className="mx-auto w-full max-w-[1480px] space-y-5 px-4 pb-10 pt-6 md:px-6">{children}</div>
    </div>
  );
}

export function PageHeader({ eyebrow, title, actions, children }: { eyebrow: string; title: string; actions?: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className="mb-1.5 text-xs font-medium text-fg-subtle">{eyebrow}</p>
        <h1 className="text-[22px] font-semibold tracking-tight text-fg">{title}</h1>
        {children}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

/* ── Panel: superficie para un bloque de contenido ─────────────────── */
export function Panel({
  title,
  subtitle,
  action,
  children,
  className,
  bodyClass,
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClass?: string;
}) {
  return (
    <section className={cn('min-w-0 rounded-2xl border border-line bg-surface/70', className)}>
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 px-5 pb-1 pt-4">
          <div className="min-w-0">
            {title && <h2 className="text-[13.5px] font-semibold text-fg">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-xs text-fg-subtle">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={cn('px-5 pb-5 pt-3', bodyClass)}>{children}</div>
    </section>
  );
}

/* ── KPI ───────────────────────────────────────────────────────────── */
export function Kpi({
  label,
  value,
  note,
  delta,
  tone = 'neutral',
}: {
  label: string;
  value: string;
  note?: string;
  /** Variación en puntos (ej. +0.12 = +12%) */
  delta?: number;
  tone?: 'neutral' | 'good' | 'warn' | 'bad';
}) {
  const toneCls = { neutral: 'text-fg-subtle', good: 'text-stage-kickoff', warn: 'text-stage-negotiation', bad: 'text-danger' }[tone];
  return (
    <div className="min-w-0 rounded-2xl border border-line bg-surface/70 px-4 py-3.5">
      <p className="truncate text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{label}</p>
      <p className="tabular mt-1.5 text-[22px] font-semibold leading-7 tracking-tight text-fg">{value}</p>
      <p className="mt-1 flex items-center gap-1.5 truncate text-[11.5px]">
        {delta != null && (
          <span className={cn('tabular font-medium', delta >= 0 ? 'text-stage-kickoff' : 'text-danger')}>
            {delta >= 0 ? '▲' : '▼'} {Math.abs(delta * 100).toFixed(0)}%
          </span>
        )}
        {note && <span className={toneCls}>{note}</span>}
      </p>
    </div>
  );
}

/* ── Tabs segmentadas ──────────────────────────────────────────────── */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-lg border border-line bg-surface p-0.5">
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={o.id === value}
          onClick={() => onChange(o.id)}
          className={cn(
            'flex h-7 items-center gap-1.5 rounded-md px-2.5 text-xs font-medium transition-colors',
            o.id === value ? 'bg-ink/[0.09] text-fg' : 'text-fg-subtle hover:text-fg-muted',
          )}
        >
          {o.label}
          {o.count != null && <span className="tabular text-[11px] text-fg-subtle">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ── Barra de progreso ─────────────────────────────────────────────── */
export function Progress({ value, className, barClass = 'bg-fg/70' }: { value: number; className?: string; barClass?: string }) {
  return (
    <div className={cn('h-1.5 overflow-hidden rounded-full bg-ink/[0.06]', className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cn('h-full rounded-full transition-all duration-500', barClass)} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

/* ── Pill de estado ────────────────────────────────────────────────── */
export function StatusPill({ label, cls, dot }: { label: string; cls?: string; dot?: string }) {
  return (
    <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium leading-4', cls ?? 'border-line text-fg-muted')}>
      {dot && <span className={cn('size-1.5 rounded-full', dot)} />}
      {label}
    </span>
  );
}

/* ── Drawer lateral genérico ───────────────────────────────────────── */
export function Drawer({
  open,
  onClose,
  label,
  header,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  header: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const t = useT();
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="animate-fade-in absolute inset-0 bg-scrim/50 backdrop-blur-[2px]" onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="animate-slide-in relative flex h-full w-full max-w-[500px] flex-col border-l border-line-strong bg-surface shadow-2xl shadow-shade/60"
      >
        <div className="flex items-start gap-3 border-b border-line px-5 pb-5 pt-4">
          <div className="min-w-0 flex-1">{header}</div>
          <IconButton label={t('Cerrar')} onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="scroll-thin flex-1 overflow-y-auto">{children}</div>
        {footer && <div className="border-t border-line px-5 py-3">{footer}</div>}
      </aside>
    </div>
  );
}

export function DrawerSection({ title, children, action }: { title: string; children: ReactNode; action?: ReactNode }) {
  return (
    <section className="border-b border-line px-5 py-5 last:border-b-0">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/* ── Tabla densa ───────────────────────────────────────────────────── */
export const Th = ({ children, className, onClick, active }: { children?: ReactNode; className?: string; onClick?: () => void; active?: boolean }) => (
  <th
    scope="col"
    onClick={onClick}
    className={cn(
      'whitespace-nowrap border-b border-line px-3 py-2.5 text-left text-[11px] font-medium uppercase tracking-wider text-fg-subtle first:pl-5 last:pr-5',
      onClick && 'cursor-pointer select-none hover:text-fg-muted',
      active && 'text-fg',
      className,
    )}
  >
    {children}
  </th>
);

export const Td = ({ children, className }: { children?: ReactNode; className?: string }) => (
  <td className={cn('border-b border-line px-3 py-3 align-middle text-[13px] first:pl-5 last:pr-5', className)}>{children}</td>
);
