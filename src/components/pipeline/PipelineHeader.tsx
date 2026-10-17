import { Download, Plus } from 'lucide-react';
import { formatCurrency } from '../../lib/format';
import { Button } from '../ui/primitives';
import { useT } from '../../lib/i18n';

export interface PipelineStats {
  openValue: number;
  activeLeads: number;
  weighted: number;
  wonValue: number;
  wonCount: number;
  stale: number;
}

export function PipelineHeader({ stats, filtered, onNewLead, onExport }: { stats: PipelineStats; filtered: boolean; onNewLead: () => void; onExport: () => void }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
      <div>
        <p className="mb-1.5 text-xs font-medium text-fg-subtle">
          Pipeline <span className="mx-1 text-fg-subtle/60">/</span> Q4 2026
        </p>
        <h1 className="text-[22px] font-semibold tracking-tight text-fg">Sales Pipeline</h1>
      </div>

      <div className="flex flex-wrap items-end gap-x-8 gap-y-4">
        <dl className="flex flex-wrap items-end gap-x-7 gap-y-3">
          <Stat label={t('Pipeline abierto')} value={formatCurrency(stats.openValue)} emphasis note={filtered ? t('filtrado') : undefined} />
          <Divider />
          <Stat label={t('Leads activos')} value={String(stats.activeLeads)} note={stats.stale ? t('{n} sin contacto +14d', { n: stats.stale }) : undefined} warn={stats.stale > 0} />
          <Divider />
          <Stat label={t('Forecast ponderado')} value={formatCurrency(stats.weighted, true)} />
          <Divider />
          <Stat label={t('Ganado (Kickoff)')} value={formatCurrency(stats.wonValue, true)} note={`${stats.wonCount} ${stats.wonCount === 1 ? 'deal' : 'deals'}`} />
        </dl>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onExport}>
            <Download className="size-3.5" />
            {t('Exportar')}
          </Button>
          <Button variant="primary" onClick={onNewLead}>
            <Plus className="size-3.5" strokeWidth={2.5} />
            {t('Nuevo lead')}
          </Button>
        </div>
      </div>
    </div>
  );
}

const Divider = () => <span aria-hidden className="hidden h-9 w-px bg-line sm:block" />;

function Stat({ label, value, note, emphasis, warn }: { label: string; value: string; note?: string; emphasis?: boolean; warn?: boolean }) {
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{label}</dt>
      <dd className="mt-1 flex items-baseline gap-2">
        <span className={emphasis ? 'tabular text-xl font-semibold tracking-tight text-fg' : 'tabular text-lg font-semibold tracking-tight text-fg/90'}>
          {value}
        </span>
        {note && <span className={warn ? 'text-[11px] text-stage-negotiation' : 'text-[11px] text-fg-subtle'}>{note}</span>}
      </dd>
    </div>
  );
}
