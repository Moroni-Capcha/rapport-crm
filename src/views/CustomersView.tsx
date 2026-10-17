import { ArrowDown, ArrowUp, Globe, Mail, MapPin, Phone, Search } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Avatar } from '../components/ui/primitives';
import { Drawer, DrawerSection, Kpi, Page, PageHeader, Progress, Segmented, StatusPill, Td, Th } from '../components/ui/page';
import { CUSTOMERS } from '../data/customers';
import { HEALTH_META } from '../data/projects';
import { SEGMENTS, STAGE_BY_ID } from '../data/stages';
import { cn, formatCurrency, formatPercent, formatRelative, formatShortDate } from '../lib/format';
import { useStore } from '../store/AppStore';
import { INVOICE_META, invoicesOf, lastTouch } from '../store/selectors';
import type { ClosedDeal, Contact, CustomerMeta, Deal, Project } from '../types';
import type { InvoiceRow } from '../store/selectors';
import type { ViewProps } from './types';
import { useT } from '../lib/i18n';

interface CustomerRow extends CustomerMeta {
  status: 'client' | 'prospect';
  ltv: number;
  openPipeline: number;
  deals: Deal[];
  projects: Project[];
  history: ClosedDeal[];
  invoices: InvoiceRow[];
  contacts: Contact[];
  lastContactAt?: string;
}

type SortKey = 'company' | 'ltv' | 'pipeline' | 'last';
type Filter = 'all' | 'client' | 'prospect';

const SEGMENT_LABEL = Object.fromEntries(SEGMENTS.map((s) => [s.id, s.label]));

