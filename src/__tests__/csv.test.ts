import { afterEach, describe, expect, it } from 'vitest';
import { toCsv } from '../components/pipeline/ExportModal';
import { SEED_DEALS } from '../data/deals';
import { setCurrentLang } from '../lib/i18n';

describe('exportar CSV', () => {
  afterEach(() => setCurrentLang('es'));

  it('genera una fila por deal más encabezados', () => {
    const csv = toCsv(SEED_DEALS.slice(0, 3));
    expect(csv.split('\n')).toHaveLength(4);
    expect(csv.split('\n')[0]).toContain('Empresa,Proyecto,Etapa');
  });

  it('escapa comas y comillas', () => {
    const deal = { ...SEED_DEALS[0]!, company: 'Acme, "Global"' };
    expect(toCsv([deal])).toContain('"Acme, ""Global"""');
  });

  it('sale en el idioma activo', () => {
    setCurrentLang('en');
    const csv = toCsv(SEED_DEALS.slice(0, 1));
    expect(csv.split('\n')[0]).toContain('Company,Project,Stage');
    expect(csv).toContain('Booking app MVP');
  });
});
