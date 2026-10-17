import { ArrowRight, Building2, Languages, CornerDownLeft, FileText, FolderKanban, Moon, Plus, RotateCcw, Search, Sun, Target } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { KeyboardEvent } from 'react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CUSTOMERS } from '../../data/customers';
import { STAGE_BY_ID } from '../../data/stages';
import { cn, formatCurrency } from '../../lib/format';
import type { Theme } from '../../lib/theme';
import { useStore } from '../../store/AppStore';
import { invoicesOf, INVOICE_META } from '../../store/selectors';
import type { Navigate } from '../../views/types';
import { Kbd } from '../ui/primitives';
import { NAV_TABS } from './TopNav';
import { useLang, useT } from '../../lib/i18n';

interface Item {
  id: string;
  group: string;
  icon: LucideIcon;
  label: string;
  sub?: string;
  hint?: string;
  run: () => void;
}

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;
  navigate: Navigate;
  onNewLead: () => void;
  theme: Theme;
  onToggleTheme: () => void;
  onResetDemo: () => void;
}

/** Normaliza para buscar sin importar tildes ni mayúsculas */
const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

const GROUP_LIMIT = 5;

export function CommandPalette({ open, onClose, navigate, onNewLead, theme, onToggleTheme, onResetDemo }: CommandPaletteProps) {
  const { deals, projects } = useStore();
  const t = useT();
  const { lang, toggle: toggleLang } = useLang();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    requestAnimationFrame(() => inputRef.current?.focus());
  }, [open]);

  const all = useMemo<Item[]>(() => {
    const go: Navigate = (tab, focus) => navigate(tab, focus);
    const actions: Item[] = [
      { id: 'a-lead', group: t('Acciones'), icon: Plus, label: t('Nuevo lead'), hint: 'N', run: onNewLead },
      {
        id: 'a-theme',
        group: t('Acciones'),
        icon: theme === 'dark' ? Sun : Moon,
        label: theme === 'dark' ? t('Cambiar a modo claro') : t('Cambiar a modo oscuro'),
        run: onToggleTheme,
      },
      { id: 'a-lang', group: t('Acciones'), icon: Languages, label: lang === 'es' ? 'Switch to English' : 'Cambiar a español', run: toggleLang },
      { id: 'a-reset', group: t('Acciones'), icon: RotateCcw, label: t('Restablecer datos de la demo'), run: onResetDemo },
    ];
    const nav: Item[] = NAV_TABS.map((tab) => ({ id: `n-${tab}`, group: t('Ir a'), icon: ArrowRight, label: tab, run: () => go(tab) }));
    const dealItems: Item[] = deals.map((d) => ({
      id: `d-${d.id}`,
      group: t('Deals'),
      icon: Target,
      label: `${d.company} — ${t(d.project)}`,
      sub: `${t(STAGE_BY_ID[d.stage].name)} · ${formatCurrency(d.value)} · ${d.contact.name}`,
      run: () => go('Pipeline', { dealId: d.id }),
    }));
    const customerItems: Item[] = CUSTOMERS.map((c) => ({
      id: `c-${c.company}`,
      group: t('Clientes'),
      icon: Building2,
      label: c.company,
      sub: `${t(c.industry)} · ${c.city}${c.contact ? ` · ${c.contact.name}` : ''}`,
      run: () => go('Customers', { company: c.company }),
    }));
    const projectItems: Item[] = projects.map((p) => ({
      id: `p-${p.id}`,
      group: t('Proyectos'),
      icon: FolderKanban,
      label: t(p.name),
      sub: `${p.company} · ${p.progress}% · ${t('lidera {name}', { name: p.lead })}`,
      run: () => go('Projects', { projectId: p.id }),
    }));
    const invoiceItems: Item[] = invoicesOf(projects)
      .filter((i) => i.invoiceNumber)
      .map((i) => ({
        id: `i-${i.id}`,
        group: t('Facturas'),
        icon: FileText,
        label: `${i.invoiceNumber} · ${i.project.company}`,
        sub: `${t(i.label)} · ${formatCurrency(i.amount)} · ${t(INVOICE_META[i.displayStatus].label)}`,
        run: () => go('Finance'),
      }));
    return [...actions, ...nav, ...dealItems, ...customerItems, ...projectItems, ...invoiceItems];
  }, [deals, projects, navigate, onNewLead, theme, onToggleTheme, onResetDemo, t, lang, toggleLang]);

  const results = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return all.filter((i) => i.id.startsWith('a-') || i.id.startsWith('n-'));
    const counts: Record<string, number> = {};
    return all.filter((i) => {
      if (!norm(`${i.label} ${i.sub ?? ''}`).includes(q)) return false;
      counts[i.group] = (counts[i.group] ?? 0) + 1;
      return counts[i.group]! <= GROUP_LIMIT;
    });
  }, [all, query]);

  useEffect(() => setActive(0), [query]);

  // Mantiene visible el ítem activo al navegar con teclado
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  if (!open) return null;

  const runItem = (item: Item | undefined) => {
    if (!item) return;
    onClose();
    item.run();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(results.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      runItem(results[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  let lastGroup = '';

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 pt-[12vh]">
      <div className="animate-fade-in fixed inset-0 bg-scrim/50 backdrop-blur-[2px]" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t('Búsqueda global')}
        onKeyDown={onKeyDown}
        className="animate-pop relative w-full max-w-[600px] overflow-hidden rounded-2xl border border-line-strong bg-surface shadow-2xl shadow-shade/60"
      >
        <label className="flex items-center gap-3 border-b border-line px-4">
          <Search className="size-4 shrink-0 text-fg-subtle" />
          <input
            ref={inputRef}
            id="command-search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('Buscar deals, clientes, proyectos, facturas o acciones…')}
            role="combobox"
            aria-expanded="true"
            aria-controls="command-results"
            aria-activedescendant={results[active] ? `cmd-${results[active]!.id}` : undefined}
            className="h-12 min-w-0 flex-1 bg-transparent text-[14px] text-fg outline-none placeholder:text-fg-subtle"
          />
          <Kbd>Esc</Kbd>
        </label>

        <div ref={listRef} id="command-results" role="listbox" className="scroll-thin max-h-[52vh] overflow-y-auto p-1.5">
          {results.length === 0 && <p className="px-3 py-10 text-center text-[13px] text-fg-subtle">{t('Sin resultados para “{q}”.', { q: query })}</p>}
          {results.map((item, index) => {
            const header = item.group !== lastGroup;
            lastGroup = item.group;
            const Icon = item.icon;
            return (
              <div key={item.id}>
                {header && <p className="px-3 pb-1 pt-2.5 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{item.group}</p>}
                <button
                  id={`cmd-${item.id}`}
                  role="option"
                  aria-selected={index === active}
                  data-index={index}
                  onMouseMove={() => setActive(index)}
                  onClick={() => runItem(item)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
                    index === active ? 'bg-ink/[0.07]' : 'hover:bg-ink/[0.04]',
                  )}
                >
                  <Icon className="size-4 shrink-0 text-fg-subtle" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] text-fg">{item.label}</span>
                    {item.sub && <span className="block truncate text-[11.5px] text-fg-subtle">{item.sub}</span>}
                  </span>
                  {item.hint && <Kbd>{item.hint}</Kbd>}
                  {index === active && <CornerDownLeft className="size-3.5 shrink-0 text-fg-subtle" />}
                </button>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-4 border-t border-line px-4 py-2 text-[11px] text-fg-subtle">
          <span className="flex items-center gap-1.5"><Kbd>↑</Kbd><Kbd>↓</Kbd> {t('navegar')}</span>
          <span className="flex items-center gap-1.5"><Kbd>↵</Kbd> {t('abrir')}</span>
          <span className="ml-auto flex items-center gap-1.5"><Kbd>Ctrl</Kbd><Kbd>K</Kbd> {t('en cualquier vista')}</span>
        </div>
      </div>
    </div>
  );
}
