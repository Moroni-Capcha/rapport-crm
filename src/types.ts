export type StageId = 'leads' | 'discovery' | 'proposal' | 'negotiation' | 'kickoff';

export type Segment = 'enterprise' | 'smb' | 'ios' | 'ecommerce' | 'web';

export type ServiceKind = 'mobile' | 'web' | 'cloud' | 'design' | 'commerce' | 'ai' | 'backend';

export type TouchType = 'email' | 'call' | 'meeting' | 'note' | 'proposal';

export type Priority = 'alta' | 'media' | 'baja';

export interface Stage {
  id: StageId;
  name: string;
  hint: string;
  /** Clase Tailwind del color de acento (bg-*) */
  accent: string;
  /** Probabilidad de cierre por defecto al entrar en la etapa */
  probability: number;
}

export interface Service {
  label: string;
  kind: ServiceKind;
}

export interface Activity {
  id: string;
  type: TouchType;
  text: string;
  at: string; // ISO
}

export interface Contact {
  name: string;
  role: string;
  email: string;
  phone: string;
}

export interface Deal {
  id: string;
  company: string;
  project: string;
  contact: Contact;
  value: number;
  probability: number;
  services: Service[];
  segments: Segment[];
  stage: StageId;
  priority: Priority;
  owner: string;
  source: string;
  nextStep?: string;
  notes: string;
  activities: Activity[]; // más reciente primero
  createdAt: string;
  /** Se llena al pasar el deal a Projects */
  projectId?: string;
  /** Cotización armada con el cotizador */
  quote?: Quote;
}

/* ───────────────────────── Cotizador ───────────────────────── */

export type QuoteRole = 'pm' | 'design' | 'frontend' | 'backend' | 'mobile' | 'qa' | 'devops';

export interface QuoteItem {
  id: string;
  role: QuoteRole;
  description: string;
  hours: number;
  /** USD por hora */
  rate: number;
}

export interface Quote {
  items: QuoteItem[];
  discountPct: number;
  /** IGV 18 % (Perú) sobre el neto */
  includeTax: boolean;
  validDays: number;
  notes: string;
  version: number;
  updatedAt: string;
}

export type SortKey = 'recent' | 'value' | 'probability' | 'manual';

export interface BoardSettings {
  showProbability: boolean;
  compact: boolean;
}

/* ───────────────────────── Projects / Finance ───────────────────────── */

export type ProjectPhase = 'discovery' | 'design' | 'development' | 'qa' | 'launch';

export type Health = 'on-track' | 'at-risk' | 'delayed';

/** Estado guardado del hito. "Vencida" se deriva (enviada + fecha pasada). */
export type MilestoneStatus = 'pending' | 'draft' | 'sent' | 'paid';

export type InvoiceStatus = MilestoneStatus | 'overdue';

export interface Milestone {
  id: string;
  label: string;
  pct: number;
  amount: number;
  dueAt: string;
  status: MilestoneStatus;
  invoiceNumber?: string;
  paidAt?: string;
}

export interface Project {
  id: string;
  dealId?: string;
  company: string;
  name: string;
  services: Service[];
  value: number;
  phase: ProjectPhase;
  progress: number;
  health: Health;
  startAt: string;
  dueAt: string;
  lead: string;
  team: string[];
  hoursUsed: number;
  hoursBudget: number;
  sprint: number;
  milestones: Milestone[];
  isNew?: boolean;
}

/* ───────────────────────── Schedule ───────────────────────── */

export type EventType = 'discovery' | 'demo' | 'proposal' | 'kickoff' | 'followup' | 'internal';

export interface CalendarEvent {
  id: string;
  title: string;
  type: EventType;
  company?: string;
  dealId?: string;
  projectId?: string;
  start: string; // ISO
  minutes: number;
  attendees: string[];
  location: string;
}

/* ───────────────────────── Customers / Growth ───────────────────────── */

export interface CustomerMeta {
  company: string;
  industry: string;
  city: string;
  website: string;
  since: number;
  segment: Segment;
  contact?: Contact;
}

export interface ClosedDeal {
  id: string;
  company: string;
  title: string;
  value: number;
  source: string;
  segment: Segment;
  service: Service;
  outcome: 'won' | 'lost';
  lossReason?: string;
  /** Índice de la última etapa alcanzada (0 = Leads … 4 = Kickoff) */
  reached: number;
  closedAt: string;
  cycleDays: number;
  owner: string;
}