export function CustomersView({ focus, navigate }: ViewProps) {
  const { deals, projects, history } = useStore();
  const t = useT();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'ltv', dir: -1 });
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    if (focus?.company) setSelected(focus.company);
  }, [focus]);

  // Une metadatos + deals abiertos + proyectos + historial + facturas por empresa
  const rows = useMemo<CustomerRow[]>(() => {
    const invoices = invoicesOf(projects);
    return CUSTOMERS.map((c) => {
      const cDeals = deals.filter((d) => d.company === c.company);
      const cProjects = projects.filter((p) => p.company === c.company);
      const cHistory = history.filter((h) => h.company === c.company);
      const cInvoices = invoices.filter((i) => i.project.company === c.company);
      const wonHistory = cHistory.filter((h) => h.outcome === 'won');
      const touches = [
        ...cDeals.map((d) => lastTouch(d).at),
        ...cInvoices.filter((i) => i.paidAt).map((i) => i.paidAt!),
        ...wonHistory.map((h) => h.closedAt),
      ].sort();
      const contacts = [c.contact, ...cDeals.map((d) => d.contact)].filter((x): x is Contact => Boolean(x));
      return {
        ...c,
        status: cProjects.length || wonHistory.length ? 'client' : 'prospect',
        ltv: wonHistory.reduce((s, h) => s + h.value, 0) + cInvoices.filter((i) => i.status === 'paid').reduce((s, i) => s + i.amount, 0),
        openPipeline: cDeals.filter((d) => d.stage !== 'kickoff').reduce((s, d) => s + d.value, 0),
        deals: cDeals,
        projects: cProjects,
        history: cHistory,
        invoices: cInvoices,
        contacts: contacts.filter((x, i) => contacts.findIndex((y) => y.name === x.name) === i),
        lastContactAt: touches[touches.length - 1],
      };
    });
  }, [deals, projects, history]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = rows.filter(
      (r) =>
        (filter === 'all' || r.status === filter) &&
        (!q || [r.company, r.industry, t(r.industry), r.city, ...r.contacts.map((c) => c.name)].some((f) => f.toLowerCase().includes(q))),
    );
    const val = (r: CustomerRow) =>
      sort.key === 'company' ? r.company : sort.key === 'ltv' ? r.ltv : sort.key === 'pipeline' ? r.openPipeline : (r.lastContactAt ?? '');
    return list.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [rows, query, filter, sort, t]);

  const kpis = useMemo(() => {
    const clients = rows.filter((r) => r.status === 'client');
    const total = clients.reduce((s, r) => s + r.ltv, 0);
    const top = [...clients].sort((a, b) => b.ltv - a.ltv)[0];
    return {
      clients: clients.length,
      prospects: rows.length - clients.length,
      avgLtv: total / Math.max(1, clients.length),
      top,
      topShare: top ? top.ltv / Math.max(1, total) : 0,
      withProjects: clients.filter((r) => r.projects.length).length,
    };
  }, [rows]);

  const toggleSort = (key: SortKey) => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'company' ? 1 : -1 }));
  const SortIcon = ({ k }: { k: SortKey }) => (sort.key === k ? sort.dir === 1 ? <ArrowUp className="ml-1 inline size-3" /> : <ArrowDown className="ml-1 inline size-3" /> : null);

  const current = rows.find((r) => r.company === selected) ?? null;

  return (
    <Page>
      <PageHeader eyebrow={`Customers · ${t('Directorio')}`} title={t('Clientes y prospectos')} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label={t('Clientes')} value={String(kpis.clients)} note={t('{n} con proyecto activo', { n: kpis.withProjects })} />
        <Kpi label={t('Prospectos')} value={String(kpis.prospects)} note={t('en el pipeline actual')} />
        <Kpi label={t('Facturado promedio')} value={formatCurrency(kpis.avgLtv, true)} note={t('por cliente · histórico')} />
        <Kpi
          label={t('Concentración')}
          value={formatPercent(kpis.topShare)}
          note={kpis.top ? t('{name} es el mayor', { name: kpis.top.company }) : undefined}
          tone={kpis.topShare > 0.3 ? 'warn' : 'neutral'}
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented<Filter>
          label={t('Tipo de cuenta')}
          value={filter}
          onChange={setFilter}
          options={[
            { id: 'all', label: t('Todos'), count: rows.length },
            { id: 'client', label: t('Clientes'), count: kpis.clients },
            { id: 'prospect', label: t('Prospectos'), count: kpis.prospects },
          ]}
        />
        <label className="flex h-8 w-full items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-fg-subtle focus-within:border-line-strong sm:w-72">
          <Search className="size-3.5" />
          <input
            id="customer-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Empresa, industria, ciudad o contacto…')}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-subtle"
          />
        </label>
      </div>

      <div className="scroll-thin overflow-x-auto rounded-2xl border border-line bg-surface/70">
        <table className="w-full min-w-[860px] border-collapse">
          <thead>
            <tr>
              <Th onClick={() => toggleSort('company')} active={sort.key === 'company'}>{t('Empresa')} <SortIcon k="company" /></Th>
              <Th>{t('Estado')}</Th>
              <Th>{t('Segmento')}</Th>
              <Th className="text-right" onClick={() => toggleSort('ltv')} active={sort.key === 'ltv'}>{t('Facturado')} <SortIcon k="ltv" /></Th>
              <Th className="text-right">{t('Proyectos')}</Th>
              <Th className="text-right" onClick={() => toggleSort('pipeline')} active={sort.key === 'pipeline'}>{t('Pipeline abierto')} <SortIcon k="pipeline" /></Th>
              <Th className="text-right" onClick={() => toggleSort('last')} active={sort.key === 'last'}>{t('Último contacto')} <SortIcon k="last" /></Th>
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.company} onClick={() => setSelected(r.company)} className="cursor-pointer transition-colors hover:bg-ink/[0.025]">
                <Td>
                  <span className="flex items-center gap-3">
                    <Avatar name={r.company} size="md" square />
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-fg">{r.company}</span>
                      <span className="block truncate text-xs text-fg-subtle">
                        {t(r.industry)} · {r.city}
                      </span>
                    </span>
                  </span>
                </Td>
                <Td>
                  {r.status === 'client' ? (
                    <StatusPill label={t('Cliente')} dot="bg-stage-kickoff" />
                  ) : (
                    <StatusPill label={t('Prospecto')} dot="bg-stage-discovery" />
                  )}
                </Td>
                <Td className="text-fg-muted">{t(SEGMENT_LABEL[r.segment] ?? '')}</Td>
                <Td className="tabular text-right font-medium text-fg">{r.ltv ? formatCurrency(r.ltv) : <span className="text-fg-subtle">—</span>}</Td>
                <Td className="tabular text-right text-fg-muted">{r.projects.length || <span className="text-fg-subtle">—</span>}</Td>
                <Td className="tabular text-right text-fg-muted">{r.openPipeline ? formatCurrency(r.openPipeline) : <span className="text-fg-subtle">—</span>}</Td>
                <Td className="tabular text-right text-xs text-fg-subtle">{r.lastContactAt ? formatRelative(r.lastContactAt) : '—'}</Td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="py-12 text-center text-[13px] text-fg-subtle">
                  {t('Ninguna empresa coincide con “{q}”.', { q: query })}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <CustomerDrawer row={current} onClose={() => setSelected(null)} navigate={navigate} />
    </Page>
  );
}

