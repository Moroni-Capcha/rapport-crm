import { Check } from 'lucide-react';
import { useEffect } from 'react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { SERVICE_DOT } from '../../data/stages';
import { cn, initials } from '../../lib/format';
import type { Service } from '../../types';
import { useT } from '../../lib/i18n';

/* ── Avatar ──────────────────────────────────────────────────────────
   Tono derivado del nombre: siempre el mismo color para la misma persona,
   pero dentro de una paleta neutra y desaturada.                        */
const AVATAR_TONES = [
  'bg-tone-1 text-tone-1-fg',
  'bg-tone-2 text-tone-2-fg',
  'bg-tone-3 text-tone-3-fg',
  'bg-tone-4 text-tone-4-fg',
  'bg-tone-5 text-tone-5-fg',
];

const hash = (s: string) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);

export function Avatar({ name, size = 'sm', square = false }: { name: string; size?: 'xs' | 'sm' | 'md' | 'lg'; square?: boolean }) {
  const sizes = { xs: 'size-5 text-[9px]', sm: 'size-6 text-[10px]', md: 'size-8 text-[11px]', lg: 'size-11 text-sm' };
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center font-semibold tracking-tight ring-1 ring-ink/[0.06]',
        square ? 'rounded-md' : 'rounded-full',
        sizes[size],
        AVATAR_TONES[hash(name) % AVATAR_TONES.length],
      )}
    >
      {initials(name)}
    </span>
  );
}

/* ── Etiqueta de servicio ──────────────────────────────────────────── */
export function ServiceTag({ service }: { service: Service }) {
  const t = useT();
  return (
    <span className="inline-flex items-center gap-1.5 rounded-md border border-line bg-ink/[0.025] px-1.5 py-0.5 text-[11px] leading-4 text-fg-muted">
      <span className={cn('size-1.5 rounded-full', SERVICE_DOT[service.kind])} />
      {t(service.label)}
    </span>
  );
}

/* ── Botones ───────────────────────────────────────────────────────── */
type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'ghost' | 'outline'; size?: 'sm' | 'md' };

export function Button({ variant = 'outline', size = 'md', className, ...props }: BtnProps) {
  return (
    <button
      {...props}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25 disabled:pointer-events-none disabled:opacity-40',
        size === 'sm' ? 'h-7 px-2.5 text-xs' : 'h-8 px-3 text-[13px]',
        variant === 'primary' && 'bg-fg text-canvas hover:bg-fg/85',
        variant === 'outline' && 'border border-line-strong bg-surface-2 text-fg hover:bg-surface-3',
        variant === 'ghost' && 'text-fg-muted hover:bg-ink/[0.05] hover:text-fg',
        className,
      )}
    />
  );
}

export function IconButton({ label, className, children, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      {...props}
      aria-label={label}
      title={label}
      className={cn(
        'inline-flex size-7 items-center justify-center rounded-md text-fg-subtle transition-colors hover:bg-ink/[0.06] hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25',
        className,
      )}
    >
      {children}
    </button>
  );
}

/* ── Kbd ───────────────────────────────────────────────────────────── */
export const Kbd = ({ children }: { children: ReactNode }) => (
  <kbd className="rounded border border-line-strong bg-surface-3 px-1 font-sans text-[10px] font-medium leading-4 text-fg-subtle">
    {children}
  </kbd>
);

/* ── Toast ─────────────────────────────────────────────────────────── */
export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [message, onDone]);

  if (!message) return null;
  return (
    <div
      role="status"
      className="animate-pop fixed bottom-20 left-1/2 md:bottom-6 z-[60] flex -translate-x-1/2 items-center gap-2 rounded-xl border border-line-strong bg-surface-3/95 px-3.5 py-2.5 text-[13px] text-fg shadow-2xl shadow-shade/50 backdrop-blur"
    >
      <span className="flex size-4 items-center justify-center rounded-full bg-stage-kickoff/20 text-stage-kickoff">
        <Check className="size-3" strokeWidth={3} />
      </span>
      {message}
    </div>
  );
}

/* ── Toggle ────────────────────────────────────────────────────────── */
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-6 rounded-md px-2 py-1.5 text-[13px] text-fg-muted hover:bg-ink/[0.04]">
      {label}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn('relative h-4 w-7 rounded-full transition-colors', checked ? 'bg-fg' : 'bg-surface-3 ring-1 ring-line-strong')}
      >
        <span
          className={cn(
            'absolute top-0.5 size-3 rounded-full transition-all',
            checked ? 'left-3.5 bg-canvas' : 'left-0.5 bg-fg-subtle',
          )}
        />
      </button>
    </label>
  );
}
