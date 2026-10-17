import { Clock, FolderKanban, Receipt } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { AlertKind } from '../../store/useAlerts';

export const ALERT_ICON: Record<AlertKind, LucideIcon> = {
  invoice: Receipt,
  project: FolderKanban,
  deal: Clock,
};
