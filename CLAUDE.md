# Rapport — CRM para agencias (React + TS + Tailwind v4)

Demo de CRM y pipeline de ventas para una agencia de desarrollo web y apps móviles.
Vite + React 18 + TypeScript (strict) + Tailwind CSS v4 + lucide-react. Sin librerías de estado ni de gráficos.

## Comandos
- `npm run dev` — servidor local (http://localhost:5173)
- `npm run typecheck` — `tsc --noEmit` (debe quedar en 0 errores)
- `npm test` — Vitest 5 (tests en `src/__tests__/*.test.ts`)
- `npm run build` — typecheck + build de producción
Corre typecheck y tests después de cada cambio.
Requiere Node >=22.12 (mínimo de Vitest 5; `engines` en `package.json` y `node-version: 22` en `.github/workflows/ci.yml`).

## Arquitectura
- `src/store/AppStore.tsx`: store global con Context + `useReducer`. El `reducer` es puro y exportado (testeable).
  Estado: `deals`, `projects`, `events`, `lost`. Se persiste en localStorage (`rapport-state-v2`).
  Si cambias la forma del estado, sube la versión de la clave.
- `src/store/selectors.ts`, `src/store/useAlerts.ts`: estado derivado (facturas, vencidas, alertas).
- `src/lib/quote.ts`: lógica pura del cotizador (tarifario, plantillas, totales).
- `src/views/*View.tsx`: una vista por pestaña. La navegación entre vistas usa `navigate(tab, focus)` (ver `views/types.ts`).
- `src/components/`: `layout/`, `pipeline/`, `quote/`, `charts/` (SVG propio), `ui/` (primitivas y piezas de página).
- `src/data/`: datos de ejemplo. Fechas relativas a hoy; historial generado con PRNG con semilla.

## Convenciones (importante)
- **i18n**: todo texto visible pasa por `t()` de `useT()` (o `tr()` fuera de React). La CLAVE es el texto en español:
  `t('Pipeline abierto')`, `t('Hace {n} días', { n })`. Toda clave nueva necesita su entrada en `src/i18n/en.ts`.
  El contenido de ejemplo (proyectos, actividades) también se traduce por la misma función.
  Fechas con `currentLocale()`, nunca un locale fijo. No uses `t` como nombre de variable en callbacks.
- **Colores**: solo tokens de `src/index.css` (`bg-surface`, `text-fg-muted`, `border-line`, `bg-ink/[0.05]`, `text-danger`…).
  Nada de `white/`, `black/` ni hex sueltos: el modo claro redefine los tokens en `:root[data-theme="light"]`.
- **Accesibilidad**: modales con `role="dialog"` + `aria-modal`, Esc para cerrar, controles con `id`/label.
- Componentes funcionales, tipos en `src/types.ts`, sin `any`.

## Notas
- Moneda USD; IGV 18 % opcional en el cotizador; esquema de pagos 30/40/30 (`PAYMENT_PLAN`).
- `window.print()` imprime solo `.print-doc` (propuesta) gracias a `@media print` en `index.css`.
