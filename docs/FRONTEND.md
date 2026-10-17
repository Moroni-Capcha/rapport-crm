# Rapport CRM — Guía del frontend

Qué hay hoy, cómo se migra a un backend real y qué reglas se mantienen. El cronograma compartido está en `docs/PLAN.md`; el contrato y las reglas de negocio del servidor, en `docs/BACKEND.md`.

## 1. Stack

React 18 · TypeScript 5.6 (strict) · Vite 6 · Tailwind CSS 4 · dnd-kit · lucide-react · Vitest 5.

A mano (sin librería): estado global (Context + `useReducer`), gráficos SVG, i18n.

Comandos: `npm run dev`, `npm run typecheck`, `npm test`, `npm run build`. Correr typecheck y tests tras cada cambio.

## 2. Punto de migración: la fachada de `useStore()`

Los componentes **no** hacen `dispatch` directo. Consumen funciones con nombre desde `useStore()` (`src/store/AppStore.tsx`):

`moveDeal`, `reorderDeal`, `addDeal`, `updateDeal`, `logActivity`, `handoffDeal`, `updateProject`, `advancePhase`, `setMilestoneStatus`, `addEvent`, `loseDeal`, `resetDemo`.

Esto es una ventaja: la migración se hace **detrás de esa interfaz**, cambiando la implementación (de `dispatch` local a mutaciones de API) sin tocar los componentes que la usan. Cada función de la lista pasa a ser una mutación.

Los componentes y vistas que dependen del store (a migrar): `App`, `CommandPalette`, `ToolSidebar`, `DealCard`, `DealDrawer`, `ExportModal`, `FilterBar`, `KanbanBoard`, `NewLeadModal`, y las vistas `Overview`, `Pipeline`, `Projects`, `Finance`, `Customers`, `Growth` y `Schedule`.

## 3. Lógica que hoy corre en el cliente y debe pasar al servidor

| Hoy (cliente) | Dónde | Pasa a |
|---|---|---|
| Generar IDs (`uid()`) y timestamps (`at`) | `useStoreValue` | El servidor |
| Crear el proyecto y sus hitos al ganar un deal | `handoffDeal` → `projectFromDeal` | `POST /deals/:id/handoff` (transaccional) |
| Armar el `ClosedDeal` (incluye `cycleDays`, `reached`) al perder | `loseDeal` | `POST /deals/:id/lose` con `{ reason }` |
| Probabilidad al mover de etapa y actividad "Movido a …" | `reducer` | `POST /deals/:id/move` |
| Número de factura `F001-n` | `nextInvoiceNumber` | Secuencia atómica en el servidor |
| Totales del cotizador | `quoteTotals` | Se recalculan en el servidor; el cliente solo muestra |
| Orden manual del kanban (orden del array) | `deal/reorder` | Campo `position` en el servidor |
| `history` = `HISTORY` (PRNG con semilla) + perdidos | `src/data/history.ts` | `GET /metrics/*` y listado de cerrados |
| Persistencia | `localStorage` (`rapport-state-v2`) | Base de datos |

Lo que **se queda** en el cliente: `quoteTotals` como vista previa instantánea mientras se edita (el servidor es la autoridad al guardar), filtros y orden de visualización, estado de UI (modales, tabs, tema, idioma).

## 4. Capas nuevas a crear

```
src/api/        cliente HTTP tipado, normalización de errores, un archivo por recurso
src/api/hooks/  hooks de React Query (queries y mutaciones) que reemplazan al store
src/routes/     (si se adopta router) rutas por pestaña y deep link a un deal
```

- Mantener `src/types.ts` como fuente de los tipos; si el backend publica OpenAPI, generar los tipos desde ahí en vez de duplicarlos.
- Mutaciones con *optimistic update* en lo que se siente instantáneo (mover o reordenar en el kanban) y reversión si el servidor rechaza.
- Estados de **loading, error y vacío** en cada vista. Hoy no existen porque los datos son síncronos.

## 5. Orden de migración sugerido

1. **Mock (MSW)** con los datos seed y el contrato acordado: el frontend avanza sin backend.
2. **Auth y router.** Reemplazar `LoginScreen` por login real.
3. **Deals / Pipeline.** Lista, crear, editar, mover y reordenar. Es el módulo con más valor y el que más ejercita el contrato.
4. **Cotizador, handoff y pérdida.**
5. **Projects y Finance** (hitos y facturas).
6. **Schedule, Customers, Overview, Growth.**
7. **Retirar** `AppStore`, `localStorage`, `src/data/*` del bundle y `resetDemo`.

En cada paso: typecheck y tests en verde antes de pasar al siguiente.

## 6. Tests

- `src/__tests__/store.test.ts` prueba el `reducer`. Cuando el reducer deje de ser la fuente de verdad, esos casos se convierten en **tests del backend** (mismas reglas). No borrarlos sin trasladarlos.
- Los tests de `quote.ts` y `boardOrder.ts` siguen valiendo: son lógica pura del cliente.
- Añadir tests de hooks/mutaciones con MSW (éxito, error, reversión del optimistic update).
- Un e2e del flujo completo al final (ver Fase 4 de `PLAN.md`).

## 7. Convenciones que no cambian (de `CLAUDE.md`)

- **i18n:** todo texto visible pasa por `t()` de `useT()` (o `tr()` fuera de React). La clave es el texto en español y toda clave nueva necesita su entrada en `src/i18n/en.ts`. Fechas con `currentLocale()`. No usar `t` como nombre de variable.
- **Colores:** solo tokens de `src/index.css`; nada de `white/`, `black/` ni hex sueltos.
- **Accesibilidad:** modales con `role="dialog"` + `aria-modal`, Esc para cerrar, controles con `id`/label.
- Componentes funcionales, tipos en `src/types.ts`, sin `any`.
- Si cambia la forma del estado persistido, subir la versión de la clave (mientras exista persistencia local).

## 8. Puntos abiertos (a decidir con backend)

1. ¿Se generan los tipos desde OpenAPI o se mantienen a mano?
2. ¿Cómo se traducen los datos dinámicos que vienen de la API? Hoy el contenido de ejemplo se traduce con `t()` usando el español como clave, y eso no escala.
3. ¿Las alertas (`useAlerts`) se siguen derivando en el cliente o pasan al servidor?
4. ¿Actualización en tiempo real (polling o websockets) cuando dos personas mueven el mismo kanban?
5. ¿Se conserva el modo demo (datos seed) como entorno de muestra?
