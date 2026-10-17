# Rapport CRM — Guía para el backend

Esta guía explica qué necesita el frontend de Rapport y cómo diseñar el backend para reemplazar el store local actual.

## 1. Situación actual

El frontend es una demo sin backend. Todo el estado vive en `src/store/AppStore.tsx` (Context + `useReducer`) y se persiste en `localStorage` (`rapport-state-v2`).

El comentario de ese archivo ya lo dice: **ese archivo es el borde con la API**. El backend debe cubrir lo que hoy hace el `reducer`.

Estado actual:

```ts
interface State {
  deals: Deal[];
  projects: Project[];
  events: CalendarEvent[];
  lost: ClosedDeal[]; // deals perdidos
}
```

Fuente de verdad de los tipos: `src/types.ts`. No inventar campos: si el backend necesita algo nuevo, se acuerda y se agrega ahí.

## 2. Entidades

| Entidad | Tipo en `types.ts` | Notas |
|---|---|---|
| Deal (oportunidad) | `Deal` | Contiene `contact`, `services[]`, `segments[]`, `activities[]` y `quote?` anidados |
| Activity | `Activity` | Historial del deal, más reciente primero |
| Quote (cotización) | `Quote` / `QuoteItem` | Un deal tiene como máximo una, con `version` |
| Project | `Project` | Se crea al ganar un deal (handoff) |
| Milestone / factura | `Milestone` | Hito de pago dentro de un proyecto |
| Event | `CalendarEvent` | Agenda; puede apuntar a un deal o proyecto |
| ClosedDeal | `ClosedDeal` | Deals ganados/perdidos para métricas de Growth |
| Customer | `CustomerMeta` | Hoy se deriva de los deals por `company` |

Sugerencia: normalizar en tablas (`deals`, `activities`, `contacts`, `deal_services`, `quotes`, `quote_items`, `projects`, `milestones`, `events`, `closed_deals`). El frontend recibe los objetos anidados tal como están en `types.ts`, así que la API debe devolverlos con esa forma.

## 3. Reglas de negocio (el backend debe ser dueño de ellas)

Hoy viven en el frontend y deben migrar al servidor, porque el cliente no es de fiar.

### Etapas del pipeline

`leads → discovery → proposal → negotiation → kickoff`

La probabilidad por defecto al entrar a una etapa:

| Etapa | Probabilidad |
|---|---|
| leads | 10 |
| discovery | 25 |
| proposal | 50 |
| negotiation | 75 |
| kickoff | 100 |

### Mover un deal (`deal/move`, `deal/reorder`)

- Si la etapa cambia: se actualiza `stage`, se reasigna `probability` de la etapa y se agrega una `Activity` de tipo `note` con el texto "Movido a {etapa}".
- Mover a la misma etapa no hace nada (ni actividad).

### Orden manual del kanban

Hoy el orden es **el orden del array** `deals`. En el backend eso no existe: hace falta un campo explícito, por ejemplo `position` por etapa.

`deal/reorder` recibe `beforeId` (el deal delante del cual se inserta, o `null` para ir al final de la columna). Sugerencia: `position` fraccionario o *lexorank* para no reescribir toda la columna en cada movimiento.

### Handoff (`deal/handoff`)

Cuando un deal se gana, en una sola operación:

1. Se crea el `Project` desde el deal.
2. El deal pasa a `kickoff`, con `probability = 100` y `projectId` apuntando al proyecto.
3. Se registra una `Activity`.

Esto debe ser **una transacción**: o pasa todo o no pasa nada.

### Deal perdido (`deal/lose`)

El deal sale de `deals` y se registra un `ClosedDeal` con `outcome: 'lost'` y `lossReason`. Mejor: mantenerlo en la misma tabla con un estado, en vez de borrarlo.

### Cotizador (`src/lib/quote.ts`)

Los totales los calcula `quoteTotals()`. El backend debe reproducir **exactamente** esta lógica y recalcular siempre en el servidor:

- Solo cuentan los items con `hours > 0` y `rate > 0`.
- `subtotal = Σ hours × rate`.
- `discountPct` se limita al rango 0–100. `discount = round(subtotal × pct / 100)`.
- `net = subtotal − discount`. **`net` es el valor del contrato y se guarda como `deal.value`.**
- IGV 18 % opcional (`includeTax`): `tax = round(net × 0.18)`. `total = net + tax`.
- Semanas estimadas: `ceil(hours / 120)`. La capacidad semanal es 120 h.
- Esquema de pagos 30/40/30 (`PAYMENT_PLAN`): Anticipo, Entrega beta, Cierre y lanzamiento. Cada monto es `round(net × pct / 100)`.
- Número de propuesta: `P-<DEAL_ID_SIN_PREFIJO_deal->-v<version>`.

