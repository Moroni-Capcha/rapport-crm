import { daysAgo } from '../lib/format';
import { itemsFromTemplate, quoteTotals } from '../lib/quote';
import type { TemplateId } from '../lib/quote';
import type { Deal, Priority, Segment, Service, StageId, TouchType } from '../types';
import { SERVICES as S, STAGE_BY_ID } from './stages';

interface Seed {
  company: string;
  project: string;
  contact: [name: string, role: string];
  value: number;
  services: Service[];
  segments: Segment[];
  stage: StageId;
  priority: Priority;
  last: [type: TouchType, daysAgo: number, summary: string];
  source: string;
  nextStep?: string;
  owner?: string;
  probability?: number;
  /** Cotización de ejemplo: plantilla + versión + descuento */
  quote?: [template: TemplateId, version: number, discountPct: number];
}

const OWNERS = ['Andrea Paz', 'Diego Salas', 'Lucía Ferré'];

const ascii = (s: string) => s.toLowerCase().normalize('NFD').replace(/[^a-z]/g, '');

const seeds: Seed[] = [
  // ── Leads Entrantes ──────────────────────────────────────────────
  {
    company: 'Nómada Travel', project: 'MVP app de reservas', contact: ['Valeria Ríos', 'Co-founder & CEO'],
    value: 38_000, services: [S.reactNative, S.node], segments: ['smb', 'ios'], stage: 'leads', priority: 'alta',
    last: ['email', 0, 'Respondió formulario web: busca MVP en 10 semanas'], source: 'Inbound · Web',
    nextStep: 'Agendar discovery call',
  },
  {
    company: 'Grupo Andino Seguros', project: 'Portal de autoservicio para asegurados', contact: ['Jorge Mendívil', 'Gerente de TI'],
    value: 145_000, services: [S.nextjs, S.aws, S.uiux], segments: ['enterprise', 'web'], stage: 'leads', priority: 'media',
    last: ['call', 3, 'Llamada de calificación: presupuesto aprobado para Q1'], source: 'Referido',
  },
  {
    company: 'Kumo Coffee', project: 'Tienda online + suscripciones', contact: ['Sofía Tanaka', 'Fundadora'],
    value: 14_500, services: [S.shopify, S.uiux], segments: ['smb', 'ecommerce'], stage: 'leads', priority: 'baja',
    last: ['email', 9, 'Pidió casos de éxito en e-commerce de café'], source: 'Instagram',
  },
  {
    company: 'Fintrek', project: 'App iOS de finanzas personales', contact: ['Mateo Lozano', 'Product Lead'],
    value: 62_000, services: [S.swift, S.uiux], segments: ['smb', 'ios'], stage: 'leads', priority: 'media',
    last: ['note', 1, 'Lead desde Product Hunt, cuenta con seed round'], source: 'Outbound · LinkedIn',
  },
  // ── Reunión Discovery ────────────────────────────────────────────
  {
    company: 'Clínica San Gabriel', project: 'App de citas y telemedicina', contact: ['Dra. Carla Benavides', 'Directora de Innovación'],
    value: 96_000, services: [S.reactNative, S.node, S.aws], segments: ['enterprise', 'ios'], stage: 'discovery', priority: 'alta',
    last: ['meeting', 2, 'Workshop de requerimientos: 3 roles de usuario, integración HIS'], source: 'Evento · Lima Tech Week',
    nextStep: 'Enviar resumen de alcance',
  },
  {
    company: 'Ludo Labs', project: 'Plataforma educativa gamificada', contact: ['Iván Quispe', 'CTO'],
    value: 54_000, services: [S.react, S.node, S.uiux], segments: ['smb', 'web'], stage: 'discovery', priority: 'media',
    last: ['call', 5, 'Definieron stack: prefieren TypeScript end-to-end'], source: 'Referido',
  },
  {
    company: 'Altura Inmobiliaria', project: 'Rediseño de sitio + buscador de proyectos', contact: ['Paula Gastelú', 'Head of Marketing'],
    value: 27_000, services: [S.nextjs, S.uiux], segments: ['smb', 'web'], stage: 'discovery', priority: 'baja',
    last: ['email', 16, 'Envió brief de marca, sin respuesta desde entonces'], source: 'Inbound · Web',
  },
  {
    company: 'LogiTrack Cargo', project: 'Migración a la nube (on-prem → AWS)', contact: ['Ricardo Palma', 'VP de Operaciones'],
    value: 180_000, services: [S.aws, S.node], segments: ['enterprise'], stage: 'discovery', priority: 'alta',
    last: ['meeting', 1, 'Auditoría técnica inicial: 14 servicios legacy'], source: 'Partner AWS',
    nextStep: 'Arquitectura objetivo v1',
  },
  // ── Propuesta Enviada ────────────────────────────────────────────
  {
    company: 'Moda Urbana', project: 'Rediseño de E-commerce headless', contact: ['Camila Ortega', 'E-commerce Manager'],
    value: 72_000, services: [S.medusa, S.nextjs, S.uiux], segments: ['ecommerce', 'web'], stage: 'proposal', priority: 'alta',
    last: ['proposal', 4, 'Propuesta v2 enviada con fases y pagos por hito'], source: 'Referido',
    nextStep: 'Follow-up de propuesta el jueves', quote: ['ecommerce', 2, 5],
  },
  {
    company: 'Pulso Health', project: 'App wearable + dashboard clínico', contact: ['Esteban Ruiz', 'Founder'],
    value: 118_000, services: [S.swift, S.kotlin, S.react], segments: ['smb', 'ios'], stage: 'proposal', priority: 'media',
    last: ['email', 8, 'Pidió desglose de horas por plataforma'], source: 'Outbound · LinkedIn',
  },
  {
    company: 'Banco Ribera', project: 'Asistente IA para atención al cliente', contact: ['Mariana Cuéllar', 'Directora Digital'],
    value: 210_000, services: [S.llm, S.node, S.gcp], segments: ['enterprise', 'web'], stage: 'proposal', priority: 'alta',
    last: ['meeting', 6, 'Presentación al comité: piden piloto de 6 semanas'], source: 'Licitación', quote: ['ai', 1, 0],
  },
  // ── Negociación y Cierre ─────────────────────────────────────────
  {
    company: 'Verde Market', project: 'Marketplace B2B para productores', contact: ['Tomás Aguirre', 'COO'],
    value: 88_000, services: [S.nextjs, S.node, S.aws], segments: ['ecommerce', 'smb'], stage: 'negotiation', priority: 'alta',
    last: ['call', 1, 'Ajuste de alcance: retiran módulo de logística de fase 1'], source: 'Inbound · Web',
    nextStep: 'Enviar contrato revisado', probability: 80, quote: ['ecommerce', 3, 8],
  },
  {
    company: 'Orbe Energía', project: 'App de campo para técnicos (offline-first)', contact: ['Luis Carranza', 'Jefe de Transformación'],
    value: 134_000, services: [S.reactNative, S.aws], segments: ['enterprise', 'ios'], stage: 'negotiation', priority: 'media',
    last: ['email', 11, 'Legal revisando cláusulas de SLA y propiedad intelectual'], source: 'Partner AWS',
  },
  {
    company: 'Studio Caleta', project: 'Web corporativa + CMS', contact: ['Renata Vidal', 'Socia'],
    value: 19_000, services: [S.nextjs, S.uiux], segments: ['smb', 'web'], stage: 'negotiation', priority: 'baja',
    last: ['meeting', 3, 'Negociando 2 rondas de diseño adicionales'], source: 'Instagram',
  },
  // ── Kickoff ──────────────────────────────────────────────────────
  {
    company: 'Rutas Express', project: 'App de delivery para conductores', contact: ['Gabriel Núñez', 'CEO'],
    value: 76_000, services: [S.reactNative, S.node], segments: ['smb', 'ios'], stage: 'kickoff', priority: 'alta',
    last: ['meeting', 0, 'Kickoff agendado: lunes 9:00 con equipo completo'], source: 'Referido',
    nextStep: 'Crear proyecto y board de sprints',
  },
  {
    company: 'Andes Retail Group', project: 'Migración de e-commerce a Shopify Plus', contact: ['Daniela Prado', 'Gerente E-commerce'],
    value: 158_000, services: [S.shopify, S.aws, S.uiux], segments: ['enterprise', 'ecommerce'], stage: 'kickoff', priority: 'media',
    last: ['email', 2, 'Contrato firmado y anticipo del 30% recibido'], source: 'Licitación',
  },
];

