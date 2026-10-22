# Proposal: composable CheckboxGroup

**Status:** local proposal draft; not submitted upstream.  
**Affected package:** `@foldkit/ui@0.168.0`.

## Problem

Foldkit exposes a controlled, single-checkbox view, but no group abstraction that composes labeled checkbox options while keeping selection in the parent model. Consumers must rebuild group semantics, option wiring, and consistent checked/disabled behavior themselves.

## Evidence (`@foldkit/ui@0.168.0`)

The installed package exports `./checkbox` (`apps/gallery/node_modules/@foldkit/ui/package.json:30-33`) but no CheckboxGroup subpath in its export map. The installed Checkbox view accepts one `isChecked` value, one `onToggle` message constructor, and a consumer-provided `toView` (`apps/gallery/node_modules/@foldkit/ui/dist/checkbox/index.d.ts:28-57,62-83`). This is a single control API; composition and group-level selection remain consumer work.

## Local workaround

WSEffect implements a stateless, controlled group at `packages/primitives/src/checkbox-group.ts:3-27`. Its `view` renders a labelled `role="group"`, maps options to checkbox inputs, reads each value from the parent-owned `selected` set, and emits a typed `toggleMessage(value, isChecked)`. It supplies a working group but duplicates composition above Foldkit's individual Checkbox abstraction.

## Proposed API

Add a controlled `CheckboxGroup.view` accepting `{ id, label, options, selectedValues, onToggle }`, where each option contains a stable string value, label, and optional disabled state. `onToggle(value, isChecked)` returns the parent's Message; the group does not own selected values. Let `toView` or an equivalent compound-part API compose the existing Checkbox attributes so applications can customize markup without recreating checkbox behavior.

## Test ideas

- Render a named group with checked and unchecked values; assert group labeling and each checkbox's checked state.
- Toggle one option and assert the emitted value and next checked state without internal selection mutation.
- Verify group-level and per-option disabled state, including that other options remain interactive.
- Verify custom composition preserves the individual Checkbox's keyboard and accessible semantics.
