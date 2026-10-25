# Proposal: configurable Listbox selected-item anchor

**Status:** Implemented locally in `packages/foldkit-ui/src/listbox` and `src/listboxSelect`; upstream follow-up is optional.
**Affected package:** `@foldkit/ui@0.168.0`.

## Problem

A select menu may need to align the selected option with the trigger when it opens rather than always using the trigger as the panel's positioning anchor. Listbox currently receives the selected value to mark and highlight the selection, but provides no positioning option to anchor the panel at that selected item. Consumers must implement item-aligned positioning separately.

## Evidence (`@foldkit/ui@0.168.0`)

The installed single-select Listbox's `ViewInputs` includes `maybeSelectedValue`, whose documented effects are item selection/highlighting and form submission (`apps/gallery/node_modules/@foldkit/ui/dist/listbox/single.d.ts:171-179`); it does not expose an anchor mode. The public Listbox exports include `AnchorListbox` (`apps/gallery/node_modules/@foldkit/ui/dist/listbox/public.d.ts:1-6`), and the installed `@foldkit/ui` is version `0.168.0` (`apps/gallery/node_modules/@foldkit/ui/package.json:1-4`).

## Implemented locally

`packages/foldkit-ui/src/listbox` now supports explicit trigger or selected/active-item anchoring and sibling item content; `src/listboxSelect` provides the typed adapter used by Themes Select. The existing Foldkit UI `select` helper remains a separate native-select API.

## Proposed API

Add an explicit Listbox positioning input such as `anchor: 'trigger' | 'selected-item'` (default `trigger`). In selected-item mode, align the panel's selected option to the trigger on initial open; when there is no selected option, use the trigger as the anchor. Define how an active keyboard option interacts with the selected anchor so navigation does not unexpectedly reposition the panel on every render.

## Test ideas

- Default trigger anchoring preserves current positioning.
- With a selected item, opening aligns that item to the trigger across top/bottom placement and viewport collision handling.
- With no selection or a missing/unmounted selected item, positioning safely falls back to the trigger.
- Keyboard navigation does not silently change the anchor unless an explicit active-item mode is selected; resize/scroll keeps the selected anchor aligned.

## Multi-child item content

The local Listbox implementation in `packages/foldkit-ui/src/listbox` accepts sibling HTML for option content, allowing the Select adapter to emit the pinned `ItemIndicator` and `ItemText` as siblings without an extra wrapper. The Themes wrapper retains its `display: contents` content node for exact Radix2Solid markup.
