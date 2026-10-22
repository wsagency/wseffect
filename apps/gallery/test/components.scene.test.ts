import { Schema } from 'effect'
import { makePages, slotsSchema } from '@wsagency/wseffect-app'
import * as DataTable from '@wsagency/wseffect-themes/components/data-table'
import { describe, expect, it } from 'vitest'
import * as Components from '../src/pages/components.js'
import { Message as DataTableMessage, page as dataTablePage } from '../src/components/dataTable.js'

describe('Gallery Components hub', () => {
  it('routes family selection through the nested kit and round-trips its model and message schemas', () => {
    const initial = Components.page.init()
    const message = Components.Message.RouteChanged({ family: 'dataTable' })
    const entered = Components.page.update(initial.model, message)

    expect(entered.model.familyKit.activeKeys).toEqual(['dataTable'])
    expect(entered.model.familyKit.slots.dataTable._tag).toBe('Loading')
    expect(entered.commands?.some((command) => command.name === 'LoadGalleryComponentFamily')).toBe(true)

    const modelCodec = Schema.toCodecJson(Components.Model)
    const messageCodec = Schema.toCodecJson(Components.Message)
    const encodedModel = Schema.encodeSync(modelCodec)(entered.model)
    const encodedMessage = Schema.encodeSync(messageCodec)(message)
    expect(Schema.decodeUnknownSync(modelCodec)(encodedModel)).toEqual(entered.model)
    expect(Schema.decodeUnknownSync(messageCodec)(encodedMessage)).toEqual(message)
  })
  it.each(['formsExtra', 'select', 'rangeSlider'] as const)('loads lane 2A family %s through its lazy slot', family => {
    const initial = Components.page.init()
    const message = Components.Message.RouteChanged({ family })
    const entered = Components.page.update(initial.model, message)

    expect(entered.model.familyKit.activeKeys).toEqual([family])
    expect(entered.model.familyKit.slots[family]._tag).toBe('Loading')
    expect(entered.commands?.some(command => command.name === 'LoadGalleryComponentFamily')).toBe(true)

    const modelCodec = Schema.toCodecJson(Components.Model)
    const encodedModel = Schema.encodeSync(modelCodec)(entered.model)
    expect(Schema.decodeUnknownSync(modelCodec)(encodedModel)).toEqual(entered.model)
  })

  it('round-trips pending DataTable focus through the APP-8 page-model codec', () => {
    const initial = dataTablePage.init()
    const message = DataTableMessage.UpdateCell()
    const gridUpdate = dataTablePage.update(initial.model, DataTableMessage.TableEvent({
      message: DataTable.Message.GridKey({ key: 'ArrowDown', ctrlKey: false }),
    }))
    const model = gridUpdate.model
    const expectedPendingFocus = { rowId: 'row-2', columnId: '$selection' }
    expect(model.table.pendingFocus).toEqual(expectedPendingFocus)

    const modelCodec = Schema.toCodecJson(dataTablePage.Model)
    const encodedModel = Schema.encodeSync(modelCodec)(model)
    expect(Schema.decodeUnknownSync(modelCodec)(encodedModel)).toEqual(model)

    const pages = makePages({ dataTable: async () => dataTablePage })
    pages.registry.register('dataTable', dataTablePage)
    const slotCodec = Schema.toCodecJson(slotsSchema(pages))
    const encodedSlots = Schema.encodeSync(slotCodec)({
      dataTable: { _tag: 'Ready', model },
    })
    expect(encodedSlots).toMatchObject({
      dataTable: {
        _tag: 'Ready',
        model: { table: { pendingFocus: expectedPendingFocus } },
      },
    })
    const decodedSlots = Schema.decodeUnknownSync(slotCodec)(encodedSlots)
    const restored = decodedSlots.dataTable
    expect(restored._tag).toBe('Ready')
    if (restored._tag === 'Ready') expect(restored.model).toEqual(model)

    const messageCodec = Schema.toCodecJson(dataTablePage.Message)
    const encodedMessage = Schema.encodeSync(messageCodec)(message)
    expect(Schema.decodeUnknownSync(messageCodec)(encodedMessage)).toEqual(message)
  })
})
