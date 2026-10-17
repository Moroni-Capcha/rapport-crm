import { useMemo, useState } from 'react';
import { BarChart } from '../components/charts/BarChart';
import { HBarList } from '../components/charts/HBarList';
import { Kpi, Page, PageHeader, Panel, Segmented, Td, Th } from '../components/ui/page';
import { LOSS_REASONS, SOURCES, STAGE_SHARE } from '../data/history';
import { useStore } from '../store/AppStore';
import { SEGMENTS, SERVICE_DOT, STAGES } from '../data/stages';
import { cn, formatCurrency, formatPercent, lastMonths, monthKey, monthLabel } from '../lib/format';
import type { ClosedDeal } from '../types';
import type { ViewProps } from './types';
import { useT } from '../lib/i18n';

type Period = '90' | '180' | '365';
const DAY = 86_400_000;

interface Agg {
  total: number;
  won: number;
  revenue: number;
  rate: number;
  ticket: number;
  cycle: number;
}

const aggregate = (rows: ClosedDeal[]): Agg => {
  const won = rows.filter((r) => r.outcome === 'won');
  const revenue = won.reduce((s, r) => s + r.value, 0);
  return {
    total: rows.length,
    won: won.length,
    revenue,
    rate: rows.length ? won.length / rows.length : 0,
    ticket: won.length ? revenue / won.length : 0,
    cycle: won.length ? Math.round(won.reduce((s, r) => s + r.cycleDays, 0) / won.length) : 0,
  };
};

