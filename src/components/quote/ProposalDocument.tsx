import { Handshake, Printer, X } from 'lucide-react';
import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { formatCurrency, formatDate } from '../../lib/format';
import { useT } from '../../lib/i18n';
import { proposalNumber, quoteTotals, ROLE_LABEL, TAX_RATE } from '../../lib/quote';
import type { Deal, Quote } from '../../types';
import { Button } from '../ui/primitives';

/**
 * Propuesta comercial lista para imprimir o guardar como PDF.
 * Siempre en "papel" (fondo blanco) sin importar el tema, como un documento real.
 * Se monta en un portal fuera de #root para que la hoja de impresión solo incluya el documento.
 */
export function ProposalDocument({ deal, quote, onClose }: { deal: Deal; quote: Quote; onClose: () => void }) {
  const t = useT();
  const totals = quoteTotals(quote);
  const issued = quote.updatedAt;
  const validUntil = new Date(new Date(issued).getTime() + quote.validDays * 86_400_000).toISOString();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div className="print-root fixed inset-0 z-[80] overflow-y-auto bg-scrim/70 p-3 backdrop-blur-sm sm:p-8">
      <div className="no-print mx-auto mb-4 flex max-w-[820px] items-center justify-between gap-3">
        <p className="text-[13px] text-white/80">{t('Vista previa de la propuesta')}</p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="size-3.5" /> {t('Imprimir / Guardar PDF')}
          </Button>
          <Button variant="primary" onClick={onClose}>
            <X className="size-3.5" /> {t('Cerrar')}
          </Button>
        </div>
      </div>

      <article
        role="dialog"
        aria-modal="true"
        aria-label={t('Propuesta comercial')}
        className="print-doc animate-pop mx-auto max-w-[820px] rounded-lg bg-white px-8 py-10 text-[13px] leading-relaxed text-[#1b1c21] shadow-2xl sm:px-14 sm:py-14"
      >
        {/* Encabezado */}
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-black/10 pb-8">
          <div className="flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-[#1b1c21] text-white">
              <Handshake className="size-[18px]" strokeWidth={1.75} />
            </span>
            <span className="text-lg font-semibold tracking-tight">Rapport</span>
          </div>
          <dl className="grid grid-cols-[auto_auto] gap-x-4 gap-y-0.5 text-right text-xs text-black/55">
            <dt>{t('Propuesta')}</dt>
            <dd className="tabular font-medium text-black/85">{proposalNumber(deal.id, quote.version)}</dd>
            <dt>{t('Fecha')}</dt>
            <dd className="text-black/85">{formatDate(issued)}</dd>
            <dt>{t('Válida hasta')}</dt>
            <dd className="text-black/85">{formatDate(validUntil)}</dd>
          </dl>
        </header>

        <section className="grid gap-6 py-8 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-black/45">{t('Preparada para')}</p>
            <p className="mt-1.5 text-base font-semibold">{deal.company}</p>
            <p className="text-black/65">
              {deal.contact.name} · {t(deal.contact.role)}
            </p>
            {deal.contact.email && <p className="text-black/65">{deal.contact.email}</p>}
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wider text-black/45">{t('Proyecto')}</p>
            <p className="mt-1.5 text-base font-semibold">{t(deal.project)}</p>
            <p className="text-black/65">
              {t('{h} horas · {w} semanas estimadas', { h: totals.hours.toLocaleString(), w: totals.weeks })}
            </p>
          </div>
        </section>

        {/* Alcance */}
        <section>
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-black/45">{t('Alcance y estimación')}</h2>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-black/15 text-left text-[11px] uppercase tracking-wider text-black/45">
                <th className="py-2 pr-3 font-medium">{t('Partida')}</th>
                <th className="py-2 pr-3 text-right font-medium">{t('Horas')}</th>
                <th className="py-2 pr-3 text-right font-medium">{t('Tarifa')}</th>
                <th className="py-2 text-right font-medium">{t('Subtotal')}</th>
              </tr>
            </thead>
            <tbody>
              {quote.items.map((i) => (
                <tr key={i.id} className="border-b border-black/[0.07] align-top">
                  <td className="py-2.5 pr-3">
                    <span className="block font-medium">{t(i.description) || t(ROLE_LABEL[i.role])}</span>
                    <span className="text-xs text-black/50">{t(ROLE_LABEL[i.role])}</span>
                  </td>
                  <td className="tabular py-2.5 pr-3 text-right">{i.hours}</td>
                  <td className="tabular py-2.5 pr-3 text-right text-black/65">${i.rate}/h</td>
                  <td className="tabular py-2.5 text-right">{formatCurrency(i.hours * i.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <dl className="ml-auto mt-5 w-full max-w-[300px] space-y-1.5">
            <Line label={t('Subtotal')} value={formatCurrency(totals.subtotal)} />
            {totals.discount > 0 && <Line label={t('Descuento ({p}%)', { p: quote.discountPct })} value={`−${formatCurrency(totals.discount)}`} />}
            <Line label={t('Valor del contrato (neto)')} value={formatCurrency(totals.net)} />
            {quote.includeTax && <Line label={t('IGV ({p}%)', { p: TAX_RATE * 100 })} value={formatCurrency(totals.tax)} />}
            <div className="flex justify-between border-t border-black/15 pt-2 text-base font-semibold">
              <dt>{t('Total')}</dt>
              <dd className="tabular">{formatCurrency(totals.total)}</dd>
            </div>
            {!quote.includeTax && <p className="text-right text-[11px] text-black/45">{t('Montos en USD, sin impuestos.')}</p>}
          </dl>
        </section>

        {/* Pagos */}
        <section className="mt-10">
          <h2 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-black/45">{t('Plan de pagos')}</h2>
          <ol className="grid gap-3 sm:grid-cols-3">
            {totals.payments.map((p, i) => (
              <li key={p.label} className="rounded-lg border border-black/10 px-4 py-3">
                <p className="text-xs text-black/50">
                  {i + 1}. {t(p.label)} · {p.pct}%
                </p>
                <p className="tabular mt-1 text-base font-semibold">{formatCurrency(p.amount)}</p>
              </li>
            ))}
          </ol>
        </section>

        {quote.notes.trim() && (
          <section className="mt-10">
            <h2 className="mb-2 text-[11px] font-medium uppercase tracking-wider text-black/45">{t('Condiciones')}</h2>
            <p className="whitespace-pre-line text-black/75">{quote.notes}</p>
          </section>
        )}

        {/* Firmas */}
        <section className="mt-16 grid gap-10 sm:grid-cols-2">
          {[
            [deal.owner, 'Rapport'],
            [deal.contact.name, deal.company],
          ].map(([name, org]) => (
            <div key={name}>
              <div className="h-10 border-b border-black/30" />
              <p className="mt-2 text-xs font-medium">{name}</p>
              <p className="text-xs text-black/50">{org}</p>
            </div>
          ))}
        </section>
      </article>
    </div>,
    document.body,
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-black/70">
      <dt>{label}</dt>
      <dd className="tabular text-black/85">{value}</dd>
    </div>
  );
}
