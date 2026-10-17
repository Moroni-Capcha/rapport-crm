import { useCallback, useEffect, useMemo, useState } from 'react';
import { DealDrawer } from '../components/pipeline/DealDrawer';
import { ExportModal } from '../components/pipeline/ExportModal';
import { ProposalDocument } from '../components/quote/ProposalDocument';
import { QuoteBuilder } from '../components/quote/QuoteBuilder';
import { formatCurrency } from '../lib/format';
import { proposalNumber } from '../lib/quote';
import { FilterBar } from '../components/pipeline/FilterBar';
import { KanbanBoard } from '../components/pipeline/KanbanBoard';
import { PipelineHeader } from '../components/pipeline/PipelineHeader';
import type { PipelineStats } from '../components/pipeline/PipelineHeader';
import { SEGMENTS, STAGES, STAGE_BY_ID } from '../data/stages';
import type { DropPlan } from '../lib/boardOrder';
import { daysSince } from '../lib/format';
import { useStore } from '../store/AppStore';
import { lastTouch } from '../store/selectors';
import type { BoardSettings, Deal, Quote, Segment, SortKey, StageId, TouchType } from '../types';
import type { ViewProps } from './types';
import { useT } from '../lib/i18n';

interface PipelineViewProps extends ViewProps {
  query: string;
  onQuery: (q: string) => void;
  settings: BoardSettings;
  onNewLead: (stage?: StageId) => void;
}

const SORT_STORAGE_KEY = 'rapport-pipeline-sort';
const SORT_KEYS: SortKey[] = ['recent', 'value', 'probability', 'manual'];

function loadSort(): SortKey {
  try {
    const saved = localStorage.getItem(SORT_STORAGE_KEY);
    return SORT_KEYS.find((k) => k === saved) ?? 'recent';
  } catch {
    return 'recent';
  }
}

