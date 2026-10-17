import { PAYMENT_PLAN } from '../data/projects';
import type { Quote, QuoteItem, QuoteRole } from '../types';
import { uid } from './format';

/** Tarifario de la agencia (USD/h) */
export const RATE_CARD: Record<QuoteRole, number> = {
  pm: 40,
  design: 45,
  frontend: 50,
  backend: 55,
  mobile: 55,
  qa: 35,
  devops: 60,
};

export const ROLE_LABEL: Record<QuoteRole, string> = {
  pm: 'Gestión de proyecto',
  design: 'Diseño UI/UX',
  frontend: 'Frontend',
  backend: 'Backend',
  mobile: 'Mobile',
  qa: 'QA',
  devops: 'DevOps / Cloud',
};

export const ROLES = Object.keys(RATE_CARD) as QuoteRole[];

export const TAX_RATE = 0.18;
/** Capacidad del equipo asignado: 3 personas × 40 h */
export const WEEKLY_CAPACITY = 120;

export type TemplateId = 'web' | 'mvp' | 'ecommerce' | 'cloud' | 'ai';

type Line = [role: QuoteRole, description: string, hours: number];

export const TEMPLATES: Record<TemplateId, { name: string; lines: Line[] }> = {
  web: {
    name: 'Web corporativa / landing',
    lines: [
      ['pm', 'Gestión del proyecto y reuniones', 20],
      ['design', 'Diseño UI/UX y prototipo navegable', 60],
      ['frontend', 'Maquetación en Next.js + CMS', 120],
      ['backend', 'Formularios e integraciones', 30],
      ['qa', 'QA, accesibilidad y ajustes', 24],
      ['devops', 'Despliegue, dominio y analítica', 8],
    ],
  },
  mvp: {
    name: 'MVP app móvil',
    lines: [
      ['pm', 'Gestión del proyecto y sprints', 50],
      ['design', 'Diseño UI/UX de la app', 120],
      ['mobile', 'Desarrollo React Native (iOS + Android)', 420],
      ['backend', 'API y panel de administración', 220],
      ['qa', 'QA en dispositivos reales', 80],
      ['devops', 'Publicación en stores y CI/CD', 30],
    ],
  },
  ecommerce: {
    name: 'E-commerce',
    lines: [
      ['pm', 'Gestión del proyecto y reuniones', 40],
      ['design', 'Diseño de tienda y checkout', 100],
      ['frontend', 'Storefront headless', 260],
      ['backend', 'Integración de pagos y ERP', 160],
      ['qa', 'QA del flujo de compra', 60],
      ['devops', 'Infraestructura y CDN', 24],
    ],
  },
  cloud: {
    name: 'Migración a la nube',
    lines: [
      ['pm', 'Gestión del proyecto y plan de migración', 80],
      ['backend', 'Refactor de servicios legacy', 600],
      ['devops', 'Arquitectura AWS e IaC (Terraform)', 420],
      ['qa', 'Pruebas de carga y de migración', 120],
    ],
  },
  ai: {
    name: 'Asistente con IA',
    lines: [
      ['pm', 'Gestión del proyecto y piloto', 60],
      ['design', 'Diseño conversacional y UI', 80],
      ['backend', 'Orquestación LLM y RAG', 420],
      ['frontend', 'Widget web y panel de control', 160],
      ['devops', 'Infraestructura GCP y monitoreo', 120],
      ['qa', 'Evaluación y QA de respuestas', 100],
    ],
  },
};

export const newItem = (role: QuoteRole = 'frontend', description = '', hours = 8): QuoteItem => ({
  id: uid(),
  role,
  description,
  hours,
  rate: RATE_CARD[role],
});

/**
 * Partidas de una plantilla. Con `targetValue` escala las horas para que el neto
 * se acerque a ese monto (redondeando a bloques de 4 h).
 */
export function itemsFromTemplate(id: TemplateId, targetValue?: number): QuoteItem[] {
  const base = TEMPLATES[id].lines.map(([role, description, hours]) => newItem(role, description, hours));
  if (!targetValue) return base;
  const subtotal = base.reduce((s, i) => s + i.hours * i.rate, 0);
  const factor = targetValue / subtotal;
  return base.map((i) => ({ ...i, hours: Math.max(4, Math.round((i.hours * factor) / 4) * 4) }));
}

export const emptyQuote = (): Quote => ({
  items: [],
  discountPct: 0,
  includeTax: false,
  validDays: 30,
  notes: '',
  version: 0,
  updatedAt: new Date().toISOString(),
});

export interface QuoteTotals {
  hours: number;
  subtotal: number;
  discount: number;
  /** Valor del contrato antes de impuestos: es el que se guarda como valor del deal */
  net: number;
  tax: number;
  total: number;
  weeks: number;
  byRole: { role: QuoteRole; hours: number; amount: number }[];
  payments: { label: string; pct: number; amount: number }[];
}

export function quoteTotals(q: Pick<Quote, 'items' | 'discountPct' | 'includeTax'>): QuoteTotals {
  const items = q.items.filter((i) => i.hours > 0 && i.rate > 0);
  const hours = items.reduce((s, i) => s + i.hours, 0);
  const subtotal = items.reduce((s, i) => s + i.hours * i.rate, 0);
  const pct = Math.min(100, Math.max(0, q.discountPct || 0));
  const discount = Math.round((subtotal * pct) / 100);
  const net = subtotal - discount;
  const tax = q.includeTax ? Math.round(net * TAX_RATE) : 0;
  const byRole = ROLES.map((role) => {
    const list = items.filter((i) => i.role === role);
    return { role, hours: list.reduce((s, i) => s + i.hours, 0), amount: list.reduce((s, i) => s + i.hours * i.rate, 0) };
  }).filter((r) => r.hours > 0);
  return {
    hours,
    subtotal,
    discount,
    net,
    tax,
    total: net + tax,
    weeks: hours ? Math.ceil(hours / WEEKLY_CAPACITY) : 0,
    byRole,
    payments: PAYMENT_PLAN.map((p) => ({ label: p.label, pct: p.pct, amount: Math.round((net * p.pct) / 100) })),
  };
}

/** Número de propuesta legible: P-<deal>-v<versión> */
export const proposalNumber = (dealId: string, version: number) => `P-${dealId.replace(/^deal-/, '').toUpperCase()}-v${version}`;
