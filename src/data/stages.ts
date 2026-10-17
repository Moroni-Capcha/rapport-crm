import type { Segment, Service, ServiceKind, Stage, TouchType } from '../types';

export const STAGES: Stage[] = [
  { id: 'leads', name: 'Leads Entrantes', hint: 'Prospecto', accent: 'bg-stage-leads', probability: 10 },
  { id: 'discovery', name: 'Reunión Discovery', hint: 'Requerimientos iniciales', accent: 'bg-stage-discovery', probability: 25 },
  { id: 'proposal', name: 'Propuesta Enviada', hint: 'Presupuesto', accent: 'bg-stage-proposal', probability: 50 },
  { id: 'negotiation', name: 'Negociación y Cierre', hint: 'Términos y contrato', accent: 'bg-stage-negotiation', probability: 75 },
  { id: 'kickoff', name: 'Kickoff', hint: 'Ganado · pasa a Projects', accent: 'bg-stage-kickoff', probability: 100 },
];

export const STAGE_BY_ID = Object.fromEntries(STAGES.map((s) => [s.id, s])) as Record<Stage['id'], Stage>;

export const SEGMENTS: { id: Segment; label: string }[] = [
  { id: 'enterprise', label: 'Enterprise' },
  { id: 'smb', label: 'SMB' },
  { id: 'ios', label: 'App iOS' },
  { id: 'ecommerce', label: 'E-commerce' },
  { id: 'web', label: 'Web Dev' },
];

export const SERVICES = {
  reactNative: { label: 'App Móvil · React Native', kind: 'mobile' },
  swift: { label: 'iOS · Swift', kind: 'mobile' },
  kotlin: { label: 'Android · Kotlin', kind: 'mobile' },
  nextjs: { label: 'Web · Next.js', kind: 'web' },
  react: { label: 'Web App · React', kind: 'web' },
  aws: { label: 'Cloud · AWS', kind: 'cloud' },
  gcp: { label: 'Cloud · GCP', kind: 'cloud' },
  uiux: { label: 'UI/UX', kind: 'design' },
  shopify: { label: 'E-commerce · Shopify', kind: 'commerce' },
  medusa: { label: 'Headless · Medusa', kind: 'commerce' },
  node: { label: 'Backend · Node.js', kind: 'backend' },
  llm: { label: 'IA · LLM', kind: 'ai' },
} satisfies Record<string, Service>;

export const SERVICE_DOT: Record<ServiceKind, string> = {
  mobile: 'bg-sky-400/80',
  web: 'bg-fg-muted',
  cloud: 'bg-amber-300/80',
  design: 'bg-pink-300/80',
  commerce: 'bg-emerald-300/80',
  ai: 'bg-violet-300/80',
  backend: 'bg-orange-300/80',
};

export const TOUCH_LABEL: Record<TouchType, string> = {
  email: 'Email',
  call: 'Llamada',
  meeting: 'Reunión',
  note: 'Nota',
  proposal: 'Propuesta',
};
