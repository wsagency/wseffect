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
