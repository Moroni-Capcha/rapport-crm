import { AlertTriangle, ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import { BarChart, ChartLegend } from '../components/charts/BarChart';
import { HBarList } from '../components/charts/HBarList';
import { TOUCH_ICON } from '../components/pipeline/DealCard';
import { Avatar, Button } from '../components/ui/primitives';
import { Kpi, Page, PageHeader, Panel } from '../components/ui/page';
import { EVENT_META } from '../data/events';
import { monthlyTarget } from '../data/history';
import { STAGES } from '../data/stages';
import {
  cn,
  daysUntil,
  formatCurrency,
  formatPercent,
  formatRelative,
  formatTime,
  lastMonths,
  monthKey,
  monthLabel,
} from '../lib/format';
import { useStore } from '../store/AppStore';
import { ALERT_ICON } from '../components/layout/alertIcons';
import { useAlerts } from '../store/useAlerts';
import type { ClosedDeal } from '../types';
import type { ViewProps } from './types';
import { currentLocale, useT } from '../lib/i18n';

const DAY = 86_400_000;
const within = (iso: string, fromDays: number, toDays = 0) => {
  const t = Date.now() - new Date(iso).getTime();
  return t >= toDays * DAY && t < fromDays * DAY;
};
const winRate = (rows: ClosedDeal[]) => {
  const won = rows.filter((r) => r.outcome === 'won').length;
  return rows.length ? won / rows.length : 0;
};

export function OverviewView({ navigate }: ViewProps) {
  const { deals, events, history } = useStore();
  const t = useT();

  const data = useMemo(() => {
    const months = lastMonths(12);
    const current = months[months.length - 1]!;
    const prev = months[months.length - 2]!;
    const kickoff = deals.filter((d) => d.stage === 'kickoff');
    const open = deals.filter((d) => d.stage !== 'kickoff');

    // Ingresos ganados por mes (historial + deals en Kickoff, que cuentan como ganados este mes)
    const wonByMonth = Object.fromEntries(months.map((m) => [m, 0])) as Record<string, number>;
    for (const h of history) if (h.outcome === 'won' && monthKey(h.closedAt) in wonByMonth) wonByMonth[monthKey(h.closedAt)]! += h.value;
    wonByMonth[current]! += kickoff.reduce((s, d) => s + d.value, 0);

    const revenue = months.map((m, i) => ({
      key: m,
      label: monthLabel(m),
      value: wonByMonth[m]!,
      target: monthlyTarget(i),
      highlight: m === current,
    }));

    const won12 = history.filter((h) => h.outcome === 'won');
    const last90 = history.filter((h) => within(h.closedAt, 90));
    const prev90 = history.filter((h) => within(h.closedAt, 180, 90));

    // Embudo: cuántos deals alcanzaron cada etapa (cerrados en 12m + abiertos hoy)
    const stageIndex = Object.fromEntries(STAGES.map((s, i) => [s.id, i]));
    const reached = STAGES.map((_, i) =>
      history.filter((h) => h.reached >= i).length + deals.filter((d) => stageIndex[d.stage]! >= i).length,
    );

    // Ranking por responsable (ganado en 90 días + Kickoff actual)
    const byOwner: Record<string, { value: number; count: number }> = {};
    for (const h of last90.filter((r) => r.outcome === 'won')) {
      byOwner[h.owner] ??= { value: 0, count: 0 };
      byOwner[h.owner]!.value += h.value;
      byOwner[h.owner]!.count++;
    }
    for (const d of kickoff) {
      byOwner[d.owner] ??= { value: 0, count: 0 };
      byOwner[d.owner]!.value += d.value;
      byOwner[d.owner]!.count++;
    }

    return {
      revenue,
      current: wonByMonth[current]!,
      prevMonth: wonByMonth[prev]!,
      target: revenue[revenue.length - 1]!.target,
      openValue: open.reduce((s, d) => s + d.value, 0),
      openCount: open.length,
      winRate: winRate(last90),
      winRatePrev: winRate(prev90),
      avgTicket: won12.reduce((s, h) => s + h.value, 0) / Math.max(1, won12.length),
      avgCycle: Math.round(won12.reduce((s, h) => s + h.cycleDays, 0) / Math.max(1, won12.length)),
      reached,
      owners: Object.entries(byOwner).sort((a, b) => b[1].value - a[1].value),
    };
  }, [deals, history, t]);

  // Lo que necesita acción hoy (mismo origen que las notificaciones)
  const alerts = useAlerts();
  const attention = alerts.map((a) => ({ ...a, icon: ALERT_ICON[a.kind], onOpen: () => navigate(a.tab, a.focus) }));

  const upcoming = useMemo(
    () => events.filter((e) => new Date(e.start).getTime() + e.minutes * 60_000 > Date.now()).sort((a, b) => a.start.localeCompare(b.start)).slice(0, 5),
    [events],
  );

  const activity = useMemo(
    () =>
      deals
        .flatMap((d) => d.activities.map((a) => ({ ...a, company: d.company, dealId: d.id })))
        .sort((a, b) => b.at.localeCompare(a.at))
        .slice(0, 7),
    [deals],
  );

  const monthName = new Date().toLocaleDateString(currentLocale(), { month: 'long', year: 'numeric' });
  const vsTarget = data.current / data.target;

  return (
    <Page>
      <PageHeader
        eyebrow={`Overview · ${monthName}`}
        title={t('Resumen de la agencia')}
        actions={
          <Button variant="outline" onClick={() => navigate('Pipeline')}>
            {t('Ir al pipeline')} <ArrowRight className="size-3.5" />
          </Button>
        }
      />

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi
          label={t('Ganado este mes')}
          value={formatCurrency(data.current, true)}
          delta={data.prevMonth ? data.current / data.prevMonth - 1 : undefined}
          note={t('{p} de la meta', { p: formatPercent(vsTarget) })}
          tone={vsTarget >= 1 ? 'good' : 'neutral'}
        />
        <Kpi label={t('Pipeline abierto')} value={formatCurrency(data.openValue, true)} note={t('{n} deals activos', { n: data.openCount })} />
        <Kpi label={t('Tasa de cierre · 90d')} value={formatPercent(data.winRate)} delta={data.winRate - data.winRatePrev} note={t('vs 90d previos')} />
        <Kpi label={t('Ticket promedio')} value={formatCurrency(data.avgTicket, true)} note={t('deals ganados · 12m')} />
        <Kpi label={t('Ciclo de venta')} value={t('{n} días', { n: data.avgCycle })} note={t('lead → firma, promedio')} />
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title={t('Ingresos ganados por mes')}
          subtitle={t('Valor de contratos firmados · últimos 12 meses')}
          action={
            <ChartLegend
              items={[
                { label: t('Ganado'), swatch: 'bg-fg/60' },
                { label: t('Meta mensual'), swatch: 'bg-stage-negotiation', dashed: true },
              ]}
            />
          }
        >
          <BarChart
            data={data.revenue}
            height={250}
            format={(v) => formatCurrency(v)}
            formatAxis={(v) => formatCurrency(v, true)}
            valueLabel={t('Ganado')}
            targetLabel={t('Meta')}
          />
        </Panel>

        <Panel title={t('Embudo de conversión')} subtitle={t('Deals que alcanzaron cada etapa · 12m')}>
          <ol className="space-y-2.5">
            {STAGES.map((s, i) => {
              const n = data.reached[i]!;
              const conv = i === 0 ? null : n / data.reached[i - 1]!;
              return (
                <li key={s.id}>
                  <div className="mb-1 flex items-baseline justify-between text-[12.5px]">
                    <span className="flex items-center gap-2 text-fg-muted">
                      <span className={cn('size-2 rounded-full', s.accent)} />
                      {t(s.name)}
                    </span>
                    <span className="tabular text-fg">
                      {n}
                      {conv != null && <span className="ml-2 text-[11px] text-fg-subtle">{formatPercent(conv)} ↓</span>}
                    </span>
                  </div>
                  <div className="h-3.5 rounded bg-ink/[0.03]">
                    <div className={cn('h-full rounded opacity-60', s.accent)} style={{ width: `${(n / data.reached[0]!) * 100}%` }} />
                  </div>
                </li>
              );
            })}
          </ol>
          <p className="mt-4 text-[11.5px] leading-relaxed text-fg-subtle">
            {t('Conversión global lead → kickoff:')}{' '}
            <span className="tabular font-medium text-fg">{formatPercent(data.reached[4]! / data.reached[0]!)}</span>
          </p>
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel
          className="lg:col-span-2"
          title={t('Requieren atención')}
          subtitle={t('Facturas vencidas, proyectos en riesgo y deals que se están enfriando')}
          action={<span className="tabular rounded-md bg-ink/[0.06] px-1.5 text-[11px] font-medium leading-5 text-fg-muted">{attention.length}</span>}
          bodyClass="px-2 pb-2 pt-2"
        >
          {attention.length === 0 ? (
            <p className="px-3 py-6 text-center text-[13px] text-fg-subtle">{t('Todo al día. No hay pendientes críticos.')}</p>
          ) : (
            <ul>
              {attention.map((it) => (
                <li key={it.id}>
                  <button onClick={it.onOpen} className="group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-ink/[0.04]">
                    <span className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface-2', it.tone)}>
                      <it.icon className="size-3.5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-fg">{it.title}</span>
                      <span className="block truncate text-xs text-fg-subtle">{it.meta}</span>
                    </span>
                    <ArrowRight className="size-3.5 shrink-0 text-fg-subtle opacity-0 transition-opacity group-hover:opacity-100" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          title={t('Próximas reuniones')}
          action={
            <button onClick={() => navigate('Schedule')} className="text-xs text-fg-subtle hover:text-fg">
              {t('Ver agenda')}
            </button>
          }
          bodyClass="px-2 pb-2 pt-2"
        >
          <ul>
            {upcoming.map((e) => {
              const d = daysUntil(e.start);
              const when = d <= 0 ? t('Hoy') : d === 1 ? t('Mañana') : new Date(e.start).toLocaleDateString(currentLocale(), { weekday: 'short', day: 'numeric' });
              return (
                <li key={e.id} className="flex items-center gap-3 rounded-xl px-3 py-2.5 hover:bg-ink/[0.03]">
                  <span className="w-14 shrink-0 text-right">
                    <span className="block text-[11px] capitalize text-fg-subtle">{when}</span>
                    <span className="tabular block text-[13px] font-medium text-fg">{formatTime(e.start)}</span>
                  </span>
                  <span className={cn('h-8 w-0.5 shrink-0 rounded-full', EVENT_META[e.type].dot)} />
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] text-fg">{t(e.title)}</span>
                    <span className="block truncate text-[11.5px] text-fg-subtle">
                      {t(EVENT_META[e.type].label)} · {e.minutes} min · {t(e.location)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <Panel title={t('Ranking comercial')} subtitle={t('Ganado en los últimos 90 días')}>
          <HBarList
            items={data.owners.map(([owner, v]) => ({
              label: owner,
              value: v.value,
              display: formatCurrency(v.value, true),
              sub: `${v.count} deals`,
            }))}
          />
        </Panel>

        <Panel className="lg:col-span-2" title={t('Actividad reciente')} subtitle={t('Últimos movimientos del equipo comercial')} bodyClass="px-2 pb-2 pt-2">
          <ul>
            {activity.map((a) => {
              const Icon = TOUCH_ICON[a.type];
              return (
                <li key={a.id}>
                  <button
                    onClick={() => navigate('Pipeline', { dealId: a.dealId })}
                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors hover:bg-ink/[0.04]"
                  >
                    <Avatar name={a.company} size="sm" square />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] text-fg-muted">
                        <span className="font-medium text-fg">{a.company}</span> · {t(a.text)}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-fg-subtle">
                      <Icon className="size-3" />
                      {formatRelative(a.at)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>

      {attention.length > 0 && (
        <p className="flex items-center gap-2 text-[11.5px] text-fg-subtle">
          <AlertTriangle className="size-3.5" /> {t('Las alertas se calculan en vivo: mueve un deal o marca una factura como pagada y se actualizan.')}
        </p>
      )}
    </Page>
  );
}
