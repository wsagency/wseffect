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
