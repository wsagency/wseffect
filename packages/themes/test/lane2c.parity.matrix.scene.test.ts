import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { defineMessageUnion } from 'foldkit/message'
import type { Html, HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { describe, expect, it } from 'vitest'
import * as AccessibleIcon from '../src/components/accessible-icon.js'
import * as AspectRatio from '../src/components/aspect-ratio.js'
import * as Avatar from '../src/components/avatar.js'
import * as Badge from '../src/components/badge.js'
import * as Blockquote from '../src/components/blockquote.js'
import * as Callout from '../src/components/callout.js'
import * as Code from '../src/components/code.js'
import * as Container from '../src/components/container.js'
import * as DataList from '../src/components/data-list.js'
import * as Em from '../src/components/em.js'
import * as IconButton from '../src/components/icon-button.js'
import * as Inset from '../src/components/inset.js'
import * as Kbd from '../src/components/kbd.js'
import * as Link from '../src/components/link.js'
import * as Progress from '../src/components/progress.js'
import * as Quote from '../src/components/quote.js'
import * as ScrollArea from '../src/components/scroll-area.js'
import * as Section from '../src/components/section.js'
import * as Separator from '../src/components/separator.js'
import * as Skeleton from '../src/components/skeleton.js'
import * as Spinner from '../src/components/spinner.js'
import * as Strong from '../src/components/strong.js'
import { mountScrollArea } from '../src/components/scroll-area.mount.js'
import * as Table from '../src/components/table.js'
import * as ThemePanel from '../src/components/theme-panel.js'
import * as VisuallyHidden from '../src/components/visually-hidden.js'

const Messages = defineMessageUnion({ Tick: {} })
type Message = typeof Messages.Type | ThemePanel.Message
type Row = {
  name: string
  render: (h: HtmlBuilder<Message>) => Html
  selector: string
  className?: string
  attrs?: ReadonlyArray<readonly [string, string]>
  styles?: ReadonlyArray<readonly [string, string]>
  text?: string
  additional?: ReadonlyArray<{ selector: string; className?: string; attrs?: ReadonlyArray<readonly [string, string]>; styles?: ReadonlyArray<readonly [string, string]> }>
}
type ResetRow = { name: 'Reset CSS' }
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const child = 'Lane 2C'
const rows: ReadonlyArray<Row> = [
  { name: 'AccessibleIcon', render: h => AccessibleIcon.view({ label: 'Save document' }, [h.span([], ['icon'])], h), selector: 'div', text: 'Save document', additional: [{ selector: 'span[aria-hidden="true"]', attrs: [['focusable', 'false']] }] },
  { name: 'VisuallyHidden', render: h => VisuallyHidden.view({}, [child], h), selector: 'span', styles: [['position', 'absolute'], ['clip', 'rect(0, 0, 0, 0)']], text: child },
  { name: 'Progress', render: h => Progress.view({ value: 30, max: 50, size: '3', variant: 'classic', color: 'crimson', highContrast: true, radius: 'full', duration: '2s' }, [], h), selector: 'div[role="progressbar"]', className: 'rt-ProgressRoot rt-r-size-3 rt-variant-classic rt-high-contrast', attrs: [['data-accent-color', 'crimson'], ['data-radius', 'full'], ['aria-valuenow', '30'], ['aria-valuemax', '50']], styles: [['--progress-value', '30'], ['--progress-max', '50'], ['--progress-duration', '2s']] },
  { name: 'Separator', render: h => Separator.view({ orientation: 'vertical', size: '3', color: 'crimson', decorative: false }, [], h), selector: 'span[role="separator"]', className: 'rt-Separator rt-r-orientation-vertical rt-r-size-3', attrs: [['data-accent-color', 'crimson'], ['aria-orientation', 'vertical']] },
  { name: 'Skeleton', render: h => Skeleton.view({ loading: true, width: '100%', height: '2rem' }, [child], h), selector: 'span.rt-Skeleton', className: 'rt-Skeleton rt-r-w rt-r-h', attrs: [['aria-hidden', 'true'], ['data-inline-skeleton', '']], styles: [['--width', '100%'], ['--height', '2rem']] },
  { name: 'Spinner', render: h => Spinner.view({ size: '3' }, [], h), selector: 'span.rt-Spinner', className: 'rt-Spinner rt-r-size-3' },
  { name: 'AspectRatio', render: h => AspectRatio.view({ ratio: 16 / 9 }, [h.span([], [child])], h), selector: 'div[data-radix-aspect-ratio-wrapper]', attrs: [['data-radix-aspect-ratio-wrapper', '']], styles: [['padding-bottom', '56.25%']], text: child },
  { name: 'Container', render: h => Container.view({ size: { initial: '2', md: '3' }, align: 'center', display: 'initial' }, [h.span([], [child])], h), selector: 'div.rt-Container', className: 'rt-Container rt-r-size-2 md:rt-r-size-3 rt-r-display-flex rt-r-ai-center', text: child, additional: [{ selector: 'div.rt-ContainerInner', className: 'rt-ContainerInner' }] },
  { name: 'Inset', render: h => Inset.view({ side: 'x', clip: 'padding-box', p: '0' }, [child], h), selector: 'div.rt-Inset', className: 'rt-Inset rt-r-side-x rt-r-clip-padding-box rt-r-p-0', text: child },
  { name: 'Section', render: h => Section.view({ size: '2', display: 'none' }, [child], h), selector: 'section.rt-Section', className: 'rt-Section rt-r-size-2 rt-r-display-none', text: child },
  { name: 'ScrollArea', render: h => ScrollArea.view({ size: '3', radius: 'full', scrollbars: 'vertical' }, [child], h), selector: 'div.rt-ScrollAreaScrollbar[data-orientation="vertical"]', className: 'rt-ScrollAreaScrollbar rt-r-size-3', attrs: [['data-state', 'hidden'], ['aria-hidden', 'true'], ['data-radius', 'full']] },
  { name: 'Avatar', render: h => Avatar.view({ fallback: 'JD', size: '5', variant: 'solid', color: 'crimson', highContrast: true, radius: 'full' }, [], h), selector: 'span.rt-AvatarRoot', className: 'rt-reset rt-AvatarRoot rt-r-size-5 rt-variant-solid rt-high-contrast', attrs: [['data-accent-color', 'crimson'], ['data-radius', 'full']], text: 'JD' },
  { name: 'Badge', render: h => Badge.view({ size: '2', variant: 'outline', color: 'crimson', highContrast: true, radius: 'full' }, [child], h), selector: 'span.rt-Badge', className: 'rt-Badge rt-r-size-2 rt-variant-outline rt-high-contrast', attrs: [['data-accent-color', 'crimson'], ['radius', 'full']], text: child },
  { name: 'Callout.Root', render: h => Callout.Root.view({ size: '3', variant: 'outline', color: 'crimson', highContrast: true }, [], h), selector: 'div.rt-CalloutRoot', className: 'rt-CalloutRoot rt-r-size-3 rt-variant-outline rt-high-contrast', attrs: [['data-accent-color', 'crimson']] },
  { name: 'Callout.Icon', render: h => Callout.Icon.view({}, [child], h), selector: 'div.rt-CalloutIcon', className: 'rt-CalloutIcon', text: child },
  { name: 'Callout.Text', render: h => Callout.Text.view({ size: '3', color: 'crimson' }, [child], h), selector: 'p.rt-CalloutText', className: 'rt-Text rt-CalloutText rt-r-size-3', attrs: [['data-accent-color', 'crimson']], text: child },
  { name: 'ThemePanel', render: h => ThemePanel.view({ isOpen: false, settings: { accentColor: 'crimson', appearance: 'dark' }, toSettingsChanged: settings => ({ _tag: 'SettingsChanged', settings }) }, [], h), selector: 'div[role="region"]', attrs: [['aria-label', 'Theme settings'], ['hidden', '']] },
  { name: 'Blockquote', render: h => Blockquote.view({ size: '4', weight: 'bold', color: 'crimson', highContrast: true }, [child], h), selector: 'blockquote.rt-Blockquote', className: 'rt-Text rt-Blockquote rt-r-size-4 rt-r-weight-bold rt-high-contrast', attrs: [['data-accent-color', 'crimson']], text: child },
  { name: 'Quote', render: h => Quote.view({ wrap: 'balance', truncate: true }, [child], h), selector: 'q.rt-Quote', className: 'rt-Quote rt-r-tw-balance rt-truncate', text: child },
  { name: 'Em', render: h => Em.view({ wrap: 'balance', truncate: true }, [child], h), selector: 'em.rt-Em', className: 'rt-Em rt-r-tw-balance rt-truncate', text: child },
  { name: 'Strong', render: h => Strong.view({ wrap: 'pretty', truncate: true }, [child], h), selector: 'strong.rt-Strong', className: 'rt-Strong rt-r-tw-pretty rt-truncate', text: child },
  { name: 'Code', render: h => Code.view({ size: '4', variant: 'outline', weight: 'bold', color: 'crimson', highContrast: true }, [child], h), selector: 'code.rt-Code', className: 'rt-reset rt-Code rt-r-size-4 rt-variant-outline rt-r-weight-bold rt-high-contrast', attrs: [['data-accent-color', 'crimson']], text: child },
  { name: 'Kbd', render: h => Kbd.view({ size: '3', variant: 'soft' }, [child], h), selector: 'kbd.rt-Kbd', className: 'rt-reset rt-Kbd rt-r-size-3 rt-variant-soft', text: child },
  { name: 'IconButton', render: h => IconButton.view({ size: '3', variant: 'outline', color: 'crimson', radius: 'full', highContrast: true, 'aria-label': 'Close' }, [child], h), selector: 'button.rt-IconButton', className: 'rt-reset rt-BaseButton rt-r-size-3 rt-variant-outline rt-IconButton rt-high-contrast', attrs: [['aria-label', 'Close'], ['data-accent-color', 'crimson'], ['data-radius', 'full']], text: child },
  { name: 'Link', render: h => Link.view({ href: '/docs', size: '3', underline: 'always', weight: 'bold', color: 'crimson', highContrast: true }, [child], h), selector: 'a.rt-Link', className: 'rt-Text rt-reset rt-Link rt-r-size-3 rt-r-weight-bold rt-underline-always rt-high-contrast', attrs: [['href', '/docs'], ['data-accent-color', 'crimson']], text: child },
  { name: 'DataList.Root', render: h => DataList.Root.view({ orientation: 'vertical', size: '3', trim: 'both' }, [DataList.Label.view({}, ['Name'], h), DataList.Value.view({}, ['Ada'], h)], h), selector: 'dl.rt-DataListRoot', className: 'rt-reset rt-Text rt-DataListRoot rt-r-orientation-vertical rt-r-size-3 rt-r-trim-both', text: 'Name' },
  { name: 'DataList.Item', render: h => DataList.Item.view({ align: 'baseline' }, [DataList.Label.view({}, ['Name'], h), DataList.Value.view({}, ['Ada'], h)], h), selector: 'div.rt-DataListItem', className: 'rt-DataListItem rt-r-ai-baseline', text: 'Name' },
  { name: 'DataList.Label', render: h => DataList.Label.view({ width: '240px', color: 'crimson', highContrast: true }, [child], h), selector: 'dt.rt-DataListLabel', className: 'rt-DataListLabel rt-r-w rt-high-contrast', attrs: [['data-accent-color', 'crimson']], styles: [['--width', '240px']], text: child },
  { name: 'DataList.Value', render: h => DataList.Value.view({}, [child], h), selector: 'dd.rt-DataListValue', className: 'rt-DataListValue', text: child },
  { name: 'Table.Root', render: h => Table.Root.view({ size: '3', variant: 'surface', layout: { initial: 'auto', md: 'fixed' } }, [], h), selector: 'div.rt-TableRoot', className: 'rt-TableRoot rt-r-size-3 rt-variant-surface', additional: [{ selector: 'table.rt-TableRootTable', className: 'rt-TableRootTable rt-r-tl-auto md:rt-r-tl-fixed' }] },
  { name: 'Table.Header', render: h => Table.Header.view({}, [child], h), selector: 'thead.rt-TableHeader', className: 'rt-TableHeader', text: child },
  { name: 'Table.Body', render: h => Table.Body.view({}, [child], h), selector: 'tbody.rt-TableBody', className: 'rt-TableBody', text: child },
  { name: 'Table.Row', render: h => Table.Row.view({ align: 'baseline' }, [child], h), selector: 'tr.rt-TableRow', className: 'rt-TableRow rt-r-va-baseline', text: child },
  { name: 'Table.Cell', render: h => Table.Cell.view({ justify: 'end', width: { initial: '180px', md: '240px' }, px: '3' }, [child], h), selector: 'td.rt-TableCell', className: 'rt-TableCell rt-r-ta-right rt-r-w md:rt-r-w rt-r-px-3', styles: [['--width', '180px'], ['--width-md', '240px']], text: child },
  { name: 'Table.ColumnHeaderCell', render: h => Table.ColumnHeaderCell.view({ justify: 'center', width: '200px' }, [child], h), selector: 'th.rt-TableColumnHeaderCell', className: 'rt-TableCell rt-TableColumnHeaderCell rt-r-ta-center rt-r-w', attrs: [['scope', 'col']], styles: [['--width', '200px']], text: child },
  { name: 'Table.RowHeaderCell', render: h => Table.RowHeaderCell.view({ justify: 'start', width: '180px' }, [child], h), selector: 'th.rt-TableRowHeaderCell', className: 'rt-TableCell rt-TableRowHeaderCell rt-r-ta-left rt-r-w', attrs: [['scope', 'row']], styles: [['--width', '180px']], text: child },
]
const defaultRows: ReadonlyArray<Row> = [
  { name: 'AccessibleIcon defaults', render: h => AccessibleIcon.view({ label: 'Save document' }, [h.span([], ['icon'])], h), selector: 'div', text: 'Save document', additional: [{ selector: 'span[aria-hidden="true"]', attrs: [['focusable', 'false']] }] },
  { name: 'VisuallyHidden defaults', render: h => VisuallyHidden.view({}, [child], h), selector: 'span', styles: [['position', 'absolute'], ['clip', 'rect(0, 0, 0, 0)']], text: child },
  { name: 'Progress defaults', render: h => Progress.view({}, [], h), selector: 'div[role="progressbar"]', className: 'rt-ProgressRoot rt-r-size-2 rt-variant-surface', attrs: [['data-max', '100'], ['aria-valuemin', '0'], ['aria-valuemax', '100']] },
  { name: 'Separator defaults', render: h => Separator.view({}, [], h), selector: 'span.rt-Separator', className: 'rt-Separator rt-r-orientation-horizontal rt-r-size-1', attrs: [['data-accent-color', 'gray']] },
  { name: 'Skeleton defaults', render: h => Skeleton.view({}, [child], h), selector: 'span.rt-Skeleton', className: 'rt-Skeleton', attrs: [['aria-hidden', 'true'], ['data-inline-skeleton', '']], text: child },
  { name: 'Spinner defaults', render: h => Spinner.view({}, [], h), selector: 'span.rt-Spinner', className: 'rt-Spinner rt-r-size-2' },
  { name: 'AspectRatio defaults', render: h => AspectRatio.view({}, [h.span([], [child])], h), selector: 'div[data-radix-aspect-ratio-wrapper]', attrs: [['data-radix-aspect-ratio-wrapper', '']], styles: [['padding-bottom', '100%']], text: child },
  { name: 'Container defaults', render: h => Container.view({}, [h.span([], [child])], h), selector: 'div.rt-Container', className: 'rt-Container rt-r-size-4', text: child },
  { name: 'Inset defaults', render: h => Inset.view({}, [child], h), selector: 'div.rt-Inset', className: 'rt-Inset rt-r-side-all rt-r-clip-border-box', text: child },
  { name: 'Section defaults', render: h => Section.view({}, [child], h), selector: 'section.rt-Section', className: 'rt-Section rt-r-size-3', text: child },
  { name: 'ScrollArea defaults', render: h => ScrollArea.view({}, [child], h), selector: 'div.rt-ScrollAreaScrollbar[data-orientation="horizontal"]', className: 'rt-ScrollAreaScrollbar rt-r-size-1', attrs: [['data-state', 'hidden'], ['aria-hidden', 'true']] },
  { name: 'Avatar defaults', render: h => Avatar.view({ fallback: 'JD' }, [], h), selector: 'span.rt-AvatarRoot', className: 'rt-reset rt-AvatarRoot rt-r-size-3 rt-variant-soft', attrs: [['data-accent-color', '']], text: 'JD' },
  { name: 'Badge defaults', render: h => Badge.view({}, [child], h), selector: 'span.rt-Badge', className: 'rt-Badge rt-r-size-1 rt-variant-soft', attrs: [['data-accent-color', '']], text: child },
  { name: 'Callout.Root defaults', render: h => Callout.Root.view({}, [], h), selector: 'div.rt-CalloutRoot', className: 'rt-CalloutRoot rt-r-size-2 rt-variant-soft', attrs: [['data-accent-color', '']] },
  { name: 'Callout.Icon defaults', render: h => Callout.Icon.view({}, [child], h), selector: 'div.rt-CalloutIcon', className: 'rt-CalloutIcon', text: child },
  { name: 'Callout.Text defaults', render: h => Callout.Text.view({}, [child], h), selector: 'p.rt-CalloutText', className: 'rt-Text rt-CalloutText rt-r-size-2', text: child },
  { name: 'ThemePanel defaults', render: h => ThemePanel.view({ isOpen: false, settings: {}, toSettingsChanged: settings => ({ _tag: 'SettingsChanged', settings }) }, [], h), selector: 'div[role="region"]', attrs: [['aria-label', 'Theme settings'], ['hidden', '']] },
  { name: 'Blockquote defaults', render: h => Blockquote.view({}, [child], h), selector: 'blockquote.rt-Blockquote', className: 'rt-Text rt-Blockquote', text: child },
  { name: 'Quote defaults', render: h => Quote.view({}, [child], h), selector: 'q.rt-Quote', className: 'rt-Quote', text: child },
  { name: 'Em defaults', render: h => Em.view({}, [child], h), selector: 'em.rt-Em', className: 'rt-Em', text: child },
  { name: 'Strong defaults', render: h => Strong.view({}, [child], h), selector: 'strong.rt-Strong', className: 'rt-Strong', text: child },
  { name: 'Code defaults', render: h => Code.view({}, [child], h), selector: 'code.rt-Code', className: 'rt-reset rt-Code rt-variant-soft', attrs: [['data-accent-color', '']], text: child },
  { name: 'Kbd defaults', render: h => Kbd.view({}, [child], h), selector: 'kbd.rt-Kbd', className: 'rt-reset rt-Kbd rt-variant-classic', text: child },
  { name: 'IconButton defaults', render: h => IconButton.view({}, [child], h), selector: 'button.rt-IconButton', className: 'rt-reset rt-BaseButton rt-r-size-2 rt-variant-solid rt-IconButton', attrs: [['data-accent-color', '']], text: child },
  { name: 'Link defaults', render: h => Link.view({}, [child], h), selector: 'a.rt-Link', className: 'rt-Text rt-reset rt-Link rt-underline-auto', text: child },
  { name: 'DataList.Root defaults', render: h => DataList.Root.view({}, [DataList.Label.view({}, ['Name'], h), DataList.Value.view({}, ['Ada'], h)], h), selector: 'dl.rt-DataListRoot', className: 'rt-reset rt-Text rt-DataListRoot rt-r-orientation-horizontal rt-r-size-2', text: 'Name' },
  { name: 'DataList.Item defaults', render: h => DataList.Item.view({}, [DataList.Label.view({}, ['Name'], h), DataList.Value.view({}, ['Ada'], h)], h), selector: 'div.rt-DataListItem', className: 'rt-DataListItem', text: 'Name' },
  { name: 'DataList.Label defaults', render: h => DataList.Label.view({}, [child], h), selector: 'dt.rt-DataListLabel', className: 'rt-DataListLabel', text: child },
  { name: 'DataList.Value defaults', render: h => DataList.Value.view({}, [child], h), selector: 'dd.rt-DataListValue', className: 'rt-DataListValue', text: child },
  { name: 'Table.Root defaults', render: h => Table.Root.view({}, [], h), selector: 'div.rt-TableRoot', className: 'rt-TableRoot rt-r-size-2 rt-variant-ghost', additional: [{ selector: 'table.rt-TableRootTable', className: 'rt-TableRootTable' }] },
  { name: 'Table.Header defaults', render: h => Table.Header.view({}, [child], h), selector: 'thead.rt-TableHeader', className: 'rt-TableHeader', text: child },
  { name: 'Table.Body defaults', render: h => Table.Body.view({}, [child], h), selector: 'tbody.rt-TableBody', className: 'rt-TableBody', text: child },
  { name: 'Table.Row defaults', render: h => Table.Row.view({}, [child], h), selector: 'tr.rt-TableRow', className: 'rt-TableRow', text: child },
  { name: 'Table.Cell defaults', render: h => Table.Cell.view({}, [child], h), selector: 'td.rt-TableCell', className: 'rt-TableCell', text: child },
  { name: 'Table.ColumnHeaderCell defaults', render: h => Table.ColumnHeaderCell.view({}, [child], h), selector: 'th.rt-TableColumnHeaderCell', className: 'rt-TableCell rt-TableColumnHeaderCell', attrs: [['scope', 'col']], text: child },
  { name: 'Table.RowHeaderCell defaults', render: h => Table.RowHeaderCell.view({}, [child], h), selector: 'th.rt-TableRowHeaderCell', className: 'rt-TableCell rt-TableRowHeaderCell', attrs: [['scope', 'row']], text: child },
]

const allRows = [...rows, ...defaultRows]
const resetRows: ReadonlyArray<ResetRow> = [{ name: 'Reset CSS' }]

describe('Lane 2C Themes parity matrix', () => {
  it.each(allRows)('$name matches pinned structure and props', row => Scene.scene(
    { update, view: (_model, h) => row.render(h) },
    Scene.given({}),
    ...(row.name.startsWith('ScrollArea') || row.name.startsWith('Table.Root') ? [Scene.Mount.resolve(mountScrollArea<Message>(), Messages.Tick())] : []),
    Scene.expect(Scene.selector(row.selector)).toExist(),
    ...(row.className === undefined ? [] : [Scene.expect(Scene.selector(row.selector)).toHaveAttr('class', row.className)]),
    ...(row.attrs ?? []).map(([name, value]) => Scene.expect(Scene.selector(row.selector)).toHaveAttr(name, value)),
    ...(row.styles ?? []).map(([name, value]) => Scene.expect(Scene.selector(row.selector)).toHaveStyle(name, value)),
    ...(row.text === undefined ? [] : [Scene.expect(Scene.text(row.text)).toExist()]),
    ...(row.additional ?? []).flatMap(item => [
      ...(item.className === undefined ? [] : [Scene.expect(Scene.selector(item.selector)).toHaveAttr('class', item.className)]),
      ...(item.attrs ?? []).map(([name, value]) => Scene.expect(Scene.selector(item.selector)).toHaveAttr(name, value)),
      ...(item.styles ?? []).map(([name, value]) => Scene.expect(Scene.selector(item.selector)).toHaveStyle(name, value)),
    ]),
  ))

  it('covers representative and pinned-default cases for each requested component and part', () => {
    expect(defaultRows.map(row => row.name)).toEqual([
      'AccessibleIcon defaults', 'VisuallyHidden defaults', 'Progress defaults', 'Separator defaults', 'Skeleton defaults', 'Spinner defaults', 'AspectRatio defaults', 'Container defaults', 'Inset defaults', 'Section defaults', 'ScrollArea defaults', 'Avatar defaults', 'Badge defaults',
      'Callout.Root defaults', 'Callout.Icon defaults', 'Callout.Text defaults', 'ThemePanel defaults', 'Blockquote defaults', 'Quote defaults', 'Em defaults', 'Strong defaults', 'Code defaults', 'Kbd defaults', 'IconButton defaults', 'Link defaults',
      'DataList.Root defaults', 'DataList.Item defaults', 'DataList.Label defaults', 'DataList.Value defaults', 'Table.Root defaults', 'Table.Header defaults', 'Table.Body defaults', 'Table.Row defaults', 'Table.Cell defaults', 'Table.ColumnHeaderCell defaults', 'Table.RowHeaderCell defaults',
    ])
    expect([...rows.map(row => row.name), ...resetRows.map(row => row.name)]).toEqual([
      'AccessibleIcon', 'VisuallyHidden', 'Progress', 'Separator', 'Skeleton', 'Spinner', 'AspectRatio', 'Container', 'Inset', 'Section', 'ScrollArea', 'Avatar', 'Badge',
      'Callout.Root', 'Callout.Icon', 'Callout.Text', 'ThemePanel', 'Blockquote', 'Quote', 'Em', 'Strong', 'Code', 'Kbd', 'IconButton', 'Link',
      'DataList.Root', 'DataList.Item', 'DataList.Label', 'DataList.Value', 'Table.Root', 'Table.Header', 'Table.Body', 'Table.Row', 'Table.Cell', 'Table.ColumnHeaderCell', 'Table.RowHeaderCell', 'Reset CSS',
    ])
  })

  it.each(resetRows)('$name source inventory matches the reset stylesheet', async () => {
    const resetCss = await readFile(resolve(import.meta.dirname, '../src/css-components/reset.css'), 'utf8')
    expect(resetCss).toContain('&:where(body, blockquote, dl, dd, figure, p)')
    expect(resetCss).toContain('&:where(button)')
    expect(resetCss).toContain('&::before')
  })
})