export const SEED_DEALS: Deal[] = seeds.map((s, i) => {
  const [lastType, lastDays, lastText] = s.last;
  const [name, role] = s.contact;
  const slug = ascii(s.company);
  const createdDays = lastDays + 6 + ((i * 7) % 23);
  // Si el deal tiene cotización, su valor es el neto de esa cotización
  const quote = s.quote
    ? {
        items: itemsFromTemplate(s.quote[0], s.value / (1 - s.quote[2] / 100)),
        discountPct: s.quote[2],
        includeTax: false,
        validDays: 30,
        notes: '',
        version: s.quote[1],
        updatedAt: daysAgo(lastDays + 1),
      }
    : undefined;
  const value = quote ? quoteTotals(quote).net : s.value;
  return {
    id: `deal-${i + 1}`,
    company: s.company,
    project: s.project,
    contact: {
      name,
      role,
      email: `${ascii(name.replace(/^Dra?\.\s*/, '').split(' ')[0]!)}@${slug}.com`,
      phone: `+51 9${String(10 + ((i * 17) % 89)).padStart(2, '0')} ${String(100 + ((i * 137) % 899))} ${String(100 + ((i * 251) % 899))}`,
    },
    value,
    quote,
    probability: s.probability ?? STAGE_BY_ID[s.stage].probability,
    services: s.services,
    segments: s.segments,
    stage: s.stage,
    priority: s.priority,
    owner: s.owner ?? OWNERS[i % OWNERS.length]!,
    source: s.source,
    nextStep: s.nextStep,
    notes: '',
    createdAt: daysAgo(createdDays),
    activities: [
      { id: `a-${i}-2`, type: lastType, text: lastText, at: daysAgo(lastDays, 11) },
      { id: `a-${i}-1`, type: 'note', text: `Lead creado · fuente: ${s.source}`, at: daysAgo(createdDays, 9) },
    ],
  };
});
