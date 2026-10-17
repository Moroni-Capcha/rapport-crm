import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCorners,
  pointerWithin,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import type {
  Announcements,
  CollisionDetection,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  ScreenReaderInstructions,
} from '@dnd-kit/core';
import { sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { useCallback, useMemo, useState } from 'react';
import { STAGE_BY_ID } from '../../data/stages';
import { planDrop } from '../../lib/boardOrder';
import type { Columns, DropPlan } from '../../lib/boardOrder';
import { useT } from '../../lib/i18n';
import type { BoardSettings, Deal, SortKey, Stage, StageId } from '../../types';
import { DealCardView } from './DealCard';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  stages: Stage[];
  /** Deals visibles (ya filtrados) */
  deals: Deal[];
  /** Todos los deals, sin filtrar */
  allDeals: Deal[];
  sort: SortKey;
  settings: BoardSettings;
  onReorder: (id: string, plan: DropPlan) => void;
  onOpen: (id: string) => void;
  onAdd: (stage: StageId) => void;
}

const lastTouch = (d: Deal) => new Date(d.activities[0]?.at ?? d.createdAt).getTime();

const SORTERS: Record<Exclude<SortKey, 'manual'>, (a: Deal, b: Deal) => number> = {
  recent: (a, b) => lastTouch(b) - lastTouch(a),
  value: (a, b) => b.value - a.value,
  probability: (a, b) => b.probability - a.probability || b.value - a.value,
};

function groupByStage(stages: Stage[], deals: Deal[], sort: SortKey) {
  const byStage = Object.fromEntries(stages.map((s) => [s.id, [] as Deal[]])) as Record<StageId, Deal[]>;
  for (const d of deals) byStage[d.stage].push(d);
  // Manual: se respeta el orden de `deals` sin reordenar
  if (sort !== 'manual') for (const s of stages) byStage[s.id].sort(SORTERS[sort]);
  return byStage;
}

const idsOf = (stages: Stage[], columns: Record<StageId, Deal[]>) =>
  Object.fromEntries(stages.map((s) => [s.id, columns[s.id].map((d) => d.id)])) as Columns;

// Con ratón/touch manda dónde está el puntero: soltar fuera de toda columna no mueve nada.
// Con teclado no hay puntero (`pointerCoordinates` es null) y se usa la cercanía de esquinas.
const collisionDetection: CollisionDetection = (args) => (args.pointerCoordinates ? pointerWithin(args) : closestCorners(args));

export function KanbanBoard({ stages, deals, allDeals, sort, settings, onReorder, onOpen, onAdd }: KanbanBoardProps) {
  const t = useT();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<StageId | null>(null);

  const sensors = useSensors(
    // Distancia: un click simple sigue abriendo el detalle
    // MouseSensor y no PointerSensor: este también recibe eventos táctiles y se saltaría la pulsación larga de abajo
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // Pulsación corta: el scroll táctil sigue funcionando
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // Agrupa y ordena una sola vez por cambio de datos/orden
  const columns = useMemo(() => groupByStage(stages, deals, sort), [stages, deals, sort]);

  const columnIds = useMemo(() => idsOf(stages, columns), [stages, columns]);

  // Orden de todos los deals (incluidos los ocultos por filtros): lo que se congela al pasar a manual
  const fullColumnIds = useMemo(
    () => (allDeals === deals ? columnIds : idsOf(stages, groupByStage(stages, allDeals, sort))),
    [stages, allDeals, deals, sort, columnIds],
  );

  const stageOf = useCallback(
    (id: string): StageId | null => {
      if (Object.hasOwn(columnIds, id)) return id as StageId;
      return (Object.keys(columnIds) as StageId[]).find((s) => columnIds[s].includes(id)) ?? null;
    },
    [columnIds],
  );

  const activeDeal = draggingId ? (deals.find((d) => d.id === draggingId) ?? null) : null;
  const activeStage = draggingId ? stageOf(draggingId) : null;

  const labelOf = useCallback(
    (id: string) => {
      const deal = deals.find((d) => d.id === id);
      return deal ? deal.company : Object.hasOwn(STAGE_BY_ID, id) ? t(STAGE_BY_ID[id as StageId].name) : id;
    },
    [deals, t],
  );

  const reset = useCallback(() => {
    setDraggingId(null);
    setOverStage(null);
  }, []);

  const handleDragStart = (e: DragStartEvent) => setDraggingId(String(e.active.id));
  const handleDragOver = (e: DragOverEvent) => setOverStage(e.over ? stageOf(String(e.over.id)) : null);
  const handleDragEnd = (e: DragEndEvent) => {
    const plan = e.over ? planDrop(columnIds, String(e.active.id), String(e.over.id), sort === 'manual', fullColumnIds) : null;
    reset();
    if (plan) onReorder(String(e.active.id), plan);
  };

  const screenReaderInstructions: ScreenReaderInstructions = {
    draggable: t(
      'Para mover una tarjeta, enfoca su asa y pulsa Espacio. Usa las flechas para moverla, Espacio para soltarla y Esc para cancelar.',
    ),
  };

  const announcements: Announcements = {
    onDragStart: ({ active }) => t('Has recogido la tarjeta {name}.', { name: labelOf(String(active.id)) }),
    onDragOver: ({ active, over }) =>
      over
        ? t('La tarjeta {name} está sobre {target}.', { name: labelOf(String(active.id)), target: labelOf(String(over.id)) })
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? t('Has soltado la tarjeta {name} sobre {target}.', { name: labelOf(String(active.id)), target: labelOf(String(over.id)) })
        : t('Has soltado la tarjeta {name} fuera de una columna.', { name: labelOf(String(active.id)) }),
    onDragCancel: ({ active }) => t('Movimiento cancelado. La tarjeta {name} vuelve a su sitio.', { name: labelOf(String(active.id)) }),
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionDetection}
      accessibility={{ screenReaderInstructions, announcements }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={reset}
    >
      <div className="scroll-thin flex h-full min-h-0 gap-3 overflow-x-auto pb-2">
        {stages.map((stage) => (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            deals={columns[stage.id]}
            settings={settings}
            isOver={overStage === stage.id && activeStage !== stage.id}
            onOpen={onOpen}
            onAdd={onAdd}
          />
        ))}
      </div>
      <DragOverlay>{activeDeal && <DealCardView deal={activeDeal} settings={settings} overlay />}</DragOverlay>
    </DndContext>
  );
}
