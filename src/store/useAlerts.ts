import { useMemo } from 'react';
import type { NavTab } from '../components/layout/TopNav';
import { HEALTH_META } from '../data/projects';
import { daysSince, daysUntil, formatCurrency } from '../lib/format';
import type { Focus } from '../views/types';
import { useT } from '../lib/i18n';
import { useStore } from './AppStore';
import { invoicesOf, lastTouch } from './selectors';

export type AlertKind = 'invoice' | 'project' | 'deal';

export interface Alert {
  id: string;
  kind: AlertKind;
  /** Clase de color del ícono (estado: crítico / atención) */
  tone: string;
  title: string;
  meta: string;
  tab: NavTab;
  focus?: Omit<Focus, 'nonce'>;
}

/**
 * Alertas calculadas en vivo desde el store. Las usan Overview ("Requieren atención")
 * y el panel de notificaciones, así ambos muestran siempre lo mismo.
 */
export function useAlerts(): Alert[] {
  const { deals, projects } = useStore();
  const t = useT();

  return useMemo(() => {
    const items: Alert[] = [];

    for (const inv of invoicesOf(projects).filter((i) => i.displayStatus === 'overdue')) {
      items.push({
        id: `inv-${inv.id}`,
        kind: 'invoice',
        tone: 'text-danger',
        title: `${t('Factura vencida')} · ${inv.project.company}`,
        meta: `${formatCurrency(inv.amount)} · ${t(inv.label)} · ${t('vencida hace {n} días', { n: -daysUntil(inv.dueAt) })}`,
        tab: 'Finance',
      });
    }

    for (const p of projects.filter((x) => x.health !== 'on-track')) {
      items.push({
        id: `prj-${p.id}`,
        kind: 'project',
        tone: HEALTH_META[p.health].text,
        title: `${t(HEALTH_META[p.health].label)} · ${t(p.name)}`,
        meta: `${p.company} · ${t('entrega en {n} días', { n: daysUntil(p.dueAt) })} · ${t('{n}% de horas usadas', { n: Math.round((p.hoursUsed / Math.max(1, p.hoursBudget)) * 100) })}`,
        tab: 'Projects',
        focus: { projectId: p.id },
      });
    }

    for (const d of deals.filter((x) => x.stage !== 'kickoff')) {
      const days = daysSince(lastTouch(d).at);
      if (days >= 14 || (d.stage === 'proposal' && days >= 7)) {
        items.push({
          id: `deal-${d.id}`,
          kind: 'deal',
          tone: days >= 14 ? 'text-danger' : 'text-stage-negotiation',
          title: `${d.stage === 'proposal' ? t('Propuesta sin respuesta') : t('Sin contacto')} · ${d.company}`,
          meta: `${formatCurrency(d.value)} · ${t('último contacto hace {n} días', { n: days })}`,
          tab: 'Pipeline',
          focus: { dealId: d.id },
        });
      }
    }
    return items;
  }, [deals, projects, t]);
}
