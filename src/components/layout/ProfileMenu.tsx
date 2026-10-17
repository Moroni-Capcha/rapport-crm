import { Languages, LogOut, Moon, RotateCcw, Search, Sun } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { cn } from '../../lib/format';
import type { Theme } from '../../lib/theme';
import { Kbd } from '../ui/primitives';
import { useLang, useT } from '../../lib/i18n';

interface ProfileMenuProps {
  children: ReactNode;
  theme: Theme;
  onToggleTheme: () => void;
  onOpenPalette: () => void;
  onResetDemo: () => void;
  onLogout: () => void;
}

export function ProfileMenu({ children, theme, onToggleTheme, onOpenPalette, onResetDemo, onLogout }: ProfileMenuProps) {
  const t = useT();
  const { lang, toggle: toggleLang } = useLang();
  const [open, setOpen] = useState(false);
  // Restablecer pide un segundo click para confirmar (sin diálogos del navegador)
  const [confirmReset, setConfirmReset] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setConfirmReset(false);
      return;
    }
    const onDown = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const run = (fn: () => void) => () => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t('Menú de perfil')}
        className={cn('flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 transition-colors hover:bg-ink/[0.05]', open && 'bg-ink/[0.05]')}
      >
        {children}
      </button>

      {open && (
        <div role="menu" className="animate-pop absolute right-0 top-full z-40 mt-2 w-64 rounded-xl border border-line-strong bg-surface-2 p-1.5 shadow-2xl shadow-shade/60">
          <div className="px-2.5 pb-2 pt-1.5">
            <p className="text-[13px] font-medium text-fg">Andrea Paz</p>
            <p className="text-[11.5px] text-fg-subtle">andrea@rapport.agency · Head of Sales</p>
          </div>
          <div className="my-1 h-px bg-line" />
          <MenuItem icon={Search} label={t('Búsqueda global')} hint="Ctrl K" onClick={run(onOpenPalette)} />
          <MenuItem icon={theme === 'dark' ? Sun : Moon} label={theme === 'dark' ? t('Modo claro') : t('Modo oscuro')} onClick={run(onToggleTheme)} />
          <MenuItem
            icon={RotateCcw}
            label={confirmReset ? t('¿Seguro? Click para confirmar') : t('Restablecer datos de la demo')}
            danger={confirmReset}
            onClick={() => (confirmReset ? run(onResetDemo)() : setConfirmReset(true))}
          />
          <div className="my-1 h-px bg-line" />
          <MenuItem icon={Languages} label={lang === 'es' ? 'English' : 'Español'} hint={lang === 'es' ? 'EN' : 'ES'} onClick={toggleLang} />
          <div className="my-1 h-px bg-line" />
          <MenuItem icon={LogOut} label={t('Cerrar sesión')} onClick={run(onLogout)} />
        </div>
      )}
    </div>
  );
}

function MenuItem({ icon: Icon, label, hint, danger, onClick }: { icon: LucideIcon; label: string; hint?: string; danger?: boolean; onClick: () => void }) {
  return (
    <button
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] transition-colors hover:bg-ink/[0.05]',
        danger ? 'text-danger' : 'text-fg-muted hover:text-fg',
      )}
    >
      <Icon className="size-3.5 shrink-0" />
      <span className="flex-1">{label}</span>
      {hint && <Kbd>{hint}</Kbd>}
    </button>
  );
}
