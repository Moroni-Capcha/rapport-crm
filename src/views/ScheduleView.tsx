import { ChevronLeft, ChevronRight, Clock3, MapPin, Plus, Users, X } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { Avatar, Button, IconButton } from '../components/ui/primitives';
import { Page, PageHeader, Panel, StatusPill } from '../components/ui/page';
import { anchorWeek, EVENT_META, startOfWeek } from '../data/events';
import { STAGE_BY_ID } from '../data/stages';
import { cn, formatTime, uid } from '../lib/format';
import { useStore } from '../store/AppStore';
import type { CalendarEvent, EventType } from '../types';
import type { ViewProps } from './types';
import { currentLocale, useT } from '../lib/i18n';

const START_HOUR = 8;
const END_HOUR = 19;
const ROW = 52; // px por hora
const DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie'];

const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

/** Asigna carriles a eventos que se solapan en un mismo día */
function layoutDay(events: CalendarEvent[]) {
  const sorted = [...events].sort((a, b) => a.start.localeCompare(b.start));
  const lanesEnd: number[] = [];
  const placed = sorted.map((e) => {
    const s = new Date(e.start).getTime();
    const end = s + e.minutes * 60_000;
    let lane = lanesEnd.findIndex((t) => t <= s);
    if (lane === -1) lane = lanesEnd.length;
    lanesEnd[lane] = end;
    return { e, lane };
  });
  return { placed, lanes: Math.max(1, lanesEnd.length) };
}

