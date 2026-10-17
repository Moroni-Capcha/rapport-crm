# Rapport CRM — Plan de desarrollo (frontend + backend)

Plan compartido para llevar Rapport de demo a producto funcional. Se actualiza marcando las casillas a medida que se completan.

Documentos relacionados:
- `docs/FRONTEND.md`: cómo migrar el frontend, qué lógica sale del cliente y qué convenciones se mantienen.
- `docs/BACKEND.md`: entidades, reglas de negocio y API sugerida.
- `CLAUDE.md`: convenciones del frontend (i18n, colores, accesibilidad).

## Principios de trabajo

1. **Contract-first.** Primero se acuerda el contrato de la API; después cada uno construye contra él.
2. **El servidor manda.** Totales, probabilidades, números de factura e IDs los calcula el backend, nunca el cliente.
3. **Por slices.** Se migra un módulo a la vez (primero deals, luego projects…). Nunca todo de golpe.
4. **Siempre en verde.** `npm run typecheck` y `npm test` sin errores antes de cada commit.
5. **PRs chicos.** Una rama y un PR por tarea, con tests y docs junto al código. Commits convencionales.
6. **No se abre la fase siguiente con la anterior en rojo.**

## Roles

| Área | Responsable |
|---|---|
| Frontend | _por definir_ |
| Backend | _por definir_ |
| Contrato de API | Los dos |

## Estado actual

- Frontend: React 18 + TypeScript + Vite + Tailwind v4 + dnd-kit. Demo completa sin backend.
- Estado en `src/store/AppStore.tsx` (Context + `useReducer`), persistido en `localStorage`.
- Sin router, sin auth real, sin capa de API.
- Backend: no existe.

---

## Fase 0 — Contrato y decisiones

**Objetivo:** que los dos puedan trabajar en paralelo sin bloquearse.

- [ ] Elegir stack del backend (lenguaje, framework).
- [ ] Elegir estilo de API: REST o tRPC.
- [ ] Elegir base de datos (recomendado: Postgres, por las transacciones del handoff y el correlativo de facturas).
- [ ] Definir autenticación (JWT, cookie de sesión o proveedor externo) y roles (¿un vendedor ve solo sus deals?).
- [ ] Definir multi-tenant (¿una agencia o varias?) y moneda (¿solo USD?).
- [ ] Definir cómo se traducen los datos dinámicos (hoy `t()` con el español como clave; no escala con datos de una API).
- [ ] Escribir el contrato de la API (OpenAPI o tipos compartidos), partiendo de `src/types.ts`.
- [ ] Montar un mock (MSW) con los datos seed actuales para que el frontend no espere al backend.

**Listo cuando:** el contrato está aprobado por los dos y el frontend corre contra el mock.

---

## Fase 1 — Base

### Backend
- [ ] Proyecto base, linter, formateo y CI.
- [ ] Postgres + migraciones.
- [ ] Autenticación y sesiones.
- [ ] CRUD de deals (`GET`, `POST`, `PATCH`) con validación de esquema.
- [ ] `POST /deals/:id/move` con campo `position` por etapa (reemplaza el orden del array).
- [ ] Actividades del deal (`POST /deals/:id/activities`).
- [ ] Tests de reglas: probabilidad por etapa, mover a la misma etapa es no-op, actividad "Movido a …".
- [ ] Formato de error uniforme `{ error: { code, message } }`.

### Frontend
- [ ] Capa `src/api/` (cliente HTTP tipado, errores normalizados).
- [ ] React Query para caché y mutaciones.
- [ ] Router (rutas por pestaña, deep links a un deal).
- [ ] Login real (reemplaza `LoginScreen` de demo).
- [ ] Estados de loading, error y vacío en las vistas.
- [ ] Pipeline contra la API (lista, mover, reordenar con dnd-kit, crear lead, editar).

**Listo cuando:** el Pipeline funciona de punta a punta contra el backend real y los tests pasan.

---

## Fase 2 — Cotizador, handoff y facturación

