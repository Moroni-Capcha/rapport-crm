import { describe, expect, it } from 'vitest';
import { projectFromDeal } from '../data/projects';
import { reducer, seedState } from '../store/AppStore';
import type { ClosedDeal } from '../types';

const at = '2026-10-17T12:00:00.000Z';

describe('reducer del store', () => {
  it('mueve un deal de etapa, ajusta la probabilidad y registra la actividad', () => {
    const state = seedState();
    const deal = state.deals.find((d) => d.stage === 'leads')!;
    const next = reducer(state, { type: 'deal/move', id: deal.id, stage: 'proposal', at, activityId: 'a1' });
    const moved = next.deals.find((d) => d.id === deal.id)!;
    expect(moved.stage).toBe('proposal');
    expect(moved.probability).toBe(50);
    expect(moved.activities[0]!.text).toBe('Movido a Propuesta Enviada');
    expect(moved.activities).toHaveLength(deal.activities.length + 1);
  });

  it('no cambia nada si el deal ya está en esa etapa', () => {
    const state = seedState();
    const deal = state.deals[0]!;
    const next = reducer(state, { type: 'deal/move', id: deal.id, stage: deal.stage, at, activityId: 'a1' });
    expect(next.deals[0]).toBe(deal);
  });

  describe('deal/reorder', () => {
    const ids = (s: ReturnType<typeof seedState>, stage: string) => s.deals.filter((d) => d.stage === stage).map((d) => d.id);
    const columnWith = (min: number) => {
      const state = seedState();
      const stage = state.deals.find((d) => state.deals.filter((x) => x.stage === d.stage).length >= min)!.stage;
      return { state, stage, col: ids(state, stage) };
    };

    it('reordena dentro de la misma columna sin tocar etapa, probabilidad ni actividades', () => {
      const { state, stage, col } = columnWith(2);
      const last = col[col.length - 1]!;
      const next = reducer(state, { type: 'deal/reorder', id: last, stage, beforeId: col[0]!, at, activityId: 'r1' });
      expect(ids(next, stage)).toEqual([last, ...col.slice(0, -1)]);
      const before = state.deals.find((d) => d.id === last)!;
      const after = next.deals.find((d) => d.id === last)!;
      expect(after.stage).toBe(before.stage);
      expect(after.probability).toBe(before.probability);
      expect(after.activities).toBe(before.activities);
      expect(next.deals).toHaveLength(state.deals.length);
    });

    it('con beforeId null lo deja al final de su columna', () => {
      const { state, stage, col } = columnWith(2);
      const next = reducer(state, { type: 'deal/reorder', id: col[0]!, stage, beforeId: null, at, activityId: 'r1' });
      expect(ids(next, stage)).toEqual([...col.slice(1), col[0]!]);
    });

    it('al soltar en otra columna cambia etapa y probabilidad, registra una actividad y queda antes de la tarjeta indicada', () => {
      const state = seedState();
      const deal = state.deals.find((d) => d.stage === 'leads')!;
      const target = state.deals.find((d) => d.stage === 'proposal')!;
      const next = reducer(state, { type: 'deal/reorder', id: deal.id, stage: 'proposal', beforeId: target.id, at, activityId: 'r1' });
      const moved = next.deals.find((d) => d.id === deal.id)!;
      expect(moved.stage).toBe('proposal');
      expect(moved.probability).toBe(50);
      expect(moved.activities).toHaveLength(deal.activities.length + 1);
      expect(moved.activities[0]).toEqual({ id: 'r1', type: 'note', text: 'Movido a Propuesta Enviada', at });
      expect(next.deals.findIndex((d) => d.id === deal.id) + 1).toBe(next.deals.findIndex((d) => d.id === target.id));
    });

    it('un id desconocido devuelve el mismo estado', () => {
      const state = seedState();
      expect(reducer(state, { type: 'deal/reorder', id: 'nope', stage: 'leads', beforeId: null, at, activityId: 'r1' })).toBe(state);
    });

    it('soltar sobre sí mismo o sin cambio de orden devuelve el mismo estado', () => {
      const { state, stage, col } = columnWith(2);
      expect(reducer(state, { type: 'deal/reorder', id: col[0]!, stage, beforeId: col[0]!, at, activityId: 'r1' })).toBe(state);
      expect(reducer(state, { type: 'deal/reorder', id: col[0]!, stage, beforeId: col[1]!, at, activityId: 'r1' })).toBe(state);
      expect(reducer(state, { type: 'deal/reorder', id: col[col.length - 1]!, stage, beforeId: null, at, activityId: 'r1' })).toBe(state);
    });
  });

  it('marcar como perdido saca el deal del pipeline y lo guarda en el historial', () => {
    const state = seedState();
    const deal = state.deals[0]!;
    const closed: ClosedDeal = {
      id: `lost-${deal.id}`, company: deal.company, title: deal.project, value: deal.value, source: deal.source,
      segment: 'smb', service: deal.services[0]!, outcome: 'lost', lossReason: 'Precio / presupuesto',
      reached: 0, closedAt: at, cycleDays: 10, owner: deal.owner,
    };
    const next = reducer(state, { type: 'deal/lose', id: deal.id, closed });
    expect(next.deals.some((d) => d.id === deal.id)).toBe(false);
    expect(next.lost[0]!.lossReason).toBe('Precio / presupuesto');
  });

  it('pasar a Projects crea el proyecto con 3 hitos y enlaza el deal', () => {
    const state = seedState();
    const deal = state.deals.find((d) => d.stage === 'kickoff')!;
    const project = projectFromDeal(deal);
    const next = reducer(state, { type: 'deal/handoff', dealId: deal.id, project, activity: { id: 'x', type: 'note', text: 'ok', at } });
    expect(next.projects[0]!.id).toBe(project.id);
    expect(next.projects[0]!.milestones).toHaveLength(3);
    expect(next.projects[0]!.milestones.reduce((s, m) => s + m.amount, 0)).toBe(deal.value);
    expect(next.deals.find((d) => d.id === deal.id)!.projectId).toBe(project.id);
  });

  it('emitir facturas asigna números correlativos y registrar el pago guarda la fecha', () => {
    let state = seedState();
    const project = state.projects.find((p) => p.milestones.some((m) => m.status === 'pending'))!;
    const pending = project.milestones.filter((m) => m.status === 'pending');
    state = reducer(state, { type: 'milestone/status', projectId: project.id, milestoneId: pending[0]!.id, status: 'sent', at });
    const first = state.projects.find((p) => p.id === project.id)!.milestones.find((m) => m.id === pending[0]!.id)!;
    expect(first.invoiceNumber).toMatch(/^F001-\d+$/);

    const firstNum = Number(first.invoiceNumber!.split('-')[1]);
    if (pending[1]) {
      state = reducer(state, { type: 'milestone/status', projectId: project.id, milestoneId: pending[1].id, status: 'sent', at });
      const second = state.projects.find((p) => p.id === project.id)!.milestones.find((m) => m.id === pending[1]!.id)!;
      expect(Number(second.invoiceNumber!.split('-')[1])).toBe(firstNum + 1);
    }

    state = reducer(state, { type: 'milestone/status', projectId: project.id, milestoneId: pending[0]!.id, status: 'paid', at });
    const paid = state.projects.find((p) => p.id === project.id)!.milestones.find((m) => m.id === pending[0]!.id)!;
    expect(paid.status).toBe('paid');
    expect(paid.paidAt).toBe(at);
    expect(paid.invoiceNumber).toBe(first.invoiceNumber);
  });

  it('reset vuelve a los datos de ejemplo', () => {
    const state = reducer(seedState(), { type: 'deal/add', deal: { ...seedState().deals[0]!, id: 'nuevo' } });
    expect(state.deals.length).toBe(seedState().deals.length + 1);
    expect(reducer(state, { type: 'reset' }).deals.length).toBe(seedState().deals.length);
  });
});
