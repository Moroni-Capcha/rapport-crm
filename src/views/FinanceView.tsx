import { Check, Send } from 'lucide-react';
import { useMemo, useState } from 'react';
import { BarChart, ChartLegend } from '../components/charts/BarChart';
import { Avatar, Button } from '../components/ui/primitives';
import { Kpi, Page, PageHeader, Panel, Segmented, StatusPill, Td, Th } from '../components/ui/page';
import { PAYMENT_PLAN } from '../data/projects';
import { daysUntil, formatCurrency, formatShortDate, lastMonths, monthKey, monthLabel } from '../lib/format';
import { useStore } from '../store/AppStore';
import { INVOICE_META, invoicesOf } from '../store/selectors';
import type { InvoiceStatus } from '../types';
import type { ViewProps } from './types';
import { useT } from '../lib/i18n';

type Filter = 'all' | InvoiceStatus;
const ORDER: InvoiceStatus[] = ['overdue', 'sent', 'draft', 'pending', 'paid'];

export function FinanceView({ navigate, notify }: ViewProps) {
  const { projects, deals, setMilestoneStatus } = useStore();
  const t = useT();
  const [filter, setFilter] = useState<Filter>('all');

  const invoices = useMemo(() => invoicesOf(projects), [projects]);

  const totals = useMemo(() => {
    const sum = (s: InvoiceStatus[]) => invoices.filter((i) => s.includes(i.displayStatus)).reduce((a, i) => a + i.amount, 0);
    const count = (s: InvoiceStatus) => invoices.filter((i) => i.displayStatus === s).length;
    return {
      paid: sum(['paid']),
      receivable: sum(['sent']),
      overdue: sum(['overdue']),
      scheduled: sum(['pending', 'draft']),
      counts: Object.fromEntries(ORDER.map((s) => [s, count(s)])) as Record<InvoiceStatus, number>,
    };
  }, [invoices]);

  // Flujo de caja: hitos por cobrar según su fecha (vencidos cuentan este mes)
  // + estimado del pipeline ponderado, repartido 30/40/30 a 1, 3 y 5 meses.
  const cashflow = useMemo(() => {
    const months = lastMonths(6, 5); // mes actual + 5 siguientes
    const current = months[0]!;
    const due = Object.fromEntries(months.map((m) => [m, 0])) as Record<string, number>;
    for (const i of invoices) {
      if (i.status === 'paid') continue;
      const key = daysUntil(i.dueAt) < 0 ? current : monthKey(i.dueAt);
      if (key in due) due[key]! += i.amount;
    }
    const forecast = Object.fromEntries(months.map((m) => [m, 0])) as Record<string, number>;
    // Mes estimado de firma según la etapa; luego anticipo → +2 meses beta → +4 meses cierre
    const closeIn: Record<string, number> = { leads: 3, discovery: 2, proposal: 1, negotiation: 0 };
    for (const d of deals.filter((x) => x.stage !== 'kickoff')) {
      const weighted = (d.value * d.probability) / 100;
      [0, 2, 4].forEach((after, idx) => {
        const key = months[closeIn[d.stage]! + after];
        if (key) forecast[key]! += (weighted * PAYMENT_PLAN[idx]!.pct) / 100;
      });
    }
    return months.map((m, i) => ({
      key: m,
      label: monthLabel(m),
      value: due[m]!,
      line: Math.round(forecast[m]!),
      highlight: i === 0,
      projected: i > 0,
    }));
  }, [invoices, deals, t]);

  const byProject = useMemo(
    () =>
      projects.map((p) => {
        const paid = p.milestones.filter((m) => m.status === 'paid').reduce((s, m) => s + m.amount, 0);
        const billed = p.milestones.filter((m) => m.status === 'sent').reduce((s, m) => s + m.amount, 0);
        return { p, paid, billed, paidPct: paid / p.value, billedPct: billed / p.value };
      }),
    [projects],
  );

  const rows = useMemo(
    () =>
      invoices
        .filter((i) => filter === 'all' || i.displayStatus === filter)
        .sort((a, b) => ORDER.indexOf(a.displayStatus) - ORDER.indexOf(b.displayStatus) || a.dueAt.localeCompare(b.dueAt)),
    [invoices, filter],
  );

  return (
    <Page>
      <PageHeader eyebrow={`Finance · ${t('Facturación y cobranza')}`} title={t('Finanzas')} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t('Cobrado')} value={formatCurrency(totals.paid, true)} note={t('{n} facturas pagadas', { n: totals.counts.paid })} tone="good" />
        <Kpi label={t('Por cobrar')} value={formatCurrency(totals.receivable, true)} note={t('{n} enviadas, en plazo', { n: totals.counts.sent })} />
        <Kpi
          label={t('Vencido')}
          value={formatCurrency(totals.overdue, true)}
          note={totals.counts.overdue ? t('{n} facturas · cobrar ya', { n: totals.counts.overdue }) : t('sin deuda vencida')}
          tone={totals.counts.overdue ? 'bad' : 'good'}
        />
        <Kpi label={t('Programado')} value={formatCurrency(totals.scheduled, true)} note={t('hitos aún sin facturar')} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title={t('Flujo de caja proyectado')}
          subtitle={t('Próximos 6 meses · hitos por cobrar y estimado del pipeline')}
          action={
            <ChartLegend
              items={[
                { label: t('Hitos por cobrar'), swatch: 'bg-fg/60' },
                { label: t('Pipeline ponderado (estimado)'), swatch: 'bg-stage-discovery', dashed: true },
              ]}
            />
          }
        >
          <BarChart
            data={cashflow}
            height={250}
            format={(v) => formatCurrency(v)}
            formatAxis={(v) => formatCurrency(v, true)}
            valueLabel={t('Hitos por cobrar')}
            lineLabel={t('Pipeline ponderado')}
          />
          <p className="mt-2 text-[11.5px] text-fg-subtle">
            {t('Meses futuros con trama = proyección. El estimado reparte cada deal abierto ({plan}) desde su mes probable de firma, ponderado por probabilidad.', { plan: PAYMENT_PLAN.map((p) => `${p.pct}%`).join(' / ') })}
          </p>
        </Panel>

        <Panel
          title={t('Cobranza por proyecto')}
          subtitle={t('Pagado y facturado sobre el valor del contrato')}
          action={<ChartLegend items={[{ label: t('Pagado'), swatch: 'bg-fg/70' }, { label: t('Facturado'), swatch: 'bg-fg/25' }]} />}
        >
          <ul className="space-y-3">
            {byProject.map(({ p, paid, billed, paidPct, billedPct }) => (
              <li key={p.id}>
                <button onClick={() => navigate('Projects', { projectId: p.id })} className="w-full text-left" title={t('{a} pagado · {b} facturado de {c}', { a: formatCurrency(paid), b: formatCurrency(billed), c: formatCurrency(p.value) })}>
                  <span className="mb-1.5 flex items-baseline justify-between gap-2 text-[12.5px]">
                    <span className="truncate text-fg-muted hover:text-fg">{p.company}</span>
                    <span className="tabular shrink-0 text-[11.5px] text-fg-subtle">
                      <span className="font-medium text-fg">{Math.round(paidPct * 100)}%</span> {t('de')} {formatCurrency(p.value, true)}
                    </span>
                  </span>
                  <span className="flex h-1.5 gap-0.5 overflow-hidden rounded-full bg-ink/[0.05]">
                    <span className="h-full rounded-full bg-fg/70" style={{ width: `${paidPct * 100}%` }} />
                    {billedPct > 0 && <span className="h-full rounded-full bg-fg/25" style={{ width: `${billedPct * 100}%` }} />}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <section className="rounded-2xl border border-line bg-surface/70">
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 pb-3 pt-4">
          <div>
            <h2 className="text-[13.5px] font-semibold text-fg">{t('Facturas e hitos')}</h2>
            <p className="mt-0.5 text-xs text-fg-subtle">{t('Esquema por proyecto:')} {PAYMENT_PLAN.map((p) => `${p.pct}% ${t(p.label).toLowerCase()}`).join(' · ')}</p>
          </div>
          <Segmented<Filter>
            label={t('Filtrar facturas')}
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'all', label: t('Todas'), count: invoices.length },
              { id: 'overdue', label: t('Vencidas'), count: totals.counts.overdue },
              { id: 'sent', label: t('Enviadas'), count: totals.counts.sent },
              { id: 'draft', label: t('Borradores'), count: totals.counts.draft },
              { id: 'paid', label: t('Pagadas'), count: totals.counts.paid },
            ]}
          />
        </header>
        <div className="scroll-thin overflow-x-auto">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr>
                <Th>Nº</Th>
                <Th>{t('Cliente · proyecto')}</Th>
                <Th>{t('Hito')}</Th>
                <Th className="text-right">{t('Monto')}</Th>
                <Th className="text-right">{t('Vence')}</Th>
                <Th>{t('Estado')}</Th>
                <Th className="text-right">{t('Acción')}</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((i) => {
                const meta = INVOICE_META[i.displayStatus];
                const days = daysUntil(i.dueAt);
                return (
                  <tr key={i.id} className="transition-colors hover:bg-ink/[0.02]">
                    <Td className="tabular whitespace-nowrap text-xs text-fg-subtle">{i.invoiceNumber ?? '—'}</Td>
                    <Td>
                      <span className="flex items-center gap-2.5">
                        <Avatar name={i.project.company} size="sm" square />
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-fg">{i.project.company}</span>
                          <span className="block truncate text-xs text-fg-subtle">{t(i.project.name)}</span>
                        </span>
                      </span>
                    </Td>
                    <Td className="whitespace-nowrap text-fg-muted">
                      {t(i.label)} <span className="text-fg-subtle">· {i.pct}%</span>
                    </Td>
                    <Td className="tabular text-right font-medium text-fg">{formatCurrency(i.amount)}</Td>
                    <Td className="tabular whitespace-nowrap text-right text-xs">
                      <span className="text-fg-muted">{formatShortDate(i.dueAt)}</span>
                      {i.status !== 'paid' && (
                        <span className={days < 0 ? 'ml-1.5 text-danger' : 'ml-1.5 text-fg-subtle'}>{days < 0 ? `+${-days}d` : `${days}d`}</span>
                      )}
                    </Td>
                    <Td>
                      <StatusPill label={t(meta.label)} cls={meta.cls} />
                    </Td>
                    <Td className="text-right">
                      {i.status === 'pending' || i.status === 'draft' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setMilestoneStatus(i.project.id, i.id, 'sent');
                            notify(`${t('Factura enviada')} · ${i.project.company}`);
                          }}
                        >
                          <Send className="size-3" /> {t('Emitir')}
                        </Button>
                      ) : i.status === 'sent' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setMilestoneStatus(i.project.id, i.id, 'paid');
                            notify(`${t('Pago registrado')} · ${formatCurrency(i.amount)}`);
                          }}
                        >
                          <Check className="size-3" /> {t('Registrar pago')}
                        </Button>
                      ) : (
                        <span className="text-xs text-fg-subtle">{i.paidAt ? t('Pagada {date}', { date: formatShortDate(i.paidAt) }) : ''}</span>
                      )}
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </Page>
  );
}
