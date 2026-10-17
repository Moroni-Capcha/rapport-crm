import type { StageId } from '../types';

/** Ids de deals por etapa, en el orden mostrado en el tablero */
export type Columns = Record<StageId, string[]>;

export interface Placement {
  stage: StageId;
  beforeId: string | null;
}

export interface ReorderOp extends Placement {
  id: string;
}

export interface DropPlan {
  /** Operaciones `reorderDeal` a aplicar en orden */
  ops: ReorderOp[];
  /** El deal cambia de etapa */
  crossStage: boolean;
  /** Reordenó dentro de su columna con un orden no manual: hay que pasar a `manual` */
  switchToManual: boolean;
}

const isColumn = (columns: Columns, id: string): id is StageId => Object.hasOwn(columns, id);

function findStage(columns: Columns, id: string): StageId | null {
  for (const stage of Object.keys(columns) as StageId[]) if (columns[stage].includes(id)) return stage;
  return null;
}

/**
 * Traduce el `over` de dnd-kit (id de tarjeta o de columna) a la posición destino.
 * Devuelve null si no hay cambio (sin destino, soltar sobre sí mismo o misma posición).
 */
export function resolveDrop(columns: Columns, activeId: string, overId: string | null): Placement | null {
  if (overId === null || overId === activeId) return null;
  const from = findStage(columns, activeId);
  if (!from) return null;

  if (isColumn(columns, overId)) {
    const ids = columns[overId];
    // Misma columna: al final, salvo que ya sea la última
    if (overId === from && ids[ids.length - 1] === activeId) return null;
    return { stage: overId, beforeId: null };
  }

  const to = findStage(columns, overId);
  if (!to) return null;
  if (to !== from) return { stage: to, beforeId: overId };

  const ids = columns[from];
  const activeIdx = ids.indexOf(activeId);
  const overIdx = ids.indexOf(overId);
  // Hacia abajo: queda DESPUÉS de la tarjeta destino (antes de la siguiente); hacia arriba: antes de ella
  if (activeIdx < overIdx) return { stage: from, beforeId: ids[overIdx + 1] ?? null };
  return { stage: from, beforeId: overId };
}

/**
 * Plan de operaciones para el store. Si el orden mostrado no es el manual y se reordena
 * dentro de la columna, primero "congela" el orden en `state.deals`.
 * `full` es el orden de TODOS los deals (también los ocultos por filtros); así los ocultos
 * quedan en su sitio y no saltan al principio de la columna. Sin filtros coincide con `columns`.
 */
export function planDrop(
  columns: Columns,
  activeId: string,
  overId: string | null,
  manual: boolean,
  full: Columns = columns,
): DropPlan | null {
  const placement = resolveDrop(columns, activeId, overId);
  if (!placement) return null;
  const from = findStage(columns, activeId)!;
  const crossStage = placement.stage !== from;
  const switchToManual = !crossStage && !manual;

  const ops: ReorderOp[] = [];
  if (switchToManual) {
    for (const stage of Object.keys(full) as StageId[]) {
      for (const id of full[stage]) ops.push({ id, stage, beforeId: null });
    }
  }
  ops.push({ id: activeId, ...placement });
  return { ops, crossStage, switchToManual };
}
