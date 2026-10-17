import { createContext, useCallback, useContext, useEffect, useMemo, useReducer } from 'react';
import type { ReactNode } from 'react';
import { SEED_DEALS } from '../data/deals';
import { SEED_EVENTS } from '../data/events';
import { HISTORY } from '../data/history';
import { PHASES, projectFromDeal, SEED_PROJECTS } from '../data/projects';
import { STAGES, STAGE_BY_ID } from '../data/stages';
import { daysSince, uid } from '../lib/format';
import type { Activity, CalendarEvent, ClosedDeal, Deal, MilestoneStatus, Project, StageId } from '../types';

/**
 * Store global de la demo (Context + useReducer, sin dependencias).
 * Una sola fuente de verdad: lo que pasa en Pipeline se refleja en
 * Projects, Finance, Customers y Overview. En producción, este archivo
 * sería el borde con la API (React Query / tRPC / Supabase).
 */

export interface State {
  deals: Deal[];
  projects: Project[];
  events: CalendarEvent[];
  /** Deals marcados como perdidos durante la demo (se suman al historial en Growth/Overview/Customers) */
  lost: ClosedDeal[];
}

const STORAGE_KEY = 'rapport-state-v2';

export const seedState = (): State => ({ deals: SEED_DEALS, projects: SEED_PROJECTS, events: SEED_EVENTS, lost: [] });

/** Estado guardado en el navegador; si no hay (o está corrupto) se usan los datos de ejemplo */
function loadState(): State {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return seedState();
    const parsed = JSON.parse(raw) as Partial<State>;
    if (!Array.isArray(parsed.deals) || !Array.isArray(parsed.projects) || !Array.isArray(parsed.events)) return seedState();
    return { deals: parsed.deals, projects: parsed.projects, events: parsed.events, lost: parsed.lost ?? [] };
  } catch {
    return seedState();
  }
}

/** Siguiente número de factura correlativo a partir de las ya emitidas */
export function nextInvoiceNumber(projects: Project[]) {
  const max = projects
    .flatMap((p) => p.milestones)
    .map((m) => Number(m.invoiceNumber?.split('-')[1] ?? 0))
    .reduce((a, b) => Math.max(a, b), 1180);
  return `F001-${max + 1}`;
}

export type Action =
  | { type: 'deal/move'; id: string; stage: StageId; at: string; activityId: string }
  | { type: 'deal/reorder'; id: string; stage: StageId; beforeId: string | null; at: string; activityId: string }
  | { type: 'deal/add'; deal: Deal }
  | { type: 'deal/update'; id: string; patch: Partial<Deal> }
  | { type: 'deal/log'; id: string; activity: Activity }
  | { type: 'deal/handoff'; dealId: string; project: Project; activity: Activity }
  | { type: 'project/update'; id: string; patch: Partial<Project> }
  | { type: 'deal/lose'; id: string; closed: ClosedDeal }
  | { type: 'milestone/status'; projectId: string; milestoneId: string; status: MilestoneStatus; at: string }
  | { type: 'event/add'; event: CalendarEvent }
  | { type: 'reset' };

/** Reducer puro: toda la lógica de negocio del store, testeable sin React */
export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'deal/move':
      return {
        ...state,
        deals: state.deals.map((d) => {
          if (d.id !== action.id || d.stage === action.stage) return d;
          const stage = STAGE_BY_ID[action.stage];
          return {
            ...d,
            stage: action.stage,
            probability: stage.probability,
            activities: [{ id: action.activityId, type: 'note', text: `Movido a ${stage.name}`, at: action.at }, ...d.activities],
          };
        }),
      };
    case 'deal/reorder': {
      const deal = state.deals.find((d) => d.id === action.id);
      if (!deal || action.beforeId === action.id) return state;
      const changesStage = deal.stage !== action.stage;
      const stage = STAGE_BY_ID[action.stage];
      const placed: Deal = changesStage
        ? {
            ...deal,
            stage: action.stage,
            probability: stage.probability,
            activities: [{ id: action.activityId, type: 'note', text: `Movido a ${stage.name}`, at: action.at }, ...deal.activities],
          }
        : deal;
      const rest = state.deals.filter((d) => d.id !== action.id);
      // Posición: antes de beforeId; si no existe, tras el último deal de la etapa (o al final)
      let index = action.beforeId === null ? -1 : rest.findIndex((d) => d.id === action.beforeId);
      if (index === -1) {
        let last = -1;
        rest.forEach((d, i) => {
          if (d.stage === action.stage) last = i;
        });
        index = last === -1 ? rest.length : last + 1;
      }
      const deals = [...rest.slice(0, index), placed, ...rest.slice(index)];
      if (!changesStage && deals.every((d, i) => d === state.deals[i])) return state;
      return { ...state, deals };
    }
    case 'deal/add':
      return { ...state, deals: [action.deal, ...state.deals] };
    case 'deal/update':
      return { ...state, deals: state.deals.map((d) => (d.id === action.id ? { ...d, ...action.patch } : d)) };
    case 'deal/log':
      return {
        ...state,
        deals: state.deals.map((d) => (d.id === action.id ? { ...d, activities: [action.activity, ...d.activities] } : d)),
      };
    case 'deal/handoff':
      return {
        ...state,
        projects: [action.project, ...state.projects],
        deals: state.deals.map((d) =>
          d.id === action.dealId
            ? { ...d, stage: 'kickoff', probability: 100, projectId: action.project.id, activities: [action.activity, ...d.activities] }
            : d,
        ),
      };
    case 'deal/lose':
      return { ...state, deals: state.deals.filter((d) => d.id !== action.id), lost: [action.closed, ...state.lost] };
    case 'project/update':
      return { ...state, projects: state.projects.map((p) => (p.id === action.id ? { ...p, ...action.patch } : p)) };
    case 'milestone/status': {
      const number = nextInvoiceNumber(state.projects);
      return {
        ...state,
        projects: state.projects.map((p) =>
          p.id !== action.projectId
            ? p
            : {
                ...p,
                milestones: p.milestones.map((m) =>
                  m.id !== action.milestoneId
                    ? m
                    : {
                        ...m,
                        status: action.status,
                        invoiceNumber: m.invoiceNumber ?? (action.status === 'sent' || action.status === 'paid' ? number : undefined),
                        paidAt: action.status === 'paid' ? action.at : m.paidAt,
                      },
                ),
              },
        ),
      };
    }
    case 'event/add':
      return { ...state, events: [...state.events, action.event] };
    case 'reset':
      return seedState();
    default:
      return state;
  }
}

