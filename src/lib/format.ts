import { currentLocale, tr } from './i18n';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const usdCompact = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  notation: 'compact',
  maximumFractionDigits: 1,
});

export const formatCurrency = (value: number, compact = false) =>
  compact ? usdCompact.format(value) : usd.format(value);

const DAY = 86_400_000;

export const daysAgo = (days: number, hour = 10) => {
  const d = new Date(Date.now() - days * DAY);
  d.setHours(hour, 0, 0, 0);
  return d.toISOString();
};

export const daysSince = (iso: string) => Math.max(0, Math.floor((Date.now() - new Date(iso).getTime()) / DAY));

export const formatRelative = (iso: string) => {
  const d = daysSince(iso);
  if (d === 0) return tr('Hoy');
  if (d === 1) return tr('Ayer');
  if (d < 7) return tr('Hace {n} días', { n: d });
  if (d < 30) return tr('Hace {n} sem', { n: Math.floor(d / 7) });
  return new Date(iso).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' });
};

export const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short', year: 'numeric' });

/** 0–6 días: al día · 7–13: atención · 14+: frío */
export const staleness = (iso: string): 'fresh' | 'warm' | 'cold' => {
  const d = daysSince(iso);
  if (d < 7) return 'fresh';
  if (d < 14) return 'warm';
  return 'cold';
};

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');

export const cn = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ');

export const uid = () => Math.random().toString(36).slice(2, 10);

export const daysFromNow = (days: number, hour = 10, minute = 0) => {
  const d = new Date(Date.now() + days * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

/** Días hasta la fecha (negativo = ya pasó) */
export const daysUntil = (iso: string) => Math.ceil((new Date(iso).getTime() - Date.now()) / DAY);

export const formatShortDate = (iso: string) =>
  new Date(iso).toLocaleDateString(currentLocale(), { day: 'numeric', month: 'short' });

export const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString(currentLocale(), { hour: '2-digit', minute: '2-digit', hour12: false });

export const formatPercent = (v: number, digits = 0) => `${(v * 100).toFixed(digits)}%`;

export const monthKey = (iso: string) => {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const monthLabel = (key: string) => {
  const [y, m] = key.split('-').map(Number);
  return new Date(y!, m! - 1, 1).toLocaleDateString(currentLocale(), { month: 'short' }).replace('.', '');
};

/** Últimos n meses (incluye el actual), del más antiguo al más reciente */
export const lastMonths = (n: number, offset = 0) => {
  const now = new Date();
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - (n - 1 - i) + offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });
};

/** PRNG determinista para que los datos de ejemplo sean estables entre recargas */
export const seeded = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
