import { ChevronDown, Handshake, Moon, Search, Sun } from 'lucide-react';
import { ProfileMenu } from './ProfileMenu';
import type { RefObject } from 'react';
import { cn } from '../../lib/format';
import type { Theme } from '../../lib/theme';
import { Avatar, Kbd } from '../ui/primitives';
import { useLang, useT } from '../../lib/i18n';

export const NAV_TABS = ['Overview', 'Pipeline', 'Customers', 'Schedule', 'Finance', 'Growth', 'Projects'] as const;
export type NavTab = (typeof NAV_TABS)[number];

interface TopNavProps {
  active: NavTab;
  onChange: (tab: NavTab) => void;
  query: string;
  onQuery: (q: string) => void;
  searchRef: RefObject<HTMLInputElement>;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenPalette: () => void;
  onResetDemo: () => void;
  onLogout: () => void;
}

export function TopNav({ active, onChange, query, onQuery, searchRef, theme, onToggleTheme, onOpenPalette, onResetDemo, onLogout }: TopNavProps) {
  const t = useT();
  const { lang, toggle: toggleLang } = useLang();
  return (
    <header className="relative z-30 flex h-14 shrink-0 items-center gap-6 border-b border-line bg-canvas/80 px-4 backdrop-blur md:px-5">
      {/* Logo */}
      <a href="#" className="flex shrink-0 items-center gap-2.5" aria-label={t('Rapport — inicio')}>
        <span className="flex size-7 items-center justify-center rounded-lg border border-line-strong bg-gradient-to-b from-surface-3 to-surface-2 shadow-inner shadow-ink/5">
          <Handshake className="size-4 text-fg" strokeWidth={1.75} />
        </span>
        <span className="text-[15px] font-semibold tracking-tight text-fg">Rapport</span>
      </a>

      {/* Tabs */}
      <nav aria-label={t('Principal')} className="scroll-thin -mb-px hidden h-full md:flex min-w-0 flex-1 items-stretch gap-1 overflow-x-auto">
        {NAV_TABS.map((tab) => {
          const isActive = tab === active;
          return (
            <button
              key={tab}
              onClick={() => onChange(tab)}
              aria-current={isActive ? 'page' : undefined}
              className={cn(
                'relative flex shrink-0 items-center px-2.5 text-[13px] font-medium transition-colors',
                isActive ? 'text-fg' : 'text-fg-subtle hover:text-fg-muted',
              )}
            >
              <span className={cn('rounded-md px-2 py-1', isActive && 'bg-ink/[0.06]')}>{tab}</span>
              {isActive && <span className="absolute inset-x-3 bottom-0 h-px bg-fg" />}
            </button>
          );
        })}
      </nav>

      {/* Búsqueda + perfil */}
      <div className="ml-auto flex shrink-0 items-center gap-2 md:ml-0 md:gap-3">
        <button
          onClick={onOpenPalette}
          aria-label={t('Búsqueda global')}
          className="flex size-8 items-center justify-center rounded-lg border border-line bg-surface text-fg-subtle transition-colors hover:border-line-strong hover:text-fg lg:hidden"
        >
          <Search className="size-4" strokeWidth={1.75} />
        </button>
        <label className="group hidden h-8 w-64 items-center gap-2 rounded-lg border border-line bg-surface px-2.5 text-fg-subtle transition-colors focus-within:border-line-strong focus-within:bg-surface-2 lg:flex">
          <Search className="size-3.5" />
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder={t('Buscar empresa, contacto, servicio…')}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-fg outline-none placeholder:text-fg-subtle"
          />
          {query ? (
            <button onClick={() => onQuery('')} className="text-[11px] text-fg-subtle hover:text-fg">
              {t('Limpiar')}
            </button>
          ) : (
            <Kbd>/</Kbd>
          )}
        </label>

        <button
          onClick={onToggleTheme}
          aria-label={theme === 'dark' ? t('Cambiar a modo claro') : t('Cambiar a modo oscuro')}
          title={theme === 'dark' ? t('Modo claro') : t('Modo oscuro')}
          className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-line bg-surface text-fg-subtle transition-colors hover:border-line-strong hover:text-fg"
        >
          {theme === 'dark' ? <Sun className="size-4" strokeWidth={1.75} /> : <Moon className="size-4" strokeWidth={1.75} />}
        </button>

        <button
          onClick={toggleLang}
          aria-label={t('Cambiar idioma')}
          title={lang === 'es' ? 'Switch to English' : 'Cambiar a español'}
          className="flex h-8 shrink-0 items-center rounded-lg border border-line bg-surface px-1 text-[11px] font-semibold tracking-wide transition-colors hover:border-line-strong"
        >
          <span className={cn('rounded-md px-1.5 py-1', lang === 'es' ? 'bg-ink/[0.09] text-fg' : 'text-fg-subtle')}>ES</span>
          <span className={cn('rounded-md px-1.5 py-1', lang === 'en' ? 'bg-ink/[0.09] text-fg' : 'text-fg-subtle')}>EN</span>
        </button>

        <span className="hidden h-5 w-px bg-line-strong lg:block" />

        <ProfileMenu theme={theme} onToggleTheme={onToggleTheme} onOpenPalette={onOpenPalette} onResetDemo={onResetDemo} onLogout={onLogout}>
          <Avatar name="Andrea Paz" size="md" />
          <span className="hidden text-left leading-tight xl:block">
            <span className="block text-[13px] font-medium text-fg">Andrea Paz</span>
            <span className="block text-[11px] text-fg-subtle">Head of Sales</span>
          </span>
          <ChevronDown className="size-3.5 text-fg-subtle" />
        </ProfileMenu>
      </div>
    </header>
  );
}
