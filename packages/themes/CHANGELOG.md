# Changelog

## 0.0.0

- Add stateless themed views for the foundation layout, typography, and controls.
- Add Dialog, DropdownMenu, and Tabs Foldkit submodel helpers.
- Publish the generated foundation stylesheets and token files.
- Publish the CSS module declaration referenced by the stylesheet exports.
- Export every generated `*.layer.css` stylesheet sibling.
- Align stateful component markup and loading spinner sizing with the pinned Radix Themes CSS.
- Restore the Radix Card reset/BaseCard classes and Dialog Content's 600px max-width default.
- Match the gallery Cards and Tabs sample props/content to the pinned Radix2Solid reference for visual comparisons.
- Separate Tabs label and panel rendering; apply Button styling to DropdownMenu triggers and Dialog close controls.
- Apply the active Theme settings to portaled DropdownMenu panels so their panel tokens resolve outside the page Theme root.
- Place the shared portal root inside the root Theme so portaled controls inherit its tokens.
- Render the gallery shell with themed layout, navigation, date, and action controls.
- Add a virtualized native DataTable with filtering, stable sorting, controlled selection, and optional Grid navigation.
- Match ContextMenu content size, solid/soft variant, explicit or default accent color, and high-contrast props to the pinned Radix2Solid menu contract.
- Add themed AlertDialog, Popover, HoverCard, Tooltip, ContextMenu, and TabNav views; match their classes, timings, state attributes, and root-Theme portal behavior to the pinned Radix Themes contract.
- Omit `aria-orientation` from decorative Separators; expose it only with separator semantics.
- Export `components-base.css`, preserving the pre-SP2 component stylesheet set for eager shells.
- Add themed Checkbox, Radio, Switch, SegmentedControl, Select, TextArea and single/range Slider controls.
- Export the multi-thumb Slider through an isolated `components/slider/range` subpath so lazy range routes do not pull in the single-slider runtime.
- Forward native name, required, placeholder, rows, and ARIA attributes to themed TextArea inputs.
- Cover view reuse counters for CheckboxGroup, CheckboxCards, RadioGroup, RadioCards, SegmentedControl, and TextArea.
- Allow TextArea labels to be omitted when native ARIA labeling is supplied.
- Add accessibility, layout, avatar, feedback, typography, data, navigation, and theme-panel views from the pinned Radix Themes API.
- Add virtualized, keyboard-navigable DataTable views and publish the complete component stylesheet subpaths with provenance notices.
- Preserve DataTable keyboard focus after row filtering and sorting while virtualized rows update.
- Restore DataTable Grid selection, Ctrl+Home navigation to the first data cell, replacement-cell focus, and visible-range-bounded row caching.
- Require Checkbox toggle callbacks to match Foldkit's controlled checkbox contract.
- Keep AlertDialog under the containing root Theme portal so its content inherits root tokens.
