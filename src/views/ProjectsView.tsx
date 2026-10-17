import { ArrowRight, CalendarDays, Check, Clock3, Send, Users } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Avatar, Button, ServiceTag } from '../components/ui/primitives';
import { Drawer, DrawerSection, Kpi, Page, PageHeader, Progress, Segmented, StatusPill } from '../components/ui/page';
import { HEALTH_META, PHASES } from '../data/projects';
import { cn, daysUntil, formatCurrency, formatShortDate } from '../lib/format';
import { useStore } from '../store/AppStore';
import { INVOICE_META, invoiceStatus } from '../store/selectors';
import type { Health, Project } from '../types';
import type { ViewProps } from './types';
import { currentLocale, useT } from '../lib/i18n';

type Filter = 'all' | Health;

export function ProjectsView({ focus, navigate, notify }: ViewProps) {
  const { projects } = useStore();
  const t = useT();
  const [filter, setFilter] = useState<Filter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    if (focus?.projectId) setSelectedId(focus.projectId);
  }, [focus]);

  const counts = useMemo(() => {
    const c = { all: projects.length, 'on-track': 0, 'at-risk': 0, delayed: 0 } as Record<Filter, number>;
    for (const p of projects) c[p.health]++;
    return c;
  }, [projects]);

  const visible = useMemo(
    () =>
      projects
        .filter((p) => filter === 'all' || p.health === filter)
        .sort((a, b) => Number(Boolean(b.isNew)) - Number(Boolean(a.isNew)) || a.dueAt.localeCompare(b.dueAt)),
    [projects, filter],
  );

  const kpis = useMemo(() => {
    const used = projects.reduce((s, p) => s + p.hoursUsed, 0);
    const budget = projects.reduce((s, p) => s + p.hoursBudget, 0);
    const toBill = projects.flatMap((p) => p.milestones).filter((m) => m.status === 'pending' || m.status === 'draft');
    const dueSoon = projects.filter((p) => daysUntil(p.dueAt) <= 14 && p.progress < 100);
    return {
      active: projects.length,
      risky: counts['at-risk'] + counts.delayed,
      hoursPct: used / Math.max(1, budget),
      used,
      toBill: toBill.reduce((s, m) => s + m.amount, 0),
      dueSoon: dueSoon.length,
    };
  }, [projects, counts]);

  const selected = projects.find((p) => p.id === selectedId) ?? null;

  return (
    <Page>
      <PageHeader
        eyebrow="Projects · Delivery"
        title={t('Proyectos en curso')}
        actions={
          <Segmented<Filter>
            label={t('Filtrar por salud')}
            value={filter}
            onChange={setFilter}
            options={[
              { id: 'all', label: t('Todos'), count: counts.all },
              { id: 'on-track', label: t('En tiempo'), count: counts['on-track'] },
              { id: 'at-risk', label: t('En riesgo'), count: counts['at-risk'] },
              { id: 'delayed', label: t('Atrasados'), count: counts.delayed },
            ]}
          />
        }
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t('Proyectos activos')} value={String(kpis.active)} note={t('{n} entregas en 14 días', { n: kpis.dueSoon })} />
        <Kpi label={t('En riesgo o atrasados')} value={String(kpis.risky)} note={kpis.risky ? t('revisar alcance y horas') : t('todo en tiempo')} tone={kpis.risky ? 'warn' : 'good'} />
        <Kpi label={t('Horas consumidas')} value={`${Math.round(kpis.hoursPct * 100)}%`} note={t('{n} h del presupuesto', { n: kpis.used.toLocaleString(currentLocale()) })} />
        <Kpi label={t('Por facturar')} value={formatCurrency(kpis.toBill, true)} note={t('hitos programados y borradores')} />
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-line py-16 text-center text-[13px] text-fg-subtle">{t('No hay proyectos con este estado.')}</div>
      ) : (
        <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {visible.map((p) => (
            <ProjectCard key={p.id} project={p} onOpen={() => setSelectedId(p.id)} />
          ))}
        </div>
      )}

      <ProjectDrawer project={selected} onClose={() => setSelectedId(null)} navigate={navigate} notify={notify} />
    </Page>
  );
}

