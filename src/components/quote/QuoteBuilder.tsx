import { FileText, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { cn, formatCurrency } from '../../lib/format';
import { useT } from '../../lib/i18n';
import { emptyQuote, itemsFromTemplate, newItem, proposalNumber, quoteTotals, RATE_CARD, ROLE_LABEL, ROLES, TAX_RATE, TEMPLATES } from '../../lib/quote';
import type { TemplateId } from '../../lib/quote';
import type { Deal, Quote, QuoteItem, QuoteRole } from '../../types';
import { Button, IconButton, Switch } from '../ui/primitives';

interface QuoteBuilderProps {
  deal: Deal;
  onClose: () => void;
  /** Guarda la cotización (nueva versión) y el neto pasa a ser el valor del deal */
  onSave: (quote: Quote, net: number) => void;
  onPreview: (quote: Quote) => void;
}

const numberCls =
  'tabular h-8 w-full rounded-md border border-line bg-surface-2 px-2 text-right text-[13px] text-fg outline-none focus:border-ink/25';

export function QuoteBuilder({ deal, onClose, onSave, onPreview }: QuoteBuilderProps) {
  const t = useT();
  const [draft, setDraft] = useState<Quote>(() => deal.quote ?? emptyQuote());
  const totals = useMemo(() => quoteTotals(draft), [draft]);
  const nextVersion = (deal.quote?.version ?? 0) + 1;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const setItem = (id: string, patch: Partial<QuoteItem>) =>
    setDraft((q) => ({ ...q, items: q.items.map((i) => (i.id === id ? { ...i, ...patch } : i)) }));
  const removeItem = (id: string) => setDraft((q) => ({ ...q, items: q.items.filter((i) => i.id !== id) }));
  const addItem = () => setDraft((q) => ({ ...q, items: [...q.items, newItem()] }));
  const applyTemplate = (id: TemplateId) => setDraft((q) => ({ ...q, items: itemsFromTemplate(id) }));

  const finalQuote = (): Quote => ({ ...draft, items: draft.items.filter((i) => i.hours > 0), version: nextVersion, updatedAt: new Date().toISOString() });

  const maxRoleHours = Math.max(1, ...totals.byRole.map((r) => r.hours));

  return (
    <div className="fixed inset-0 z-[55] flex items-start justify-center overflow-y-auto p-3 sm:p-6">
      <div className="animate-fade-in fixed inset-0 bg-scrim/55 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('Cotización · {name}', { name: deal.company })}
        className="animate-pop relative flex w-full max-w-[1120px] flex-col rounded-2xl border border-line-strong bg-surface shadow-2xl shadow-shade/60"
      >
        {/* Cabecera */}
        <div className="flex items-start gap-3 border-b border-line px-5 py-4">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-line-strong bg-surface-2">
            <FileText className="size-4 text-fg-muted" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-semibold text-fg">{t('Cotización · {name}', { name: deal.company })}</h2>
            <p className="truncate text-xs text-fg-subtle">
              {t(deal.project)} · {proposalNumber(deal.id, nextVersion)}
              {deal.quote && ` · ${t('reemplaza la v{n}', { n: deal.quote.version })}`}
            </p>
          </div>
          <IconButton label={t('Cerrar')} onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>

        <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_330px]">
          {/* Partidas */}
          <div className="min-w-0 border-b border-line p-5 lg:border-b-0 lg:border-r">
            <div className="mb-4 flex flex-wrap items-center gap-1.5">
              <span className="mr-1 text-xs text-fg-subtle">{t('Partir de una plantilla:')}</span>
              {(Object.keys(TEMPLATES) as TemplateId[]).map((id) => (
                <button
                  key={id}
                  onClick={() => applyTemplate(id)}
                  className="h-7 rounded-full border border-line px-2.5 text-xs text-fg-muted transition-colors hover:border-line-strong hover:text-fg"
                >
                  {t(TEMPLATES[id].name)}
                </button>
              ))}
            </div>

            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-[13px]">
                <thead>
                  <tr className="text-left text-[11px] font-medium uppercase tracking-wider text-fg-subtle">
                    <th className="w-[176px] pb-2 pr-2 font-medium">{t('Rol')}</th>
                    <th className="pb-2 pr-2 font-medium">{t('Descripción')}</th>
                    <th className="w-[76px] pb-2 pr-2 text-right font-medium">{t('Horas')}</th>
                    <th className="w-[76px] pb-2 pr-2 text-right font-medium">{t('Tarifa')}</th>
                    <th className="w-[96px] pb-2 pr-2 text-right font-medium">{t('Subtotal')}</th>
                    <th className="w-8 pb-2" />
                  </tr>
                </thead>
                <tbody>
                  {draft.items.map((item, idx) => (
                    <tr key={item.id} className="border-t border-line">
                      <td className="py-1.5 pr-2">
                        <select
                          id={`q-role-${idx}`}
                          aria-label={t('Rol')}
                          value={item.role}
                          onChange={(e) => {
                            const role = e.target.value as QuoteRole;
                            setItem(item.id, { role, rate: RATE_CARD[role] });
                          }}
                          className="h-8 w-full rounded-md border border-line bg-surface-2 px-2 text-[13px] text-fg outline-none focus:border-ink/25"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r} className="bg-surface-2">
                              {t(ROLE_LABEL[r])}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          id={`q-desc-${idx}`}
                          aria-label={t('Descripción')}
                          value={t(item.description)}
                          onChange={(e) => setItem(item.id, { description: e.target.value })}
                          placeholder={t('Qué incluye esta partida')}
                          className="h-8 w-full rounded-md border border-line bg-surface-2 px-2 text-[13px] text-fg outline-none placeholder:text-fg-subtle focus:border-ink/25"
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          id={`q-hours-${idx}`}
                          aria-label={t('Horas')}
                          type="number"
                          min={0}
                          step={4}
                          value={item.hours}
                          onChange={(e) => setItem(item.id, { hours: Math.max(0, Number(e.target.value)) })}
                          className={numberCls}
                        />
                      </td>
                      <td className="py-1.5 pr-2">
                        <input
                          id={`q-rate-${idx}`}
                          aria-label={t('Tarifa')}
                          type="number"
                          min={0}
                          step={5}
                          value={item.rate}
                          onChange={(e) => setItem(item.id, { rate: Math.max(0, Number(e.target.value)) })}
                          className={numberCls}
                        />
                      </td>
                      <td className="tabular py-1.5 pr-2 text-right font-medium text-fg">{formatCurrency(item.hours * item.rate)}</td>
                      <td className="py-1.5 text-right">
                        <IconButton label={t('Quitar partida')} onClick={() => removeItem(item.id)}>
                          <Trash2 className="size-3.5" />
                        </IconButton>
                      </td>
                    </tr>
                  ))}
                  {draft.items.length === 0 && (
                    <tr>
                      <td colSpan={6} className="rounded-xl border border-dashed border-line py-10 text-center text-[13px] text-fg-subtle">
                        {t('Elige una plantilla o añade partidas a mano.')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <button onClick={addItem} className="mt-3 flex h-8 items-center gap-1.5 rounded-lg px-2 text-xs text-fg-subtle transition-colors hover:bg-ink/[0.04] hover:text-fg">
              <Plus className="size-3.5" /> {t('Añadir partida')}
            </button>

            <p className="mt-4 text-[11.5px] text-fg-subtle">
              {t('Tarifario')}: {ROLES.map((r) => `${t(ROLE_LABEL[r])} $${RATE_CARD[r]}/h`).join(' · ')}
            </p>

            <label className="mt-5 flex flex-col gap-1.5">
              <span className="text-xs font-medium text-fg-muted">{t('Condiciones y notas para el cliente')}</span>
              <textarea
                id="q-notes"
                rows={3}
                value={draft.notes}
                onChange={(e) => setDraft((q) => ({ ...q, notes: e.target.value }))}
                placeholder={t('Ej. Incluye 2 rondas de revisión de diseño y 30 días de soporte post-lanzamiento.')}
                className="w-full resize-none rounded-lg border border-line bg-surface-2 px-3 py-2 text-[13px] text-fg outline-none placeholder:text-fg-subtle focus:border-ink/25"
              />
            </label>
          </div>

          {/* Resumen */}
          <aside className="flex flex-col gap-5 p-5">
            <dl className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                <dt className="text-[11px] text-fg-subtle">{t('Horas totales')}</dt>
                <dd className="tabular mt-0.5 text-lg font-semibold text-fg">{totals.hours.toLocaleString()}</dd>
              </div>
              <div className="rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                <dt className="text-[11px] text-fg-subtle">{t('Duración estimada')}</dt>
                <dd className="tabular mt-0.5 text-lg font-semibold text-fg">{t('{n} sem', { n: totals.weeks })}</dd>
              </div>
            </dl>

            <div className="space-y-2 text-[13px]">
              <Row label={t('Subtotal')} value={formatCurrency(totals.subtotal)} />
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="q-discount" className="text-fg-muted">
                  {t('Descuento')}
                </label>
                <span className="flex items-center gap-2">
                  <span className="tabular text-xs text-fg-subtle">{totals.discount ? `−${formatCurrency(totals.discount)}` : ''}</span>
                  <span className="relative w-16">
                    <input
                      id="q-discount"
                      type="number"
                      min={0}
                      max={50}
                      value={draft.discountPct}
                      onChange={(e) => setDraft((q) => ({ ...q, discountPct: Math.min(50, Math.max(0, Number(e.target.value))) }))}
                      className={cn(numberCls, 'pr-5')}
                    />
                    <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-xs text-fg-subtle">%</span>
                  </span>
                </span>
              </div>
              <Row label={t('Valor del contrato (neto)')} value={formatCurrency(totals.net)} strong />
              <div className="-mx-2">
                <Switch
                  label={t('Incluir IGV ({p}%)', { p: TAX_RATE * 100 })}
                  checked={draft.includeTax}
                  onChange={(v) => setDraft((q) => ({ ...q, includeTax: v }))}
                />
              </div>
              {draft.includeTax && <Row label={t('IGV')} value={formatCurrency(totals.tax)} />}
              <div className="flex items-baseline justify-between border-t border-line pt-3">
                <span className="font-medium text-fg">{t('Total a pagar')}</span>
                <span className="tabular text-xl font-semibold tracking-tight text-fg">{formatCurrency(totals.total)}</span>
              </div>
            </div>

            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{t('Plan de pagos')}</p>
              <ul className="space-y-1.5 text-[13px]">
                {totals.payments.map((p) => (
                  <li key={p.label} className="flex justify-between gap-3">
                    <span className="text-fg-muted">
                      <span className="tabular text-fg-subtle">{p.pct}%</span> {t(p.label)}
                    </span>
                    <span className="tabular text-fg">{formatCurrency(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>

            {totals.byRole.length > 0 && (
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{t('Horas por rol')}</p>
                <ul className="space-y-2">
                  {totals.byRole.map((r) => (
                    <li key={r.role} title={`${t(ROLE_LABEL[r.role])}: ${r.hours} h · ${formatCurrency(r.amount)}`}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-fg-muted">{t(ROLE_LABEL[r.role])}</span>
                        <span className="tabular text-fg-subtle">{r.hours} h</span>
                      </div>
                      <div className="h-1 overflow-hidden rounded-full bg-ink/[0.06]">
                        <div className="h-full rounded-full bg-fg/50" style={{ width: `${(r.hours / maxRoleHours) * 100}%` }} />
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <label className="flex items-center justify-between gap-3 text-[13px] text-fg-muted">
              {t('Validez de la propuesta')}
              <select
                id="q-valid"
                value={draft.validDays}
                onChange={(e) => setDraft((q) => ({ ...q, validDays: Number(e.target.value) }))}
                className="h-8 rounded-md border border-line bg-surface-2 px-2 text-[13px] text-fg outline-none"
              >
                {[15, 30, 45].map((d) => (
                  <option key={d} value={d} className="bg-surface-2">
                    {t('{n} días', { n: d })}
                  </option>
                ))}
              </select>
            </label>
          </aside>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3.5">
          <p className="text-[11.5px] text-fg-subtle">
            {deal.value === totals.net
              ? t('El valor del deal se mantiene en {a}.', { a: formatCurrency(deal.value) })
              : t('Al guardar, el valor del deal pasa de {a} a {b}.', { a: formatCurrency(deal.value), b: formatCurrency(totals.net) })}
          </p>
          <div className="flex gap-2">
            <Button variant="ghost" onClick={onClose}>
              {t('Cancelar')}
            </Button>
            <Button variant="outline" disabled={!totals.hours} onClick={() => onPreview(finalQuote())}>
              {t('Ver propuesta')}
            </Button>
            <Button variant="primary" disabled={!totals.hours} onClick={() => onSave(finalQuote(), totals.net)}>
              {t('Guardar cotización v{n}', { n: nextVersion })}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={strong ? 'font-medium text-fg' : 'text-fg-muted'}>{label}</span>
      <span className={cn('tabular', strong ? 'font-semibold text-fg' : 'text-fg')}>{value}</span>
    </div>
  );
}
