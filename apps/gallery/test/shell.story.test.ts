import { describe, expect, it } from 'vitest'
import { given, message, model, story } from 'foldkit/story'
import { Message, createInitialModel, update } from '../src/shell.js'
import { PageOutMessage } from '../src/contract.js'

describe('gallery shell', () => {
  it('stores a changed date once in its Model', () => {
    const initial = createInitialModel([])
    story(update, given(initial), message(Message.ChangedDate({ date: '2026-10-19' })),
      model((next) => expect(next.date).toBe('2026-10-19')))
  })

  it('routes the shared page pair together', () => {
    const initial = createInitialModel([])
    story(update, given(initial), message(Message.ChangedUrl({ path: '/shared' })),
      model((next) => expect(next.kit.activeKeys).toEqual(['sharedA', 'sharedB'])))
  })

  it('applies a valid page-requested theme setting and ignores an invalid value', () => {
    const initial = createInitialModel([])
    story(update, given(initial), message(Message.PageOutMessage({ message: PageOutMessage.ChangedThemeSetting({ setting: 'accentColor', value: 'crimson' }) })),
      model((next) => expect(next.theme.accentColor).toBe('crimson')),
      message(Message.PageOutMessage({ message: PageOutMessage.ChangedThemeSetting({ setting: 'accentColor', value: 'not-a-color' }) })),
      model((next) => expect(next.theme.accentColor).toBe('crimson')))
  })

  it('shifts the shared date by the requested day count', () => {
    const initial = { ...createInitialModel([]), date: '2026-10-19' }
    story(update, given(initial), message(Message.PageOutMessage({ message: PageOutMessage.RequestedShiftDay({ days: -1 }) })),
      model((next) => expect(next.date).toBe('2026-10-18')))
  })
})
