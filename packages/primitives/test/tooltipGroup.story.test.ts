import { Schema } from 'effect'
import { expect, it } from 'vitest'
import * as TooltipGroup from '../src/tooltip-group.js'

it('first hover waits 700ms', () => {
  const model = TooltipGroup.init()
  expect(TooltipGroup.reflectShowDelay(model)).toBe(700)
})

it('next tooltip opens immediately in 300ms window', () => {
  const result = TooltipGroup.update(TooltipGroup.init(), { _tag: 'TooltipOpened', now: 1000 })
  expect(TooltipGroup.reflectShowDelay(result.model)).toBe(0)
})

it('focus opens immediately', () => {
  const model = TooltipGroup.update(TooltipGroup.init(), { _tag: 'TooltipOpened', now: 1000 }).model
  expect(TooltipGroup.reflectShowDelay(model)).toBe(0)
})

it('stale expiry version cannot close newer skip window', () => {
  let model = TooltipGroup.init()
  model = TooltipGroup.update(model, { _tag: 'TooltipClosed', now: 100 }).model
  model = TooltipGroup.update(model, { _tag: 'TooltipOpened', now: 200 }).model
  const stale = TooltipGroup.update(model, { _tag: 'SkipExpired', version: 1 }).model
  expect(stale.isSkipping).toBe(true)
  expect(stale.expiryVersion).toBe(2)
})

it('Model and Message schemas round-trip through the APP-8 page-model codec', () => {
  const model = TooltipGroup.init()
  const encoded = Schema.encodeSync(TooltipGroup.Model)(model)
  expect(Schema.decodeUnknownSync(TooltipGroup.Model)(encoded)).toEqual(model)
  const message: TooltipGroup.Message = { _tag: 'TooltipOpened', now: 10 }
  const encodedMessage = Schema.encodeSync(TooltipGroup.Message)(message)
  expect(Schema.decodeUnknownSync(TooltipGroup.Message)(encodedMessage)).toEqual(message)
})
