# @wsagency/wseffect-themes

Radix Themes' foundation CSS and thin, stateless Foldkit view helpers for applications built with wseffect's owned Foldkit core and UI packages.

## Install

```sh
pnpm add @wsagency/wseffect-themes @wsagency/wseffect-foldkit @wsagency/wseffect-foldkit-ui effect @effect/platform-browser
```

The package uses workspace-owned Foldkit core and UI packages from the vendored 0.168.0 snapshot and Effect 4.

## Importing components

```ts
import { Box, Button, Dialog, Flex, Grid, Heading, Text, TextField, Theme } from '@wsagency/wseffect-themes'

const title = Heading.view({ size: '6' }, ['Settings'], h)
const action = Button.view({ variant: 'solid', onClick: Message.Saved() }, ['Save'], h)
const layout = Box.view({ p: '3', width: '100%' }, [title, action], h)
```

The package also exports `Card`, `DropdownMenu`, and `Tabs`. `Dialog`, `DropdownMenu`, and `Tabs` expose the stateful Foldkit helpers described by their component exports; they do not add wrapper state.

## Portaled menus and Themes

Foldkit's anchored UI panels share a `#foldkit-portal-root` in their containing Document or ShadowRoot. Render that element as the first child of the root Theme so portaled menu panels inherit its CSS variables, appearance, and color settings:

```ts
Theme.view({ settings, isRoot: true }, [
  h.div([h.Id('foldkit-portal-root')], []),
  appContent,
], h)
```

Menus inherit that shared root Theme by default. A menu inside a nested Theme can opt into its local settings by passing `themeSettings` in `DropdownMenu.embed`'s `viewInputs`; the override is applied only while the panel is visible.

## Stylesheets

Import the token/theme CSS and component CSS in your application entry point:

```ts
import '@wsagency/wseffect-themes/styles.css'
import '@wsagency/wseffect-themes/components.css'
```

The package exposes the generated utilities, token, layout, and per-component CSS files as separate subpaths when applications need a smaller stylesheet set.

## License

This package is MIT licensed. It retains the Radix Themes MIT notice copyright 2023 WorkOS, Radix Colors MIT notice copyright 2021 Radix, and radix2solid MIT notice copyright 2026 Radix2Solid contributors; see `LICENSE` for the full notices.
