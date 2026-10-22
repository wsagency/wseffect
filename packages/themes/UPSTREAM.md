# Upstream CSS provenance

The CSS files listed below originate from Radix2Solid at commit `383676172abb84b4a1d2e54a087d290437ee8848` (the pinned release used for this port) and are copied under `src/css-components/`; `_internal/base-button.css` is the transitive import required by `icon-button.css`. The lane adds local scrollbar-hiding rules to `scroll-area.css` to preserve native overflow scrolling while displaying synchronized custom thumbs. The locally authored aggregates `src/css-components/index.css` and `src/css-components/index-base.css` are inventoried separately and are not upstream copies; `index-base.css` preserves the component import list at base commit `200a6a5`. Component behavior and prop mappings were independently ported from the pinned `.tsx` and `.props.ts` source files listed below; their TypeScript implementation is not copied verbatim.

## Exhaustive R2S source-file list

- `packages/themes/src/components/avatar.css`
- `packages/themes/src/components/badge.css`
- `packages/themes/src/components/blockquote.css`
- `packages/themes/src/components/callout.css`
- `packages/themes/src/components/code.css`
- `packages/themes/src/components/container.css`
- `packages/themes/src/components/data-list.css`
- `packages/themes/src/components/em.css`
- `packages/themes/src/components/icon-button.css`
- `packages/themes/src/components/inset.css`
- `packages/themes/src/components/kbd.css`
- `packages/themes/src/components/link.css`
- `packages/themes/src/components/progress.css`
- `packages/themes/src/components/quote.css`
- `packages/themes/src/components/reset.css`
- `packages/themes/src/components/scroll-area.css`
- `packages/themes/src/components/section.css`
- `packages/themes/src/components/separator.css`
- `packages/themes/src/components/skeleton.css`
- `packages/themes/src/components/spinner.css`
- `packages/themes/src/components/strong.css`
- `packages/themes/src/components/table.css`
- `packages/themes/src/components/theme-panel.css`
- `packages/themes/src/components/_internal/base-button.css` (transitive import of `icon-button.css`)
- `packages/themes/src/components/animations.css`
- `packages/themes/src/components/shared.css`

- `packages/themes/src/css-components/index.css` (locally-authored aggregate import manifest; not copied from R2S)
- `packages/themes/src/css-components/index-base.css` (locally-authored pre-SP2 aggregate import manifest; not copied from R2S)
- `packages/themes/src/components/alert-dialog.css`
- `packages/themes/src/components/box.css`
- `packages/themes/src/components/button.css`
- `packages/themes/src/components/card.css`
- `packages/themes/src/components/checkbox-cards.css`
- `packages/themes/src/components/checkbox-group.css`
- `packages/themes/src/components/checkbox.css`
- `packages/themes/src/components/context-menu.css`
- `packages/themes/src/components/dialog.css`
- `packages/themes/src/components/dropdown-menu.css`
- `packages/themes/src/components/flex.css`
- `packages/themes/src/components/grid.css`
- `packages/themes/src/components/heading.css`
- `packages/themes/src/components/hover-card.css`
- `packages/themes/src/components/layout.css`
- `packages/themes/src/components/popover.css`
- `packages/themes/src/components/radio-cards.css`
- `packages/themes/src/components/radio-group.css`
- `packages/themes/src/components/radio.css`
- `packages/themes/src/components/segmented-control.css`
- `packages/themes/src/components/select.css`
- `packages/themes/src/components/slider.css`
- `packages/themes/src/components/switch.css`
- `packages/themes/src/components/tab-nav.css`
- `packages/themes/src/components/tabs.css`
- `packages/themes/src/components/text-area.css`
- `packages/themes/src/components/text-field.css`
- `packages/themes/src/components/text.css`
- `packages/themes/src/components/_internal/base-card.css`
- `packages/themes/src/components/_internal/base-checkbox.css`
- `packages/themes/src/components/_internal/base-dialog.css`
- `packages/themes/src/components/_internal/base-menu.css`
- `packages/themes/src/components/_internal/base-radio.css`
- `packages/themes/src/components/_internal/base-tab-list.css`
- `packages/themes/src/components/_adapters/menu.css`
- `packages/themes/src/components/tooltip.css`
### Ported component and prop-definition sources

