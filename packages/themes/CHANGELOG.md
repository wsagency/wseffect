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
- Add themed AlertDialog, Popover, HoverCard, Tooltip, ContextMenu, and TabNav views; match their classes, timings, state attributes, and portal behavior to the pinned Radix Themes contract.
- Omit `aria-orientation` from decorative Separators; expose it only with separator semantics.
- Export `components-base.css`, preserving the pre-SP2 component stylesheet set for eager shells.
- Add themed Checkbox, Radio, Switch, SegmentedControl, Select, TextArea and single/range Slider controls.
- Forward native name, required, placeholder, rows, and ARIA attributes to themed TextArea inputs.
- Cover view reuse counters for CheckboxGroup, CheckboxCards, RadioGroup, RadioCards, SegmentedControl, and TextArea.
- Allow TextArea labels to be omitted when native ARIA labeling is supplied.
- Add accessibility, layout, avatar, feedback, typography, data, navigation, and theme-panel views from the pinned Radix Themes API.
- Add virtualized, keyboard-navigable DataTable views and publish the complete component stylesheet subpaths with provenance notices.
- Match AlertDialog action layout and HoverCard link-trigger markup to the pinned reference; preserve Radix Progress indicator widths without double scaling.
