import { Copy, Download, X } from 'lucide-react';
import { useEffect, useMemo } from 'react';
import { SEGMENTS, STAGE_BY_ID } from '../../data/stages';
import { formatDate } from '../../lib/format';
import { tr } from '../../lib/i18n';
import { lastTouch } from '../../store/selectors';
import type { Deal } from '../../types';
import { Button, IconButton } from '../ui/primitives';
import { useT } from '../../lib/i18n';

const SEGMENT_LABEL = Object.fromEntries(SEGMENTS.map((s) => [s.id, s.label]));

const HEADERS = [
  'Empresa', 'Proyecto', 'Etapa', 'Valor (USD)', 'Probabilidad (%)', 'Ponderado (USD)', 'Contacto', 'Cargo', 'Email',
  'Servicios', 'Segmentos', 'Responsable', 'Fuente', 'Último contacto', 'Próximo paso',
];

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function toCsv(deals: Deal[]) {
  const rows = deals.map((d) => [
    d.company,
    tr(d.project),
    tr(STAGE_BY_ID[d.stage].name),
    d.value,
    d.probability,
    Math.round((d.value * d.probability) / 100),
    d.contact.name,
    tr(d.contact.role),
    d.contact.email,
    d.services.map((s) => tr(s.label)).join(' | '),
    d.segments.map((s) => tr(SEGMENT_LABEL[s] ?? s)).join(' | '),
    d.owner,
    tr(d.source),
    formatDate(lastTouch(d).at),
    d.nextStep ? tr(d.nextStep) : '',
  ]);
  return [HEADERS.map((h) => tr(h)), ...rows].map((r) => r.map(cell).join(',')).join('\n');
}

interface ExportModalProps {
  open: boolean;
  deals: Deal[];
  filtered: boolean;
  onClose: () => void;
  notify: (m: string) => void;
}

export function ExportModal({ open, deals, filtered, onClose, notify }: ExportModalProps) {
  const t = useT();
  const csv = useMemo(() => (open ? toCsv(deals) : ''), [open, deals, t]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const filename = `rapport-pipeline-${new Date().toISOString().slice(0, 10)}.csv`;

  const download = () => {
    // BOM para que Excel respete tildes y ñ
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify(t('Descargando {file}', { file: filename }));
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(csv);
      notify(t('{n} filas copiadas al portapapeles', { n: deals.length }));
    } catch {
      // Sin permiso de portapapeles: seleccionamos el texto para copiar a mano
      const pre = document.getElementById('csv-preview');
      if (pre) {
        const range = document.createRange();
        range.selectNodeContents(pre);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
      notify(t('Texto seleccionado: copia con Ctrl+C'));
    }
  };

  const preview = csv.split('\n').slice(0, 7).join('\n');

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4 pt-[10vh]">
      <div className="animate-fade-in fixed inset-0 bg-scrim/55 backdrop-blur-[2px]" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-label={t('Exportar pipeline')} className="animate-pop relative w-full max-w-[640px] rounded-2xl border border-line-strong bg-surface shadow-2xl shadow-shade/60">
        <div className="flex items-start justify-between border-b border-line px-5 py-4">
          <div>
            <h2 className="text-[15px] font-semibold text-fg">{t('Exportar pipeline')}</h2>
            <p className="text-xs text-fg-subtle">
              {t(filtered ? '{n} deals con los filtros actuales' : '{n} deals (todo el pipeline)', { n: deals.length })} · {t('{n} columnas', { n: HEADERS.length })} · CSV
            </p>
          </div>
          <IconButton label={t('Cerrar')} onClick={onClose}>
            <X className="size-4" />
          </IconButton>
        </div>
        <div className="px-5 py-4">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{t('Vista previa')}</p>
          <pre
            id="csv-preview"
            className="scroll-thin max-h-56 overflow-auto rounded-xl border border-line bg-surface-2 p-3 font-mono text-[11px] leading-5 text-fg-muted"
          >
            {preview}
            {deals.length > 6 && `\n… ${t('{n} filas más', { n: deals.length - 6 })}`}
          </pre>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-5 py-3.5">
          <span className="text-[11.5px] text-fg-subtle">{filename}</span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={copy}>
              <Copy className="size-3.5" /> {t('Copiar')}
            </Button>
            <Button variant="primary" onClick={download}>
              <Download className="size-3.5" /> {t('Descargar CSV')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
