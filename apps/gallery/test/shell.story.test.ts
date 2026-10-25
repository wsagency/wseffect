import { Option } from 'effect'
import { given, message, model, story } from '@wsagency/wseffect-foldkit/story'
import { describe, expect, it } from 'vitest'
import { Message, createInitialModel, init, update } from '../src/shell.js'
import * as Url from '@wsagency/wseffect-foldkit/url'
import { PageOutMessage } from '../src/contract.js'

describe('gallery shell', () => {
  it('stores a changed date once in its Model', () => {
    const initial = createInitialModel([])
    story(update, given(initial), message(Message.ChangedDate({ date: '2026-10-19' })),
      model((next) => expect(next.date).toBe('2026-10-19')))
  })
  it('starts the current route with its page module loading', () => {
    const url = Option.getOrThrow(Url.fromString('https://gallery.test/virtual-list'))
    const initial = init(url)
    expect(initial.model.kit.activeKeys).toEqual(['virtualList'])
    expect(initial.model.kit.slots.virtualList?._tag).toBe('Loading')
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
    story(update, given(initial), message(Message.PageOutMessage({ message: PageOutMessage.ChangedThemeSetting({ setting: 'hasBackground', value: 'false' }) })),
      model((next) => expect(next.theme.hasBackground).toBe(false)),
      message(Message.PageOutMessage({ message: PageOutMessage.ChangedThemeSetting({ setting: 'hasBackground', value: 'invalid' }) })),
      model((next) => expect(next.theme.hasBackground).toBe(false)))
  })

  it('shifts the shared date by the requested day count', () => {
    const initial = { ...createInitialModel([]), date: '2026-10-19' }
    story(update, given(initial), message(Message.PageOutMessage({ message: PageOutMessage.RequestedShiftDay({ days: -1 }) })),
      model((next) => expect(next.date).toBe('2026-10-18')))
  })
})
