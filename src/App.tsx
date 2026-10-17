import { useCallback, useEffect, useRef, useState } from 'react';
import { CommandPalette } from './components/layout/CommandPalette';
import { LoginScreen } from './components/layout/LoginScreen';
import { MobileNav } from './components/layout/MobileNav';
import { TopNav } from './components/layout/TopNav';
import type { NavTab } from './components/layout/TopNav';
import { ToolSidebar } from './components/layout/ToolSidebar';
import { NewLeadModal } from './components/pipeline/NewLeadModal';
import { Toast } from './components/ui/primitives';
import { useTheme } from './lib/theme';
import { useStore } from './store/AppStore';
import { useAlerts } from './store/useAlerts';
import type { Alert } from './store/useAlerts';
import type { BoardSettings, Deal, StageId } from './types';
import { CustomersView } from './views/CustomersView';
import { FinanceView } from './views/FinanceView';
import { GrowthView } from './views/GrowthView';
import { OverviewView } from './views/OverviewView';
import { PipelineView } from './views/PipelineView';
import { ProjectsView } from './views/ProjectsView';
import { ScheduleView } from './views/ScheduleView';
import type { Focus, Navigate } from './views/types';
import { useT } from './lib/i18n';

export default function App() {
  const { addDeal, resetDemo } = useStore();
  const alerts = useAlerts();
  const [signedIn, setSignedIn] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const { theme, toggle: toggleTheme } = useTheme();
  const t = useT();

  const [tab, setTab] = useState<NavTab>('Pipeline');
  const [focus, setFocus] = useState<Focus | null>(null);
  const [query, setQuery] = useState('');
  const [newLead, setNewLead] = useState<{ open: boolean; stage: StageId }>({ open: false, stage: 'leads' });
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [settings, setSettings] = useState<BoardSettings>({ showProbability: true, compact: false });
  const [toast, setToast] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  // Navegación entre módulos con "foco" opcional (abrir un deal, proyecto o cliente)
  const navigate = useCallback<Navigate>((next, f) => {
    setTab(next);
    setFocus(f ? { ...f, nonce: Date.now() } : null);
  }, []);

  const changeTab = useCallback((next: NavTab) => navigate(next), [navigate]);

  // La búsqueda rápida del top nav filtra el pipeline
  const handleQuery = useCallback((q: string) => {
    setQuery(q);
    setTab('Pipeline');
  }, []);

  const notify = useCallback((m: string) => setToast(m), []);
  const clearToast = useCallback(() => setToast(null), []);
  const openNewLead = useCallback((stage: StageId = 'leads') => setNewLead({ open: true, stage }), []);
  const closeNewLead = useCallback(() => setNewLead((s) => ({ ...s, open: false })), []);

  const focusSearch = useCallback(() => {
    setTab('Pipeline');
    requestAnimationFrame(() => searchRef.current?.focus());
  }, []);

  const openPalette = useCallback(() => setPaletteOpen(true), []);
  const closePalette = useCallback(() => setPaletteOpen(false), []);

  const handleReset = useCallback(() => {
    resetDemo();
    setQuery('');
    navigate('Pipeline');
    setToast(t('Datos de la demo restablecidos'));
  }, [resetDemo, navigate, t]);

  const handleLogout = useCallback(() => {
    setSignedIn(false);
    setPaletteOpen(false);
  }, []);

  const openAlert = useCallback((a: Alert) => navigate(a.tab, a.focus), [navigate]);

  const handleCreate = (deal: Deal) => {
    addDeal(deal);
    closeNewLead();
    setTab('Pipeline');
    setToast(t('Lead creado: {name}', { name: deal.company }));
  };

  // Atajos globales: Ctrl/⌘ K paleta · "/" buscar en pipeline · "n" nuevo lead
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setPaletteOpen((o) => !o);
        return;
      }
      const el = e.target as HTMLElement;
      if (el.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector('[aria-modal="true"]')) return;
      if (e.key === '/') {
        e.preventDefault();
        focusSearch();
      } else if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        openNewLead();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focusSearch, openNewLead]);

  const viewProps = { focus, navigate, notify };

  if (!signedIn) return <LoginScreen onLogin={() => setSignedIn(true)} />;

  return (
    <div className="flex h-full flex-col overflow-hidden bg-canvas">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-x-0 top-0 h-80 bg-[radial-gradient(60%_100%_at_50%_0%,color-mix(in_oklab,var(--color-ink)_4%,transparent),transparent)]"
      />

      <TopNav
        active={tab}
        onChange={changeTab}
        query={query}
        onQuery={handleQuery}
        searchRef={searchRef}
        theme={theme}
        onToggleTheme={toggleTheme}
        onOpenPalette={openPalette}
        onResetDemo={handleReset}
        onLogout={handleLogout}
      />

      <div className="relative flex min-h-0 flex-1">
        <ToolSidebar
          expanded={sidebarExpanded}
          onToggle={() => setSidebarExpanded((v) => !v)}
          onSearch={openPalette}
          onNewLead={() => openNewLead()}
          settings={settings}
          onSettings={setSettings}
          theme={theme}
          onToggleTheme={toggleTheme}
          alerts={alerts}
          onOpenAlert={openAlert}
        />

        <main key={tab} className="animate-fade-in relative min-w-0 flex-1 pb-14 md:pb-0">
          {tab === 'Overview' && <OverviewView {...viewProps} />}
          {tab === 'Pipeline' && (
            <PipelineView {...viewProps} query={query} onQuery={setQuery} settings={settings} onNewLead={openNewLead} />
          )}
          {tab === 'Customers' && <CustomersView {...viewProps} />}
          {tab === 'Schedule' && <ScheduleView {...viewProps} />}
          {tab === 'Finance' && <FinanceView {...viewProps} />}
          {tab === 'Growth' && <GrowthView {...viewProps} />}
          {tab === 'Projects' && <ProjectsView {...viewProps} />}
        </main>
      </div>

      <MobileNav active={tab} onChange={changeTab} />
      <CommandPalette
        open={paletteOpen}
        onClose={closePalette}
        navigate={navigate}
        onNewLead={openNewLead}
        theme={theme}
        onToggleTheme={toggleTheme}
        onResetDemo={handleReset}
      />
      <NewLeadModal open={newLead.open} initialStage={newLead.stage} onClose={closeNewLead} onCreate={handleCreate} />
      <Toast message={toast} onDone={clearToast} />
    </div>
  );
}