export function PipelineView({ query, onQuery, settings, onNewLead, focus, navigate, notify }: PipelineViewProps) {
  const { deals, moveDeal, reorderDeal, updateDeal, logActivity, handoffDeal, loseDeal } = useStore();
  const t = useT();
  const [segments, setSegments] = useState<Set<Segment>>(new Set());
  const [sort, setSort] = useState<SortKey>(loadSort);
  // Así el orden manual sigue visible al recargar
  useEffect(() => {
    try {
      localStorage.setItem(SORT_STORAGE_KEY, sort);
    } catch {
      /* sin almacenamiento: la elección solo dura la sesión */
    }
  }, [sort]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [quoting, setQuoting] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ dealId: string; quote: Quote } | null>(null);

  // Abrir un deal llegando desde otra vista (Overview, Customers, Schedule…)
  useEffect(() => {
    if (focus?.dealId) setSelectedId(focus.dealId);
  }, [focus]);

  const searched = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return deals;
    return deals.filter((d) =>
      [d.company, d.project, d.contact.name, ...d.services.map((s) => s.label)].some((f) => f.toLowerCase().includes(q)),
    );
  }, [deals, query]);

  const visible = useMemo(
    () => (segments.size === 0 ? searched : searched.filter((d) => d.segments.some((s) => segments.has(s)))),
    [searched, segments],
  );

  const segmentCounts = useMemo(() => {
    const counts = Object.fromEntries(SEGMENTS.map((s) => [s.id, 0])) as Record<Segment, number>;
    for (const d of searched) for (const s of d.segments) counts[s]++;
    return counts;
  }, [searched]);

  const stats = useMemo<PipelineStats>(() => {
    const open = visible.filter((d) => d.stage !== 'kickoff');
    const won = visible.filter((d) => d.stage === 'kickoff');
    return {
      openValue: open.reduce((s, d) => s + d.value, 0),
      activeLeads: open.length,
      weighted: open.reduce((s, d) => s + (d.value * d.probability) / 100, 0),
      wonValue: won.reduce((s, d) => s + d.value, 0),
      wonCount: won.length,
      stale: open.filter((d) => daysSince(lastTouch(d).at) >= 14).length,
    };
  }, [visible]);

  const selected = useMemo(() => deals.find((d) => d.id === selectedId) ?? null, [deals, selectedId]);

  const handleMove = useCallback(
    (id: string, stage: StageId) => {
      const deal = deals.find((d) => d.id === id);
      if (!deal || deal.stage === stage) return;
      moveDeal(id, stage);
      notify(`${deal.company} → ${t(STAGE_BY_ID[stage].name)}`);
    },
    [deals, moveDeal, notify, t],
  );

  // Drag & drop del tablero: aplica el plan sobre el orden completo (los filtros solo ocultan deals)
  const handleReorder = useCallback(
    (id: string, plan: DropPlan) => {
      const deal = deals.find((d) => d.id === id);
      if (!deal) return;
      for (const op of plan.ops) reorderDeal(op.id, op.stage, op.beforeId);
      if (plan.switchToManual) setSort('manual');
      if (plan.crossStage) {
        const target = plan.ops[plan.ops.length - 1]!.stage;
        notify(`${deal.company} → ${t(STAGE_BY_ID[target].name)}`);
      }
    },
    [deals, reorderDeal, notify, t],
  );

  const closeDrawer = useCallback(() => setSelectedId(null), []);

  const handleLog = (id: string, type: TouchType, text: string) => {
    logActivity(id, { type, text });
    notify(t('Actividad registrada'));
  };

  // Kickoff → crea el proyecto con sus hitos de pago y salta a Projects
  const handleHandoff = (deal: Deal) => {
    const existed = Boolean(deal.projectId);
    const projectId = handoffDeal(deal);
    setSelectedId(null);
    if (!existed) notify(t('Proyecto creado: {name}', { name: deal.company }));
    navigate('Projects', { projectId });
  };

  const handleLose = (deal: Deal, reason: string) => {
    loseDeal(deal, reason);
    setSelectedId(null);
    notify(`${t('{name} marcado como perdido', { name: deal.company })} · ${t(reason)}`);
  };

  // Guardar la cotización: nueva versión, el neto pasa a ser el valor del deal y queda en la actividad
  const handleSaveQuote = (deal: Deal, quote: Quote, net: number) => {
    updateDeal(deal.id, { quote, value: net });
    logActivity(deal.id, {
      type: 'proposal',
      text: `Cotización ${proposalNumber(deal.id, quote.version)} guardada · ${formatCurrency(net)}`,
    });
    setQuoting(null);
    notify(t('Cotización v{n} guardada · {v}', { n: quote.version, v: formatCurrency(net) }));
  };

  const quotingDeal = deals.find((d) => d.id === quoting) ?? null;
  const previewDeal = preview ? deals.find((d) => d.id === preview.dealId) ?? null : null;

  const toggleSegment = (s: Segment) =>
    setSegments((prev) => {
      const next = new Set(prev);
      if (next.has(s)) next.delete(s);
      else next.add(s);
      return next;
    });

  return (
    <div className="flex h-full flex-col overflow-y-auto md:overflow-hidden">
      <div className="space-y-5 px-4 pb-4 pt-6 md:px-6">
        <PipelineHeader stats={stats} filtered={visible.length !== deals.length} onNewLead={() => onNewLead()} onExport={() => setExporting(true)} />
        <FilterBar
          active={segments}
          counts={segmentCounts}
          total={searched.length}
          onToggle={toggleSegment}
          onClear={() => setSegments(new Set())}
          sort={sort}
          onSort={setSort}
          query={query}
          onQuery={onQuery}
        />
      </div>
      <div className="min-h-[560px] flex-1 px-4 pb-4 md:min-h-0 md:px-6">
        <KanbanBoard stages={STAGES} deals={visible} allDeals={deals} sort={sort} settings={settings} onReorder={handleReorder} onOpen={setSelectedId} onAdd={onNewLead} />
      </div>

      <DealDrawer deal={selected} onClose={closeDrawer} onMove={handleMove} onUpdate={updateDeal} onLog={handleLog} onHandoff={handleHandoff} onLose={handleLose} onQuote={(d) => setQuoting(d.id)} onPreview={(d) => d.quote && setPreview({ dealId: d.id, quote: d.quote })} />
      {quotingDeal && (
        <QuoteBuilder
          deal={quotingDeal}
          onClose={() => setQuoting(null)}
          onSave={(q, net) => handleSaveQuote(quotingDeal, q, net)}
          onPreview={(q) => setPreview({ dealId: quotingDeal.id, quote: q })}
        />
      )}
      {previewDeal && preview && <ProposalDocument deal={previewDeal} quote={preview.quote} onClose={() => setPreview(null)} />}
      <ExportModal open={exporting} deals={visible} filtered={visible.length !== deals.length} onClose={() => setExporting(false)} notify={notify} />
    </div>
  );
}