### Backend
- [ ] Guardar cotización (`PUT /deals/:id/quote`) recalculando `quoteTotals` en el servidor y actualizando `deal.value` con el `net`.
- [ ] Reutilizar los casos de `src/__tests__/` para validar que los totales coinciden con `src/lib/quote.ts`.
- [ ] Definir quién absorbe la diferencia de redondeo en los pagos 30/40/30.
- [ ] Handoff transaccional (`POST /deals/:id/handoff`): crea el proyecto, pasa el deal a `kickoff`, `probability = 100`, `projectId`, y registra la actividad. Todo o nada.
- [ ] `POST /deals/:id/lose` con motivo; conservar el deal con estado en vez de borrarlo.
- [ ] Estado de hitos (`pending → draft → sent → paid`) con número de factura `F001-n` atómico (secuencia o bloqueo) e inmutable una vez asignado.
- [ ] "Vencida" derivada (`sent` + fecha pasada), nunca persistida.

### Frontend
- [ ] Cotizador guarda por API y muestra los totales que devuelve el servidor.
- [ ] Handoff, pérdida de deal y cambio de estado de hitos como mutaciones.
- [ ] Manejo de conflictos y errores (por ejemplo, handoff repetido).

**Listo cuando:** un deal va de lead a proyecto y a factura pagada sin tocar localStorage.

---

## Fase 3 — Resto de módulos

- [ ] Projects: lectura y edición (`GET`/`PATCH /projects`).
- [ ] Schedule: eventos (`GET`/`POST /events`).
- [ ] Customers: derivados de deals y proyectos por empresa (o entidad propia, a decidir).
- [ ] Overview y Growth: endpoints `/metrics/*` (hoy se calculan en el cliente con datos seed).
- [ ] Alertas (`useAlerts`): decidir si siguen derivándose en el cliente o pasan al servidor.
- [ ] Paginación y filtros en listados grandes.

**Listo cuando:** ninguna vista depende de `AppStore` ni de los datos seed.

---

## Fase 4 — Cierre y salida a producción

- [ ] Retirar `AppStore.tsx`, `localStorage` y los datos de ejemplo del bundle.
- [ ] Mover el seed a un script del backend (solo para desarrollo/staging).
- [ ] Permisos por rol revisados en todos los endpoints.
- [ ] Tests e2e (Playwright) del flujo completo: lead → cotización → handoff → factura pagada.
- [ ] Tests de concurrencia en facturas y reordenamiento.
- [ ] CI completo (typecheck, tests, build, e2e).
- [ ] Deploy a staging y luego a producción, reproducible.
- [ ] Backups, logs y monitoreo básico.
- [ ] Documentación: README actualizado, variables de entorno, cómo levantar el proyecto.

**Listo cuando:** el flujo completo pasa en CI y el deploy es reproducible.

---

## Riesgos y cómo evitarlos

| Riesgo | Mitigación |
|---|---|
| Migrar el store de golpe y romper todo | Migrar por slices; `typecheck` y `test` en verde en cada paso |
| Lógica duplicada cliente/servidor que diverge | El servidor es la fuente; el cliente solo muestra lo que devuelve |
| Números de factura duplicados con usuarios simultáneos | Secuencia atómica en base de datos + test de concurrencia |
| Orden del kanban inconsistente entre usuarios | `position` explícito (fraccionario o lexorank) en el servidor |
| Datos dinámicos sin traducir | Decidirlo en la Fase 0 |
| Frontend bloqueado esperando al backend | Mock MSW basado en el contrato desde la Fase 0 |

## Definición de "hecho" para cualquier tarea

- [ ] Funciona y fue probada de forma observable (no solo "compila").
- [ ] Tests añadidos o actualizados.
- [ ] `npm run typecheck` y `npm test` en verde.
- [ ] Textos nuevos con su entrada en `src/i18n/en.ts`; colores solo con tokens.
- [ ] Docs actualizadas si cambia el contrato o una regla de negocio.
- [ ] PR revisado por la otra persona.

## Registro de decisiones

Anoten aquí cada decisión de la Fase 0 con fecha y motivo.

| Fecha | Decisión | Motivo |
|---|---|---|
| | | |