/* ───────────────────────── Tarjeta ───────────────────────── */

function PhaseSteps({ phase, size = 'sm' }: { phase: Project['phase']; size?: 'sm' | 'md' }) {
  const t = useT();
  const idx = PHASES.findIndex((p) => p.id === phase);
  return (
    <div className="grid grid-cols-5 gap-1">
      {PHASES.map((p, i) => (
        <div key={p.id} className="min-w-0">
          <div className={cn('rounded-full', size === 'sm' ? 'h-1' : 'h-1.5', i < idx ? 'bg-fg/55' : i === idx ? 'bg-fg' : 'bg-ink/[0.07]')} />
          <p className={cn('mt-1.5 truncate text-[10.5px]', i === idx ? 'font-medium text-fg' : 'text-fg-subtle')}>{t(p.name)}</p>
        </div>
      ))}
    </div>
  );
}

function ProjectCard({ project: p, onOpen }: { project: Project; onOpen: () => void }) {
  const t = useT();
  const health = HEALTH_META[p.health];
  const due = daysUntil(p.dueAt);
  const hoursPct = p.hoursUsed / Math.max(1, p.hoursBudget);
  const nextMilestone = p.milestones.find((m) => m.status !== 'paid');
  const team = [p.lead, ...p.team];

  return (
    <button
      onClick={onOpen}
      className="group flex flex-col rounded-2xl border border-line bg-surface/70 p-4 text-left transition-all hover:border-line-strong hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/25"
    >
      <div className="flex items-start gap-3">
        <Avatar name={p.company} size="md" square />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate text-[14px] font-semibold tracking-tight text-fg">{t(p.name)}</h3>
            {p.isNew && <StatusPill label={t('Nuevo')} cls="border-stage-discovery/40 text-stage-discovery" />}
          </div>
          <p className="truncate text-xs text-fg-subtle">
            {p.company} · {formatCurrency(p.value)}
          </p>
        </div>
        <StatusPill label={t(health.label)} dot={health.dot} cls="border-line" />
      </div>

      <div className="mt-4">
        <PhaseSteps phase={p.phase} />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Progress value={p.progress} className="flex-1" />
        <span className="tabular w-9 text-right text-xs font-medium text-fg">{p.progress}%</span>
      </div>

      <dl className="mt-4 grid grid-cols-3 gap-2 text-[11.5px]">
        <div>
          <dt className="flex items-center gap-1 text-fg-subtle"><CalendarDays className="size-3" /> {t('Entrega')}</dt>
          <dd className={cn('tabular mt-0.5 font-medium', due < 0 ? 'text-danger' : due <= 10 ? 'text-stage-negotiation' : 'text-fg-muted')}>
            {formatShortDate(p.dueAt)} <span className="font-normal text-fg-subtle">· {due < 0 ? `+${-due}d` : `${due}d`}</span>
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-fg-subtle"><Clock3 className="size-3" /> {t('Horas')}</dt>
          <dd className={cn('tabular mt-0.5 font-medium', hoursPct > p.progress / 100 + 0.15 ? 'text-stage-negotiation' : 'text-fg-muted')}>
            {Math.round(hoursPct * 100)}% <span className="font-normal text-fg-subtle">{t('usadas')}</span>
          </dd>
        </div>
        <div>
          <dt className="flex items-center gap-1 text-fg-subtle"><ArrowRight className="size-3" /> Sprint</dt>
          <dd className="tabular mt-0.5 font-medium text-fg-muted">{p.sprint ? `#${p.sprint}` : t('Por iniciar')}</dd>
        </div>
      </dl>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-line pt-3">
        <div className="flex -space-x-1">
          {team.slice(0, 4).map((n) => (
            <span key={n} className="rounded-full ring-2 ring-surface" title={n}>
              <Avatar name={n} size="sm" />
            </span>
          ))}
          {team.length > 4 && <span className="flex size-6 items-center justify-center rounded-full bg-surface-3 text-[9px] text-fg-muted ring-2 ring-surface">+{team.length - 4}</span>}
        </div>
        {nextMilestone && (
          <span className="flex min-w-0 items-center gap-2 text-[11.5px] text-fg-subtle">
            <span className="truncate">{t(nextMilestone.label)}</span>
            <span className="tabular font-medium text-fg-muted">{formatCurrency(nextMilestone.amount, true)}</span>
          </span>
        )}
      </div>
    </button>
  );
}

