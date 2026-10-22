import type { Html, HtmlBuilder } from 'foldkit/html'
import { Option } from 'effect'
import { defineMessageUnion } from 'foldkit/message'
import * as Scene from 'foldkit/scene'
import { describe, expect, it } from 'vitest'
import * as Menu from '@foldkit/ui/menu'
import * as ContextMenu from '../src/components/context-menu.js'
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
import * as Table from '../src/components/table.js'
import * as ThemePanel from '../src/components/theme-panel.js'
import { defaults as themeDefaults } from '../src/components/theme.js'
import { mountScrollArea } from '../src/components/scroll-area.mount.js'

const Messages = defineMessageUnion({ Tick: {} })
type Message = typeof Messages.Type | ThemePanel.Message | ContextMenu.Message
const update = (model: Readonly<Record<string, never>>, _message: Message) => ({ model })
const text = 'Enum parity'
type Row = {
  name: string
  render: (h: HtmlBuilder<Message>) => Html
  selector: string
  classes?: ReadonlyArray<string>
  absentClasses?: ReadonlyArray<string>
  attrs?: ReadonlyArray<readonly [string, string]>
  absentAttrs?: ReadonlyArray<string>
  structure?: ReadonlyArray<string>
  absentStructure?: ReadonlyArray<string>
  radioOptions?: ReadonlyArray<{ name: string; selected: boolean }>
  additional?: ReadonlyArray<{ selector: string; text?: string; classes?: ReadonlyArray<string>; attrs?: ReadonlyArray<readonly [string, string]>; absentAttrs?: ReadonlyArray<string> }>
}
const row = (name: string, selector: string, classes: ReadonlyArray<string>, render: Row['render']): Row => ({ name, selector, classes, render })
const enumRows: Row[] = []
const add = (component: string, selector: string, property: string, values: ReadonlyArray<string>, className: string,
  render: (value: string, h: HtmlBuilder<Message>) => Html, classValue: (value: string) => string = value => value) => {
  for (const value of values) enumRows.push(row(`${component} ${property}=${value}`, selector, [`${className}-${classValue(value)}`], h => render(value, h)))
}
const addRadius = (component: string, selector: string, render: (value: 'none' | 'small' | 'medium' | 'large' | 'full', h: HtmlBuilder<Message>) => Html) => {
  for (const value of ['none', 'small', 'medium', 'large', 'full'] as const) enumRows.push({
    name: `${component} radius=${value}`, selector, attrs: [[component === 'Badge' ? 'radius' : 'data-radius', value]], render: h => render(value, h),
  })
}
const sizes9 = ['1', '2', '3', '4', '5', '6', '7', '8', '9']
const colors = ['gray', 'custom'] as const
const contextMenu = ContextMenu.create<'open'>()
const contextMenuConfig = { id: 'parity', sourceId: 'parity-source', sourceToken: 'parity-token', longPressMs: 600 as const, items: [], toItem: () => null }
const contextMenuModel = contextMenu.update(contextMenu.init(contextMenuConfig), Menu.Message.Opened({ maybeActiveItemIndex: Option.none() })).model
// Pinned citations: R2S context-menu.tsx:31-45 and context-menu.props.ts:1-6.
for (const variant of ['solid', 'soft'] as const) enumRows.push({
  name: `ContextMenu variant=${variant}`, selector: '[role="menu"]',
  classes: [`rt-variant-${variant}`, 'rt-r-size-2'],
  attrs: [['data-accent-color', themeDefaults.accentColor]],
  render: h => contextMenu.view(contextMenuModel, { ...contextMenuConfig, variant }, h as unknown as HtmlBuilder<ContextMenu.Message>),
})