export function GrowthView(_: ViewProps) {
  const { history } = useStore();
  const t = useT();
  const [period, setPeriod] = useState<Period>('365');

  const data = useMemo(() => {
    const days = Number(period);
    const inRange = (offset: number) =>
      history.filter((h) => {
        const age = Date.now() - new Date(h.closedAt).getTime();
        return age >= offset * days * DAY && age < (offset + 1) * days * DAY;
      });
    const rows = inRange(0);
    const prev = inRange(1);

    const groupBy = <K extends string>(key: (r: ClosedDeal) => K) => {
      const map = new Map<K, ClosedDeal[]>();
      for (const r of rows) map.set(key(r), [...(map.get(key(r)) ?? []), r]);
      return map;
    };

    const sources = SOURCES.map((s) => ({ name: s, ...aggregate(rows.filter((r) => r.source === s)) })).sort((a, b) => b.revenue - a.revenue);

    const services = [...groupBy((r) => r.service.label).entries()]
      .map(([label, list]) => ({ label, kind: list[0]!.service.kind, ...aggregate(list) }))
      .sort((a, b) => b.revenue - a.revenue);

    const segments = SEGMENTS.map((s) => ({ ...s, ...aggregate(rows.filter((r) => r.segment === s.id)) })).filter((s) => s.total > 0);

    const lost = rows.filter((r) => r.outcome === 'lost');
    const reasons = LOSS_REASONS.map((reason) => {
      const list = lost.filter((r) => r.lossReason === reason);
      return { reason, count: list.length, value: list.reduce((s, r) => s + r.value, 0) };
    }).sort((a, b) => b.count - a.count);

    const months = lastMonths(Math.min(12, Math.round(days / 30)));
    const trend = months.map((m, i) => {
      const list = history.filter((h) => monthKey(h.closedAt) === m);
      return { key: m, label: monthLabel(m), value: Math.round(aggregate(list).rate * 100), highlight: i === months.length - 1 };
    });

    return { all: aggregate(rows), prev: aggregate(prev), sources, services, segments, reasons, lost: lost.length, trend };
  }, [period, history]);

  const { all, prev } = data;
  const delta = (a: number, b: number) => (b ? a / b - 1 : undefined);
  const hasPrev = prev.total > 0;
  const stageDays = (id: string) => Math.round(all.cycle * STAGE_SHARE[id as keyof typeof STAGE_SHARE]);

  return (
    <Page>
      <PageHeader
        eyebrow={`Growth · ${t('Análisis comercial')}`}
        title={t('Crecimiento')}
        actions={
          <Segmented<Period>
            label={t('Periodo')}
            value={period}
            onChange={setPeriod}
            options={[
              { id: '90', label: t('90 días') },
              { id: '180', label: t('6 meses') },
              { id: '365', label: t('12 meses') },
            ]}
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t('Ingresos ganados')} value={formatCurrency(all.revenue, true)} delta={delta(all.revenue, prev.revenue)} note={hasPrev ? t('vs periodo anterior') : t('últimos 12 meses')} />
        <Kpi label={t('Tasa de cierre')} value={formatPercent(all.rate)} delta={prev.rate ? all.rate - prev.rate : undefined} note={t('{a} de {b} deals', { a: all.won, b: all.total })} />
        <Kpi label={t('Ticket promedio')} value={formatCurrency(all.ticket, true)} delta={delta(all.ticket, prev.ticket)} note={t('por deal ganado')} />
        <Kpi label={t('Ciclo de venta')} value={t('{n} días', { n: all.cycle })} note={hasPrev && prev.cycle ? t('{n} días el periodo anterior', { n: prev.cycle }) : t('lead → firma, deals ganados')} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title={t('Rendimiento por fuente')} subtitle={t('De dónde vienen los deals que cerramos')} bodyClass="px-0 pb-2 pt-1">
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse">
              <thead>
                <tr>
                  <Th>{t('Fuente')}</Th>
                  <Th className="text-right">Deals</Th>
                  <Th>{t('Tasa de cierre')}</Th>
                  <Th className="text-right">Ticket</Th>
                  <Th className="text-right">{t('Ingresos')}</Th>
                </tr>
              </thead>
              <tbody>
                {data.sources.map((s) => (
                  <tr key={s.name} className="hover:bg-ink/[0.02]">
                    <Td className="font-medium text-fg">{t(s.name)}</Td>
                    <Td className="tabular text-right text-fg-muted">
                      {s.won}/{s.total}
                    </Td>
                    <Td>
                      <span className="flex items-center gap-2.5">
                        <span className="h-1.5 w-24 overflow-hidden rounded-full bg-ink/[0.06]">
                          <span className="block h-full rounded-full bg-fg/60" style={{ width: `${s.rate * 100}%` }} />
                        </span>
                        <span className={cn('tabular text-xs', s.rate >= all.rate ? 'text-fg' : 'text-fg-subtle')}>{formatPercent(s.rate)}</span>
                      </span>
                    </Td>
                    <Td className="tabular text-right text-fg-muted">{s.ticket ? formatCurrency(s.ticket, true) : '—'}</Td>
                    <Td className="tabular text-right font-medium text-fg">{formatCurrency(s.revenue, true)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title={t('Motivos de pérdida')} subtitle={t('{n} deals perdidos en el periodo', { n: data.lost })}>
          <HBarList
            items={data.reasons.map((r) => ({
              label: t(r.reason),
              value: r.count,
              display: `${r.count}`,
              sub: formatCurrency(r.value, true),
            }))}
            barClass="bg-fg/35"
          />
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title={t('Ingresos por servicio')} subtitle={t('Qué vendemos mejor')}>
          <HBarList
            items={data.services.map((s) => ({
              label: t(s.label),
              value: s.revenue,
              display: formatCurrency(s.revenue, true),
              sub: t('{p} cierre', { p: formatPercent(s.rate) }),
              dot: SERVICE_DOT[s.kind],
            }))}
          />
        </Panel>

        <Panel className="lg:col-span-2" title={t('Tasa de cierre mensual')} subtitle={t('Deals ganados sobre deals cerrados en cada mes')}>
          <BarChart data={data.trend} height={230} format={(v) => `${v}%`} valueLabel={t('Tasa de cierre')} />
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel className="lg:col-span-2" title={t('Comparativa por segmento')} bodyClass="px-0 pb-2 pt-1">
          <div className="scroll-thin overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse">
              <thead>
                <tr>
                  <Th>{t('Segmento')}</Th>
                  <Th className="text-right">{t('Ganados')}</Th>
                  <Th className="text-right">{t('Tasa')}</Th>
                  <Th className="text-right">Ticket</Th>
                  <Th className="text-right">{t('Ciclo')}</Th>
                  <Th className="text-right">{t('Ingresos')}</Th>
                </tr>
              </thead>
              <tbody>
                {data.segments.map((s) => (
                  <tr key={s.id} className="hover:bg-ink/[0.02]">
                    <Td className="font-medium text-fg">{t(s.label)}</Td>
                    <Td className="tabular text-right text-fg-muted">{s.won}</Td>
                    <Td className="tabular text-right text-fg-muted">{formatPercent(s.rate)}</Td>
                    <Td className="tabular text-right text-fg-muted">{formatCurrency(s.ticket, true)}</Td>
                    <Td className="tabular text-right text-fg-muted">{s.cycle} d</Td>
                    <Td className="tabular text-right font-medium text-fg">{formatCurrency(s.revenue, true)}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>

        <Panel title={t('Tiempo promedio por etapa')} subtitle={t('{n} días de lead a firma, en promedio', { n: all.cycle })}>
          <div className="flex h-3 gap-0.5 overflow-hidden rounded-full">
            {STAGES.slice(0, 4).map((s) => (
              <span key={s.id} className={cn('h-full opacity-80', s.accent)} style={{ width: `${STAGE_SHARE[s.id as keyof typeof STAGE_SHARE] * 100}%` }} />
            ))}
          </div>
          <ul className="mt-4 space-y-2.5">
            {STAGES.slice(0, 4).map((s) => (
              <li key={s.id} className="flex items-center justify-between text-[13px]">
                <span className="flex items-center gap-2 text-fg-muted">
                  <span className={cn('size-2 rounded-full', s.accent)} />
                  {t(s.name)}
                </span>
                <span className="tabular font-medium text-fg">{t('{n} días', { n: stageDays(s.id) })}</span>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[11.5px] leading-relaxed text-fg-subtle">{t('Propuesta Enviada es la etapa más larga del ciclo.')}</p>
        </Panel>
      </div>
    </Page>
  );
}
