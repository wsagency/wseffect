# Plan issues

## B1: CSS imports require nested internal sources

- **Evidence:** the pinned radix2solid `packages/themes/src/components/button.css` imports `./_internal/base-button.css`; `card.css`, `dialog.css`, `dropdown-menu.css`, and `tabs.css` also import `./_internal/*.css`. Copying only the plan's literal `src/components/*.css` into `src/css-components/` omits required files and makes PostCSS resolution fail.
- **Proposed fix:** copy only the `_internal/*.css` files imported by the foundation CSS closure into `src/css-components/_internal/` and preserve their relative paths. This is still CSS-only source copied from the pinned commit and adds no non-foundation component.
## B1: Pinned source defines 31 color token files

- **Evidence:** the pinned radix2solid `src/styles/tokens/index.css` imports 31 distinct files under `colors/` (gray, mauve, slate, sage, olive, sand, plus 25 named accents); the copied build emits all 31 unchanged, and `@radix-ui/colors` 3.0.0 includes these imports.
- **Proposed fix:** amend the plan/spec's 30-file count to 31. Keep the full upstream set rather than silently dropping a color family used by the CSS.

## B3: Pinned Foldkit package does not export `Lazy.expectAllReused`

- **Evidence:** installed `foldkit@0.168.0` `dist/test/public.js` exports only `Story` and `Scene`; its `package.json` resolves `foldkit/test` to that file. The available `createLazy` API is present, and a changed-theme Scene test can assert a memoized child view executes only once.
- **Proposed fix:** replace the unavailable helper assertion with an execution-count assertion around `createLazy`. This preserves the required memoization behavior test without patching or vendoring Foldkit (UP-7).
