# @wsagency/wseffect-themes

Radix Themes' foundation CSS and thin, stateless Foldkit view helpers for applications built with `foldkit` and `@foldkit/ui`.

## Install

```sh
pnpm add @wsagency/wseffect-themes foldkit @foldkit/ui effect @effect/platform-browser
```

The package peers on `foldkit` and `@foldkit/ui` 0.168.0 and Effect 4.

## Importing components

```ts
import { Box, Button, Dialog, Flex, Grid, Heading, Text, TextField, Theme } from '@wsagency/wseffect-themes'

const title = Heading.view({ size: '6' }, ['Settings'], h)
const action = Button.view({ variant: 'solid', onClick: Message.Saved() }, ['Save'], h)
const layout = Box.view({ p: '3', width: '100%' }, [title, action], h)
```

The package also exports `Card`, `DropdownMenu`, and `Tabs`. `Dialog`, `DropdownMenu`, and `Tabs` expose the stateful Foldkit helpers described by their component exports; they do not add wrapper state.

## Stylesheets

Import the token/theme CSS and component CSS in your application entry point:

```ts
import '@wsagency/wseffect-themes/styles.css'
import '@wsagency/wseffect-themes/components.css'
```

The package exposes the generated utilities, token, layout, and per-component CSS files as separate subpaths when applications need a smaller stylesheet set.

## License

This package is MIT licensed. It retains the Radix Themes MIT notice copyright 2023 WorkOS, Radix Colors MIT notice copyright 2021 Radix, and radix2solid MIT notice copyright 2026 Radix2Solid contributors; see `LICENSE` for the full notices.
