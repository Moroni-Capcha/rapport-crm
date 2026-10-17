import { describe, expect, it } from 'vitest';
import { planDrop, resolveDrop } from '../lib/boardOrder';
import type { Columns, DropPlan } from '../lib/boardOrder';
import { reducer, seedState } from '../store/AppStore';
import type { State } from '../store/AppStore';
import type { StageId } from '../types';

const STAGE_IDS: StageId[] = ['leads', 'discovery', 'proposal', 'negotiation', 'kickoff'];
const at = '2026-01-01T00:00:00.000Z';

const stageIds = (s: State, stage: StageId) => s.deals.filter((d) => d.stage === stage).map((d) => d.id);
const columnsOf = (s: State): Columns =>
  Object.fromEntries(STAGE_IDS.map((st) => [st, stageIds(s, st)])) as Columns;

function apply(state: State, plan: DropPlan): State {
  return plan.ops.reduce(
    (acc, op, i) => reducer(acc, { type: 'deal/reorder', id: op.id, stage: op.stage, beforeId: op.beforeId, at, activityId: `op${i}` }),
    state,
  );
}

const cols = (): Columns => ({ leads: ['a', 'b', 'c'], discovery: ['d'], proposal: [], negotiation: [], kickoff: [] });

describe('resolveDrop', () => {
  it('hacia abajo en la misma columna: antes de la tarjeta siguiente al destino', () => {
    expect(resolveDrop(cols(), 'a', 'b')).toEqual({ stage: 'leads', beforeId: 'c' });
  });

  it('hacia abajo sobre la última tarjeta: al final', () => {
    expect(resolveDrop(cols(), 'a', 'c')).toEqual({ stage: 'leads', beforeId: null });
  });

  it('hacia arriba: antes de la tarjeta destino', () => {
    expect(resolveDrop(cols(), 'c', 'a')).toEqual({ stage: 'leads', beforeId: 'a' });
  });

  it('sin destino o sobre sí misma: no-op', () => {
    expect(resolveDrop(cols(), 'a', null)).toBeNull();
    expect(resolveDrop(cols(), 'a', 'a')).toBeNull();
    expect(resolveDrop(cols(), 'zzz', 'a')).toBeNull();
  });

  it('sobre su propia columna: al final, salvo que ya sea la última', () => {
    expect(resolveDrop(cols(), 'a', 'leads')).toEqual({ stage: 'leads', beforeId: null });
    expect(resolveDrop(cols(), 'c', 'leads')).toBeNull();
  });

  it('otra columna: sobre una tarjeta va antes de ella; sobre la columna (o vacía) va al final', () => {
    expect(resolveDrop(cols(), 'a', 'd')).toEqual({ stage: 'discovery', beforeId: 'd' });
    expect(resolveDrop(cols(), 'a', 'discovery')).toEqual({ stage: 'discovery', beforeId: null });
    expect(resolveDrop(cols(), 'a', 'proposal')).toEqual({ stage: 'proposal', beforeId: null });
  });
});

describe('planDrop contra el reducer', () => {
  const biggest = (s: State) => STAGE_IDS.reduce((best, st) => (stageIds(s, st).length > stageIds(s, best).length ? st : best));

  it('orden manual: sin congelar, una sola operación', () => {
    const plan = planDrop(cols(), 'a', 'b', true)!;
    expect(plan.ops).toHaveLength(1);
    expect(plan.switchToManual).toBe(false);
    expect(plan.crossStage).toBe(false);
  });

  it('manual, hacia abajo: el orden final es el esperado', () => {
    const state = seedState();
    const stage = biggest(state);
    const [a, b, c, ...rest] = stageIds(state, stage);
    expect(c).toBeDefined();
    const plan = planDrop(columnsOf(state), a!, b!, true)!;
    expect(stageIds(apply(state, plan), stage)).toEqual([b, a, c, ...rest]);
  });

  it('manual, hacia arriba: el orden final es el esperado', () => {
    const state = seedState();
    const stage = biggest(state);
    const ids = stageIds(state, stage);
    const last = ids[ids.length - 1]!;
    const plan = planDrop(columnsOf(state), last, ids[0]!, true)!;
    expect(stageIds(apply(state, plan), stage)).toEqual([last, ...ids.slice(0, -1)]);
  });

  it('orden no manual: congela el orden mostrado y aplica el movimiento', () => {
    const state = seedState();
    const stage = biggest(state);
    // Orden mostrado distinto al del array (p. ej. por valor): el inverso
    const displayed = columnsOf(state);
    for (const st of STAGE_IDS) displayed[st] = [...displayed[st]].reverse();
    const [a, b, c, ...rest] = displayed[stage];
    expect(c).toBeDefined();
    const plan = planDrop(displayed, a!, b!, false)!;
    expect(plan.switchToManual).toBe(true);
    const next = apply(state, plan);
    expect(stageIds(next, stage)).toEqual([b, a, c, ...rest]);
    for (const st of STAGE_IDS) {
      if (st !== stage) expect(stageIds(next, st)).toEqual(displayed[st]);
    }
    expect(next.deals).toHaveLength(state.deals.length);
  });

  it('con filtros: los deals ocultos conservan su sitio al congelar el orden', () => {
    // 6 deals en una sola etapa, para no depender del tamaño de los datos de ejemplo
    const seed = seedState();
    const stage: StageId = 'leads';
    const state: State = { ...seed, deals: seed.deals.slice(0, 6).map((d) => ({ ...d, stage })) };
    // Orden mostrado completo (distinto al del array) y un deal de cada dos oculto por un filtro
    const full = columnsOf(state);
    for (const st of STAGE_IDS) full[st] = [...full[st]].reverse();
    const ids = full[stage];
    expect(ids.length).toBeGreaterThanOrEqual(5);
    const hidden = new Set(ids.filter((_, i) => i % 2 === 1));
    const visible = { ...full, [stage]: ids.filter((id) => !hidden.has(id)) };
    const [a, b, c] = visible[stage];

    const plan = planDrop(visible, a!, b!, false, full)!;
    expect(plan.switchToManual).toBe(true);
    const result = stageIds(apply(state, plan), stage);

    // Los ocultos no saltan al principio: quedan donde estaban respecto a los visibles
    const expected = ids.filter((id) => id !== a);
    expected.splice(expected.indexOf(c!), 0, a!);
    expect(result).toEqual(expected);
    expect(result.filter((id) => hidden.has(id))).toEqual(ids.filter((id) => hidden.has(id)));
  });

  it('cruce de columna: cambia etapa y probabilidad, y queda en la posición indicada', () => {
    const state = seedState();
    const from = biggest(state);
    const to = STAGE_IDS.find((s) => s !== from && stageIds(state, s).length > 0)!;
    const moving = stageIds(state, from)[0]!;
    const target = stageIds(state, to)[0]!;
    const plan = planDrop(columnsOf(state), moving, target, true)!;
    expect(plan.crossStage).toBe(true);
    expect(plan.switchToManual).toBe(false);
    const next = apply(state, plan);
    expect(stageIds(next, to)).toEqual([moving, ...stageIds(state, to)]);
    expect(next.deals.find((d) => d.id === moving)!.stage).toBe(to);
  });

  it('cruce de columna con orden no manual: no congela ni cambia a manual', () => {
    const plan = planDrop(cols(), 'a', 'proposal', false)!;
    expect(plan.ops).toEqual([{ id: 'a', stage: 'proposal', beforeId: null }]);
    expect(plan.switchToManual).toBe(false);
  });
});
