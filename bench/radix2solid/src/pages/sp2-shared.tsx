import { For, type Component } from 'solid-js'
import { Dynamic } from '@solidjs/web'
import * as R2S from '@wsagency/radix2solid-themes'
import type { AppPageProps } from '../types'

type VisualProps = Record<string, unknown>
const FAMILY_COMPONENTS: Record<string, ReadonlyArray<string>> = {
  accessibility: ['AccessibleIcon', 'VisuallyHidden'], 'layout-extra': ['AspectRatio', 'Container', 'Inset', 'Section'],
  avatar: ['Avatar'], feedback: ['Badge', 'Callout', 'Progress', 'Separator', 'Skeleton', 'Spinner'],
  'typography-extra': ['Blockquote', 'Quote', 'Em', 'Strong', 'Code', 'Kbd'], 'icon-button': ['IconButton'],
  links: ['Link'], 'scroll-area': ['ScrollArea'], data: ['Table', 'DataList'],
  'forms-extra': ['Checkbox', 'CheckboxGroup', 'CheckboxCards', 'Radio', 'RadioGroup', 'RadioCards', 'Switch', 'SegmentedControl', 'TextArea'],
  select: ['Select'], 'range-slider': ['Slider'], 'tab-nav': ['TabNav'], 'alert-dialog': ['AlertDialog'],
  popover: ['Popover'], 'hover-card': ['HoverCard'], tooltip: ['Tooltip'], 'context-menu': ['ContextMenu'],
  'theme-panel': ['ThemePanel'], 'data-table': ['DataTable'],
}
const DIRECT: Record<string, Component<Record<string, unknown>>> = {
  AccessibleIcon: R2S.AccessibleIcon as unknown as Component<Record<string, unknown>>,
  VisuallyHidden: R2S.VisuallyHidden as unknown as Component<Record<string, unknown>>,
  AspectRatio: R2S.AspectRatio as unknown as Component<Record<string, unknown>>,
  Container: R2S.Container as unknown as Component<Record<string, unknown>>,
  Inset: R2S.Inset as unknown as Component<Record<string, unknown>>,
  Section: R2S.Section as unknown as Component<Record<string, unknown>>,
  Avatar: R2S.Avatar as unknown as Component<Record<string, unknown>>,
  Badge: R2S.Badge as unknown as Component<Record<string, unknown>>,
  Progress: R2S.Progress as unknown as Component<Record<string, unknown>>,
  Separator: R2S.Separator as unknown as Component<Record<string, unknown>>,
  Skeleton: R2S.Skeleton as unknown as Component<Record<string, unknown>>,
  Spinner: R2S.Spinner as unknown as Component<Record<string, unknown>>,
  Blockquote: R2S.Blockquote as unknown as Component<Record<string, unknown>>,
  Quote: R2S.Quote as unknown as Component<Record<string, unknown>>,
  Em: R2S.Em as unknown as Component<Record<string, unknown>>,
  Strong: R2S.Strong as unknown as Component<Record<string, unknown>>,
  Code: R2S.Code as unknown as Component<Record<string, unknown>>,
  Kbd: R2S.Kbd as unknown as Component<Record<string, unknown>>,
  IconButton: R2S.IconButton as unknown as Component<Record<string, unknown>>,
  Link: R2S.Link as unknown as Component<Record<string, unknown>>,
  ScrollArea: R2S.ScrollArea as unknown as Component<Record<string, unknown>>,
  Checkbox: R2S.Checkbox as unknown as Component<Record<string, unknown>>,
  Radio: R2S.Radio as unknown as Component<Record<string, unknown>>,
  Switch: R2S.Switch as unknown as Component<Record<string, unknown>>,
  TextArea: R2S.TextArea as unknown as Component<Record<string, unknown>>,
  Slider: R2S.Slider as unknown as Component<Record<string, unknown>>,
  ThemePanel: R2S.ThemePanel as unknown as Component<Record<string, unknown>>,
}

function componentProps(name: string, props: VisualProps): VisualProps {
  const result: VisualProps = { ...props }
  if (name === 'AccessibleIcon') result.label = 'Information'
  if (name === 'Avatar') result.fallback = 'JD'
  if (name === 'Progress') { result.value = 64; result.max = 100 }
  if (name === 'Separator') result.orientation = 'horizontal'
  if (name === 'Blockquote') result.children = 'The details are not the details. They make the design.'
  if (name === 'Quote') result.children = 'Good design is obvious. Great design is transparent.'
  if (name === 'Em') result.children = 'Emphasized example'
  if (name === 'Strong') result.children = 'Strong example'
  if (name === 'Code') result.children = 'pnpm check'
  if (name === 'Kbd') result.children = '⌘ K'
  if (name === 'IconButton') { result['aria-label'] = 'More options'; result.children = '⋯' }
  if (name === 'Link') { result.href = '#details'; result.children = 'View details' }
  if (name === 'Checkbox') { result.checked = true; result['aria-label'] = 'Enable notifications' }
  if (name === 'Radio') { result.checked = true; result.value = 'daily'; result['aria-label'] = 'Daily' }
  if (name === 'Switch') { result.checked = true; result['aria-label'] = 'Airplane mode' }
  if (name === 'TextArea') { result.value = 'Radix2Solid sample'; result['aria-label'] = 'Description' }
  if (name === 'Slider') { result.value = props.value ?? [48]; result.min = 0; result.max = 100; result['aria-label'] = 'Volume'; result.tabindex = 0 }
  if (name === 'ThemePanel') result.defaultOpen = true
  return result
}

