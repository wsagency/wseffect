# Upstream provenance and sync

- Repository: https://github.com/foldkit/foldkit
- Upstream package: `packages/ui`, tag `@foldkit/ui@0.168.0`
- Snapshot commit: `060271955cc2fdd34ddb5e17a64b6662268f79c5`
- Source package `dist` rebuilt at that commit is byte-for-byte identical to the installed published `@foldkit/ui@0.168.0` dist.

## Local divergence

- The package is named `@wsagency/wseffect-foldkit-ui`; upstream subpath exports remain unchanged.
- Workspace dependency versions/build/test scripts are aligned with wseffect. Its package-local `tsconfig.base.json` mirrors upstream compiler options, with separate build/test configs; the clean/build scripts preserve upstream's `rimraf`, TypeScript, and branding sequence. The root Oxlint config scopes wseffect-specific rule exemptions to the vendored packages.
- Internal imports target the local core package; the branding step remains part of the build and imports the local Vite plugin. Upstream examples retain upstream specifiers: `foldkit` maps to `@wsagency/wseffect-foldkit`, `@foldkit/ui` to `@wsagency/wseffect-foldkit-ui`, and `@foldkit/vite-plugin` to `@wsagency/wseffect-vite-plugin`.
- Extended Menu with serializable context invocation, virtual-point anchoring, source events, and source-token-checked focus restoration. The source-event Mount is still named `ContextMenuSourceEvents` for compatibility.
- Added `tooltip/group`, whose explicit group model owns versioned shared show-delay/skip state.
- Added stateless `checkboxGroup`, which composes Checkbox attributes through `toView` rather than choosing consumer markup.
- Extended Listbox `BaseModel` with optional `anchorMode: 'Trigger' | 'SelectedOrActiveItem'`, decoding to `Trigger` when absent; widened item content to `Html | ReadonlyArray<Html>`. Item-aligned active options render `data-active="true"`.
- Added the `listboxSelect` subpath and `createSelect` adapter over Listbox.
- Added controlled `Slider.Range` alongside the existing scalar Slider.
- Fixed-height `VirtualList.informItemsChanged` updates skip construction of the item-key `HashSet` and measured-height filtering when no measurements exist; measured-height pruning remains unchanged otherwise. Candidate upstream PR.
- Extended `VirtualList.view` with container/row tag and role options, `rowToView`, `spacerToView`, and `windowToView`; custom `rowToView` replaces `itemToView`, and defaults preserve the upstream list markup while custom window output supports native table sections and spacers.
- Generalized nested keyed-row lookup in `ApplyScroll`, focus, and dynamic measurement so row targets remain discoverable below custom window/container markup.
- Merge caller `Style` attributes with the required viewport styles; required scroll behavior (`overflow`, `overflow-anchor`, list style, margin, and padding) takes precedence.
- Added optional `InitConfig.initialContainerHeight` to seed viewport geometry for fixed-height lists before the first browser measurement.
- Scoped custom virtual-row discovery to the nearest marked viewport so nested keyed lists cannot capture outer scroll, focus, or measurement operations.
- DataTable delegates scroll-container ownership to `VirtualList` and marks its native table body as the virtual row area; the table does not add a second scroll viewport.
- Added `VirtualList`'s measured `leadingOffsetPx` model field; the observer measures the marked row area's content-space offset (including caption/header geometry) and updates it during container/row-area measurement.
- Contextual Menu virtual anchors reveal the panel after positioning and focus its active menu item, preserving immediate keyboard activation; the regular Menu anchor remains focused on its items container.
- Item-aligned Listbox anchors resolve current active/selected DOM items on patches, fit and scroll long panels within viewport collision padding, align the selection to its trigger after clamping where the scroll range permits, and resolve triggers within their owning document or shadow root.
- Exported `VirtualList.renderedRange` so consumers can use its shared viewport-window calculation, including measured leading offsets, row-height strategy, and overscan.
- Slider.Range patch handling reads the live mount host's `data-disabled` attribute for pointer-driven disabled state changes.
- This file, the provenance README, and the first local changelog entry are maintained by wseffect.
- Removed upstream website API-doc tooling (`typedoc.json`, `typedoc-entry.ts`, `tsconfig.docs.json`); neither local builds nor tests use these files.

## Sync procedure

1. Select and record an upstream release tag and commit; check the package source and published build provenance.
2. Export only this package's tracked source at the selected commit (no Git history or generated dist), preserving upstream formatting.
3. Reapply only the package-name/import, workspace dependency, and build/test integration changes listed above and record each additional delta here.
4. Rebuild declarations and dist with the pinned wseffect toolchain; run this package's upstream tests as part of `pnpm check`; review source and output diffs.
5. Update this provenance, README, CHANGELOG, licenses/notices, and snapshot hashes.

## Contribution policy

Upstream PRs are optional. Propose a change upstream only when it is generally useful to Foldkit users and fits Foldkit's philosophy; wseffect may maintain its own changes otherwise.
