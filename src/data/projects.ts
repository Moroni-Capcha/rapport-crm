import { daysAgo, daysFromNow, uid } from '../lib/format';
import type { Deal, Health, Milestone, MilestoneStatus, Project, ProjectPhase } from '../types';
import { SERVICES as S } from './stages';

export const PHASES: { id: ProjectPhase; name: string }[] = [
  { id: 'discovery', name: 'Discovery' },
  { id: 'design', name: 'Diseño' },
  { id: 'development', name: 'Desarrollo' },
  { id: 'qa', name: 'QA' },
  { id: 'launch', name: 'Lanzamiento' },
];

export const HEALTH_META: Record<Health, { label: string; dot: string; text: string }> = {
  'on-track': { label: 'En tiempo', dot: 'bg-stage-kickoff', text: 'text-stage-kickoff' },
  'at-risk': { label: 'En riesgo', dot: 'bg-stage-negotiation', text: 'text-stage-negotiation' },
  delayed: { label: 'Atrasado', dot: 'bg-danger', text: 'text-danger' },
};

/** Esquema de pagos estándar de la agencia: 30% anticipo · 40% beta · 30% cierre */
export const PAYMENT_PLAN = [
  { label: 'Anticipo', pct: 30 },
  { label: 'Entrega beta', pct: 40 },
  { label: 'Cierre y lanzamiento', pct: 30 },
];

let invoiceSeq = 1180;
const seedInvoiceNumber = () => `F001-${++invoiceSeq}`;

/** Crea los 3 hitos. `due` en días relativos a hoy (negativo = pasado). */
function milestones(value: number, due: [number, number, number], states: [MilestoneStatus, MilestoneStatus, MilestoneStatus]): Milestone[] {
  return PAYMENT_PLAN.map((p, i) => {
    const status = states[i]!;
    const dueAt = due[i]! < 0 ? daysAgo(-due[i]!) : daysFromNow(due[i]!);
    return {
      id: uid(),
      label: p.label,
      pct: p.pct,
      amount: Math.round((value * p.pct) / 100),
      dueAt,
      status,
      invoiceNumber: status === 'sent' || status === 'paid' ? seedInvoiceNumber() : undefined,
      paidAt: status === 'paid' ? (due[i]! < 0 ? daysAgo(Math.max(0, -due[i]! - 3)) : daysAgo(1)) : undefined,
    };
  });
}

export const SEED_PROJECTS: Project[] = [
  {
    id: 'prj-1', company: 'Inca Pay', name: 'App de pagos P2P v2', services: [S.reactNative, S.node, S.aws],
    value: 128_000, phase: 'development', progress: 62, health: 'on-track', startAt: daysAgo(74), dueAt: daysFromNow(46),
    lead: 'Diego Salas', team: ['Camila Ruiz', 'Joaquín Mora', 'Elena Paredes', 'Bruno Céspedes'], hoursUsed: 1180, hoursBudget: 1900, sprint: 6,
    milestones: milestones(128_000, [-70, 12, 46], ['paid', 'sent', 'pending']),
  },
  {
    id: 'prj-2', company: 'Tambo Hoteles', name: 'Motor de reservas web', services: [S.nextjs, S.uiux, S.node],
    value: 46_000, phase: 'qa', progress: 84, health: 'at-risk', startAt: daysAgo(96), dueAt: daysFromNow(9),
    lead: 'Lucía Ferré', team: ['Valentina Soto', 'Joaquín Mora'], hoursUsed: 690, hoursBudget: 720, sprint: 8,
    milestones: milestones(46_000, [-92, -18, 9], ['paid', 'sent', 'pending']),
  },
  {
    id: 'prj-3', company: 'EduPlus', name: 'LMS para colegios', services: [S.react, S.node, S.uiux],
    value: 58_000, phase: 'design', progress: 28, health: 'on-track', startAt: daysAgo(24), dueAt: daysFromNow(98),
    lead: 'Andrea Paz', team: ['Valentina Soto', 'Renzo Abad'], hoursUsed: 240, hoursBudget: 980, sprint: 2,
    milestones: milestones(58_000, [-20, 52, 98], ['paid', 'pending', 'pending']),
  },
  {
    id: 'prj-4', company: 'Farmacia Vital', name: 'E-commerce con receta digital', services: [S.shopify, S.node],
    value: 39_500, phase: 'development', progress: 46, health: 'delayed', startAt: daysAgo(80), dueAt: daysFromNow(6),
    lead: 'Diego Salas', team: ['Bruno Céspedes', 'Renzo Abad'], hoursUsed: 610, hoursBudget: 640, sprint: 5,
    milestones: milestones(39_500, [-76, -9, 6], ['paid', 'sent', 'pending']),
  },
  {
    id: 'prj-5', company: 'Constructora Norte', name: 'Portal de clientes y postventa', services: [S.nextjs, S.aws, S.uiux],
    value: 142_000, phase: 'launch', progress: 94, health: 'on-track', startAt: daysAgo(160), dueAt: daysFromNow(4),
    lead: 'Lucía Ferré', team: ['Camila Ruiz', 'Elena Paredes', 'Valentina Soto'], hoursUsed: 1960, hoursBudget: 2100, sprint: 11,
    milestones: milestones(142_000, [-155, -40, 4], ['paid', 'paid', 'draft']),
  },
  {
    id: 'prj-6', company: 'Kallpa Gym', name: 'App iOS de reservas de clases', services: [S.swift, S.uiux],
    value: 52_000, phase: 'development', progress: 55, health: 'on-track', startAt: daysAgo(48), dueAt: daysFromNow(40),
    lead: 'Andrea Paz', team: ['Joaquín Mora', 'Valentina Soto'], hoursUsed: 470, hoursBudget: 860, sprint: 4,
    milestones: milestones(52_000, [-45, 3, 40], ['paid', 'draft', 'pending']),
  },
  {
    id: 'prj-7', company: 'Agro Export Sur', name: 'Migración a la nube y BI', services: [S.aws, S.node],
    value: 168_000, phase: 'discovery', progress: 12, health: 'on-track', startAt: daysAgo(9), dueAt: daysFromNow(140),
    lead: 'Diego Salas', team: ['Elena Paredes', 'Bruno Céspedes'], hoursUsed: 120, hoursBudget: 2400, sprint: 1,
    milestones: milestones(168_000, [-5, 70, 140], ['sent', 'pending', 'pending']),
  },
];

/** Convierte un deal ganado en proyecto (lo usa "Pasar a Projects") */
export function projectFromDeal(deal: Deal): Project {
  const weeks = Math.max(8, Math.round(deal.value / 9_000));
  const days = weeks * 7;
  return {
    id: `prj-${uid()}`,
    dealId: deal.id,
    company: deal.company,
    name: deal.project,
    services: deal.services,
    value: deal.value,
    phase: 'discovery',
    progress: 0,
    health: 'on-track',
    startAt: new Date().toISOString(),
    dueAt: daysFromNow(days),
    lead: deal.owner,
    team: [],
    hoursUsed: 0,
    hoursBudget: Math.round(deal.value / 75),
    sprint: 0,
    milestones: PAYMENT_PLAN.map((p, i) => ({
      id: uid(),
      label: p.label,
      pct: p.pct,
      amount: Math.round((deal.value * p.pct) / 100),
      dueAt: daysFromNow([7, Math.round(days * 0.6), days][i]!),
      status: i === 0 ? 'draft' : 'pending',
    })),
    isNew: true,
  };
}