Trampa a evitar: los redondeos. Los tres pagos pueden no sumar exactamente `net`. Hay que decidir (y documentar) quién absorbe el centavo de diferencia.

### Facturación (`milestone/status`)

Estados del hito: `pending → draft → sent → paid`.

- Al pasar a `sent` o `paid`, si el hito no tiene número, se le asigna el siguiente correlativo `F001-<n>`. El máximo actual se calcula sobre todas las facturas existentes, con base 1180.
- Una vez asignado, el número no cambia.
- Al pasar a `paid` se guarda `paidAt`.
- **"Vencida" no se guarda**: se deriva (`sent` + `dueAt` en el pasado). El backend puede exponerla como campo calculado, pero no debe persistirla.

El correlativo **debe ser atómico** (secuencia de base de datos o bloqueo). Con el cálculo actual de "máximo + 1", dos usuarios simultáneos generarían el mismo número.

## 4. API sugerida

REST con JSON. Todos los timestamps en ISO 8601 UTC.

```
GET    /deals                      lista (filtros: stage, owner, priority, q)
POST   /deals                      crea deal
GET    /deals/:id
PATCH  /deals/:id                  edita campos (deal/update)
POST   /deals/:id/move             { stage, beforeId? }   (deal/move + deal/reorder)
POST   /deals/:id/activities       registra actividad (deal/log)
PUT    /deals/:id/quote            guarda cotización; el servidor recalcula y actualiza deal.value
POST   /deals/:id/handoff          crea el proyecto (transaccional)
POST   /deals/:id/lose             { reason }

GET    /projects
PATCH  /projects/:id
POST   /projects/:pid/milestones/:mid/status    { status }

GET    /events
POST   /events

GET    /metrics/overview           agregados para Overview y Growth
```

Convenciones:

- Errores con forma uniforme: `{ "error": { "code": "STAGE_INVALID", "message": "..." } }`.
- Validar con un esquema (Zod, Joi, etc.) todo lo que entra: etapas, estados, rangos.
- `PATCH /deals/:id` solo debe aceptar campos editables; no `stage`, `probability` ni `projectId` (esos cambian por sus acciones).
- Paginación en `GET /deals` y `GET /projects` aunque hoy la demo tenga pocos registros.

## 5. Lo que el frontend NO debe seguir haciendo

- Generar IDs (`uid()`) y fechas (`at`, `activityId`). Los pone el servidor.
- Calcular totales, probabilidades o números de factura de forma autoritativa.
- Persistir en `localStorage`.

## 6. Autenticación y roles

Hoy existe `LoginScreen.tsx`, pero es solo de demo. Falta definir:

- Mecanismo (JWT, sesión por cookie, proveedor externo).
- Roles. Hay un campo `owner` en deals y `lead`/`team` en proyectos: hace falta saber si un vendedor ve solo lo suyo o todo.

## 7. i18n

Los textos visibles se traducen en el frontend. Los datos que vienen de la API (nombres de proyecto, actividades, etc.) se traducen hoy por la misma función `t()` con el texto en español como clave. Decisión pendiente: o el backend guarda en español y el cliente sigue traduciendo, o se guardan campos por idioma.

## 8. Decisiones abiertas (a resolver entre los dos)

1. ¿REST o tRPC? (el comentario del store menciona React Query / tRPC / Supabase).
2. Base de datos: relacional (Postgres) encaja bien por las transacciones del handoff y el correlativo de facturas.
3. Moneda: hoy todo es USD. ¿Se mantiene o se agrega multimoneda?
4. Multi-tenant: ¿una sola agencia o varias?
5. Estrategia de actualización en tiempo real (polling vs. websockets), si dos personas mueven el mismo kanban.

## 9. Tests mínimos esperados

- `quoteTotals`: mismos resultados que `src/lib/quote.ts` (se pueden reutilizar los casos de `src/__tests__/`).
- Mover deal: probabilidad y actividad correctas; mover a la misma etapa es no-op.
- Handoff: atómico; no deja un proyecto huérfano si falla a la mitad.
- Facturas: correlativo único bajo concurrencia; número inmutable una vez asignado.
- "Vencida": derivada, nunca persistida.
