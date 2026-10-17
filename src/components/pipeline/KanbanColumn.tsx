import { Plus } from 'lucide-react';
import { useRef } from 'react';
import type { DragEvent } from 'react';
import { cn, formatCurrency } from '../../lib/format';
import type { BoardSettings, Deal, Stage, StageId } from '../../types';
import { IconButton } from '../ui/primitives';
import { DealCard } from './DealCard';
import { useT } from '../../lib/i18n';

interface KanbanColumnProps {
  stage: Stage;
  deals: Deal[];
  settings: BoardSettings;
  draggingId: string | null;
  isOver: boolean;
  onOver: (stage: StageId | null) => void;
  onDrop: (id: string, stage: StageId) => void;
  onOpen: (id: string) => void;
  onAdd: (stage: StageId) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
}

export function KanbanColumn({
  stage,
  deals,
  settings,
  draggingId,
  isOver,
  onOver,
  onDrop,
  onOpen,
  onAdd,
  onDragStart,
  onDragEnd,
}: KanbanColumnProps) {
  const ref = useRef<HTMLElement>(null);
  const t = useT();
  const total = deals.reduce((sum, d) => sum + d.value, 0);
  const draggingFromHere = draggingId != null && deals.some((d) => d.id === draggingId);
  const canDrop = draggingId != null && !draggingFromHere;

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!isOver) onOver(stage.id);
  };
  const handleDragLeave = (e: DragEvent) => {
    if (!ref.current?.contains(e.relatedTarget as Node | null)) onOver(null);
  };
  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    const id = e.dataTransfer.getData('text/plain');
    if (id) onDrop(id, stage.id);
    onOver(null);
  };

  return (
    <section
      ref={ref}
      aria-label={t(stage.name)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'flex h-full w-[284px] shrink-0 flex-col xl:w-auto xl:min-w-[252px] xl:flex-1 rounded-2xl border bg-surface/60 transition-colors',
        isOver && canDrop ? 'border-ink/20 bg-surface-2/80' : 'border-line',
      )}
    >
      {/* Encabezado */}
      <header className="px-3.5 pb-3 pt-3.5">
        <div className="flex items-center gap-2">
          <span className={cn('size-2 rounded-full', stage.accent)} />
          <h2 className="truncate text-[13px] font-semibold text-fg">{t(stage.name)}</h2>
          <span className="tabular rounded-md bg-ink/[0.06] px-1.5 text-[11px] font-medium leading-5 text-fg-muted">{deals.length}</span>
          <IconButton label={t('Añadir lead en {stage}', { stage: t(stage.name) })} className="ml-auto" onClick={() => onAdd(stage.id)}>
            <Plus className="size-3.5" />
          </IconButton>
        </div>
        <div className="mt-1.5 flex items-center justify-between pl-4 text-[11px]">
          <span className="truncate text-fg-subtle">{t(stage.hint)}</span>
          <span className="tabular font-medium text-fg-muted">{formatCurrency(total)}</span>
        </div>
        {/* Barra de acento de la etapa */}
        <div className="mt-3 h-px w-full bg-line">
          <div className={cn('h-px w-10 opacity-80', stage.accent)} />
        </div>
      </header>

      {/* Tarjetas */}
      <div className="scroll-thin flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        {deals.map((deal) => (
          <DealCard
            key={deal.id}
            deal={deal}
            settings={settings}
            dragging={deal.id === draggingId}
            onOpen={onOpen}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          />
        ))}

        {isOver && canDrop && (
          <div className="animate-fade-in flex h-20 shrink-0 items-center justify-center rounded-xl border border-dashed border-ink/20 text-xs text-fg-muted">
            {t('Soltar en {stage}', { stage: t(stage.name) })}
          </div>
        )}

        {deals.length === 0 && !(isOver && canDrop) && (
          <div className="flex h-24 shrink-0 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-line text-center text-xs text-fg-subtle">
            {t('Sin deals en esta etapa')}
            <span className="text-[11px] text-fg-subtle/70">{t('Arrastra una tarjeta aquí')}</span>
          </div>
        )}

        <button
          onClick={() => onAdd(stage.id)}
          className="flex h-8 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs text-fg-subtle transition-colors hover:bg-ink/[0.04] hover:text-fg-muted"
        >
          <Plus className="size-3.5" /> {t('Añadir lead')}
        </button>
      </div>
    </section>
  );
}
