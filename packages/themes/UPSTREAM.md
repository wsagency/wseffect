# Upstream CSS

The Radix Themes CSS and its PostCSS pipeline are copied from [`wsagency/radix2solid`](https://github.com/wsagency/radix2solid) commit `383676172abb84b4a1d2e54a087d290437ee8848` (public `main`, rc.3).

Copied paths:

- `packages/themes/src/styles/**` → `src/styles/**`
- `packages/themes/src/components/*.css` → `src/css-components/*.css`
- `packages/themes/src/components/_internal/*.css` → `src/css-components/_internal/*.css`
- `packages/themes/postcss.config.js` → `postcss.config.js`
- `packages/themes/postcss-breakpoints.js` → `postcss-breakpoints.js`
- `packages/themes/postcss-whitespace.js` → `postcss-whitespace.js`
- `packages/themes/scripts/build-css.js` → `scripts/build-css.js`

Local changes: component CSS lives in `src/css-components` and its index is limited to the foundation component closure. The layout CSS index excludes non-foundation Section and Container. The build script emits only the foundation component CSS and its spinner, scroll-area, heading and text dependencies, and produces each `.layer.css` sibling in `@layer radix`. CSS output order is retained from the pinned source.

The local `src/css-components/_adapters/menu.css` adapts the pinned menu highlight selectors from `[data-highlighted]` to Foldkit Menu's `[data-active]`. Foldkit 0.168.0's `Menu.ItemConfig` exposes only `className` and `content`, so a themed `itemToConfig` cannot supply `data-highlighted` without changing the upstream API.

The themed Dialog, DropdownMenu and Tabs views retain the pinned upstream semantic aliases `rt-DialogContent`, `rt-DialogOverlay`, `rt-DialogScroll`, `rt-DialogScrollPadding`, `rt-DropdownMenuContent`, `rt-DropdownMenuItem`, `rt-DropdownMenuViewport`, `rt-TabsRoot`, `rt-TabsList`, `rt-TabsTrigger`, `rt-TabsTriggerInner` and `rt-TabsTriggerInnerHidden`. These are recorded from the component markup in `src/components/dialog.tsx`, `src/components/dropdown-menu.tsx` and `src/components/tabs.tsx` at the pinned commit. They intentionally have no selector in the CSS; `test/distribution.test.ts` keeps their upstream markup excerpt as the explicit allowlist evidence and requires every other literal emitted `rt-*` class to have a selector in the generated stylesheet.
