import { Bell, HelpCircle, PanelLeftClose, PanelLeftOpen, Search, Settings, UserPlus } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '../../lib/format';
import type { Theme } from '../../lib/theme';
import type { Alert } from '../../store/useAlerts';
import { ALERT_ICON } from './alertIcons';
import type { BoardSettings } from '../../types';
import { Kbd, Switch } from '../ui/primitives';
import { useLang, useT } from '../../lib/i18n';

type Panel = 'notifications' | 'settings' | 'help' | null;

interface ToolSidebarProps {
  expanded: boolean;
  onToggle: () => void;
  onSearch: () => void;
  onNewLead: () => void;
  settings: BoardSettings;
  onSettings: (s: BoardSettings) => void;
  theme: Theme;
  onToggleTheme: () => void;
  alerts: Alert[];
  onOpenAlert: (alert: Alert) => void;
}

export function ToolSidebar({ expanded, onToggle, onSearch, onNewLead, settings, onSettings, theme, onToggleTheme, alerts, onOpenAlert }: ToolSidebarProps) {
  const t = useT();
  const { lang, toggle: toggleLang } = useLang();
  const [panel, setPanel] = useState<Panel>(null);
  // Ids de alertas ya vistas: una alerta nueva vuelve a encender el punto
  const [seen, setSeen] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  // Cierra popovers al hacer click fuera o con Escape
  useEffect(() => {
    if (!panel) return;
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setPanel(null);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setPanel(null);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [panel]);

  const toggle = (p: Exclude<Panel, null>) => {
    setPanel((cur) => (cur === p ? null : p));
    if (p === 'notifications') setSeen(new Set(alerts.map((a) => a.id)));
  };

  const unread = alerts.some((a) => !seen.has(a.id));

  return (
    <aside
      ref={ref}
      aria-label="Herramientas"
      className={cn(
        'relative z-20 my-3 ml-3 hidden shrink-0 flex-col rounded-2xl border border-line bg-surface/90 p-1.5 shadow-xl shadow-shade/30 backdrop-blur transition-[width] duration-200 md:flex',
        expanded ? 'w-48' : 'w-12',
      )}
    >
      <div className="flex flex-col gap-1">
        <RailItem icon={Search} label={t('Búsqueda global')} hint="⌘K" expanded={expanded} onClick={onSearch} />
        <RailItem icon={UserPlus} label={t('Nuevo lead')} hint="N" expanded={expanded} onClick={onNewLead} />
        <RailItem
          icon={Bell}
          label={t('Notificaciones')}
          expanded={expanded}
          active={panel === 'notifications'}
          dot={unread}
          onClick={() => toggle('notifications')}
        />
      </div>

      <div className="mx-2 my-2 h-px bg-line" />

      <div className="flex flex-col gap-1">
        <RailItem icon={Settings} label={t('Ajustes del tablero')} expanded={expanded} active={panel === 'settings'} onClick={() => toggle('settings')} />
        <RailItem icon={HelpCircle} label={t('Ayuda y atajos')} expanded={expanded} active={panel === 'help'} onClick={() => toggle('help')} />
      </div>

      <div className="mt-auto">
        <RailItem
          icon={expanded ? PanelLeftClose : PanelLeftOpen}
          label={expanded ? t('Colapsar') : t('Expandir')}
          expanded={expanded}
          onClick={onToggle}
        />
      </div>

      {/* Popovers */}
      {panel && (
        <div
          className={cn(
            'animate-pop absolute top-1.5 z-40 w-72 rounded-xl border border-line-strong bg-surface-2 p-1.5 shadow-2xl shadow-shade/60',
            expanded ? 'left-[200px]' : 'left-[56px]',
          )}
        >
          {panel === 'notifications' && (
            <>
              <PopoverTitle>{`${t('Notificaciones')} · ${alerts.length}`}</PopoverTitle>
              <div className="scroll-thin max-h-[60vh] overflow-y-auto">
                {alerts.length === 0 && <p className="px-2 py-4 text-[13px] text-fg-subtle">{t('Todo al día. No hay alertas.')}</p>}
                {alerts.map((a) => {
                  const Icon = ALERT_ICON[a.kind];
                  return (
                    <button
                      key={a.id}
                      onClick={() => {
                        setPanel(null);
                        onOpenAlert(a);
                      }}
                      className="flex w-full gap-2.5 rounded-lg px-2 py-2 text-left hover:bg-ink/[0.05]"
                    >
                      <Icon className={cn('mt-0.5 size-3.5 shrink-0', a.tone)} />
                      <span className="min-w-0">
                        <span className="block text-[13px] leading-snug text-fg">{a.title}</span>
                        <span className="mt-0.5 block text-[11px] leading-snug text-fg-subtle">{a.meta}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </>
          )}
          {panel === 'settings' && (
            <>
              <PopoverTitle>{t('Ajustes')}</PopoverTitle>
              <Switch label={t('Modo claro')} checked={theme === 'light'} onChange={onToggleTheme} />
              <Switch label="English" checked={lang === 'en'} onChange={toggleLang} />
              <Switch
                label={t('Mostrar probabilidad')}
                checked={settings.showProbability}
                onChange={(v) => onSettings({ ...settings, showProbability: v })}
              />
              <Switch label={t('Tarjetas compactas')} checked={settings.compact} onChange={(v) => onSettings({ ...settings, compact: v })} />
            </>
          )}
          {panel === 'help' && (
            <>
              <PopoverTitle>{t('Atajos de teclado')}</PopoverTitle>
              {[
                ['Búsqueda global', 'Ctrl K'],
                ['Buscar en el pipeline', '/'],
                ['Nuevo lead', 'N'],
                ['Cerrar panel', 'Esc'],
              ].map(([label, key]) => (
                <div key={label} className="flex items-center justify-between px-2 py-1.5 text-[13px] text-fg-muted">
                  {t(label!)}
                  <Kbd>{key}</Kbd>
                </div>
              ))}
              <p className="px-2 pb-1.5 pt-2 text-[11px] leading-relaxed text-fg-subtle">
                {t('Arrastra las tarjetas entre columnas para avanzar un deal. Haz click en una tarjeta para ver el detalle.')}
              </p>
            </>
          )}
        </div>
      )}
    </aside>
  );
}

function RailItem({
  icon: Icon,
  label,
  hint,
  expanded,
  active,
  dot,
  onClick,
}: {
  icon: LucideIcon;
  label: string;
  hint?: string;
  expanded: boolean;
  active?: boolean;
  dot?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      className={cn(
        'group/rail relative flex h-9 items-center gap-3 rounded-lg px-2.5 text-fg-subtle transition-colors hover:bg-ink/[0.06] hover:text-fg',
        active && 'bg-ink/[0.07] text-fg',
      )}
    >
      <span className="relative">
        <Icon className="size-4" strokeWidth={1.75} />
        {dot && <span className="absolute -right-0.5 -top-0.5 size-1.5 rounded-full bg-stage-negotiation ring-2 ring-surface" />}
      </span>
      {expanded ? (
        <>
          <span className="truncate text-[13px] font-medium">{label}</span>
          {hint && (
            <span className="ml-auto">
              <Kbd>{hint}</Kbd>
            </span>
          )}
        </>
      ) : (
        // Tooltip en modo colapsado
        <span className="pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded-md border border-line-strong bg-surface-3 px-2 py-1 text-xs text-fg opacity-0 shadow-lg transition-opacity group-hover/rail:opacity-100">
          {label}
        </span>
      )}
    </button>
  );
}

const PopoverTitle = ({ children }: { children: string }) => (
  <p className="px-2 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-wider text-fg-subtle">{children}</p>
);