/* ───────────────────────── Drawer ───────────────────────── */

function ProjectDrawer({
  project: p,
  onClose,
  navigate,
  notify,
}: {
  project: Project | null;
  onClose: () => void;
  navigate: ViewProps['navigate'];
  notify: ViewProps['notify'];
}) {
  const { updateProject, advancePhase, setMilestoneStatus } = useStore();
  const t = useT();
  if (!p) return null;

  const phaseIdx = PHASES.findIndex((x) => x.id === p.phase);
  const nextPhase = PHASES[phaseIdx + 1];
  const billed = p.milestones.filter((m) => m.status === 'sent' || m.status === 'paid').reduce((s, m) => s + m.amount, 0);
  const paid = p.milestones.filter((m) => m.status === 'paid').reduce((s, m) => s + m.amount, 0);
  const hoursPct = Math.round((p.hoursUsed / Math.max(1, p.hoursBudget)) * 100);

  return (
    <Drawer
      open
      onClose={onClose}
      label={t('Proyecto {name}', { name: t(p.name) })}
      header={
        <div className="flex items-start gap-3">
          <Avatar name={p.company} size="lg" square />
          <div className="min-w-0 pt-0.5">
            <h2 className="truncate text-base font-semibold tracking-tight text-fg">{t(p.name)}</h2>
            <p className="truncate text-[13px] text-fg-subtle">
              {p.company} · {t('lidera {name}', { name: p.lead })}
            </p>
          </div>
        </div>
      }
      footer={
        <div className="flex gap-2">
          {p.dealId && (
            <Button variant="ghost" onClick={() => navigate('Pipeline', { dealId: p.dealId })}>
              {t('Ver deal de origen')}
            </Button>
          )}
          <Button variant="ghost" onClick={() => navigate('Customers', { company: p.company })}>
            {t('Ver cliente')}
          </Button>
        </div>
      }
    >
      <DrawerSection title={t('Resumen')}>
        <dl className="grid grid-cols-3 gap-3">
          {[
            [t('Valor'), formatCurrency(p.value)],
            [t('Facturado'), formatCurrency(billed)],
            [t('Cobrado'), formatCurrency(paid)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] text-fg-subtle">{k}</dt>
              <dd className="tabular mt-0.5 text-[15px] font-semibold text-fg">{v}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-3 text-xs text-fg-subtle">
          {t('Inicio {start} · entrega {due} ({n} días)', { start: formatShortDate(p.startAt), due: formatShortDate(p.dueAt), n: daysUntil(p.dueAt) })}
        </p>
      </DrawerSection>

      <DrawerSection title={t('Fase y avance')}>
        <PhaseSteps phase={p.phase} size="md" />
        <div className="mt-4 flex items-center gap-3">
          <input
            id={`progress-${p.id}`}
            aria-label={t('Avance del proyecto')}
            type="range"
            min={0}
            max={100}
            step={5}
            value={p.progress}
            onChange={(e) => updateProject(p.id, { progress: Number(e.target.value) })}
            className="h-1.5 flex-1 cursor-pointer accent-fg"
          />
          <span className="tabular w-10 text-right text-[13px] font-medium text-fg">{p.progress}%</span>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {(Object.keys(HEALTH_META) as Health[]).map((h) => (
            <button
              key={h}
              onClick={() => updateProject(p.id, { health: h })}
              aria-pressed={p.health === h}
              className={cn(
                'flex h-7 items-center gap-1.5 rounded-full border px-2.5 text-xs transition-colors',
                p.health === h ? 'border-ink/20 bg-ink/[0.08] text-fg' : 'border-line text-fg-subtle hover:text-fg-muted',
              )}
            >
              <span className={cn('size-1.5 rounded-full', HEALTH_META[h].dot)} />
              {t(HEALTH_META[h].label)}
            </button>
          ))}
          {nextPhase && (
            <Button
              variant="primary"
              size="sm"
              className="ml-auto"
              onClick={() => {
                advancePhase(p);
                notify(`${t(p.name)} → ${t(nextPhase.name)}`);
              }}
            >
              {t('Avanzar a {stage}', { stage: t(nextPhase.name) })} <ArrowRight className="size-3" />
            </Button>
          )}
        </div>
      </DrawerSection>

      <DrawerSection title={t('Hitos de pago')}>
        <ul className="space-y-2">
          {p.milestones.map((m) => {
            const st = invoiceStatus(m);
            return (
              <li key={m.id} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 px-3 py-2.5">
                <span className="tabular w-9 text-xs font-medium text-fg-subtle">{m.pct}%</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] text-fg">{t(m.label)}</span>
                  <span className="block text-[11px] text-fg-subtle">
                    {m.invoiceNumber ? `${m.invoiceNumber} · ` : ''}{t('vence {date}', { date: formatShortDate(m.dueAt) })}
                  </span>
                </span>
                <span className="tabular text-[13px] font-medium text-fg">{formatCurrency(m.amount)}</span>
                {st === 'pending' || st === 'draft' ? (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMilestoneStatus(p.id, m.id, 'sent');
                      notify(`${t('Factura enviada')} · ${p.company}`);
                    }}
                  >
                    <Send className="size-3" /> {t('Facturar')}
                  </Button>
                ) : st === 'paid' ? (
                  <StatusPill label={t('Pagada')} cls={INVOICE_META.paid.cls} />
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setMilestoneStatus(p.id, m.id, 'paid');
                      notify(`${t('Pago registrado')} · ${formatCurrency(m.amount)}`);
                    }}
                    className={st === 'overdue' ? 'border-danger/40 text-danger' : undefined}
                  >
                    <Check className="size-3" /> {st === 'overdue' ? t('Vencida · cobrar') : t('Marcar pagada')}
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </DrawerSection>

      <DrawerSection title={t('Horas')}>
        <div className="flex items-baseline justify-between text-[13px]">
          <span className="text-fg-muted">
            <span className="tabular font-medium text-fg">{p.hoursUsed.toLocaleString(currentLocale())}</span> / {p.hoursBudget.toLocaleString(currentLocale())} h
          </span>
          <span className={cn('tabular text-xs', hoursPct > p.progress + 15 ? 'text-stage-negotiation' : 'text-fg-subtle')}>
            {t('{a}% usado · {b}% avance', { a: hoursPct, b: p.progress })}
          </span>
        </div>
        <Progress value={hoursPct} className="mt-2" barClass={hoursPct > p.progress + 15 ? 'bg-stage-negotiation' : 'bg-fg/70'} />
      </DrawerSection>

      <DrawerSection title={t('Equipo y stack')}>
        <ul className="space-y-2">
          {[p.lead, ...p.team].map((n, i) => (
            <li key={n} className="flex items-center gap-2.5 text-[13px] text-fg-muted">
              <Avatar name={n} size="sm" />
              {n}
              <span className="text-[11px] text-fg-subtle">{i === 0 ? 'Project lead' : t('Equipo')}</span>
            </li>
          ))}
          {p.team.length === 0 && (
            <li className="flex items-center gap-2 text-xs text-fg-subtle">
              <Users className="size-3.5" /> {t('Equipo por asignar en el kickoff')}
            </li>
          )}
        </ul>
        <div className="mt-4 flex flex-wrap gap-1">
          {p.services.map((s) => (
            <ServiceTag key={s.label} service={s} />
          ))}
        </div>
      </DrawerSection>
    </Drawer>
  );
}