add('Progress', 'div[role="progressbar"]', 'size', ['1', '2', '3'], 'rt-r-size', (v, h) => Progress.view({ size: v as '1' | '2' | '3' }, [], h))
add('Progress', 'div[role="progressbar"]', 'variant', ['classic', 'surface', 'soft'], 'rt-variant', (v, h) => Progress.view({ variant: v as 'classic' | 'surface' | 'soft' }, [], h))
add('Separator', 'span.rt-Separator', 'orientation', ['horizontal', 'vertical'], 'rt-r-orientation', (v, h) => Separator.view({ orientation: v as 'horizontal' | 'vertical' }, [], h))
add('Separator', 'span.rt-Separator', 'size', ['1', '2', '3', '4'], 'rt-r-size', (v, h) => Separator.view({ size: v as '1' | '2' | '3' | '4' }, [], h))
add('Spinner', 'span.rt-Spinner', 'size', ['1', '2', '3'], 'rt-r-size', (v, h) => Spinner.view({ size: v as '1' | '2' | '3' }, [], h))
add('Container', 'div.rt-Container', 'size', ['1', '2', '3', '4'], 'rt-r-size', (v, h) => Container.view({ size: v as '1' | '2' | '3' | '4' }, [text], h))
add('Container', 'div.rt-Container', 'display', ['none', 'initial'], 'rt-r-display', (v, h) => Container.view({ display: v as 'none' | 'initial' }, [text], h), v => v === 'initial' ? 'flex' : 'none')
add('Container', 'div.rt-Container', 'align', ['left', 'center', 'right'], 'rt-r-ai', (v, h) => Container.view({ align: v as 'left' | 'center' | 'right' }, [text], h), v => v === 'left' ? 'start' : v === 'right' ? 'end' : v)
add('Inset', 'div.rt-Inset', 'side', ['all', 'x', 'y', 'top', 'bottom', 'left', 'right'], 'rt-r-side', (v, h) => Inset.view({ side: v as 'all' | 'x' | 'y' | 'top' | 'bottom' | 'left' | 'right' }, [text], h))
add('Inset', 'div.rt-Inset', 'clip', ['border-box', 'padding-box'], 'rt-r-clip', (v, h) => Inset.view({ clip: v as 'border-box' | 'padding-box' }, [text], h))
for (const property of ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl'] as const) add('Inset', 'div.rt-Inset', property, ['current', '0'], `rt-r-${property}`, (v, h) => Inset.view({ [property]: v as 'current' | '0' }, [text], h), v => v === 'current' ? 'inset' : v)
add('Section', 'section.rt-Section', 'size', ['1', '2', '3', '4'], 'rt-r-size', (v, h) => Section.view({ size: v as '1' | '2' | '3' | '4' }, [text], h))
add('Section', 'section.rt-Section', 'display', ['none', 'initial'], 'rt-r-display', (v, h) => Section.view({ display: v as 'none' | 'initial' }, [text], h), v => v === 'initial' ? 'block' : 'none')
add('ScrollArea', 'div.rt-ScrollAreaScrollbar', 'size', ['1', '2', '3'], 'rt-r-size', (v, h) => ScrollArea.view({ size: v as '1' | '2' | '3' }, [text], h))
for (const value of ['vertical', 'horizontal', 'both'] as const) enumRows.push({ name: `ScrollArea scrollbars=${value}`, selector: 'div.rt-ScrollAreaScrollbar', structure: value === 'both' ? ['[data-orientation="horizontal"]', '[data-orientation="vertical"]', '.rt-ScrollAreaCorner'] : [value === 'vertical' ? '[data-orientation="vertical"]' : '[data-orientation="horizontal"]'], absentStructure: value === 'both' ? [] : [value === 'vertical' ? '[data-orientation="horizontal"]' : '[data-orientation="vertical"]', '.rt-ScrollAreaCorner'], render: h => ScrollArea.view({ scrollbars: value }, [text], h) })
add('Avatar', 'span.rt-AvatarRoot', 'size', sizes9, 'rt-r-size', (v, h) => Avatar.view({ fallback: 'JD', size: v as '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' }, [], h))
addRadius('Progress', 'div[role="progressbar"]', (radius, h) => Progress.view({ radius }, [], h))
addRadius('ScrollArea', 'div.rt-ScrollAreaScrollbar', (radius, h) => ScrollArea.view({ radius }, [text], h))
const radiusDefaultRows: Row[] = [
  { name: 'Progress radius default', selector: 'div[role="progressbar"]', absentAttrs: ['data-radius'], render: h => Progress.view({}, [], h) },
  { name: 'ScrollArea radius default', selector: 'div.rt-ScrollAreaScrollbar', absentAttrs: ['data-radius'], render: h => ScrollArea.view({}, [text], h) },
  { name: 'Avatar radius default', selector: 'span.rt-AvatarRoot', absentAttrs: ['data-radius'], render: h => Avatar.view({ fallback: 'JD' }, [], h) },
  { name: 'Badge radius default', selector: 'span.rt-Badge', absentAttrs: ['radius'], render: h => Badge.view({}, [text], h) },
  { name: 'IconButton radius default', selector: 'button.rt-IconButton', absentAttrs: ['data-radius'], render: h => IconButton.view({ 'aria-label': 'Action' }, [text], h) },
]
add('Avatar', 'span.rt-AvatarRoot', 'variant', ['solid', 'soft'], 'rt-variant', (v, h) => Avatar.view({ fallback: 'JD', variant: v as 'solid' | 'soft' }, [], h))
addRadius('Avatar', 'span.rt-AvatarRoot', (radius, h) => Avatar.view({ fallback: 'JD', radius }, [], h))
add('Badge', 'span.rt-Badge', 'size', ['1', '2', '3'], 'rt-r-size', (v, h) => Badge.view({ size: v as '1' | '2' | '3' }, [text], h))
add('Badge', 'span.rt-Badge', 'variant', ['solid', 'soft', 'surface', 'outline'], 'rt-variant', (v, h) => Badge.view({ variant: v as 'solid' | 'soft' | 'surface' | 'outline' }, [text], h))
addRadius('Badge', 'span.rt-Badge', (radius, h) => Badge.view({ radius }, [text], h))
add('Callout.Root', 'div.rt-CalloutRoot', 'size', ['1', '2', '3'], 'rt-r-size', (v, h) => Callout.Root.view({ size: v as '1' | '2' | '3' }, [], h))
add('Callout.Root', 'div.rt-CalloutRoot', 'variant', ['soft', 'surface', 'outline'], 'rt-variant', (v, h) => Callout.Root.view({ variant: v as 'soft' | 'surface' | 'outline' }, [], h))
add('Callout.Text', 'p.rt-CalloutText', 'size', sizes9, 'rt-r-size', (v, h) => Callout.Text.view({ size: v as '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' }, [text], h))
add('Callout.Text', 'p.rt-CalloutText', 'weight', ['light', 'regular', 'medium', 'bold'], 'rt-r-weight', (v, h) => Callout.Text.view({ weight: v as 'light' | 'regular' | 'medium' | 'bold' }, [text], h))
add('Code', 'code.rt-Code', 'size', sizes9, 'rt-r-size', (v, h) => Code.view({ size: v as '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' }, [text], h))
add('Code', 'code.rt-Code', 'variant', ['solid', 'soft', 'outline', 'ghost'], 'rt-variant', (v, h) => Code.view({ variant: v as 'solid' | 'soft' | 'outline' | 'ghost' }, [text], h))
add('Code', 'code.rt-Code', 'weight', ['light', 'regular', 'medium', 'bold'], 'rt-r-weight', (v, h) => Code.view({ weight: v as 'light' | 'regular' | 'medium' | 'bold' }, [text], h))
add('Kbd', 'kbd.rt-Kbd', 'size', sizes9, 'rt-r-size', (v, h) => Kbd.view({ size: v as '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' }, [text], h))
add('Kbd', 'kbd.rt-Kbd', 'variant', ['classic', 'soft'], 'rt-variant', (v, h) => Kbd.view({ variant: v as 'classic' | 'soft' }, [text], h))
add('IconButton', 'button.rt-IconButton', 'size', ['1', '2', '3', '4'], 'rt-r-size', (v, h) => IconButton.view({ size: v as '1' | '2' | '3' | '4', 'aria-label': 'Action' }, [text], h))
add('IconButton', 'button.rt-IconButton', 'variant', ['classic', 'solid', 'soft', 'surface', 'outline', 'ghost-offset', 'ghost'], 'rt-variant', (v, h) => IconButton.view({ variant: v as 'classic' | 'solid' | 'soft' | 'surface' | 'outline' | 'ghost-offset' | 'ghost', 'aria-label': 'Action' }, [text], h))
addRadius('IconButton', 'button.rt-IconButton', (radius, h) => IconButton.view({ radius, 'aria-label': 'Action' }, [text], h))
add('Link', 'a.rt-Link', 'size', sizes9, 'rt-r-size', (v, h) => Link.view({ size: v as '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' }, [text], h))
add('Link', 'a.rt-Link', 'underline', ['auto', 'always', 'hover', 'none'], 'rt-underline', (v, h) => Link.view({ underline: v as 'auto' | 'always' | 'hover' | 'none' }, [text], h))
add('Link', 'a.rt-Link', 'weight', ['light', 'regular', 'medium', 'bold'], 'rt-r-weight', (v, h) => Link.view({ weight: v as 'light' | 'regular' | 'medium' | 'bold' }, [text], h))
add('Link', 'a.rt-Link', 'trim', ['normal', 'start', 'end', 'both'], 'rt-r-lt', (v, h) => Link.view({ trim: v as 'normal' | 'start' | 'end' | 'both' }, [text], h))
for (const component of ['Blockquote', 'Quote', 'Em', 'Strong', 'Code', 'Link'] as const) {
  const selector = { Blockquote: 'blockquote.rt-Blockquote', Quote: 'q.rt-Quote', Em: 'em.rt-Em', Strong: 'strong.rt-Strong', Code: 'code.rt-Code', Link: 'a.rt-Link' }[component]
  const renderWrap = (value: 'wrap' | 'nowrap' | 'pretty' | 'balance', h: HtmlBuilder<Message>) => ({
    Blockquote: () => Blockquote.view({ wrap: value }, [text], h), Quote: () => Quote.view({ wrap: value }, [text], h), Em: () => Em.view({ wrap: value }, [text], h),
    Strong: () => Strong.view({ wrap: value }, [text], h), Code: () => Code.view({ wrap: value }, [text], h), Link: () => Link.view({ wrap: value }, [text], h),
  }[component]())
  add(component, selector, 'wrap', ['wrap', 'nowrap', 'pretty', 'balance'], 'rt-r-tw', (v, h) => renderWrap(v as 'wrap' | 'nowrap' | 'pretty' | 'balance', h))
}
add('Callout.Text', 'p.rt-CalloutText', 'wrap', ['wrap', 'nowrap', 'pretty', 'balance'], 'rt-r-tw', (v, h) => Callout.Text.view({ wrap: v as 'wrap' | 'nowrap' | 'pretty' | 'balance' }, [text], h))
add('Callout.Text', 'p.rt-CalloutText', 'trim', ['normal', 'start', 'end', 'both'], 'rt-r-lt', (v, h) => Callout.Text.view({ trim: v as 'normal' | 'start' | 'end' | 'both' }, [text], h))
add('Callout.Text', 'p.rt-CalloutText', 'align', ['left', 'center', 'right'], 'rt-r-ta', (v, h) => Callout.Text.view({ align: v as 'left' | 'center' | 'right' }, [text], h))
add('DataList.Root', 'dl.rt-DataListRoot', 'orientation', ['horizontal', 'vertical'], 'rt-r-orientation', (v, h) => DataList.Root.view({ orientation: v as 'horizontal' | 'vertical' }, [], h))
add('DataList.Root', 'dl.rt-DataListRoot', 'size', ['1', '2', '3'], 'rt-r-size', (v, h) => DataList.Root.view({ size: v as '1' | '2' | '3' }, [], h))
add('DataList.Root', 'dl.rt-DataListRoot', 'trim', ['normal', 'start', 'end', 'both'], 'rt-r-trim', (v, h) => DataList.Root.view({ trim: v as 'normal' | 'start' | 'end' | 'both' }, [], h))
add('DataList.Item', 'div.rt-DataListItem', 'align', ['start', 'center', 'end', 'baseline', 'stretch'], 'rt-r-ai', (v, h) => DataList.Item.view({ align: v as 'start' | 'center' | 'end' | 'baseline' | 'stretch' }, [], h))
add('Table.Root', 'div.rt-TableRoot', 'size', ['1', '2', '3'], 'rt-r-size', (v, h) => Table.Root.view({ size: v as '1' | '2' | '3' }, [], h))
add('Table.Root', 'div.rt-TableRoot', 'variant', ['surface', 'ghost'], 'rt-variant', (v, h) => Table.Root.view({ variant: v as 'surface' | 'ghost' }, [], h))
for (const value of ['auto', 'fixed'] as const) enumRows.push(row(`Table.Root layout=${value}`, 'table.rt-TableRootTable', [`rt-r-tl-${value}`], h => Table.Root.view({ layout: value }, [], h)))
add('Table.Row', 'tr.rt-TableRow', 'align', ['start', 'center', 'end', 'baseline'], 'rt-r-va', (v, h) => Table.Row.view({ align: v as 'start' | 'center' | 'end' | 'baseline' }, [], h), v => ({ start: 'top', center: 'middle', end: 'bottom', baseline: 'baseline' })[v]!)
add('Table.Cell', 'td.rt-TableCell', 'justify', ['start', 'center', 'end'], 'rt-r-ta', (v, h) => Table.Cell.view({ justify: v as 'start' | 'center' | 'end' }, [], h), v => ({ start: 'left', center: 'center', end: 'right' })[v]!)
add('Table.ColumnHeaderCell', 'th.rt-TableColumnHeaderCell', 'justify', ['start', 'center', 'end'], 'rt-r-ta', (v, h) => Table.ColumnHeaderCell.view({ justify: v as 'start' | 'center' | 'end' }, [], h), v => ({ start: 'left', center: 'center', end: 'right' })[v]!)
add('Table.RowHeaderCell', 'th.rt-TableRowHeaderCell', 'justify', ['start', 'center', 'end'], 'rt-r-ta', (v, h) => Table.RowHeaderCell.view({ justify: v as 'start' | 'center' | 'end' }, [], h), v => ({ start: 'left', center: 'center', end: 'right' })[v]!)
const paddingValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
for (const component of ['Table.Cell', 'Table.ColumnHeaderCell', 'Table.RowHeaderCell'] as const) {
  const selector = { 'Table.Cell': 'td.rt-TableCell', 'Table.ColumnHeaderCell': 'th.rt-TableColumnHeaderCell', 'Table.RowHeaderCell': 'th.rt-TableRowHeaderCell' }[component]
  for (const property of ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl'] as const) {
    add(component, selector, property, paddingValues, `rt-r-${property}`, (value, h) => {
      const props = { [property]: value as '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' }
      if (component === 'Table.Cell') return Table.Cell.view(props as never, [], h)
      if (component === 'Table.ColumnHeaderCell') return Table.ColumnHeaderCell.view(props as never, [], h)
      return Table.RowHeaderCell.view(props as never, [], h)
    })
  }
}
const booleanRows: Row[] = []
const boolClass = (name: string, selector: string, onClass: string, render: (value: boolean, h: HtmlBuilder<Message>) => Html, attr?: readonly [string, string]) => {
  for (const value of [false, true]) booleanRows.push({ name: `${name}=${value}`, selector, classes: value ? [onClass] : [], absentClasses: value ? [] : [onClass], ...(attr && value ? { attrs: [attr] } : {}), render: h => render(value, h) })
}
for (const name of ['Progress', 'Avatar', 'Badge', 'Callout.Root', 'Callout.Text', 'Blockquote', 'Code', 'IconButton', 'Link', 'DataList.Label'] as const) {
  const selector = { Progress: 'div[role="progressbar"]', Avatar: 'span.rt-AvatarRoot', Badge: 'span.rt-Badge', 'Callout.Root': 'div.rt-CalloutRoot', 'Callout.Text': 'p.rt-CalloutText', Blockquote: 'blockquote.rt-Blockquote', Code: 'code.rt-Code', IconButton: 'button.rt-IconButton', Link: 'a.rt-Link', 'DataList.Label': 'dt.rt-DataListLabel' }[name]
  const render = (highContrast: boolean, h: HtmlBuilder<Message>) => ({
    Progress: () => Progress.view({ highContrast }, [], h), Avatar: () => Avatar.view({ fallback: 'JD', highContrast }, [], h), Badge: () => Badge.view({ highContrast }, [text], h),
    'Callout.Root': () => Callout.Root.view({ highContrast }, [], h), 'Callout.Text': () => Callout.Text.view({ highContrast }, [text], h), Blockquote: () => Blockquote.view({ highContrast }, [text], h), Code: () => Code.view({ highContrast }, [text], h),
    IconButton: () => IconButton.view({ highContrast, 'aria-label': 'Action' }, [text], h), Link: () => Link.view({ highContrast }, [text], h), 'DataList.Label': () => DataList.Label.view({ highContrast }, [text], h),
  }[name]())
  boolClass(`${name} highContrast`, selector, 'rt-high-contrast', render)
}
for (const name of ['Blockquote', 'Callout.Text', 'Quote', 'Em', 'Strong', 'Code', 'Link'] as const) {
  const selector = { Blockquote: 'blockquote.rt-Blockquote', 'Callout.Text': 'p.rt-CalloutText', Quote: 'q.rt-Quote', Em: 'em.rt-Em', Strong: 'strong.rt-Strong', Code: 'code.rt-Code', Link: 'a.rt-Link' }[name]
  boolClass(`${name} truncate`, selector, 'rt-truncate', (truncate, h) => ({
    Blockquote: () => Blockquote.view({ truncate }, [text], h), 'Callout.Text': () => Callout.Text.view({ truncate }, [text], h), Quote: () => Quote.view({ truncate }, [text], h), Em: () => Em.view({ truncate }, [text], h),
    Strong: () => Strong.view({ truncate }, [text], h), Code: () => Code.view({ truncate }, [text], h), Link: () => Link.view({ truncate }, [text], h),
  }[name]()))
}
boolClass('IconButton loading', 'button.rt-IconButton', 'rt-loading', (loading, h) => IconButton.view({ loading, 'aria-label': 'Action' }, [text], h))
for (const loading of [false, true]) {
  booleanRows.push({ name: `Skeleton loading=${loading}`, selector: 'div', structure: loading ? ['span.rt-Skeleton'] : [], absentStructure: loading ? [] : ['span.rt-Skeleton'], render: h => h.div([], [Skeleton.view({ loading }, [text], h)]) })
  booleanRows.push({ name: `Spinner loading=${loading}`, selector: 'div', structure: loading ? ['span.rt-Spinner'] : [], absentStructure: loading ? [] : ['span.rt-Spinner'], render: h => h.div([], [Spinner.view({ loading }, [text], h)]) })
}
booleanRows.push({ name: 'Separator decorative=true', selector: 'span.rt-Separator', absentAttrs: ['role', 'aria-orientation'], render: h => Separator.view({ decorative: true }, [], h) })
booleanRows.push({ name: 'Separator decorative=false', selector: 'span.rt-Separator', attrs: [['role', 'separator'], ['aria-orientation', 'horizontal']], render: h => Separator.view({ decorative: false }, [], h) })
booleanRows.push({ name: 'IconButton disabled=false', selector: 'button.rt-IconButton', absentAttrs: ['disabled'], render: h => IconButton.view({ disabled: false, 'aria-label': 'Action' }, [text], h) })
booleanRows.push({ name: 'IconButton disabled=true', selector: 'button.rt-IconButton', attrs: [['disabled', '']], render: h => IconButton.view({ disabled: true, 'aria-label': 'Action' }, [text], h) })


const colorRows: Row[] = []
for (const color of colors) {
  colorRows.push({ name: `Progress color=${color}`, selector: 'div[role="progressbar"]', attrs: [['data-accent-color', color]], render: h => Progress.view({ color }, [], h) })
  colorRows.push({ name: `Avatar color=${color}`, selector: 'span.rt-AvatarRoot', attrs: [['data-accent-color', color]], render: h => Avatar.view({ fallback: 'JD', color }, [], h) })
  colorRows.push({ name: `Badge color=${color}`, selector: 'span.rt-Badge', attrs: [['data-accent-color', color]], render: h => Badge.view({ color }, [text], h) })
  colorRows.push({ name: `Callout.Root color=${color}`, selector: 'div.rt-CalloutRoot', attrs: [['data-accent-color', color]], render: h => Callout.Root.view({ color }, [], h) })
  colorRows.push({ name: `Blockquote color=${color}`, selector: 'blockquote.rt-Blockquote', attrs: [['data-accent-color', color]], render: h => Blockquote.view({ color }, [text], h) })
  colorRows.push({ name: `Code color=${color}`, selector: 'code.rt-Code', attrs: [['data-accent-color', color]], render: h => Code.view({ color }, [text], h) })
  colorRows.push({ name: `IconButton color=${color}`, selector: 'button.rt-IconButton', attrs: [['data-accent-color', color]], render: h => IconButton.view({ color, 'aria-label': 'Action' }, [text], h) })
  colorRows.push({ name: `Link color=${color}`, selector: 'a.rt-Link', attrs: [['data-accent-color', color]], render: h => Link.view({ color }, [text], h) })
  colorRows.push({ name: `DataList.Label color=${color}`, selector: 'dt.rt-DataListLabel', attrs: [['data-accent-color', color]], render: h => DataList.Label.view({ color }, [text], h) })
  colorRows.push({ name: `Separator color=${color}`, selector: 'span.rt-Separator', attrs: [['data-accent-color', color]], render: h => Separator.view({ color }, [], h) })
  colorRows.push({ name: `Callout.Text color=${color}`, selector: 'p.rt-CalloutText', attrs: [['data-accent-color', color]], render: h => Callout.Text.view({ color }, [text], h) })
}
const themePanelRows: Row[] = []
const themeSettings: ReadonlyArray<{ prop: string; values: ReadonlyArray<string> }> = [
  { prop: 'appearance', values: ['inherit', 'light', 'dark'] },
  { prop: 'accentColor', values: ['gray', 'indigo', 'sky'] },
  { prop: 'grayColor', values: ['auto', 'gray', 'mauve', 'slate', 'sage', 'olive', 'sand'] },
  { prop: 'radius', values: ['none', 'small', 'medium', 'large', 'full'] },
  { prop: 'scaling', values: ['90%', '95%', '100%', '105%', '110%'] },
  { prop: 'panelBackground', values: ['solid', 'translucent'] },
]
for (const { prop, values } of themeSettings) for (const value of values) themePanelRows.push({
  name: `ThemePanel ${prop}=${value}`, selector: 'div[role="region"]',
  ...(prop === 'grayColor' && value === 'gray' ? { additional: [{ selector: 'div[aria-label="Gray color"] button[aria-checked="true"]', text: 'Gray' }] } : {
    radioOptions: [{ name: value === 'auto' ? 'Auto' : value === 'solid' ? 'Solid' : value === 'translucent' ? 'Translucent' : value[0].toUpperCase() + value.slice(1), selected: true }],
  }),
  render: h => ThemePanel.view({
    isOpen: true, settings: { [prop]: value, ...(prop === 'grayColor' ? { accentColor: 'custom' } : {}) } as never,
    toSettingsChanged: settings => ({ _tag: 'SettingsChanged', settings }),
  }, [], h),
})
for (const value of [true, false]) themePanelRows.push({
  name: `ThemePanel hasBackground=${value}`, selector: 'div[role="region"]',
  radioOptions: [{ name: value ? 'On' : 'Off', selected: true }],
  render: h => ThemePanel.view({
    isOpen: true, settings: { hasBackground: value },
    toSettingsChanged: settings => ({ _tag: 'SettingsChanged', settings }),
  }, [], h),
})
for (const isOpen of [true, false]) themePanelRows.push({
  name: `ThemePanel isOpen=${isOpen}`, selector: 'div[role="region"]',
  ...(isOpen ? { absentAttrs: ['hidden'] } : { attrs: [['hidden', '']] }),
  render: h => ThemePanel.view({
    isOpen, settings: {},
    toSettingsChanged: settings => ({ _tag: 'SettingsChanged', settings }),
  }, [], h),
})
const rows = [...enumRows, ...booleanRows, ...colorRows, ...radiusDefaultRows, ...themePanelRows]

describe('Lane 2C exhaustive finite prop parity', () => {

  it.each(rows)('$name maps to the expected rendered DOM', row => Scene.scene(
    { update, view: (_model, h) => row.render(h) },
    Scene.given({}),
    ...(row.name.startsWith('ScrollArea') || row.name.startsWith('Table.Root') ? [Scene.Mount.resolve(mountScrollArea<Message>(), Messages.Tick())] : []),
    ...(row.name.startsWith('ContextMenu') ? [
      Scene.Mount.resolve({ name: 'ContextMenuSourceEvents' }, Menu.Message.IgnoredMouseClick()),
      Scene.Mount.resolve({ name: 'ContextMenuAnchor' }, Menu.Message.CompletedAnchorMenu()),
    ] : []),
    Scene.expect(Scene.selector(row.selector)).toExist(),
    ...(row.classes ?? []).map(className => Scene.expect(Scene.selector(row.selector)).toHaveClass(className)),
    ...(row.absentClasses ?? []).map(className => Scene.expect(Scene.selector(row.selector)).not.toHaveClass(className)),
    ...(row.attrs ?? []).map(([name, value]) => Scene.expect(Scene.selector(row.selector)).toHaveAttr(name, value)),
    ...(row.absentAttrs ?? []).map(name => Scene.expect(Scene.selector(row.selector)).not.toHaveAttr(name)),
    ...(row.structure ?? []).map(selector => Scene.expect(Scene.selector(selector)).toExist()),
    ...(row.absentStructure ?? []).map(selector => Scene.expect(Scene.selector(selector)).not.toExist()),
    ...(row.additional ?? []).flatMap(item => [
      ...(item.text === undefined ? [] : [Scene.expect(Scene.selector(item.selector)).toHaveText(item.text)]),
      ...(item.classes ?? []).map(className => Scene.expect(Scene.selector(item.selector)).toHaveClass(className)),
      ...(item.attrs ?? []).map(([name, value]) => Scene.expect(Scene.selector(item.selector)).toHaveAttr(name, value)),
      ...(item.absentAttrs ?? []).map(name => Scene.expect(Scene.selector(item.selector)).not.toHaveAttr(name)),
    ]),
    ...(row.radioOptions ?? []).map(option => Scene.expect(Scene.role('radio', { name: option.name })).toHaveAttr('aria-checked', String(option.selected))),
  ))

})
