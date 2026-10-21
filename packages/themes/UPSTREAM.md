# Upstream CSS provenance

The CSS files listed below are copied verbatim from Radix2Solid at commit `383676172abb84b4a1d2e54a087d290437ee8848` (the pinned release used for this port). The corresponding files are under `src/css-components/` in this package; `_internal/base-button.css` is the transitive import required by `icon-button.css`. No upstream TypeScript or Solid implementation is copied.

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

The imported closure is self-contained in this list: `icon-button.css` imports `_internal/base-button.css`; `table.css` uses the ScrollArea classes supplied by `scroll-area.css`. The build pipeline processes these source CSS files without adding them to the eager application stylesheet.

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
