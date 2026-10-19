import { createMemo, createSignal, For } from 'solid-js'
import { Button, DropdownMenu, Heading, Text, TextField } from '@wsagency/radix2solid-themes'

const tableData = Array.from({ length: 10_000 }, (_, index) => ({
  id: index + 1,
  name: `Record ${String(index + 1).padStart(5, '0')}`,
  account: `Account ${index % 117}`,
  region: ['North', 'South', 'East', 'West'][index % 4],
  amount: ((index * 379) % 100_000) / 100,
}))
const menuIndexes = Array.from({ length: 200 }, (_, index) => index)

export function VirtualTable() {
  const [cellValue, setCellValue] = createSignal<string | undefined>()
  const [scrollTop, setScrollTop] = createSignal(0)
  const [filter, setFilter] = createSignal('')
  const [descending, setDescending] = createSignal(false)
  const [revision, setRevision] = createSignal(0)
  const [selected, setSelected] = createSignal<number>()
  const filteredRows = createMemo(() => {
    const query = filter().trim().toLowerCase()
    const matches = query ? tableData.filter(row => `${row.name} ${row.account} ${row.region}`.toLowerCase().includes(query)) : tableData
    return descending() ? [...matches].sort((left, right) => right.id - left.id) : matches
  })
  const firstIndex = createMemo(() => Math.max(0, Math.floor(scrollTop() / 32) - 2))
  const visibleRows = createMemo(() => filteredRows().slice(firstIndex(), firstIndex() + 15))

  return <section class="bench-section" data-testid="virtual-table">
    <Heading as="h2">10,000-row virtual table</Heading>
    <div class="component-row">
      <label>Filter records <input type="text" data-perf="vl-filter" aria-label="Filter records" value={filter()} onInput={event => { setFilter(event.currentTarget.value); setScrollTop(0); setCellValue(undefined) }} /></label>
      <Button type="button" data-perf="vl-sort" variant="outline" onClick={() => { setDescending(value => !value); setCellValue(undefined) }}>Toggle sort</Button>
      <Button type="button" data-testid="table-update" onClick={() => setRevision(value => value + 1)}>Update visible rows</Button>
      <Text data-testid="table-count">{filteredRows().length.toLocaleString()} rows · update {revision()}</Text>
      <Text data-testid="table-selection">Selected row: {selected() ?? 'none'}</Text>
    </div>
    <div class="virtual-scroll" data-testid="table-viewport" onScroll={event => setScrollTop(event.currentTarget.scrollTop)}>
      <div class="virtual-spacer" style={{ height: `${filteredRows().length * 32}px` }}>
        <For each={visibleRows()}>{(row, index) => <div class="virtual-row" data-perf="vl-row" data-row-id={row.id} style={{ transform: `translateY(${(firstIndex() + index()) * 32}px)` }}>
          <span class="virtual-cell">{row.id}</span>
          <TextField.Root class="virtual-cell" type="text" aria-label={`Record ${row.id}`} data-perf={index() === 0 ? 'vl-cell-input' : undefined} value={index() === 0 ? cellValue() ?? row.name : row.name} onInput={event => setCellValue(event.currentTarget.value)} />
          <span class="virtual-cell">{row.account}</span>
          <span class="virtual-cell">{row.region}</span>
          <span class="virtual-cell">{(row.amount + revision()).toFixed(2)}</span>
          <Button type="button" data-perf={index() === 0 ? 'vl-select' : undefined} onClick={() => setSelected(row.id)}>Select</Button>
        </div>}</For>
      </div>
    </div>
    <Text>Visible DOM rows: {visibleRows().length} of {filteredRows().length.toLocaleString()}</Text>
  </section>
}

export function ControlledForm() {
  const controls = Array.from({ length: 200 }, (_, index) => ({
    label: `Field ${String(index + 1).padStart(3, '0')}`,
    state: createSignal(index === 0 ? 'seed' : ''),
  }))
  return <section class="bench-section" data-testid="controlled-form">
    <Heading as="h2">200-field controlled form</Heading>
    <div class="form-grid">
      <For each={controls}>{(control, index) => <label>{control.label}
        <TextField.Root type="text" aria-label={control.label} data-perf={index() === 0 ? 'form-field-0' : undefined} data-testid={index() === 0 ? 'form-field-0' : undefined} value={control.state[0]()} onInput={event => control.state[1](event.currentTarget.value)} />
      </label>}</For>
    </div>
  </section>
}

export function ClosedMenus() {
  const [unrelated, setUnrelated] = createSignal(0)
  return <section class="bench-section" data-testid="closed-menus">
    <Heading as="h2">200 closed DropdownMenus</Heading>
    <div class="component-row">
      <Button type="button" data-perf="menus-tick" data-testid="menus-update" onClick={() => setUnrelated(value => value + 1)}>Unrelated update</Button>
      <Text data-testid="menus-counter">Unrelated value: {unrelated()}</Text>
    </div>
    <div class="menu-grid">
      <For each={menuIndexes}>{index => <div class="menu-cell" data-menu-index={index}>
        <DropdownMenu.Root>
          <DropdownMenu.Trigger>{target => target(Button, { type: 'button', size: '1', variant: 'soft', 'aria-label': `Closed menu ${index + 1}`, children: `Menu ${index + 1}` })}</DropdownMenu.Trigger>
          <DropdownMenu.Content><DropdownMenu.Item>Open item</DropdownMenu.Item><DropdownMenu.Item>Archive item</DropdownMenu.Item></DropdownMenu.Content>
        </DropdownMenu.Root>
      </div>}</For>
    </div>
  </section>
}
