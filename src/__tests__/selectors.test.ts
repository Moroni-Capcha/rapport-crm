import { describe, expect, it } from 'vitest';
import { daysAgo, daysFromNow } from '../lib/format';
import { invoiceStatus, lastTouch } from '../store/selectors';
import type { Deal, Milestone } from '../types';

const milestone = (patch: Partial<Milestone>): Milestone => ({
  id: 'm', label: 'Anticipo', pct: 30, amount: 1000, dueAt: daysFromNow(5), status: 'sent', ...patch,
});

describe('selectores', () => {
  it('una factura enviada con fecha pasada se muestra como vencida', () => {
    expect(invoiceStatus(milestone({ dueAt: daysAgo(3) }))).toBe('overdue');
    expect(invoiceStatus(milestone({ dueAt: daysFromNow(3) }))).toBe('sent');
    expect(invoiceStatus(milestone({ dueAt: daysAgo(3), status: 'paid' }))).toBe('paid');
  });

  it('el último contacto ignora las notas automáticas', () => {
    const deal = {
      activities: [
        { id: '1', type: 'note', text: 'Movido a Kickoff', at: daysAgo(0) },
        { id: '2', type: 'call', text: 'Llamada', at: daysAgo(4) },
      ],
    } as Deal;
    expect(lastTouch(deal).type).toBe('call');
  });
});
