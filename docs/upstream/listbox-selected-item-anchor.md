# Proposal: configurable Listbox selected-item anchor

**Status:** local proposal draft; not submitted upstream.  
**Affected package:** `@foldkit/ui@0.168.0`.

## Problem

A select menu may need to align the selected option with the trigger when it opens rather than always using the trigger as the panel's positioning anchor. Listbox currently receives the selected value to mark and highlight the selection, but provides no positioning option to anchor the panel at that selected item. Consumers must implement item-aligned positioning separately.

## Evidence (`@foldkit/ui@0.168.0`)

The installed single-select Listbox's `ViewInputs` includes `maybeSelectedValue`, whose documented effects are item selection/highlighting and form submission (`apps/gallery/node_modules/@foldkit/ui/dist/listbox/single.d.ts:171-179`); it does not expose an anchor mode. The public Listbox exports include `AnchorListbox` (`apps/gallery/node_modules/@foldkit/ui/dist/listbox/public.d.ts:1-6`), and the installed `@foldkit/ui` is version `0.168.0` (`apps/gallery/node_modules/@foldkit/ui/package.json:1-4`).

## Local workaround

`packages/primitives/src/select.ts:18-24,55-84` supports `position: 'popper' | 'item-aligned'`; the latter takes a local rendering path rather than the upstream Listbox view. `packages/primitives/src/select-position.ts:4-9,11-44` mounts the panel relative to the selected or active item, observes trigger/panel/item resizing, and falls back to trigger position when no item exists. This duplicates Listbox view/positioning behavior and must be maintained beside its upstream semantics.

## Proposed API

Add an explicit Listbox positioning input such as `anchor: 'trigger' | 'selected-item'` (default `trigger`). In selected-item mode, align the panel's selected option to the trigger on initial open; when there is no selected option, use the trigger as the anchor. Define how an active keyboard option interacts with the selected anchor so navigation does not unexpectedly reposition the panel on every render.

## Test ideas

- Default trigger anchoring preserves current positioning.
- With a selected item, opening aligns that item to the trigger across top/bottom placement and viewport collision handling.
- With no selection or a missing/unmounted selected item, positioning safely falls back to the trigger.
- Keyboard navigation does not silently change the anchor unless an explicit active-item mode is selected; resize/scroll keeps the selected anchor aligned.

## Multi-child item content

`@foldkit/ui@0.168.0` exposes `itemToConfig(...).content: Html` (`node_modules/@foldkit/ui/dist/listbox/shared.d.ts:351`) and renders that value as the single child `[itemConfig.content]` of each option (`node_modules/@foldkit/ui/dist/listbox/shared.js:623`). This prevents the Select adapter from emitting pinned `ItemIndicator` and `ItemText` as separate option children. Locally, the primitive puts those nodes in one generic span and the theme applies `display: contents`; a future API could widen item content to `Html | ReadonlyArray<Html>` so the Listbox can render siblings directly.
