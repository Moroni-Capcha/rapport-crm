import { useCallback, useMemo, useState } from 'react';
import type { BoardSettings, Deal, SortKey, Stage, StageId } from '../../types';
import { KanbanColumn } from './KanbanColumn';

interface KanbanBoardProps {
  stages: Stage[];
  deals: Deal[];
  sort: SortKey;
  settings: BoardSettings;
  onMove: (id: string, stage: StageId) => void;
  onOpen: (id: string) => void;
  onAdd: (stage: StageId) => void;
}

const lastTouch = (d: Deal) => new Date(d.activities[0]?.at ?? d.createdAt).getTime();

const SORTERS: Record<Exclude<SortKey, 'manual'>, (a: Deal, b: Deal) => number> = {
  recent: (a, b) => lastTouch(b) - lastTouch(a),
  value: (a, b) => b.value - a.value,
  probability: (a, b) => b.probability - a.probability || b.value - a.value,
};

export function KanbanBoard({ stages, deals, sort, settings, onMove, onOpen, onAdd }: KanbanBoardProps) {
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStage, setOverStage] = useState<StageId | null>(null);

  // Agrupa y ordena una sola vez por cambio de datos/orden
  const columns = useMemo(() => {
    const byStage = Object.fromEntries(stages.map((s) => [s.id, [] as Deal[]])) as Record<StageId, Deal[]>;
    for (const d of deals) byStage[d.stage].push(d);
    // Manual: se respeta el orden de `deals` sin reordenar
    if (sort !== 'manual') for (const s of stages) byStage[s.id].sort(SORTERS[sort]);
    return byStage;
  }, [stages, deals, sort]);

  const handleDragEnd = useCallback(() => {
    setDraggingId(null);
    setOverStage(null);
  }, []);

  const handleDrop = useCallback(
    (id: string, stage: StageId) => {
      onMove(id, stage);
      handleDragEnd();
    },
    [onMove, handleDragEnd],
  );

  return (
    <div className="scroll-thin flex h-full min-h-0 gap-3 overflow-x-auto pb-2">
      {stages.map((stage) => (
        <KanbanColumn
          key={stage.id}
          stage={stage}
          deals={columns[stage.id]}
          settings={settings}
          draggingId={draggingId}
          isOver={overStage === stage.id}
          onOver={setOverStage}
          onDrop={handleDrop}
          onOpen={onOpen}
          onAdd={onAdd}
          onDragStart={setDraggingId}
          onDragEnd={handleDragEnd}
        />
      ))}
    </div>
  );
}