function Specialized(props: { name: string; values: VisualProps; state: string }) {
  const v: VisualProps = { ...props.values, ...(props.state.includes('focus') || props.state === 'hover' ? { 'data-capture-focus': 'true' } : {}) }
  const selectorOpen = props.state === 'open'
  const hoverState = props.state === 'hover'
  if (props.name === 'Callout') return <R2S.Callout.Root size={v.size as '2'} variant={v.variant as 'soft'}><R2S.Callout.Icon>ⓘ</R2S.Callout.Icon><R2S.Callout.Text>Changes saved successfully.</R2S.Callout.Text></R2S.Callout.Root>
  if (props.name === 'Table' || props.name === 'DataTable') return <R2S.Table.Root size={v.size as '2'} variant={v.variant as 'surface'}><R2S.Table.Header><R2S.Table.Row><R2S.Table.ColumnHeaderCell>Name</R2S.Table.ColumnHeaderCell><R2S.Table.ColumnHeaderCell>Status</R2S.Table.ColumnHeaderCell></R2S.Table.Row></R2S.Table.Header><R2S.Table.Body><For each={Array.from({ length: 10 }, (_, index) => index)}>{index => <R2S.Table.Row><R2S.Table.RowHeaderCell>Record {String(index + 1).padStart(2, '0')}</R2S.Table.RowHeaderCell><R2S.Table.Cell>{index % 2 === 0 ? 'Active' : 'Pending'}</R2S.Table.Cell></R2S.Table.Row>}</For></R2S.Table.Body></R2S.Table.Root>
  if (props.name === 'DataList') return <R2S.DataList.Root size={v.size as '2'}><R2S.DataList.Item><R2S.DataList.Label>Owner</R2S.DataList.Label><R2S.DataList.Value>Radix2Solid</R2S.DataList.Value></R2S.DataList.Item><R2S.DataList.Item><R2S.DataList.Label>Status</R2S.DataList.Label><R2S.DataList.Value>Active</R2S.DataList.Value></R2S.DataList.Item></R2S.DataList.Root>
  if (props.name === 'CheckboxGroup') return <R2S.CheckboxGroup.Root size={v.size as '2'} variant={v.variant as 'surface'} value={['updates']} onValueChange={() => undefined} aria-label="Notifications"><R2S.CheckboxGroup.Item value="updates">Product updates</R2S.CheckboxGroup.Item><R2S.CheckboxGroup.Item value="news">Company news</R2S.CheckboxGroup.Item></R2S.CheckboxGroup.Root>
  if (props.name === 'CheckboxCards') return <R2S.CheckboxCards.Root size={v.size as '2'} variant={v.variant as 'surface'} value={['standard']} onValueChange={() => undefined} aria-label="Plans"><R2S.CheckboxCards.Item value="standard">Standard plan</R2S.CheckboxCards.Item><R2S.CheckboxCards.Item value="premium">Premium plan</R2S.CheckboxCards.Item></R2S.CheckboxCards.Root>
  if (props.name === 'RadioGroup') return <R2S.RadioGroup.Root size={v.size as '2'} variant={v.variant as 'surface'} value="daily" onValueChange={() => undefined} aria-label="Frequency"><R2S.RadioGroup.Item value="daily">Daily</R2S.RadioGroup.Item><R2S.RadioGroup.Item value="weekly">Weekly</R2S.RadioGroup.Item></R2S.RadioGroup.Root>
  if (props.name === 'RadioCards') return <R2S.RadioCards.Root size={v.size as '2'} variant={v.variant as 'surface'} value="monthly" onValueChange={() => undefined} aria-label="Billing"><R2S.RadioCards.Item value="monthly">Monthly</R2S.RadioCards.Item><R2S.RadioCards.Item value="yearly">Yearly</R2S.RadioCards.Item></R2S.RadioCards.Root>
  if (props.name === 'SegmentedControl') return <R2S.SegmentedControl.Root size={v.size as '2'} variant={v.variant as 'surface'} value="day"><R2S.SegmentedControl.Item value="day">Day</R2S.SegmentedControl.Item><R2S.SegmentedControl.Item value="week">Week</R2S.SegmentedControl.Item></R2S.SegmentedControl.Root>
  if (props.name === 'Select') return <R2S.Select.Root size={v.size as '2'} value="indigo" open={selectorOpen} onValueChange={() => undefined}><R2S.Select.Trigger variant={v.triggerVariant as 'surface'} placeholder="Choose a color" /><R2S.Select.Content variant={v.contentVariant as 'solid'} position="popper"><R2S.Select.Item value="indigo">Indigo</R2S.Select.Item><R2S.Select.Item value="blue">Blue</R2S.Select.Item></R2S.Select.Content></R2S.Select.Root>
  if (props.name === 'TabNav') return <R2S.TabNav.Root aria-label="Documentation"><R2S.TabNav.Link href="#overview" active>Overview</R2S.TabNav.Link><R2S.TabNav.Link href="#api">API</R2S.TabNav.Link></R2S.TabNav.Root>
  if (props.name === 'AlertDialog') return <R2S.AlertDialog.Root open={selectorOpen}><R2S.AlertDialog.Trigger>{target => target(R2S.Button, { children: 'Delete record' })}</R2S.AlertDialog.Trigger><R2S.AlertDialog.Content><R2S.AlertDialog.Title>Delete record?</R2S.AlertDialog.Title><R2S.AlertDialog.Description>This action cannot be undone.</R2S.AlertDialog.Description><R2S.AlertDialog.Cancel>{target => target(R2S.Button, { variant: 'outline', children: 'Cancel' })}</R2S.AlertDialog.Cancel><R2S.AlertDialog.Action>{target => target(R2S.Button, { children: 'Delete' })}</R2S.AlertDialog.Action></R2S.AlertDialog.Content></R2S.AlertDialog.Root>
  if (props.name === 'Popover') return <R2S.Popover.Root open={selectorOpen}><R2S.Popover.Trigger>{target => target(R2S.Button, { variant: 'outline', children: 'Details' })}</R2S.Popover.Trigger><R2S.Popover.Content>Popover content for comparison.</R2S.Popover.Content></R2S.Popover.Root>
  if (props.name === 'ContextMenu') return <R2S.ContextMenu.Root><R2S.ContextMenu.Trigger>{target => target(R2S.Button, { variant: 'outline', children: 'Right-click for actions' })}</R2S.ContextMenu.Trigger><R2S.ContextMenu.Content variant={v.contentVariant as 'solid'}><R2S.ContextMenu.Item>Open</R2S.ContextMenu.Item><R2S.ContextMenu.Item>Rename</R2S.ContextMenu.Item><R2S.ContextMenu.Separator /><R2S.ContextMenu.Item shortcut="⌘⌫">Delete</R2S.ContextMenu.Item></R2S.ContextMenu.Content></R2S.ContextMenu.Root>
  if (props.name === 'HoverCard') return <R2S.HoverCard.Root open={hoverState}><R2S.HoverCard.Trigger>{target => target(R2S.Link, { href: '#profile', children: '@radix' })}</R2S.HoverCard.Trigger><R2S.HoverCard.Content>Radix2Solid profile card.</R2S.HoverCard.Content></R2S.HoverCard.Root>
  if (props.name === 'Tooltip') return <R2S.Tooltip open={hoverState} content="Save your changes">{target => target(R2S.Button, { variant: 'outline', children: 'Save' })}</R2S.Tooltip>
  if (props.name === 'AccessibleIcon') return <R2S.AccessibleIcon label="Information">{target => target('svg', { viewBox: '0 0 24 24', children: <path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm0 5v6m0 4h.01" fill="none" stroke="currentColor" stroke-width="2" /> })}</R2S.AccessibleIcon>
  const directComponent = DIRECT[props.name]
  return directComponent ? <Dynamic component={directComponent} {...componentProps(props.name, v)} /> : null
}

export function Sp2Page(props: AppPageProps & { family: string; title: string }) {
  const captureId = new URLSearchParams(window.location.search).get('capture') ?? ''
  const parts = captureId.split('/')
  const componentId = parts.length > 1 ? parts[1]! : FAMILY_COMPONENTS[props.family]?.[0] ?? ''
  const state = new URLSearchParams(window.location.search).get('state') ?? 'default'
  let visualProps: VisualProps = {}
  try { visualProps = JSON.parse(new URLSearchParams(window.location.search).get('props') ?? '{}') as VisualProps } catch { visualProps = {} }
  const components = captureId ? [componentId] : FAMILY_COMPONENTS[props.family] ?? []
  return <main class="page-content" data-page={props.family} data-sp2-family={props.family}>
    <section class="bench-section">
      <R2S.Heading as="h2">{props.title}</R2S.Heading>
      <div class="demo-grid">
        <For each={components}>{name => <section class="bench-section" data-sp2-component={name}>
          <R2S.Heading as="h3">{name}</R2S.Heading>
          <Specialized name={name} values={componentId === name ? visualProps : {}} state={componentId === name ? state : 'default'} />
        </section>}</For>
      </div>
    </section>
  </main>
}
