import { lastMonths, seeded } from '../lib/format';
import type { ClosedDeal, Segment, Service } from '../types';
import { SERVICES } from './stages';

/**
 * Historial de deals cerrados (ganados y perdidos) de los últimos 12 meses.
 * Se genera con un PRNG con semilla fija: datos realistas y estables.
 * Alimenta Overview (ingresos vs meta, embudo) y Growth (fuentes, servicios, motivos).
 */

export const SOURCES = ['Referido', 'Inbound · Web', 'Outbound · LinkedIn', 'Instagram', 'Partner AWS', 'Licitación', 'Evento · Lima Tech Week'];
const SOURCE_WEIGHT = [26, 22, 16, 12, 9, 8, 7];
/** Probabilidad de ganar por fuente: los referidos cierran mucho mejor que el outbound */
const SOURCE_WIN = [0.55, 0.36, 0.22, 0.3, 0.48, 0.33, 0.3];

export const LOSS_REASONS = ['Precio / presupuesto', 'Eligió a la competencia', 'Timing · proyecto pospuesto', 'Sin respuesta (ghosting)', 'Alcance no encaja'];
const LOSS_WEIGHT = [32, 22, 20, 16, 10];

const WON_COMPANIES = ['Inca Pay', 'Tambo Hoteles', 'EduPlus', 'Farmacia Vital', 'Constructora Norte', 'Kallpa Gym', 'Agro Export Sur', 'Sabor Peruano', 'Textil Pacífico'];
const LOST_COMPANIES = [
  'Óptica Visión', 'Colegio San Marcos', 'Transportes Lima Sur', 'Boutique Alma', 'Clínica Dental Sonrisa', 'Café Barista',
  'Seguros Pacífico Norte', 'Hostal Miraflores', 'Qoya Startup', 'Minera Huascarán', 'Lavandería Express', 'Panadería Don Lucho',
];

const SERVICE_POOL: { service: Service; segment: Segment; min: number; max: number; title: string }[] = [
  { service: SERVICES.reactNative, segment: 'ios', min: 35_000, max: 110_000, title: 'App móvil multiplataforma' },
  { service: SERVICES.swift, segment: 'ios', min: 40_000, max: 120_000, title: 'App iOS nativa' },
  { service: SERVICES.nextjs, segment: 'web', min: 12_000, max: 60_000, title: 'Sitio web / landing en Next.js' },
  { service: SERVICES.react, segment: 'smb', min: 25_000, max: 80_000, title: 'Web app a medida' },
  { service: SERVICES.shopify, segment: 'ecommerce', min: 10_000, max: 70_000, title: 'Tienda Shopify' },
  { service: SERVICES.medusa, segment: 'ecommerce', min: 50_000, max: 140_000, title: 'E-commerce headless' },
  { service: SERVICES.aws, segment: 'enterprise', min: 80_000, max: 220_000, title: 'Migración a la nube' },
  { service: SERVICES.llm, segment: 'enterprise', min: 60_000, max: 200_000, title: 'Asistente con IA' },
];
const SERVICE_WEIGHT = [18, 10, 20, 14, 14, 6, 10, 8];

const OWNERS = ['Andrea Paz', 'Diego Salas', 'Lucía Ferré'];

const pick = <T,>(rand: () => number, items: T[], weights: number[]) => {
  const total = weights.reduce((a, b) => a + b, 0);
  let r = rand() * total;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]!;
    if (r <= 0) return { item: items[i]!, index: i };
  }
  return { item: items[items.length - 1]!, index: items.length - 1 };
};

function generate(): ClosedDeal[] {
  const rand = seeded(2026);
  const months = lastMonths(12);
  const out: ClosedDeal[] = [];
  months.forEach((key, mi) => {
    const [y, m] = key.split('-').map(Number);
    const isCurrent = mi === months.length - 1;
    const today = new Date().getDate();
    const count = isCurrent ? 1 : 6 + Math.floor(rand() * 4) + Math.floor(mi / 4);
    for (let k = 0; k < count; k++) {
      const { index: si } = pick(rand, SOURCES, SOURCE_WEIGHT);
      const { item: svc } = pick(rand, SERVICE_POOL, SERVICE_WEIGHT);
      const won = rand() < SOURCE_WIN[si]! + mi * 0.006;
      const value = Math.round((svc.min + rand() * (svc.max - svc.min)) / 500) * 500;
      const day = 1 + Math.floor(rand() * (isCurrent ? Math.max(1, today - 1) : 27));
      const closed = new Date(y!, m! - 1, day, 12);
      const cycle = Math.round((svc.segment === 'enterprise' ? 55 : 28) + rand() * 30);
      const company = won
        ? WON_COMPANIES[Math.floor(rand() * WON_COMPANIES.length)]!
        : LOST_COMPANIES[Math.floor(rand() * LOST_COMPANIES.length)]!;
      out.push({
        id: `h-${key}-${k}`,
        company,
        title: svc.title,
        value,
        source: SOURCES[si]!,
        segment: svc.segment,
        service: svc.service,
        outcome: won ? 'won' : 'lost',
        lossReason: won ? undefined : pick(rand, LOSS_REASONS, LOSS_WEIGHT).item,
        // Perdidos: la mayoría cae entre Discovery y Propuesta
        reached: won ? 4 : pick(rand, [0, 1, 2, 3], [22, 34, 30, 14]).item,
        closedAt: closed.toISOString(),
        cycleDays: won ? cycle : Math.round(cycle * 0.6),
        owner: OWNERS[Math.floor(rand() * OWNERS.length)]!,
      });
    }
  });
  return out.sort((a, b) => b.closedAt.localeCompare(a.closedAt));
}

export const HISTORY: ClosedDeal[] = generate();

/** Meta mensual de ingresos cerrados (sube cada trimestre) */
export const monthlyTarget = (monthIndexFromOldest: number) => 200_000 + Math.floor(monthIndexFromOldest / 3) * 25_000;

/** Proporción del ciclo de venta que un deal pasa en cada etapa (de los ciclos ganados) */
export const STAGE_SHARE = { leads: 0.1, discovery: 0.25, proposal: 0.37, negotiation: 0.28 } as const;
