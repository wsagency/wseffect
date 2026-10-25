# Proposal: multi-thumb Slider

**Status:** approved for local implementation; lane work is in progress. No upstream PR is required; upstream follow-up is optional.
**Affected package:** `@foldkit/ui@0.168.0`.

## Problem

Slider's controlled value and interaction messages describe one scalar thumb. Range controls therefore cannot reuse the upstream Slider's accessible rendering and drag/keyboard behavior for multiple related values; consumers must build a second state and view implementation, including ordering and bounds between thumbs.

## Evidence (`@foldkit/ui@0.168.0`)

The installed Slider's `ViewInputs` contains one `value: number` (`apps/gallery/node_modules/@foldkit/ui/dist/slider/index.d.ts:294-337`), its `ChangedValue` OutMessage has one number (`:51-57`), and its Model captures a single drag origin (`:7-24`). The public subpath exports `Slider` only (`apps/gallery/node_modules/@foldkit/ui/package.json:102-105`). These declarations describe the single-thumb contract, not a coordinated range.

## Local workaround

`packages/primitives/src/range-slider.ts:5-47` defines a controlled list of identified thumbs and a drag snapshot; `:49-99` implements neighboring-thumb limits, keyboard/page/boundary changes, drag updates, and drag cancellation. Its view renders one range input per thumb (`:102-138`). This works locally but duplicates the value constraints and per-thumb interaction behavior rather than composing the upstream Slider.

## Proposed API

Add a `RangeSlider` bundle/view whose controlled input is `thumbs: ReadonlyArray<{ id: string; value: number; min?: number; max?: number; step?: number }>` plus global range/orientation settings. Emit one `ValuesChanged({ thumbs })` event when any thumb changes. Keep stable thumb identity, each thumb's effective bounds/step, and non-crossing behavior explicit; share the existing Slider's thumb attribute, keyboard, and drag implementation where possible.

## Test ideas

- Render two or more individually named slider thumbs with their own `aria-valuenow`, bounds, and stable IDs.
- Exercise arrows, Home/End, Page keys, pointer drag, and disabled behavior for each thumb.
- Verify a thumb cannot cross its neighbor and per-thumb bounds/step compose with global constraints.
- Cancel a drag and restore the entire pre-drag value list; serialize/restore any interaction model state.
- Verify a single-thumb Slider retains its existing API and behavior.
