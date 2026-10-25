# Proposal: VirtualList container and spacer element overrides

**Status:** Implemented locally in `packages/foldkit-ui/src/virtualList`; upstream follow-up is optional.
**Affected package:** `@foldkit/ui@0.168.0`.

## Problem

VirtualList already allows a custom row tag, but hard-codes its scroll container to `<ul>` and its spacers to `<li>`. Those list elements are invalid inside native table sections such as `<tbody>`, preventing VirtualList from rendering virtualized table rows without a parallel table-specific view. Programmatic scroll/focus handling also needs to find keyed rows nested under custom containers.

## Evidence (`@foldkit/ui@0.168.0`)

Installed `virtualList/index.js` destructures a configurable `rowElement` but no container or spacer tags (`apps/gallery/node_modules/@foldkit/ui/dist/virtualList/index.js:713-715`). `renderContainer` always creates a keyed `ul` (`:731-736`), and the top/bottom spacers are keyed `li` elements (`:743-752`); rows alone use `rowElement` (`:753-778`). `ApplyScroll` obtains the mounted container and applies scrolling to that element (`:264-315`), while row discovery uses the container's direct children (`:184-185`). The installed `@foldkit/ui` package version is `0.168.0` (`apps/gallery/node_modules/@foldkit/ui/package.json:1-4`).

## Implemented locally

`packages/foldkit-ui/src/virtualList` now supports configurable scroll/row/spacer element output, nested keyed-row lookup, and a window callback. Themes DataTable uses this API for native table windowing while keeping its table markup and sticky header in the component wrapper.

## Proposed API

Keep the existing defaults and add optional `containerElement` and `spacerElement` tags alongside `rowElement` (or an equivalent typed element-rendering hook). A native-table configuration should be able to place spacer rows under `<tbody>` and choose an external scroll container without emitting invalid list markup. Make `ApplyScroll` and row/anchor lookup resolve keyed rows nested beneath the configured container, rather than assuming rows are direct children; preserve stable-key matching and the default list behavior.

## Test ideas

- Assert default output remains a `<ul>` with `<li>` spacers and configured row tags.
- Render a `<tbody>` configuration with `<tr>` spacers and row elements; assert no invalid nested list elements are emitted.
- Apply an index/key scroll when rows are nested under table structure; assert scroll and anchor outcomes use the expected row.
- Focus a nested keyed row after programmatic scroll, including when preceding rows are virtualized away.
- Verify dynamic row measurement, container resize/scroll observation, and reconciliation continue to work with overrides.