function CustomerDrawer({ row: r, onClose, navigate }: { row: CustomerRow | null; onClose: () => void; navigate: ViewProps['navigate'] }) {
  if (!r) return null;
  const t = useT();
  const openDeals = r.deals;
  const won = r.history.filter((h) => h.outcome === 'won');
  return (
    <Drawer
      open
      onClose={onClose}
      label={t('Cliente {name}', { name: r.company })}
      header={
        <div className="flex items-start gap-3">
          <Avatar name={r.company} size="lg" square />
          <div className="min-w-0 pt-0.5">
            <h2 className="truncate text-base font-semibold tracking-tight text-fg">{r.company}</h2>
            <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12.5px] text-fg-subtle">
              <span>{t(r.industry)}</span>
              <span className="flex items-center gap-1"><MapPin className="size-3" />{r.city}</span>
              <span className="flex items-center gap-1"><Globe className="size-3" />{r.website}</span>
            </p>
          </div>
        </div>
      }
    >
      <DrawerSection title={t('Resumen')}>
        <dl className="grid grid-cols-3 gap-3">
          {[
            [t('Facturado'), formatCurrency(r.ltv)],
            [t('Pipeline abierto'), formatCurrency(r.openPipeline)],
            [r.status === 'client' ? t('Cliente desde') : t('Prospecto desde'), String(r.since)],
          ].map(([k, v]) => (
            <div key={k}>
              <dt className="text-[11px] text-fg-subtle">{k}</dt>
              <dd className="tabular mt-0.5 text-[15px] font-semibold text-fg">{v}</dd>
            </div>
          ))}
        </dl>
      </DrawerSection>

      <DrawerSection title={t('Contactos')}>
        <ul className="space-y-2">
          {r.contacts.map((c) => (
            <li key={c.name} className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3">
              <Avatar name={c.name} size="md" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-fg">{c.name}</span>
                <span className="block truncate text-xs text-fg-subtle">{t(c.role)}</span>
              </span>
              <span className="hidden text-right text-[11.5px] text-fg-subtle sm:block">
                <span className="flex items-center justify-end gap-1 select-all"><Mail className="size-3" />{c.email}</span>
                {c.phone && <span className="flex items-center justify-end gap-1 select-all"><Phone className="size-3" />{c.phone}</span>}
              </span>
            </li>
          ))}
        </ul>
      </DrawerSection>

      {openDeals.length > 0 && (
        <DrawerSection title={t('Deals en el pipeline')}>
          <ul className="space-y-1">
            {openDeals.map((d) => (
              <li key={d.id}>
                <button onClick={() => navigate('Pipeline', { dealId: d.id })} className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left hover:bg-ink/[0.04]">
                  <span className={cn('size-2 shrink-0 rounded-full', STAGE_BY_ID[d.stage].accent)} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-fg">{t(d.project)}</span>
                    <span className="block text-[11px] text-fg-subtle">{t(STAGE_BY_ID[d.stage].name)}</span>
                  </span>
                  <span className="tabular text-[13px] font-medium text-fg">{formatCurrency(d.value)}</span>
                </button>
              </li>
            ))}
          </ul>
        </DrawerSection>
      )}

      {r.projects.length > 0 && (
        <DrawerSection title={t('Proyectos')}>
          <ul className="space-y-1">
            {r.projects.map((p) => (
              <li key={p.id}>
                <button onClick={() => navigate('Projects', { projectId: p.id })} className="w-full rounded-lg px-2 py-2 text-left hover:bg-ink/[0.04]">
                  <span className="flex items-center justify-between gap-3">
                    <span className="truncate text-[13px] text-fg">{t(p.name)}</span>
                    <StatusPill label={t(HEALTH_META[p.health].label)} dot={HEALTH_META[p.health].dot} />
                  </span>
                  <span className="mt-2 flex items-center gap-3">
                    <Progress value={p.progress} className="flex-1" />
                    <span className="tabular text-[11px] text-fg-subtle">{p.progress}%</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </DrawerSection>
      )}

      {r.invoices.some((i) => i.status !== 'pending') && (
        <DrawerSection title={t('Facturas')}>
          <ul className="divide-y divide-line">
            {r.invoices
              .filter((i) => i.status !== 'pending')
              .map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-2 text-[13px]">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-fg-muted">{i.invoiceNumber ?? t('Borrador')} · {t(i.label)}</span>
                    <span className="block text-[11px] text-fg-subtle">{t('vence {date}', { date: formatShortDate(i.dueAt) })}</span>
                  </span>
                  <span className="tabular font-medium text-fg">{formatCurrency(i.amount)}</span>
                  <StatusPill label={t(INVOICE_META[i.displayStatus].label)} cls={INVOICE_META[i.displayStatus].cls} />
                </li>
              ))}
          </ul>
        </DrawerSection>
      )}

      {r.history.length > 0 && (
        <DrawerSection title={t('Historial · {a} ganados de {b}', { a: won.length, b: r.history.length })}>
          <ul className="divide-y divide-line">
            {r.history.slice(0, 6).map((h) => (
              <li key={h.id} className="flex items-center gap-3 py-2 text-[13px]">
                <span className={cn('size-1.5 rounded-full', h.outcome === 'won' ? 'bg-stage-kickoff' : 'bg-danger')} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-fg-muted">{t(h.title)}</span>
                  <span className="block text-[11px] text-fg-subtle">
                    {formatShortDate(h.closedAt)} · {h.outcome === 'won' ? t('Ganado') : `${t('Perdido')} · ${t(h.lossReason ?? '')}`}
                  </span>
                </span>
                <span className="tabular font-medium text-fg">{formatCurrency(h.value)}</span>
              </li>
            ))}
          </ul>
        </DrawerSection>
      )}
    </Drawer>
  );
}
