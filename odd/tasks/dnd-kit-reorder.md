# Feature: dnd-kit-reorder

Migrate the Pipeline Kanban drag & drop to `@dnd-kit` so cards can be reordered inside a column, dragged on touch devices, and moved with the keyboard.

## Context (from exploration)

- Today: native HTML5 DnD in `DealCard.tsx` (draggable) and `KanbanColumn.tsx` (drop target); `KanbanBoard.tsx` holds `draggingId`/`overStage`. Same-column drops are blocked. No touch, no keyboard.
- Store: `deal/move` in `src/store/AppStore.tsx` changes stage/probability and prepends an activity. `Deal` has no order field; `KanbanBoard` re-sorts each column with `SORTERS` (`recent` | `value` | `probability`), which would erase any manual order.
- Cards use Enter/Space to open the drawer, which collides with dnd-kit's keyboard sensor. Drawer stage selector stays as the non-DnD fallback.

## Decisions (user-approved: Manual sort is automatic)

- Add a `manual` option to the Sort dropdown. Dragging a card inside a column switches the sort to `manual` automatically.
- Manual order = position inside `state.deals` (no new field), so it persists in `rapport-state-v2` with no migration. `deal/add` still prepends (new leads on top).
- New action `deal/reorder { id, stage, beforeId | null }`: removes the deal from the array and reinserts it before `beforeId` (or at the end of that stage's deals when `null`). Cross-column drop also sets stage/probability and logs the same activity as `deal/move`. Same-column reorder logs no activity and keeps stage and probability.
- Keyboard: drag handle activates dnd-kit KeyboardSensor (Space/arrows); Enter/click on the card body still opens the drawer.
- Touch: TouchSensor with a short press delay; PointerSensor with a distance constraint so clicks still open the drawer.
- CSV export keeps following `state.deals` order.
- All UI text through `t()` with entries in `src/i18n/en.ts`.

## Config

- TDD: not enabled (no project config or user choice found). Ordinary functional checks per task.
- Runner: `npm test` (vitest, `src/**/*.test.ts`, node env; reducer/pure logic only). Also `npm run typecheck` and `npm run build`.
- Delivery strategy: `ask-on-risk`. Forecast ~350 authored changed lines.
- Authoring size heuristic: about 400 changed lines per task, advisory only.

## Tasks

- [x] T1 Store: `deal/reorder` action in `AppStore.tsx` + reducer tests (same-column reorder, cross-column move at position, `beforeId: null`, unknown id no-op). Route: delegated writer (2 files; trigger: 2+ non-trivial files). Evidence: `npm test` 5 files / 24 tests pass, `npm run typecheck` clean (writer and parent spot check). Commit: see git log (`feat(store): add deal/reorder action`).
- [ ] T2 Sort: add `manual` to `SortKey` (`types.ts`), "Manual" option in `FilterBar.tsx`, manual ordering in `KanbanBoard` (array order), `en.ts` entries. Route: delegated writer.
- [ ] T3 dnd-kit: add `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`; rewrite `KanbanBoard`/`KanbanColumn`/`DealCard` with DndContext, SortableContext, sensors, drag handle, DragOverlay, translated announcements; wire `PipelineView` (`handleReorder`, auto-switch to manual). Route: delegated writer.
- [ ] T4 Docs and copy: README (drag, touch, keyboard, Manual sort), `en.ts` drag hint text, CLAUDE.md if conventions changed. Route: inline.

## Acceptance

- Reordering inside a column works with mouse, touch and keyboard; the order persists after reload.
- Moving across columns still updates stage/probability and logs the activity; drawer stage selector still works.
- Search/segment filters do not corrupt the stored order (indices mapped against the full list).
- `npm test`, `npm run typecheck`, `npm run build` pass; a reorder test exists.

## Progress

Branch: `feat/dnd-kit-reorder`. T1 done (reducer action + `reorderDeal` in context, 5 new tests, ~88 changed lines).

## Next step

T2.