function useStoreValue() {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  // Persistencia: los cambios sobreviven a una recarga
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      /* storage lleno o bloqueado: la demo sigue funcionando en memoria */
    }
  }, [state]);

  const moveDeal = useCallback(
    (id: string, stage: StageId) => dispatch({ type: 'deal/move', id, stage, at: new Date().toISOString(), activityId: uid() }),
    [],
  );
  const reorderDeal = useCallback(
    (id: string, stage: StageId, beforeId: string | null) =>
      dispatch({ type: 'deal/reorder', id, stage, beforeId, at: new Date().toISOString(), activityId: uid() }),
    [],
  );
  const addDeal = useCallback((deal: Deal) => dispatch({ type: 'deal/add', deal }), []);
  const updateDeal = useCallback((id: string, patch: Partial<Deal>) => dispatch({ type: 'deal/update', id, patch }), []);
  const logActivity = useCallback(
    (id: string, activity: Omit<Activity, 'id' | 'at'>) =>
      dispatch({ type: 'deal/log', id, activity: { ...activity, id: uid(), at: new Date().toISOString() } }),
    [],
  );

  /** Crea el proyecto (con sus hitos de pago) a partir de un deal ganado. Devuelve el id del proyecto. */
  const handoffDeal = useCallback((deal: Deal) => {
    if (deal.projectId) return deal.projectId;
    const project = projectFromDeal(deal);
    dispatch({
      type: 'deal/handoff',
      dealId: deal.id,
      project,
      activity: { id: uid(), type: 'note', text: `Proyecto creado en Projects: ${project.name}`, at: new Date().toISOString() },
    });
    return project.id;
  }, []);

  const updateProject = useCallback((id: string, patch: Partial<Project>) => dispatch({ type: 'project/update', id, patch }), []);

  const advancePhase = useCallback(
    (project: Project) => {
      const i = PHASES.findIndex((p) => p.id === project.phase);
      const next = PHASES[i + 1];
      if (!next) return;
      updateProject(project.id, { phase: next.id, progress: Math.max(project.progress, (i + 1) * 20), isNew: false });
    },
    [updateProject],
  );

  const setMilestoneStatus = useCallback(
    (projectId: string, milestoneId: string, status: MilestoneStatus) =>
      dispatch({ type: 'milestone/status', projectId, milestoneId, status, at: new Date().toISOString() }),
    [],
  );

  const addEvent = useCallback((event: CalendarEvent) => dispatch({ type: 'event/add', event }), []);

  /** Saca el deal del pipeline y lo registra como perdido con su motivo */
  const loseDeal = useCallback((deal: Deal, reason: string) => {
    dispatch({
      type: 'deal/lose',
      id: deal.id,
      closed: {
        id: `lost-${deal.id}`,
        company: deal.company,
        title: deal.project,
        value: deal.value,
        source: deal.source,
        segment: deal.segments[0] ?? 'smb',
        service: deal.services[0]!,
        outcome: 'lost',
        lossReason: reason,
        reached: STAGES.findIndex((s) => s.id === deal.stage),
        closedAt: new Date().toISOString(),
        cycleDays: Math.max(1, daysSince(deal.createdAt)),
        owner: deal.owner,
      },
    });
  }, []);

  const resetDemo = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* nada que limpiar */
    }
    dispatch({ type: 'reset' });
  }, []);

  return useMemo(
    () => ({
      ...state,
      /** Historial completo: datos de ejemplo + deals perdidos en esta demo */
      history: [...state.lost, ...HISTORY],
      moveDeal, reorderDeal, addDeal, updateDeal, logActivity, handoffDeal, updateProject, advancePhase, setMilestoneStatus, addEvent, loseDeal, resetDemo,
    }),
    [state, moveDeal, reorderDeal, addDeal, updateDeal, logActivity, handoffDeal, updateProject, advancePhase, setMilestoneStatus, addEvent, loseDeal, resetDemo],
  );
}

type Store = ReturnType<typeof useStoreValue>;

const StoreContext = createContext<Store | null>(null);

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const value = useStoreValue();
  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore debe usarse dentro de <AppStoreProvider>');
  return ctx;
}
