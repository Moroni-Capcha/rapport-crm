import { afterEach, describe, expect, it } from 'vitest';
import { setCurrentLang, tr } from '../lib/i18n';

describe('i18n', () => {
  afterEach(() => setCurrentLang('es'));

  it('en español devuelve el texto tal cual (la clave es el español)', () => {
    setCurrentLang('es');
    expect(tr('Pipeline abierto')).toBe('Pipeline abierto');
    expect(tr('Hace {n} días', { n: 3 })).toBe('Hace 3 días');
  });

  it('en inglés traduce e interpola variables', () => {
    setCurrentLang('en');
    expect(tr('Pipeline abierto')).toBe('Open pipeline');
    expect(tr('Hace {n} días', { n: 3 })).toBe('3 days ago');
  });

  it('traduce textos guardados con partes variables', () => {
    setCurrentLang('en');
    expect(tr('Movido a Propuesta Enviada')).toBe('Moved to Proposal Sent');
    expect(tr('Presentación propuesta · Banco Ribera')).toBe('Proposal presentation · Banco Ribera');
    expect(tr('Oficinas Banco Ribera')).toBe('Banco Ribera offices');
  });

  it('si falta la traducción muestra el español, nunca una clave rota', () => {
    setCurrentLang('en');
    expect(tr('Texto que nadie tradujo')).toBe('Texto que nadie tradujo');
  });
});