- `packages/themes/src/components/accessible-icon.tsx`
- `packages/themes/src/components/aspect-ratio.tsx`
- `packages/themes/src/components/avatar.tsx`
- `packages/themes/src/components/avatar.props.ts`
- `packages/themes/src/components/badge.tsx`
- `packages/themes/src/components/badge.props.ts`
- `packages/themes/src/components/_internal/base-button.tsx`
- `packages/themes/src/components/_internal/base-button.props.ts`
- `packages/themes/src/components/blockquote.tsx`
- `packages/themes/src/components/blockquote.props.ts`
- `packages/themes/src/components/callout.tsx`
- `packages/themes/src/components/callout.props.ts`
- `packages/themes/src/components/code.tsx`
- `packages/themes/src/components/code.props.ts`
- `packages/themes/src/components/container.tsx`
- `packages/themes/src/components/container.props.ts`
- `packages/themes/src/components/data-list.tsx`
- `packages/themes/src/components/data-list.props.ts`
- `packages/themes/src/components/em.tsx`
- `packages/themes/src/components/em.props.ts`
- `packages/themes/src/components/icon-button.tsx`
- `packages/themes/src/components/icon-button.props.ts`
- `packages/themes/src/components/inset.tsx`
- `packages/themes/src/components/inset.props.ts`
- `packages/themes/src/components/kbd.tsx`
- `packages/themes/src/components/kbd.props.ts`
- `packages/themes/src/components/link.tsx`
- `packages/themes/src/components/link.props.ts`
- `packages/themes/src/components/progress.tsx`
- `packages/themes/src/components/progress.props.ts`
- `packages/themes/src/components/quote.tsx`
- `packages/themes/src/components/quote.props.ts`
- `packages/themes/src/components/scroll-area.tsx`
- `packages/themes/src/components/scroll-area.props.ts`
- `packages/themes/src/components/section.tsx`
- `packages/themes/src/components/section.props.ts`
- `packages/themes/src/components/separator.tsx`
- `packages/themes/src/components/separator.props.ts`
- `packages/themes/src/components/skeleton.tsx`
- `packages/themes/src/components/skeleton.props.ts`
- `packages/themes/src/components/spinner.tsx`
- `packages/themes/src/components/spinner.props.ts`
- `packages/themes/src/components/strong.tsx`
- `packages/themes/src/components/strong.props.ts`
- `packages/themes/src/components/table.tsx`
- `packages/themes/src/components/table.props.ts`
- `packages/themes/src/components/theme-panel.tsx`
- `packages/themes/src/components/visually-hidden.tsx`

### Shared prop definitions and behavior helpers

These pinned shared sources inform the ported component schemas and prop-to-class/style/attribute mapping:

- `packages/themes/src/props/as-child.prop.ts`
- `packages/themes/src/props/color.prop.ts`
- `packages/themes/src/props/gap.props.ts`
- `packages/themes/src/props/height.props.ts`
- `packages/themes/src/props/high-contrast.prop.ts`
- `packages/themes/src/props/layout.props.ts`
- `packages/themes/src/props/leading-trim.prop.ts`
- `packages/themes/src/props/margin.props.ts`
- `packages/themes/src/props/padding.props.ts`
- `packages/themes/src/props/prop-def.ts`
- `packages/themes/src/props/radius.prop.ts`
- `packages/themes/src/props/text-align.prop.ts`
- `packages/themes/src/props/text-wrap.prop.ts`
- `packages/themes/src/props/truncate.prop.ts`
- `packages/themes/src/props/weight.prop.ts`
- `packages/themes/src/props/width.props.ts`
- `packages/themes/src/props/index.ts`
- `packages/themes/src/helpers/component-props.ts`
- `packages/themes/src/helpers/extract-margin-props.ts`
- `packages/themes/src/helpers/extract-props.ts`
- `packages/themes/src/helpers/get-margin-styles.ts`
- `packages/themes/src/helpers/get-responsive-styles.ts`
- `packages/themes/src/helpers/get-matching-gray-color.ts`
- `packages/themes/src/helpers/get-scaling-factor.ts`
- `packages/themes/src/helpers/has-own-property.ts`
- `packages/themes/src/helpers/inert.ts`
- `packages/themes/src/helpers/input-attributes.ts`
- `packages/themes/src/helpers/is-responsive-object.ts`
- `packages/themes/src/helpers/map-prop-values.ts`
- `packages/themes/src/helpers/merge-styles.ts`


The imported closure is self-contained in this list: `icon-button.css` imports `_internal/base-button.css`; `table.css` uses the ScrollArea classes supplied by `scroll-area.css`. `data-table.css` is locally authored to compose the native table and virtualization styles; it is not copied from R2S. The build pipeline processes these source CSS files without adding them to the eager application stylesheet.

## Verbatim upstream license and attribution notices

### Radix2Solid

MIT License

Copyright (c) 2026 Radix2Solid contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

This repository adapts and reuses the software below. Their original MIT licenses and copyright notices are retained unchanged. This is an independent, unofficial native Solid 2 port; it is not affiliated with or endorsed by Radix, WorkOS or Modulz, and the MIT licenses do not grant rights to their names, logos or trademarks.

### Radix Themes (radix-ui/themes)

MIT License

Copyright (c) 2023 WorkOS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### Radix Colors (radix-ui/colors repository)

MIT License

Copyright (c) 2021-2022 Modulz
Copyright (c) 2022-Present WorkOS

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

### Radix Colors, as published in @radix-ui/colors 3.0.0

MIT License

Copyright (c) 2021 Radix

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
