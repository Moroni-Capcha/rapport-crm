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
