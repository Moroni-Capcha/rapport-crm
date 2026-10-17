import { Calendar, Columns3, FolderKanban, LayoutGrid, LineChart, Users, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/format';
import { NAV_TABS } from './TopNav';
import type { NavTab } from './TopNav';
import { useT } from '../../lib/i18n';

const ICONS: Record<NavTab, LucideIcon> = {
  Overview: LayoutGrid,
  Pipeline: Columns3,
  Customers: Users,
  Schedule: Calendar,
  Finance: Wallet,
  Growth: LineChart,
  Projects: FolderKanban,
};

/** Barra inferior para pantallas chicas: las 7 pestañas no caben arriba */
export function MobileNav({ active, onChange }: { active: NavTab; onChange: (t: NavTab) => void }) {
  const t = useT();
  return (
    <nav
      aria-label={t('Principal (móvil)')}
      className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-7 border-t border-line bg-surface/95 px-1 backdrop-blur md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      {NAV_TABS.map((tab) => {
        const Icon = ICONS[tab];
        const isActive = tab === active;
        return (
          <button
            key={tab}
            onClick={() => onChange(tab)}
            aria-current={isActive ? 'page' : undefined}
            className={cn('flex h-14 min-w-0 flex-col items-center justify-center gap-1', isActive ? 'text-fg' : 'text-fg-subtle')}
          >
            <span className={cn('flex h-6 w-10 items-center justify-center rounded-full transition-colors', isActive && 'bg-ink/[0.09]')}>
              <Icon className="size-[18px]" strokeWidth={isActive ? 2 : 1.75} />
            </span>
            <span className="max-w-full truncate text-[9.5px] font-medium">{tab}</span>
          </button>
        );
      })}
    </nav>
  );
}
