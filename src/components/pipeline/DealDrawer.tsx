import { ArrowRight, Calendar, Check, CircleX, FileText, Mail, Phone, Rocket, Tag, UserRound, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { LOSS_REASONS } from '../../data/history';
import { SEGMENTS, STAGES, STAGE_BY_ID, TOUCH_LABEL } from '../../data/stages';
import { cn, formatCurrency, formatDate, formatRelative } from '../../lib/format';
import { proposalNumber, quoteTotals } from '../../lib/quote';
import type { Deal, StageId, TouchType } from '../../types';
import { Avatar, Button, IconButton, ServiceTag } from '../ui/primitives';
import { TOUCH_ICON } from './DealCard';
import { useT } from '../../lib/i18n';

interface DealDrawerProps {
  deal: Deal | null;
  onClose: () => void;
  onMove: (id: string, stage: StageId) => void;
  onUpdate: (id: string, patch: Partial<Deal>) => void;
  onLog: (id: string, type: TouchType, text: string) => void;
  onHandoff: (deal: Deal) => void;
  onLose: (deal: Deal, reason: string) => void;
  onQuote: (deal: Deal) => void;
  onPreview: (deal: Deal) => void;
}

export function DealDrawer({ deal, onClose, onMove, onUpdate, onLog, onHandoff, onLose, onQuote, onPreview }: DealDrawerProps) {
  const t = useT();
  const [notes, setNotes] = useState('');
  const [logType, setLogType] = useState<TouchType>('call');
  const [logText, setLogText] = useState('');
  // Flujo de pérdida: null = cerrado, '' = abierto sin motivo elegido
  const [lossReason, setLossReason] = useState<string | null>(null);

  useEffect(() => {
    setNotes(deal?.notes ?? '');
    setLogText('');
    setLossReason(null);
  }, [deal?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!deal) return;
    // Esc cierra el drawer solo si no hay otro modal encima (cotizador, propuesta)
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && document.querySelectorAll('[aria-modal="true"]').length <= 1 && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [deal, onClose]);

  if (!deal) return null;

  const stageIndex = STAGES.findIndex((s) => s.id === deal.stage);
  const next = STAGES[stageIndex + 1];
  const won = deal.stage === 'kickoff';

  const submitLog = () => {
    if (!logText.trim()) return;
    onLog(deal.id, logType, logText.trim());
    setLogText('');
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="animate-fade-in absolute inset-0 bg-scrim/50 backdrop-blur-[2px]" onClick={onClose} />

      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t('Detalle de {name}', { name: deal.company })}
        className="animate-slide-in relative flex h-full w-full max-w-[460px] flex-col border-l border-line-strong bg-surface shadow-2xl shadow-shade/60"
      >
        {/* Cabecera */}
        <div className="flex items-start gap-3 border-b border-line px-5 pb-5 pt-4">
          <Avatar name={deal.company} size="lg" square />
          <div className="min-w-0 flex-1 pt-0.5">
            <h2 className="truncate text-base font-semibold tracking-tight text-fg">{deal.company}</h2>
            <p className="truncate text-[13px] text-fg-subtle">{t(deal.project)}</p>
          </div>
          <IconButton label={t('Cerrar')} onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>

        <div className="scroll-thin flex-1 overflow-y-auto">
          {/* Valor + etapa */}
          <section className="space-y-4 px-5 py-5">
            <div className="flex items-end justify-between">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{t('Valor estimado')}</p>
                <p className="tabular mt-1 text-2xl font-semibold tracking-tight text-fg">{formatCurrency(deal.value)}</p>
              </div>
              <div className="text-right">
                <p className="text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{t('Ponderado')}</p>
                <p className="tabular mt-1 text-sm font-medium text-fg-muted">
                  {formatCurrency((deal.value * deal.probability) / 100)} · {deal.probability}%
                </p>
              </div>
            </div>

            {/* Selector de etapa (alternativa accesible al drag & drop) */}
            <div>
              <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{t('Etapa')}</p>
              <div className="grid grid-cols-5 gap-1">
                {STAGES.map((s, i) => (
                  <button
                    key={s.id}
                    onClick={() => onMove(deal.id, s.id)}
                    title={t(s.name)}
                    aria-pressed={s.id === deal.stage}
                    className="group flex flex-col gap-1.5"
                  >
                    <span
                      className={cn(
                        'h-1.5 rounded-full transition-colors',
                        i <= stageIndex ? s.accent : 'bg-ink/[0.07] group-hover:bg-ink/15',
                      )}
                    />
                    <span
                      className={cn(
                        'truncate text-left text-[10.5px] leading-tight',
                        s.id === deal.stage ? 'font-medium text-fg' : 'text-fg-subtle group-hover:text-fg-muted',
                      )}
                    >
                      {t(s.name).split(' ')[0]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              {won ? (
                <Button variant="primary" className="flex-1" onClick={() => onHandoff(deal)}>
                  <Rocket className="size-3.5" /> {deal.projectId ? t('Ver proyecto en Projects') : t('Pasar a Projects')}
                </Button>
              ) : (
                <>
                  {next && (
                    <Button variant="primary" className="flex-1 whitespace-nowrap" onClick={() => onMove(deal.id, next.id)} title={t('Avanzar a {stage}', { stage: t(next.name) })}>
                      {t('Avanzar a {stage}', { stage: t(next.name).split(' ')[0]! })} <ArrowRight className="size-3.5" />
                    </Button>
                  )}
                  {deal.stage !== 'negotiation' && (
                    <Button variant="outline" onClick={() => onMove(deal.id, 'kickoff')}>
                      <Check className="size-3.5" /> {t('Ganado')}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    onClick={() => setLossReason((r) => (r === null ? '' : null))}
                    aria-expanded={lossReason !== null}
                    className={lossReason !== null ? 'border-danger/40 text-danger' : undefined}
                  >
                    <CircleX className="size-3.5" /> {t('Perdido')}
                  </Button>
                </>
              )}
            </div>

            {lossReason !== null && !won && (
              <div className="animate-pop rounded-xl border border-danger/30 bg-danger/[0.04] p-3">
                <p className="text-[13px] font-medium text-fg">{t('¿Por qué se perdió?')}</p>
                <p className="mt-0.5 text-[11.5px] text-fg-subtle">{t('El deal sale del pipeline y su motivo aparece en Growth.')}</p>
                <div role="radiogroup" aria-label={t('Motivo de pérdida')} className="mt-3 flex flex-wrap gap-1.5">
                  {LOSS_REASONS.map((r) => (
                    <button
                      key={r}
                      role="radio"
                      aria-checked={lossReason === r}
                      onClick={() => setLossReason(r)}
                      className={cn(
                        'h-7 rounded-full border px-2.5 text-xs transition-colors',
                        lossReason === r ? 'border-danger/50 bg-danger/10 text-fg' : 'border-line text-fg-muted hover:border-line-strong hover:text-fg',
                      )}
                    >
                      {t(r)}
                    </button>
                  ))}
                </div>
                <div className="mt-3 flex justify-end gap-2">
                  <Button size="sm" variant="ghost" onClick={() => setLossReason(null)}>
                    {t('Cancelar')}
                  </Button>
                  <Button size="sm" variant="primary" disabled={!lossReason} onClick={() => lossReason && onLose(deal, lossReason)}>
                    {t('Marcar como perdido')}
                  </Button>
                </div>
              </div>
            )}
          </section>

          {/* Contacto */}
          <Section title={t('Cotización')}>
            {deal.quote ? (
              (() => {
                const q = quoteTotals(deal.quote);
                return (
                  <div className="rounded-xl border border-line bg-surface-2 p-3">
                    <div className="flex items-start gap-3">
                      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface">
                        <FileText className="size-3.5 text-fg-muted" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="tabular text-[13px] font-medium text-fg">{proposalNumber(deal.id, deal.quote.version)}</p>
                        <p className="text-[11.5px] text-fg-subtle">
                          {t('{h} h · {w} semanas · actualizada {when}', { h: q.hours.toLocaleString(), w: q.weeks, when: formatRelative(deal.quote.updatedAt).toLowerCase() })}
                        </p>
                      </div>
                      <span className="tabular text-[13px] font-semibold text-fg">{formatCurrency(q.net)}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" variant="outline" className="flex-1" onClick={() => onPreview(deal)}>
                        {t('Ver propuesta')}
                      </Button>
                      <Button size="sm" variant="ghost" className="flex-1" onClick={() => onQuote(deal)}>
                        {t('Editar cotización')}
                      </Button>
                    </div>
                  </div>
                );
              })()
            ) : (
              <div className="flex items-center justify-between gap-3 rounded-xl border border-dashed border-line px-3 py-3">
                <p className="text-[12.5px] text-fg-subtle">{t('Arma la propuesta por partidas y el valor del deal se actualiza solo.')}</p>
                <Button size="sm" variant="outline" className="shrink-0" onClick={() => onQuote(deal)}>
                  <FileText className="size-3" /> {t('Cotizar')}
                </Button>
              </div>
            )}
          </Section>

          <Section title={t('Contacto principal')}>
            <div className="flex items-center gap-3 rounded-xl border border-line bg-surface-2 p-3">
              <Avatar name={deal.contact.name} size="md" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-fg">{deal.contact.name}</p>
                <p className="truncate text-xs text-fg-subtle">{t(deal.contact.role)}</p>
              </div>
              <a href={`mailto:${deal.contact.email}`} title={deal.contact.email} className="rounded-md p-1.5 text-fg-subtle hover:bg-ink/[0.06] hover:text-fg">
                <Mail className="size-4" />
              </a>
              <a href={`tel:${deal.contact.phone.replace(/\s/g, '')}`} title={deal.contact.phone} className="rounded-md p-1.5 text-fg-subtle hover:bg-ink/[0.06] hover:text-fg">
                <Phone className="size-4" />
              </a>
            </div>
          </Section>

          {/* Detalles */}
          <Section title={t('Detalles')}>
            <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2.5 text-[13px]">
              <Meta icon={UserRound} label={t('Responsable')} value={deal.owner} />
              <Meta icon={Tag} label={t('Fuente')} value={t(deal.source)} />
              <Meta icon={Calendar} label={t('Creado')} value={formatDate(deal.createdAt)} />
              {deal.nextStep && <Meta icon={ArrowRight} label={t('Próximo paso')} value={t(deal.nextStep)} />}
            </dl>
            <div className="mt-4 flex flex-wrap gap-1">
              {deal.services.map((s) => (
                <ServiceTag key={s.label} service={s} />
              ))}
            </div>
            <div className="mt-2 flex flex-wrap gap-1">
              {deal.segments.map((id) => (
                <span key={id} className="rounded-full border border-line px-2 py-0.5 text-[11px] text-fg-subtle">
                  {t(SEGMENTS.find((s) => s.id === id)?.label ?? '')}
                </span>
              ))}
            </div>
          </Section>

          {/* Registrar actividad */}
          <Section title={t('Actividad')}>
            <div className="rounded-xl border border-line bg-surface-2 focus-within:border-line-strong">
              <textarea
                value={logText}
                onChange={(e) => setLogText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.metaKey || e.ctrlKey) && submitLog()}
                rows={2}
                placeholder={t('Registrar llamada, email o reunión…')}
                className="block w-full resize-none bg-transparent px-3 pt-2.5 text-[13px] text-fg outline-none placeholder:text-fg-subtle"
              />
              <div className="flex items-center justify-between px-2 pb-2">
                <div className="flex gap-0.5">
                  {(['call', 'email', 'meeting', 'note'] as TouchType[]).map((kind) => {
                    const Icon = TOUCH_ICON[kind];
                    return (
                      <button
                        key={kind}
                        onClick={() => setLogType(kind)}
                        title={t(TOUCH_LABEL[kind])}
                        aria-pressed={logType === kind}
                        className={cn(
                          'rounded-md p-1.5 transition-colors',
                          logType === kind ? 'bg-ink/[0.08] text-fg' : 'text-fg-subtle hover:text-fg-muted',
                        )}
                      >
                        <Icon className="size-3.5" />
                      </button>
                    );
                  })}
                </div>
                <Button size="sm" variant="outline" onClick={submitLog} disabled={!logText.trim()}>
                  {t('Registrar')}
                </Button>
              </div>
            </div>

            <ol className="relative mt-4 space-y-4 before:absolute before:bottom-2 before:left-[11px] before:top-2 before:w-px before:bg-line">
              {deal.activities.map((a) => {
                const Icon = TOUCH_ICON[a.type];
                return (
                  <li key={a.id} className="relative flex gap-3">
                    <span className="z-10 flex size-6 shrink-0 items-center justify-center rounded-full border border-line-strong bg-surface text-fg-subtle">
                      <Icon className="size-3" />
                    </span>
                    <div className="min-w-0 pt-0.5">
                      <p className="text-[13px] leading-snug text-fg-muted">{t(a.text)}</p>
                      <p className="mt-0.5 text-[11px] text-fg-subtle">
                        {t(TOUCH_LABEL[a.type])} · {formatRelative(a.at)}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Section>

          {/* Notas */}
          <Section title={t('Notas internas')} last>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              onBlur={() => notes !== deal.notes && onUpdate(deal.id, { notes })}
              rows={4}
              placeholder={t('Stakeholders, riesgos, objeciones, decisiones de stack…')}
              className="block w-full resize-none rounded-xl border border-line bg-surface-2 px-3 py-2.5 text-[13px] text-fg outline-none placeholder:text-fg-subtle focus:border-line-strong"
            />
            <p className="mt-1.5 text-[11px] text-fg-subtle">{t('Se guarda al salir del campo.')}</p>
          </Section>
        </div>

        {/* Footer: stage label */}
        <div className="flex items-center gap-2 border-t border-line px-5 py-3 text-[11px] text-fg-subtle">
          <span className={cn('size-1.5 rounded-full', STAGE_BY_ID[deal.stage].accent)} />
          {t(STAGE_BY_ID[deal.stage].name)}
          <span className="ml-auto">ID {deal.id}</span>
        </div>
      </aside>
    </div>
  );
}

function Section({ title, children, last }: { title: string; children: ReactNode; last?: boolean }) {
  return (
    <section className={cn('border-t border-line px-5 py-5', last && 'pb-6')}>
      <h3 className="mb-3 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{title}</h3>
      {children}
    </section>
  );
}

function Meta({ icon: Icon, label, value }: { icon: typeof Tag; label: string; value: string }) {
  return (
    <>
      <dt className="flex items-center gap-2 text-fg-subtle">
        <Icon className="size-3.5" /> {label}
      </dt>
      <dd className="text-fg-muted">{value}</dd>
    </>
  );
}
