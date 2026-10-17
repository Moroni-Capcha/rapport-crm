import { describe, expect, it } from 'vitest';
import { itemsFromTemplate, newItem, quoteTotals, RATE_CARD, WEEKLY_CAPACITY } from '../lib/quote';

describe('cotizador', () => {
  it('calcula subtotal, descuento, impuesto y total', () => {
    const items = [newItem('frontend', 'Front', 100), newItem('qa', 'QA', 20)];
    const t = quoteTotals({ items, discountPct: 10, includeTax: true });
    const subtotal = 100 * RATE_CARD.frontend + 20 * RATE_CARD.qa; // 5000 + 700
    expect(t.subtotal).toBe(subtotal);
    expect(t.discount).toBe(570);
    expect(t.net).toBe(subtotal - 570);
    expect(t.tax).toBe(Math.round((subtotal - 570) * 0.18));
    expect(t.total).toBe(t.net + t.tax);
    expect(t.hours).toBe(120);
    expect(t.weeks).toBe(Math.ceil(120 / WEEKLY_CAPACITY));
  });

  it('el plan de pagos 30/40/30 suma el neto (con tolerancia de redondeo)', () => {
    const t = quoteTotals({ items: itemsFromTemplate('mvp'), discountPct: 0, includeTax: false });
    const sum = t.payments.reduce((s, p) => s + p.amount, 0);
    expect(Math.abs(sum - t.net)).toBeLessThan(3);
  });

  it('una plantilla escalada se acerca al valor objetivo', () => {
    const t = quoteTotals({ items: itemsFromTemplate('ecommerce', 90_000), discountPct: 0, includeTax: false });
    expect(Math.abs(t.net - 90_000) / 90_000).toBeLessThan(0.03);
  });

  it('ignora partidas sin horas y limita el descuento', () => {
    const t = quoteTotals({ items: [newItem('pm', '', 0), newItem('pm', '', 10)], discountPct: 250, includeTax: false });
    expect(t.hours).toBe(10);
    expect(t.net).toBe(0);
  });
});
