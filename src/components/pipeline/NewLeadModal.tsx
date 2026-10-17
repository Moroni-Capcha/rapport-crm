import { X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent, ReactNode } from 'react';
import { SEGMENTS, SERVICES, STAGES, STAGE_BY_ID } from '../../data/stages';
import { cn, uid } from '../../lib/format';
import type { Deal, Priority, Segment, Service, StageId } from '../../types';
import { Button, IconButton, ServiceTag } from '../ui/primitives';
import { useT } from '../../lib/i18n';

interface NewLeadModalProps {
  open: boolean;
  initialStage: StageId;
  onClose: () => void;
  onCreate: (deal: Deal) => void;
}

const SERVICE_LIST = Object.values(SERVICES) as Service[];

const EMPTY = {
  company: '',
  project: '',
  contactName: '',
  contactRole: '',
  email: '',
  value: '',
  priority: 'media' as Priority,
};

export function NewLeadModal({ open, initialStage, onClose, onCreate }: NewLeadModalProps) {
  const t = useT();
  const [form, setForm] = useState(EMPTY);
  const [stage, setStage] = useState<StageId>(initialStage);
  const [services, setServices] = useState<Service[]>([]);
  const [segments, setSegments] = useState<Segment[]>([]);
  const firstField = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setForm(EMPTY);
    setServices([]);
    setSegments([]);
    setStage(initialStage);
    requestAnimationFrame(() => firstField.current?.focus());
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, initialStage, onClose]);

  if (!open) return null;

  const set = (k: keyof typeof EMPTY) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const toggle = <T,>(list: T[], item: T) => (list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  const valid = form.company.trim() && form.contactName.trim() && Number(form.value) > 0;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!valid) return;
    const now = new Date().toISOString();
    onCreate({
      id: `deal-${uid()}`,
      company: form.company.trim(),
      project: form.project.trim() || 'Proyecto por definir',
      contact: { name: form.contactName.trim(), role: form.contactRole.trim() || 'Contacto', email: form.email.trim(), phone: '' },
      value: Number(form.value),
      probability: STAGE_BY_ID[stage].probability,
      services: services.length ? services : [SERVICES.nextjs],
      segments: segments.length ? segments : ['smb'],
      stage,
      priority: form.priority,
      owner: 'Andrea Paz',
      source: 'Manual',
      notes: '',
      createdAt: now,
      activities: [{ id: uid(), type: 'note', text: 'Lead creado manualmente', at: now }],
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[8vh]">
      <div className="animate-fade-in fixed inset-0 bg-scrim/55 backdrop-blur-[2px]" onClick={onClose} />
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label={t('Nuevo lead')}
        className="animate-pop relative w-full max-w-[560px] rounded-2xl border border-line-strong bg-surface shadow-2xl shadow-shade/60"
      >
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-fg">{t('Nuevo lead')}</h2>
            <p className="text-xs text-fg-subtle">{t('Se añadirá a {stage}', { stage: t(STAGE_BY_ID[stage].name) })}</p>
          </div>
          <IconButton label={t('Cerrar')} type="button" onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>

        <div className="grid grid-cols-2 gap-x-3 gap-y-4 px-5 py-5">
          <Field label={t('Empresa *')}>
            <input ref={firstField} value={form.company} onChange={set('company')} placeholder={t('Ej. Kumo Coffee')} className={inputCls} />
          </Field>
          <Field label={t('Valor estimado (USD) *')}>
            <input
              value={form.value}
              onChange={set('value')}
              inputMode="numeric"
              type="number"
              min={0}
              step={500}
              placeholder="45000"
              className={cn(inputCls, 'tabular')}
            />
          </Field>
          <Field label={t('Proyecto')} full>
            <input value={form.project} onChange={set('project')} placeholder={t('Ej. MVP para Startup, Migración a la nube…')} className={inputCls} />
          </Field>
          <Field label={t('Contacto *')}>
            <input value={form.contactName} onChange={set('contactName')} placeholder={t('Nombre y apellido')} className={inputCls} />
          </Field>
          <Field label={t('Cargo')}>
            <input value={form.contactRole} onChange={set('contactRole')} placeholder={t('CTO, Founder…')} className={inputCls} />
          </Field>
          <Field label="Email">
            <input value={form.email} onChange={set('email')} type="email" placeholder={t('nombre@empresa.com')} className={inputCls} />
          </Field>
          <Field label={t('Etapa')}>
            <select value={stage} onChange={(e) => setStage(e.target.value as StageId)} className={inputCls}>
              {STAGES.map((s) => (
                <option key={s.id} value={s.id} className="bg-surface-2">
                  {t(s.name)}
                </option>
              ))}
            </select>
          </Field>

          <Field label={t('Servicios')} full group>
            <div className="flex flex-wrap gap-1.5">
              {SERVICE_LIST.map((s) => {
                const on = services.includes(s);
                return (
                  <button
                    key={s.label}
                    type="button"
                    onClick={() => setServices((l) => toggle(l, s))}
                    aria-pressed={on}
                    className={cn('rounded-md transition-opacity', on ? 'opacity-100 ring-1 ring-ink/30' : 'opacity-60 hover:opacity-100')}
                  >
                    <ServiceTag service={s} />
                  </button>
                );
              })}
            </div>
          </Field>

          <Field label={t('Segmento')} group>
            <div className="flex flex-wrap gap-1.5">
              {SEGMENTS.map((s) => (
                <Pill key={s.id} on={segments.includes(s.id)} onClick={() => setSegments((l) => toggle(l, s.id))}>
                  {t(s.label)}
                </Pill>
              ))}
            </div>
          </Field>
          <Field label={t('Prioridad')} group>
            <div className="flex gap-1.5">
              {(['alta', 'media', 'baja'] as Priority[]).map((p) => (
                <Pill key={p} on={form.priority === p} onClick={() => setForm((f) => ({ ...f, priority: p }))}>
                  {t(p[0]!.toUpperCase() + p.slice(1))}
                </Pill>
              ))}
            </div>
          </Field>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-line px-5 py-3.5">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('Cancelar')}
          </Button>
          <Button type="submit" variant="primary" disabled={!valid}>
            {t('Crear lead')}
          </Button>
        </div>
      </form>
    </div>
  );
}

const inputCls =
  'h-9 w-full rounded-lg border border-line bg-surface-2 px-3 text-[13px] text-fg outline-none transition-colors placeholder:text-fg-subtle focus:border-ink/20 focus:bg-surface-3';

function Field({ label, full, group, children }: { label: string; full?: boolean; group?: boolean; children: ReactNode }) {
  // Inputs simples → <label> (click enfoca el campo). Grupos de botones → role="group".
  const Tag = group ? 'div' : 'label';
  return (
    <Tag role={group ? 'group' : undefined} aria-label={group ? label : undefined} className={cn('flex flex-col gap-1.5', full && 'col-span-2')}>
      <span className="text-xs font-medium text-fg-muted">{label}</span>
      {children}
    </Tag>
  );
}

function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={cn(
        'h-7 rounded-full border px-2.5 text-xs transition-colors',
        on ? 'border-ink/20 bg-fg text-canvas' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
      )}
    >
      {children}
    </button>
  );
}
