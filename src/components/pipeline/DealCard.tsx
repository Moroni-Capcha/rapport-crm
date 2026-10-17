import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { CircleCheck, FileText, GripVertical, Mail, Phone, StickyNote, Video } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { memo } from 'react';
import type { ButtonHTMLAttributes, CSSProperties, Ref } from 'react';
import { TOUCH_LABEL } from '../../data/stages';
import { cn, formatCurrency, formatRelative, staleness } from '../../lib/format';
import type { BoardSettings, Deal, TouchType } from '../../types';
import { Avatar, ServiceTag } from '../ui/primitives';
import { useT } from '../../lib/i18n';

export const TOUCH_ICON: Record<TouchType, LucideIcon> = {
  email: Mail,
  call: Phone,
  meeting: Video,
  note: StickyNote,
  proposal: FileText,
};

const STALE_STYLE = {
  fresh: 'bg-stage-kickoff',
  warm: 'bg-stage-negotiation',
  cold: 'bg-danger/90',
} as const;

const PRIORITY_STYLE = {
  alta: 'text-fg border-ink/15',
  media: 'text-fg-muted border-line-strong',
  baja: 'text-fg-subtle border-line',
} as const;

interface DealCardViewProps {
  deal: Deal;
  settings: BoardSettings;
  /** Tarjeta fantasma en la columna mientras se arrastra su copia */
  ghost?: boolean;
  /** Copia que sigue al puntero (DragOverlay) */
  overlay?: boolean;
  onOpen?: (id: string) => void;
  cardRef?: Ref<HTMLElement>;
  style?: CSSProperties;
  handleRef?: Ref<HTMLButtonElement>;
  handleProps?: ButtonHTMLAttributes<HTMLButtonElement>;
}

export function DealCardView({ deal, settings, ghost, overlay, onOpen, cardRef, style, handleRef, handleProps }: DealCardViewProps) {
  const t = useT();
  const last = deal.activities.find((a) => a.type !== 'note') ?? deal.activities[0]!;
  const TouchIcon = TOUCH_ICON[last.type];
  const stale = staleness(last.at);
  const won = deal.stage === 'kickoff';

  return (
    <article
      ref={cardRef}
      style={style}
      onClick={() => onOpen?.(deal.id)}
      onKeyDown={(e) => {
        // Las teclas del asa (arrastre con teclado) no abren el detalle
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') (e.preventDefault(), onOpen?.(deal.id));
      }}
      tabIndex={overlay ? -1 : 0}
      aria-label={`${deal.company}, ${formatCurrency(deal.value)}`}
      className={cn(
        'group relative cursor-pointer rounded-xl border border-line bg-surface-2 transition-all duration-150',
        'hover:border-line-strong hover:bg-surface-3 hover:shadow-lg hover:shadow-shade/30',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25',
        settings.compact ? 'p-3' : 'p-3.5',
        ghost && 'scale-[0.98] opacity-40',
        overlay && 'cursor-grabbing border-line-strong shadow-xl shadow-shade/40',
      )}
    >
      {!overlay && (
        <button
          type="button"
          ref={handleRef}
          {...handleProps}
          aria-label={t('Arrastrar tarjeta')}
          title={t('Arrastrar tarjeta')}
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'absolute right-1.5 top-1.5 z-10 flex size-6 cursor-grab touch-none items-center justify-center rounded-md text-fg-subtle',
            'opacity-0 transition-opacity hover:bg-ink/[0.06] hover:text-fg group-hover:opacity-100 group-focus-within:opacity-100',
            'focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25 [@media(hover:none)]:opacity-100',
          )}
        >
          <GripVertical className="size-4" />
        </button>
      )}
      {/* Empresa + proyecto */}
      <header className="flex items-start gap-2.5 pr-5">
        <Avatar name={deal.company} size="md" square />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[13.5px] font-semibold leading-5 tracking-tight text-fg">{deal.company}</h3>
            {deal.quote && (
              <span title={t('Cotización v{n}', { n: deal.quote.version })} className="flex shrink-0 items-center gap-0.5 text-[10px] font-medium text-fg-subtle">
                <FileText className="size-3" />v{deal.quote.version}
              </span>
            )}
            {deal.priority === 'alta' && !won && (
              <span className={cn('shrink-0 rounded border px-1 text-[10px] font-medium leading-4', PRIORITY_STYLE.alta)}>{t('Alta')}</span>
            )}
          </div>
          <p className="truncate text-xs leading-5 text-fg-subtle">{t(deal.project)}</p>
        </div>
      </header>

      {/* Valor + probabilidad */}
      <div className={cn('flex items-center justify-between gap-3', settings.compact ? 'mt-2.5' : 'mt-3.5')}>
        <span className="tabular text-[15px] font-semibold tracking-tight text-fg">{formatCurrency(deal.value)}</span>
        {won ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-stage-kickoff/12 px-2 py-0.5 text-[11px] font-medium text-stage-kickoff">
            <CircleCheck className="size-3" /> {deal.projectId ? t('En Projects') : t('Ganado')}
          </span>
        ) : (
          settings.showProbability && (
            <span className="flex items-center gap-2" title={t('Probabilidad de cierre: {n}%', { n: deal.probability })}>
              <span className="h-1 w-12 overflow-hidden rounded-full bg-ink/[0.06]">
                <span className="block h-full rounded-full bg-fg/60" style={{ width: `${deal.probability}%` }} />
              </span>
              <span className="tabular w-7 text-right text-[11px] text-fg-subtle">{deal.probability}%</span>
            </span>
          )
        )}
      </div>

      {/* Servicios */}
      {!settings.compact && (
        <div className="mt-3 flex flex-wrap gap-1">
          {deal.services.slice(0, 2).map((s) => (
            <ServiceTag key={s.label} service={s} />
          ))}
          {deal.services.length > 2 && (
            <span className="rounded-md border border-line px-1.5 py-0.5 text-[11px] leading-4 text-fg-subtle">
              +{deal.services.length - 2}
            </span>
          )}
        </div>
      )}

      {/* Contacto + último contacto */}
      <footer
        className={cn(
          'flex items-center justify-between gap-2 border-t border-line',
          settings.compact ? 'mt-2.5 pt-2.5' : 'mt-3.5 pt-3',
        )}
      >
        <span className="flex min-w-0 items-center gap-2">
          <Avatar name={deal.contact.name} size="xs" />
          <span className="truncate text-xs text-fg-muted">{deal.contact.name}</span>
        </span>
        <span
          className="flex shrink-0 items-center gap-1.5 text-[11px] text-fg-subtle"
          title={`${t(TOUCH_LABEL[last.type])}: ${t(last.text)}`}
        >
          <TouchIcon className="size-3" />
          <span className="tabular">{formatRelative(last.at)}</span>
          <span className={cn('size-1.5 rounded-full', STALE_STYLE[stale])} />
        </span>
      </footer>
    </article>
  );
}

interface DealCardProps {
  deal: Deal;
  settings: BoardSettings;
  onOpen: (id: string) => void;
}

function DealCardBase({ deal, settings, onOpen }: DealCardProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: deal.id });
  return (
    <DealCardView
      deal={deal}
      settings={settings}
      ghost={isDragging}
      onOpen={onOpen}
      cardRef={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      handleRef={setActivatorNodeRef}
      handleProps={{ ...attributes, ...listeners } as ButtonHTMLAttributes<HTMLButtonElement>}
    />
  );
}

export const DealCard = memo(DealCardBase);
