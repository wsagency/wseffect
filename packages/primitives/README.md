# @wsagency/wseffect-primitives

Local, JavaScript-only stateful and view primitives for the WSEffect Themes package. Import only the named ESM subpath required by a consumer:

- `@wsagency/wseffect-primitives/checkbox-group` — stateless controlled CheckboxGroup view.
- `@wsagency/wseffect-primitives/select-position` — element-lifetime positioning for item-aligned Select panels.
- `@wsagency/wseffect-primitives/select` — generic Foldkit Listbox adapter for item-aligned Selects.
- `@wsagency/wseffect-primitives/context-menu` — ContextMenu invocation, anchor, and source-lifetime state.
- `@wsagency/wseffect-primitives/range-slider` — stable-ID, controlled multi-thumb Slider model and view.
- `@wsagency/wseffect-primitives/tooltip-group` — shared Tooltip open/skip-delay coordination model.

The core and UI imports use wseffect-owned workspace packages `@wsagency/wseffect-foldkit` and `@wsagency/wseffect-foldkit-ui` at the vendored 0.168.0 snapshot. `@floating-ui/dom` is a direct dependency used only by the ContextMenu subpath. This package is MIT licensed; retain all applicable third-party notices when copying source or CSS.

## License

MIT. See `LICENSE` for the license text. Included upstream material retains the notices recorded with its source and in the package provenance records.
