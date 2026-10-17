import type { CalendarEvent, EventType } from '../types';

export const EVENT_META: Record<EventType, { label: string; dot: string; block: string }> = {
  discovery: { label: 'Discovery', dot: 'bg-stage-discovery', block: 'border-stage-discovery/50 bg-stage-discovery/10' },
  demo: { label: 'Demo', dot: 'bg-stage-proposal', block: 'border-stage-proposal/50 bg-stage-proposal/10' },
  proposal: { label: 'Propuesta', dot: 'bg-stage-negotiation', block: 'border-stage-negotiation/50 bg-stage-negotiation/10' },
  kickoff: { label: 'Kickoff', dot: 'bg-stage-kickoff', block: 'border-stage-kickoff/50 bg-stage-kickoff/10' },
  followup: { label: 'Follow-up', dot: 'bg-fg-muted', block: 'border-ink/20 bg-ink/[0.05]' },
  internal: { label: 'Interno', dot: 'bg-stage-leads', block: 'border-ink/10 bg-ink/[0.025]' },
};

/** Lunes 00:00 de la semana que contiene `date` */
export const startOfWeek = (date = new Date()) => {
  const d = new Date(date);
  const day = (d.getDay() + 6) % 7; // 0 = lunes
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
};

/** Semana "actual" de la agenda: si hoy es sábado o domingo, la semana que empieza el lunes */
export const anchorWeek = () => {
  const today = new Date();
  const weekend = today.getDay() === 0 || today.getDay() === 6;
  const d = startOfWeek(today);
  if (weekend) d.setDate(d.getDate() + 7);
  return d;
};

