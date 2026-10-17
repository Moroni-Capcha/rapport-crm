import { daysUntil } from '../lib/format';
import type { Deal, InvoiceStatus, Milestone, Project } from '../types';

/** Último contacto real (ignora notas automáticas como "Movido a…") */
export const lastTouch = (d: Deal) => d.activities.find((a) => a.type !== 'note') ?? d.activities[0]!;

/** Estado visible de una factura: "enviada" con fecha pasada = vencida */
export const invoiceStatus = (m: Milestone): InvoiceStatus =>
  m.status === 'sent' && daysUntil(m.dueAt) < 0 ? 'overdue' : m.status;

export interface InvoiceRow extends Milestone {
  project: Project;
  displayStatus: InvoiceStatus;
}

export const invoicesOf = (projects: Project[]): InvoiceRow[] =>
  projects.flatMap((project) => project.milestones.map((m) => ({ ...m, project, displayStatus: invoiceStatus(m) })));

export const INVOICE_META: Record<InvoiceStatus, { label: string; cls: string }> = {
  pending: { label: 'Programada', cls: 'border-line text-fg-subtle' },
  draft: { label: 'Borrador', cls: 'border-line-strong text-fg-muted' },
  sent: { label: 'Enviada', cls: 'border-stage-discovery/40 text-stage-discovery' },
  paid: { label: 'Pagada', cls: 'border-stage-kickoff/40 text-stage-kickoff' },
  overdue: { label: 'Vencida', cls: 'border-danger/40 text-danger' },
};
