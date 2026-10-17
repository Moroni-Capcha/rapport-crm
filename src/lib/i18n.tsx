import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { EN, EN_PATTERNS } from '../i18n/en';

/**
 * i18n sin dependencias. El texto en español ES la clave:
 *   t('Pipeline abierto')            → "Open pipeline" en inglés
 *   t('Hace {n} días', { n: 3 })     → "3 days ago"
 * Ventajas: el código se lee en español, no hay archivo de claves que mantener en paralelo
 * y cualquier texto sin traducción cae al español (nunca se ve una clave rota).
 * El contenido de ejemplo (proyectos, actividades, eventos) pasa por la misma función.
 */

export type Lang = 'es' | 'en';
export type Vars = Record<string, string | number>;

const KEY = 'rapport-lang';

// Idioma activo a nivel de módulo: lo usan los helpers de formato (fechas) fuera de React.
let current: Lang = 'es';

export const currentLang = () => current;
/** Cambia el idioma fuera de React (tests, scripts). En la app usa useLang().setLang */
export const setCurrentLang = (lang: Lang) => {
  current = lang;
};
export const currentLocale = () => (current === 'en' ? 'en-US' : 'es-PE');

const interpolate = (s: string, vars?: Vars) => (vars ? s.replace(/\{(\w+)\}/g, (_, k: string) => String(vars[k] ?? '')) : s);

function toEnglish(text: string): string {
  const exact = EN[text];
  if (exact != null) return exact;
  for (const [re, fn] of EN_PATTERNS) {
    const m = text.match(re);
    if (m) return fn(m, toEnglish);
  }
  // Texto compuesto "Parte · Parte": se traduce cada segmento conocido
  if (text.includes(' · ')) {
    const parts = text.split(' · ');
    const translated = parts.map(toEnglish);
    if (translated.some((p, i) => p !== parts[i])) return translated.join(' · ');
  }
  return text;
}

/** Traduce con el idioma activo. Úsalo fuera de componentes; dentro, prefiere useT(). */
export function tr(text: string, vars?: Vars) {
  return interpolate(current === 'en' ? toEnglish(text) : text, vars);
}

export function readLang(): Lang {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'es' || saved === 'en') return saved;
  } catch {
    /* storage bloqueado */
  }
  return typeof navigator !== 'undefined' && navigator.language?.toLowerCase().startsWith('en') ? 'en' : 'es';
}

type T = (text: string, vars?: Vars) => string;

const LangContext = createContext<{ lang: Lang; setLang: (l: Lang) => void; toggle: () => void; t: T }>({
  lang: 'es',
  setLang: () => {},
  toggle: () => {},
  t: tr,
});

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLang] = useState<Lang>(readLang);
  // Se fija durante el render para que fechas y textos de este render ya salgan en el idioma nuevo
  current = lang;

  useEffect(() => {
    document.documentElement.lang = lang;
    try {
      localStorage.setItem(KEY, lang);
    } catch {
      /* sin persistencia */
    }
  }, [lang]);

  // Nueva identidad por idioma: los useMemo que dependen de `t` se recalculan al cambiarlo
  const t = useCallback<T>((text, vars) => interpolate(lang === 'en' ? toEnglish(text) : text, vars), [lang]);
  const toggle = useCallback(() => setLang((l) => (l === 'es' ? 'en' : 'es')), []);
  const value = useMemo(() => ({ lang, setLang, toggle, t }), [lang, toggle, t]);

  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

/** Función de traducción; suscribe el componente a cambios de idioma (incluso si está memoizado) */
export const useT = () => useContext(LangContext).t;
export const useLang = () => useContext(LangContext);