const at = (weekOffset: number, weekday: number, hour: number, minute = 0) => {
  const d = anchorWeek();
  d.setDate(d.getDate() + weekOffset * 7 + weekday);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

type Row = [w: number, day: number, h: number, m: number, minutes: number, type: EventType, title: string, company: string | undefined, attendees: string[], location: string, dealId?: string, projectId?: string];

// Semana anterior (-1), actual (0) y dos siguientes. day: 0 = lunes … 4 = viernes
const ROWS: Row[] = [
  [-1, 0, 9, 0, 45, 'internal', 'Pipeline review semanal', undefined, ['Andrea Paz', 'Diego Salas', 'Lucía Ferré'], 'Sala Ancón'],
  [-1, 1, 11, 0, 60, 'discovery', 'Discovery · LogiTrack Cargo', 'LogiTrack Cargo', ['Ricardo Palma', 'Diego Salas'], 'Google Meet', 'deal-8'],
  [-1, 2, 15, 0, 60, 'demo', 'Sprint demo · Inca Pay', 'Inca Pay', ['Fernando Arce', 'Diego Salas'], 'Zoom', undefined, 'prj-1'],
  [-1, 3, 10, 30, 60, 'proposal', 'Presentación propuesta · Banco Ribera', 'Banco Ribera', ['Mariana Cuéllar', 'Andrea Paz'], 'Oficinas Banco Ribera', 'deal-11'],
  [-1, 4, 16, 0, 30, 'followup', 'Follow-up · Pulso Health', 'Pulso Health', ['Esteban Ruiz'], 'Llamada', 'deal-10'],

  [0, 0, 9, 0, 45, 'internal', 'Pipeline review semanal', undefined, ['Andrea Paz', 'Diego Salas', 'Lucía Ferré'], 'Sala Ancón'],
  [0, 0, 11, 30, 60, 'discovery', 'Discovery · Clínica San Gabriel', 'Clínica San Gabriel', ['Dra. Carla Benavides', 'Lucía Ferré'], 'Google Meet', 'deal-5'],
  [0, 0, 16, 0, 30, 'followup', 'Follow-up propuesta · Moda Urbana', 'Moda Urbana', ['Camila Ortega', 'Andrea Paz'], 'Llamada', 'deal-9'],
  [0, 1, 10, 0, 90, 'demo', 'Demo QA · Motor de reservas', 'Tambo Hoteles', ['Lucía Huamán', 'Lucía Ferré'], 'Zoom', undefined, 'prj-2'],
  [0, 1, 15, 0, 60, 'discovery', 'Discovery · Nómada Travel', 'Nómada Travel', ['Valeria Ríos', 'Andrea Paz'], 'Google Meet', 'deal-1'],
  [0, 2, 9, 30, 60, 'proposal', 'Revisión de contrato · Verde Market', 'Verde Market', ['Tomás Aguirre', 'Diego Salas'], 'Oficina Rapport', 'deal-12'],
  [0, 2, 12, 0, 60, 'internal', 'Estimación: Grupo Andino Seguros', 'Grupo Andino Seguros', ['Diego Salas', 'Camila Ruiz', 'Elena Paredes'], 'Sala Ancón', 'deal-2'],
  [0, 2, 17, 0, 30, 'followup', 'Follow-up legal · Orbe Energía', 'Orbe Energía', ['Luis Carranza'], 'Llamada', 'deal-13'],
  [0, 3, 10, 0, 60, 'demo', 'Sprint demo · Kallpa Gym', 'Kallpa Gym', ['Natalia Flores', 'Andrea Paz'], 'Zoom', undefined, 'prj-6'],
  [0, 3, 14, 30, 90, 'discovery', 'Workshop técnico · Ludo Labs', 'Ludo Labs', ['Iván Quispe', 'Lucía Ferré', 'Joaquín Mora'], 'Google Meet', 'deal-6'],
  [0, 4, 9, 0, 120, 'kickoff', 'Kickoff · Rutas Express', 'Rutas Express', ['Gabriel Núñez', 'Diego Salas', 'Camila Ruiz', 'Joaquín Mora'], 'Oficina Rapport', 'deal-15'],
  [0, 4, 15, 0, 45, 'internal', 'Retro comercial', undefined, ['Andrea Paz', 'Diego Salas', 'Lucía Ferré'], 'Sala Ancón'],

  [1, 0, 9, 0, 45, 'internal', 'Pipeline review semanal', undefined, ['Andrea Paz', 'Diego Salas', 'Lucía Ferré'], 'Sala Ancón'],
  [1, 0, 11, 0, 120, 'kickoff', 'Kickoff · Andes Retail Group', 'Andes Retail Group', ['Daniela Prado', 'Lucía Ferré', 'Elena Paredes'], 'Oficinas Andes Retail', 'deal-16'],
  [1, 1, 10, 0, 60, 'proposal', 'Presentación propuesta · Clínica San Gabriel', 'Clínica San Gabriel', ['Dra. Carla Benavides', 'Lucía Ferré'], 'Clínica San Gabriel', 'deal-5'],
  [1, 2, 16, 0, 60, 'demo', 'Pre-lanzamiento · Portal Constructora Norte', 'Constructora Norte', ['Hugo Saavedra', 'Lucía Ferré'], 'Zoom', undefined, 'prj-5'],
  [1, 3, 11, 0, 60, 'discovery', 'Discovery · Fintrek', 'Fintrek', ['Mateo Lozano', 'Andrea Paz'], 'Google Meet', 'deal-4'],
  [1, 4, 15, 30, 30, 'followup', 'Follow-up · Kumo Coffee', 'Kumo Coffee', ['Sofía Tanaka'], 'Llamada', 'deal-3'],

  [2, 0, 9, 0, 45, 'internal', 'Pipeline review semanal', undefined, ['Andrea Paz', 'Diego Salas', 'Lucía Ferré'], 'Sala Ancón'],
  [2, 2, 10, 0, 60, 'demo', 'Sprint demo · Inca Pay', 'Inca Pay', ['Fernando Arce', 'Diego Salas'], 'Zoom', undefined, 'prj-1'],
  [2, 3, 15, 0, 60, 'proposal', 'Arquitectura objetivo · LogiTrack Cargo', 'LogiTrack Cargo', ['Ricardo Palma', 'Diego Salas', 'Elena Paredes'], 'Oficinas LogiTrack', 'deal-8'],
];

export const SEED_EVENTS: CalendarEvent[] = ROWS.map(([w, day, h, m, minutes, type, title, company, attendees, location, dealId, projectId], i) => ({
  id: `ev-${i + 1}`,
  title,
  type,
  company,
  dealId,
  projectId,
  start: at(w, day, h, m),
  minutes,
  attendees,
  location,
}));
