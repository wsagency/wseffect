import { Effect, Schema } from 'effect'
import * as VirtualList from '@wsagency/wseffect-foldkit-ui/virtualList'
import { Command } from '@wsagency/wseffect-foldkit'
import * as Render from '@wsagency/wseffect-foldkit/render'
import type { Message } from './data-table.js'

export function makeDataTableMounts(message: typeof Message) {
  const focusDataTableCell = Command.define('FocusDataTableCell', {
    messages: [message.FocusTargetCompleted],
    args: {
      containerId: Schema.String,
      rowId: Schema.String,
      columnId: Schema.String,
      columnIndex: Schema.Number,
      rowIndex: Schema.Number,
    },
    execute: ({ containerId, rowId, columnId, columnIndex, rowIndex }) => Effect.gen(function* () {
      yield* Render.afterCommit
      const container = document.getElementById(containerId)
      if (!(container instanceof HTMLElement)) return yield* Effect.never
      const isRoot = rowId === '$grid-root'
      const row = isRoot
        ? undefined
        : Array.from(container.querySelectorAll<HTMLTableRowElement>('tr[data-virtual-list-item-key]'))
          .find(candidate => candidate.dataset.virtualListItemKey === rowId)
      const cell = row?.cells.item(columnIndex)
      if (isRoot) {
        const grid = container.querySelector<HTMLElement>('[role="grid"]')
        if (grid === null) return yield* Effect.never
        grid.focus()
      } else if (cell?.tabIndex === 0) {
        cell.focus()
      } else {
        return yield* Effect.never
      }
      const anchor = row === undefined
        ? { _tag: 'None' as const }
        : {
            _tag: 'Row' as const,
            key: rowId,
            index: rowIndex,
            viewportOffset: row.getBoundingClientRect().top - container.getBoundingClientRect().top - container.clientTop,
          }
      return message.FocusTargetCompleted({
        rowId,
        columnId,
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
        containerHeight: container.clientHeight,
        anchor,
      })
    }),
  })

  const focusHeaderCell = Command.define('FocusDataTableHeaderCell', {
    messages: [VirtualList.Message],
    args: { containerId: Schema.String, columnIndex: Schema.Number },
    execute: ({ containerId, columnIndex }) => Effect.gen(function* () {
      yield* Render.afterCommit
      const container = document.getElementById(containerId)
      if (!(container instanceof HTMLElement)) return VirtualList.Message.ObservedContainerScroll({
        scrollTop: 0,
        scrollHeight: 0,
        containerHeight: 0,
        anchor: { _tag: 'None' },
      })
      container.querySelector<HTMLTableRowElement>('thead tr')?.cells.item(columnIndex)?.focus()
      return VirtualList.Message.ObservedContainerScroll({
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
        containerHeight: container.clientHeight,
        anchor: { _tag: 'None' },
      })
    }),
  })
  return { focusDataTableCell, focusHeaderCell }
}