export function ScheduleView({ focus, navigate, notify }: ViewProps) {
  const { events, deals, addEvent } = useStore();
  const t = useT();
  const [week, setWeek] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (focus?.dealId) {
      const ev = events.find((e) => e.dealId === focus.dealId && new Date(e.start) > new Date());
      if (ev) setSelectedId(ev.id);
    }
  }, [focus, events]);

  const monday = useMemo(() => {
    const d = anchorWeek();
    d.setDate(d.getDate() + week * 7);
    return d;
  }, [week]);

  const days = useMemo(
    () =>
      DAYS.map((label, i) => {
        const date = new Date(monday);
        date.setDate(monday.getDate() + i);
        return { label, date, ...layoutDay(events.filter((e) => sameDay(new Date(e.start), date))) };
      }),
    [monday, events],
  );

  const selected = events.find((e) => e.id === selectedId) ?? null;
  const todayEvents = events.filter((e) => sameDay(new Date(e.start), now)).sort((a, b) => a.start.localeCompare(b.start));
  const next7 = events
    .filter((e) => {
      const diff = new Date(e.start).getTime() - now.getTime();
      return diff > 0 && !sameDay(new Date(e.start), now) && diff < 7 * 86_400_000;
    })
    .sort((a, b) => a.start.localeCompare(b.start));
  const followups = deals.filter((d) => d.nextStep && d.stage !== 'kickoff');

  const rangeLabel = `${monday.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' })} – ${days[4]!.date.toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short', year: 'numeric' })}`;
  const weekCount = days.reduce((s, d) => s + d.placed.length, 0);
  const nowTop = (now.getHours() - START_HOUR + now.getMinutes() / 60) * ROW;

  return (
    <Page>
      <PageHeader
        eyebrow={`Schedule · ${t('{n} reuniones esta semana', { n: weekCount })}`}
        title={monday.toLocaleDateString(currentLocale(), { month: 'long', year: 'numeric' }).replace(/^\w/, (c) => c.toUpperCase())}
        actions={
          <>
            <div className="flex items-center rounded-lg border border-line bg-surface p-0.5">
              <IconButton label={t('Semana anterior')} onClick={() => setWeek((w) => w - 1)}>
                <ChevronLeft className="size-4" />
              </IconButton>
              <button onClick={() => setWeek(0)} className="h-7 rounded-md px-2.5 text-xs font-medium text-fg-muted hover:bg-ink/[0.06] hover:text-fg">
                {t('Hoy')}
              </button>
              <IconButton label={t('Semana siguiente')} onClick={() => setWeek((w) => w + 1)}>
                <ChevronRight className="size-4" />
              </IconButton>
            </div>
            <span className="tabular text-[13px] text-fg-muted">{rangeLabel}</span>
            <Button variant="primary" onClick={() => setCreating(true)}>
              <Plus className="size-3.5" strokeWidth={2.5} /> {t('Nuevo evento')}
            </Button>
          </>
        }
      />

      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-fg-subtle">
        {(Object.keys(EVENT_META) as EventType[]).map((type) => (
          <span key={type} className="flex items-center gap-1.5">
            <span className={cn('size-2 rounded-sm', EVENT_META[type].dot)} />
            {t(EVENT_META[type].label)}
          </span>
        ))}
      </div>

      <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_320px]">
        {/* Calendario semanal */}
        <div className="scroll-thin overflow-x-auto rounded-2xl border border-line bg-surface/70">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-[56px_repeat(5,minmax(0,1fr))] border-b border-line">
              <span />
              {days.map((d) => {
                const isToday = sameDay(d.date, now);
                return (
                  <div key={d.label} className="border-l border-line px-3 py-2.5">
                    <p className={cn('text-[11px] font-medium uppercase tracking-wider', isToday ? 'text-fg' : 'text-fg-subtle')}>{d.date.toLocaleDateString(currentLocale(), { weekday: 'short' }).replace('.', '')}</p>
                    <p className={cn('tabular mt-0.5 flex items-center gap-2 text-lg font-semibold leading-6', isToday ? 'text-fg' : 'text-fg-muted')}>
                      <span className={cn(isToday && 'rounded-md bg-fg px-1.5 text-canvas')}>{d.date.getDate()}</span>
                      {d.placed.length > 0 && <span className="text-[11px] font-normal text-fg-subtle">{t('{n} ev.', { n: d.placed.length })}</span>}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="relative grid grid-cols-[56px_repeat(5,minmax(0,1fr))]" style={{ height: (END_HOUR - START_HOUR) * ROW }}>
              {/* Horas */}
              <div className="relative">
                {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                  <span key={i} className="tabular absolute right-2 -translate-y-1/2 text-[10.5px] text-fg-subtle" style={{ top: i * ROW }}>
                    {i === 0 ? '' : `${String(START_HOUR + i).padStart(2, '0')}:00`}
                  </span>
                ))}
              </div>

              {days.map((d) => {
                const isToday = sameDay(d.date, now);
                return (
                  <div key={d.label} className={cn('relative border-l border-line', isToday && 'bg-ink/[0.015]')}>
                    {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => (
                      <div key={i} className="absolute inset-x-0 border-t border-line/70" style={{ top: i * ROW }} />
                    ))}
                    {d.placed.map(({ e, lane }) => {
                      const s = new Date(e.start);
                      const top = (s.getHours() - START_HOUR + s.getMinutes() / 60) * ROW;
                      const height = Math.max(22, (e.minutes / 60) * ROW - 3);
                      const meta = EVENT_META[e.type];
                      return (
                        <button
                          key={e.id}
                          onClick={() => setSelectedId(e.id)}
                          className={cn(
                            'absolute overflow-hidden rounded-lg border-l-2 px-2 py-1 text-left transition-all hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/30',
                            meta.block,
                            selectedId === e.id && 'ring-1 ring-ink/40',
                            new Date(e.start).getTime() + e.minutes * 60_000 < now.getTime() && 'opacity-55',
                          )}
                          style={{ top: top + 1, height, left: `calc(${(lane / d.lanes) * 100}% + 3px)`, width: `calc(${100 / d.lanes}% - 6px)` }}
                        >
                          <p className="truncate text-[11.5px] font-medium leading-4 text-fg">{t(e.title)}</p>
                          {height > 34 && (
                            <p className="tabular truncate text-[10.5px] leading-4 text-fg-muted">
                              {formatTime(e.start)} · {e.minutes} min
                            </p>
                          )}
                        </button>
                      );
                    })}
                    {isToday && nowTop > 0 && nowTop < (END_HOUR - START_HOUR) * ROW && (
                      <div className="pointer-events-none absolute inset-x-0 z-10 flex items-center" style={{ top: nowTop }}>
                        <span className="-ml-1 size-2 rounded-full bg-danger" />
                        <span className="h-px flex-1 bg-danger/80" />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Panel lateral */}
        <div className="space-y-3">
          {selected ? (
            <EventDetail event={selected} onClose={() => setSelectedId(null)} navigate={navigate} />
          ) : (
            <Panel title={t('Hoy')} subtitle={now.toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'long' })} bodyClass="px-2 pb-2 pt-1">
              {todayEvents.length ? (
                <EventList events={todayEvents} onSelect={setSelectedId} />
              ) : (
                <p className="px-3 py-4 text-[13px] text-fg-subtle">{t('Sin reuniones hoy.')}</p>
              )}
            </Panel>
          )}
          <Panel title={t('Próximos 7 días')} bodyClass="px-2 pb-2 pt-1">
            <EventList events={next7} onSelect={setSelectedId} withDay />
          </Panel>
          <Panel title={t('Follow-ups pendientes')} subtitle={t('Próximo paso definido en cada deal')} bodyClass="px-2 pb-2 pt-1">
            <ul>
              {followups.map((d) => (
                <li key={d.id}>
                  <button onClick={() => navigate('Pipeline', { dealId: d.id })} className="flex w-full items-start gap-2.5 rounded-lg px-3 py-2 text-left hover:bg-ink/[0.04]">
                    <span className={cn('mt-1.5 size-1.5 shrink-0 rounded-full', STAGE_BY_ID[d.stage].accent)} />
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] text-fg">{t(d.nextStep ?? '')}</span>
                      <span className="block truncate text-[11.5px] text-fg-subtle">
                        {d.company} · {d.owner}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      {creating && (
        <NewEventModal
          defaultDate={week === 0 && now.getDay() >= 1 && now.getDay() <= 5 ? now : monday}
          onClose={() => setCreating(false)}
          onCreate={(ev) => {
            addEvent(ev);
            setCreating(false);
            const d = startOfWeek(new Date(ev.start));
            setWeek(Math.round((d.getTime() - anchorWeek().getTime()) / (7 * 86_400_000)));
            setSelectedId(ev.id);
            notify(t('Evento agendado: {title}', { title: t(ev.title) }));
          }}
        />
      )}
    </Page>
  );
}

function EventList({ events, onSelect, withDay }: { events: CalendarEvent[]; onSelect: (id: string) => void; withDay?: boolean }) {
  const t = useT();
  if (!events.length) return <p className="px-3 py-4 text-[13px] text-fg-subtle">{t('Nada agendado.')}</p>;
  return (
    <ul>
      {events.map((e) => (
        <li key={e.id}>
          <button onClick={() => onSelect(e.id)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-ink/[0.04]">
            <span className="w-12 shrink-0">
              {withDay && <span className="block text-[10.5px] capitalize text-fg-subtle">{new Date(e.start).toLocaleDateString(currentLocale(), { weekday: 'short', day: 'numeric' })}</span>}
              <span className="tabular block text-[12.5px] font-medium text-fg">{formatTime(e.start)}</span>
            </span>
            <span className={cn('h-7 w-0.5 shrink-0 rounded-full', EVENT_META[e.type].dot)} />
            <span className="min-w-0">
              <span className="block truncate text-[13px] text-fg">{t(e.title)}</span>
              <span className="block truncate text-[11px] text-fg-subtle">{t(e.location)}</span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function EventDetail({ event: e, onClose, navigate }: { event: CalendarEvent; onClose: () => void; navigate: ViewProps['navigate'] }) {
  const t = useT();
  const meta = EVENT_META[e.type];
  const end = new Date(new Date(e.start).getTime() + e.minutes * 60_000).toISOString();
  return (
    <section className="animate-pop rounded-2xl border border-line-strong bg-surface-2 p-4">
      <div className="flex items-start justify-between gap-3">
        <StatusPill label={t(meta.label)} dot={meta.dot} />
        <IconButton label={t('Cerrar detalle')} onClick={onClose}>
          <X className="size-4" />
        </IconButton>
      </div>
      <h3 className="mt-3 text-[15px] font-semibold leading-snug tracking-tight text-fg">{t(e.title)}</h3>
      <ul className="mt-3 space-y-2 text-[13px] text-fg-muted">
        <li className="flex items-center gap-2">
          <Clock3 className="size-3.5 text-fg-subtle" />
          <span className="capitalize">{new Date(e.start).toLocaleDateString(currentLocale(), { weekday: 'long', day: 'numeric', month: 'short' })}</span>
          <span className="tabular">· {formatTime(e.start)}–{formatTime(end)}</span>
        </li>
        <li className="flex items-center gap-2">
          <MapPin className="size-3.5 text-fg-subtle" />
          {t(e.location)}
        </li>
        <li className="flex items-start gap-2">
          <Users className="mt-0.5 size-3.5 text-fg-subtle" />
          <span className="flex flex-col gap-1.5">
            {e.attendees.map((a) => (
              <span key={a} className="flex items-center gap-2">
                <Avatar name={a} size="xs" /> {a}
              </span>
            ))}
          </span>
        </li>
      </ul>
      {(e.dealId || e.projectId || e.company) && (
        <div className="mt-4 flex flex-wrap gap-2 border-t border-line pt-3">
          {e.dealId && (
            <Button size="sm" variant="outline" onClick={() => navigate('Pipeline', { dealId: e.dealId })}>
              {t('Abrir deal')}
            </Button>
          )}
          {e.projectId && (
            <Button size="sm" variant="outline" onClick={() => navigate('Projects', { projectId: e.projectId })}>
              {t('Abrir proyecto')}
            </Button>
          )}
          {e.company && (
            <Button size="sm" variant="ghost" onClick={() => navigate('Customers', { company: e.company })}>
              {t('Ver cliente')}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

const inputCls =
  'h-9 w-full rounded-lg border border-line bg-surface-2 px-3 text-[13px] text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-ink/20';

function NewEventModal({ defaultDate, onClose, onCreate }: { defaultDate: Date; onClose: () => void; onCreate: (e: CalendarEvent) => void }) {
  const { deals } = useStore();
  const t = useT();
  const pad = (n: number) => String(n).padStart(2, '0');
  const [form, setForm] = useState({
    title: '',
    type: 'discovery' as EventType,
    date: `${defaultDate.getFullYear()}-${pad(defaultDate.getMonth() + 1)}-${pad(defaultDate.getDate())}`,
    time: '10:00',
    minutes: 60,
    dealId: '',
    location: 'Google Meet',
  });

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const submit = (ev: FormEvent) => {
    ev.preventDefault();
    const deal = deals.find((d) => d.id === form.dealId);
    const title = form.title.trim() || `${t(EVENT_META[form.type].label)}${deal ? ` · ${deal.company}` : ''}`;
    onCreate({
      id: `ev-${uid()}`,
      title,
      type: form.type,
      company: deal?.company,
      dealId: deal?.id,
      start: new Date(`${form.date}T${form.time}:00`).toISOString(),
      minutes: form.minutes,
      attendees: deal ? [deal.contact.name, deal.owner] : ['Andrea Paz'],
      location: form.location,
    });
  };

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[10vh]">
      <div className="animate-fade-in fixed inset-0 bg-scrim/55 backdrop-blur-[2px]" onClick={onClose} />
      <form onSubmit={submit} role="dialog" aria-modal="true" aria-label={t('Nuevo evento')} className="animate-pop relative w-full max-w-[480px] rounded-2xl border border-line-strong bg-surface shadow-2xl shadow-shade/60">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="text-[15px] font-semibold text-fg">{t('Nuevo evento')}</h2>
          <IconButton label={t('Cerrar')} type="button" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-4 px-5 py-5">
          <Field label={t('Deal relacionado')} full>
            <select id="ev-deal" value={form.dealId} onChange={(e) => set('dealId', e.target.value)} className={inputCls}>
              <option value="" className="bg-surface-2">{t('Sin deal (evento interno)')}</option>
              {deals.map((d) => (
                <option key={d.id} value={d.id} className="bg-surface-2">
                  {d.company} — {t(d.project)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('Título')} full>
            <input id="ev-title" value={form.title} onChange={(e) => set('title', e.target.value)} placeholder={t('Se genera automáticamente si lo dejas vacío')} className={inputCls} />
          </Field>
          <Field label={t('Tipo')}>
            <select id="ev-type" value={form.type} onChange={(e) => set('type', e.target.value as EventType)} className={inputCls}>
              {(Object.keys(EVENT_META) as EventType[]).map((type) => (
                <option key={type} value={type} className="bg-surface-2">
                  {t(EVENT_META[type].label)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t('Lugar')}>
            <input id="ev-location" value={form.location} onChange={(e) => set('location', e.target.value)} className={inputCls} />
          </Field>
          <Field label={t('Fecha')}>
            <input id="ev-date" type="date" value={form.date} onChange={(e) => set('date', e.target.value)} className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label={t('Hora')}>
              <input id="ev-time" type="time" min="08:00" max="18:30" step={900} value={form.time} onChange={(e) => set('time', e.target.value)} className={inputCls} />
            </Field>
            <Field label={t('Duración')}>
              <select id="ev-minutes" value={form.minutes} onChange={(e) => set('minutes', Number(e.target.value))} className={inputCls}>
                {[30, 45, 60, 90, 120].map((m) => (
                  <option key={m} value={m} className="bg-surface-2">
                    {m} min
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-line px-5 py-3.5">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('Cancelar')}
          </Button>
          <Button type="submit" variant="primary">
            {t('Agendar')}
          </Button>
        </div>
      </form>
    </div>
  );
}

function Field({ label, full, children }: { label: string; full?: boolean; children: ReactNode }) {
  return (
    <label className={cn('flex min-w-0 flex-col gap-1.5', full && 'col-span-2')}>
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      {children}
    </label>
  );
}
