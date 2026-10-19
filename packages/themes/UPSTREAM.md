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

The local `src/css-components/_adapters/menu.css` adapts only the pinned menu highlight selectors from `[data-highlighted]` to Foldkit Menu's `[data-active]`. Foldkit 0.168.0's `Menu.ItemConfig` exposes only `className` and `content`, so a themed `itemToConfig` cannot supply `data-highlighted` without changing the upstream API.

The generated `css/dropdown-menu.css` and `css/dialog.css` include the Button CSS dependency because their themed trigger and close controls use the same `rt-Button` sizing, padding and variant rules as Radix Themes Buttons. Dialog also depends on Flex CSS for the close-control alignment row.

The themed Dialog, DropdownMenu and Tabs views retain the pinned upstream semantic aliases `rt-DialogContent`, `rt-DialogOverlay`, `rt-DialogScroll`, `rt-DialogScrollPadding`, `rt-DropdownMenuContent`, `rt-DropdownMenuItem`, `rt-DropdownMenuViewport`, `rt-TabsRoot`, `rt-TabsList`, `rt-TabsTrigger`, `rt-TabsTriggerInner` and `rt-TabsTriggerInnerHidden`. Their verbatim source excerpts and provenance are in `test/fixtures/radix2solid-383676172-markup.txt`; `test/distribution.test.ts` reads that fixture and requires each allowlisted alias to appear there and in local component source. Every other literal emitted `rt-*` class must have a selector in the generated stylesheet.
