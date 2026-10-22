import { Schema } from 'effect'
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

  it('keeps DataTable model and message codecs available to nested family state', () => {
    const initial = dataTablePage.init()
    const message = DataTableMessage.UpdateCell()
    const modelCodec = Schema.toCodecJson(dataTablePage.Model)
    const messageCodec = Schema.toCodecJson(dataTablePage.Message)
    const encodedModel = Schema.encodeSync(modelCodec)(initial.model)
    const encodedMessage = Schema.encodeSync(messageCodec)(message)

    expect(Schema.decodeUnknownSync(modelCodec)(encodedModel)).toEqual(initial.model)
    expect(Schema.decodeUnknownSync(messageCodec)(encodedMessage)).toEqual(message)
  })
})
