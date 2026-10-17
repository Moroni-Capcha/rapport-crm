import type { NavTab } from '../components/layout/TopNav';

/** A qué elemento enfocar al navegar entre vistas */
export interface Focus {
  dealId?: string;
  projectId?: string;
  company?: string;
  /** Cambia en cada navegación para re-disparar el efecto aunque el id sea el mismo */
  nonce: number;
}

export type Navigate = (tab: NavTab, focus?: Omit<Focus, 'nonce'>) => void;

export interface ViewProps {
  focus: Focus | null;
  navigate: Navigate;
  notify: (message: string) => void;
}
