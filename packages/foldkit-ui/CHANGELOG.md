# @wsagency/wseffect-foldkit-ui

## Unreleased

- Align item-aligned Select panels to their trigger after viewport clamping where the scroll range permits while tracking active/selected option geometry, route Menu context invocations through contextual anchors, focus the active ContextMenu item on initial open, invalidate closed touch long-presses, and restore Menu's typeahead and delay-clear public type.
- Absorb CheckboxGroup, context-menu invocation, Tooltip group, Slider.Range, and the popup Select adapter into Foldkit UI. `VirtualList.view` supports custom container/row/spacer/window rendering, with `rowToView` replacing the default `itemToView` callback; Themes consumes these headless APIs while retaining themed rendering. Remove the unpublished primitives package.
- Keep nested custom rows scoped to their nearest virtual viewport, measure the custom row area's leading offset for consistent virtual scrolling, and read Slider.Range disabled state from its live root DOM attribute.

## Local snapshot

Vendored from Foldkit `@foldkit/ui@0.168.0` at `0602719`.

See the [upstream CHANGELOG at 0602719](https://github.com/foldkit/foldkit/blob/0602719/packages/ui/CHANGELOG.md).
