import { Effect, Queue, Schema, Stream } from 'effect'
import * as VirtualList from '@foldkit/ui/virtualList'
import { Command } from 'foldkit'
import * as Render from 'foldkit/render'
import * as Mount from 'foldkit/mount'
import type { Message } from './data-table.js'

export function makeDataTableMounts<State>(message: typeof Message, tableStates: Map<string, State>) {
  const observeDataTable = Mount.defineStream('ObserveDataTable', {
    args: { id: Schema.String, tableId: Schema.String },
    messages: [message],
    execute: ({ element, tableId, viewStateChanges }) => viewStateChanges.pipe(Stream.switchMap(viewState => {
      if (viewState !== 'Live' || !(element instanceof HTMLElement)) return Stream.never
      return Stream.callback(queue => Effect.acquireRelease(Effect.sync(() => {
        const emitResize = () => Queue.offerUnsafe(queue, message.VirtualList({ message: VirtualList.Message.ResizedContainer({
          containerWidth: element.clientWidth,
          containerHeight: element.clientHeight,
        }) }))
        const emitScroll = () => Queue.offerUnsafe(queue, message.VirtualList({ message: VirtualList.Message.ObservedContainerScroll({
          scrollTop: element.scrollTop,
          scrollHeight: element.scrollHeight,
          containerHeight: element.clientHeight,
          anchor: { _tag: 'None' },
        }) }))
        const resizeObserver = new ResizeObserver(emitResize)
        element.addEventListener('scroll', emitScroll, { passive: true })
        resizeObserver.observe(element)
        emitResize()
        return () => {
          resizeObserver.disconnect()
          element.removeEventListener('scroll', emitScroll)
          tableStates.delete(tableId)
        }
      }), cleanup => Effect.sync(cleanup)).pipe(Effect.flatMap(() => Effect.never)))
    })),
  })
  const scrollToRow = Command.define('ScrollDataTableRow', {
    messages: [VirtualList.Message],
    args: { containerId: Schema.String, rowIndex: Schema.Number, rowHeight: Schema.Number, rowId: Schema.NullOr(Schema.String), scrollTop: Schema.Number, columnIndex: Schema.Number, shouldFocus: Schema.Boolean },
    execute: ({ containerId, rowIndex, rowHeight, rowId, scrollTop, columnIndex, shouldFocus }) => Effect.gen(function* () {
      yield* Render.afterCommit
      const container = document.getElementById(containerId)
      if (!(container instanceof HTMLElement)) return VirtualList.Message.ObservedContainerScroll({
        scrollTop: 0,
        scrollHeight: 0,
        containerHeight: 0,
        anchor: { _tag: 'None' },
      })
      container.scrollTop = scrollTop
      if (shouldFocus && rowId !== null) {
        const row = Array.from(container.querySelectorAll<HTMLTableRowElement>('tr[data-virtual-list-item-key]'))
          .find(candidate => candidate.dataset.virtualListItemKey === rowId)
        row?.cells.item(columnIndex)?.focus()
      }
      return VirtualList.Message.ObservedContainerScroll({
        scrollTop: container.scrollTop,
        scrollHeight: container.scrollHeight,
        containerHeight: container.clientHeight,
        anchor: rowId === null
          ? { _tag: 'None' }
          : { _tag: 'Row', key: rowId, index: rowIndex, viewportOffset: rowIndex * rowHeight - scrollTop },
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
  return { observeDataTable, scrollToRow, focusHeaderCell }
}
