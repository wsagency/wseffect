import * as Themes from '@wsagency/wseffect-themes'

const exposedNamespaces = {
  AccessibleIcon: Themes.AccessibleIcon,
  AspectRatio: Themes.AspectRatio,
  Avatar: Themes.Avatar,
  Badge: Themes.Badge,
  Blockquote: Themes.Blockquote,
  Callout: Themes.Callout,
  Code: Themes.Code,
  Container: Themes.Container,
  DataList: Themes.DataList,
  Em: Themes.Em,
  IconButton: Themes.IconButton,
  Inset: Themes.Inset,
  Kbd: Themes.Kbd,
  Link: Themes.Link,
  Progress: Themes.Progress,
  Quote: Themes.Quote,
  ScrollArea: Themes.ScrollArea,
  Section: Themes.Section,
  Separator: Themes.Separator,
  Skeleton: Themes.Skeleton,
  Spinner: Themes.Spinner,
  Strong: Themes.Strong,
  Table: Themes.Table,
  ThemePanel: Themes.ThemePanel,
  VisuallyHidden: Themes.VisuallyHidden,
}

function hasCallableApi(value, visited = new WeakSet()) {
  if (typeof value === 'function') return true
  if (!value || typeof value !== 'object' || visited.has(value)) return false
  visited.add(value)
  return Object.values(value).some(child => hasCallableApi(child, visited))
}

for (const [name, namespace] of Object.entries(exposedNamespaces)) {
  if (!hasCallableApi(namespace)) {
    throw new Error(`@wsagency/wseffect-themes root export ${name} has no callable component API`)
  }
}
