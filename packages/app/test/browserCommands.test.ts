import { Effect } from 'effect'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { clipboardCommand, scrollIntoViewCommand, type BrowserCommandResult } from '../src/index.js'

const succeeded = (result: BrowserCommandResult) => result._tag === 'Succeeded' ? result : result

function setClipboard(value: unknown) {
  Object.defineProperty(navigator, 'clipboard', { configurable: true, value })
}

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(navigator, 'clipboard')
  Reflect.deleteProperty(globalThis, 'isSecureContext')
  document.body.replaceChildren()
})

describe('browser Commands', () => {
  it('clipboardEmitsSuccess', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    setClipboard({ writeText })
    Object.defineProperty(globalThis, 'isSecureContext', { configurable: true, value: true })
    const result = await Effect.runPromise(clipboardCommand('copied', succeeded).effect)
    expect(writeText).toHaveBeenCalledWith('copied')
    expect(result).toEqual({ _tag: 'Succeeded' })
  })

  it('clipboardMapsDeniedUnavailableAndInsecureContextToFailure', async () => {
    const denied = vi.fn().mockRejectedValue(new DOMException('denied', 'NotAllowedError'))
    setClipboard({ writeText: denied })
    Object.defineProperty(globalThis, 'isSecureContext', { configurable: true, value: true })
    expect(await Effect.runPromise(clipboardCommand('x', succeeded).effect)).toMatchObject({ _tag: 'Failed' })
    setClipboard(undefined)
    expect(await Effect.runPromise(clipboardCommand('x', succeeded).effect)).toMatchObject({ _tag: 'Failed' })
    setClipboard({ writeText: vi.fn() })
    Object.defineProperty(globalThis, 'isSecureContext', { configurable: true, value: false })
    expect(await Effect.runPromise(clipboardCommand('x', succeeded).effect)).toMatchObject({ _tag: 'Failed' })
  })

  it('scrollUsesNativeOptionsAndEmitsSuccess', async () => {
    const element = document.createElement('div')
    element.id = 'target'
    const scrollIntoView = vi.fn()
    Object.defineProperty(element, 'scrollIntoView', { configurable: true, value: scrollIntoView })
    document.body.append(element)
    const options: ScrollIntoViewOptions = { behavior: 'smooth', block: 'center' }
    const result = await Effect.runPromise(scrollIntoViewCommand('target', options, succeeded).effect)
    expect(scrollIntoView).toHaveBeenCalledWith(options)
    expect(result).toEqual({ _tag: 'Succeeded' })
  })

  it('scrollMapsMissingTargetAndDomExceptionToFailure', async () => {
    expect(await Effect.runPromise(scrollIntoViewCommand('missing', {}, succeeded).effect)).toMatchObject({ _tag: 'Failed' })
    const element = document.createElement('div')
    element.id = 'throws'
    Object.defineProperty(element, 'scrollIntoView', { configurable: true, value: () => { throw new DOMException('blocked') } })
    document.body.append(element)
    expect(await Effect.runPromise(scrollIntoViewCommand('throws', {}, succeeded).effect)).toMatchObject({ _tag: 'Failed' })
  })
})
