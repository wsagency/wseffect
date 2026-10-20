import { Effect, Fiber, Stream } from 'effect'
import { Mount } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { describe, expect, it } from 'vitest'
import { Island, type IslandPatch, type IslandResult } from '../src/index.js'

function islandAction(patches: Stream.Stream<IslandPatch>) {
  let action: Mount.MountAction<IslandResult> | undefined
  const builder = {
    Id: (value: string) => ({ _tag: 'Id', value }),
    InnerHTML: (value: string) => ({ _tag: 'InnerHTML', value }),
    OnMount: (value: Mount.MountAction<IslandResult>) => ({ _tag: 'OnMount', action: value }),
    div: (attributes: ReadonlyArray<{ readonly _tag: string; readonly action?: Mount.MountAction<IslandResult> }>) => {
      action = attributes.find((attribute) => attribute._tag === 'OnMount')?.action
      return action
    },
  }
  Island({ id: 'island', html: '<section id="inside"><p>initial</p></section>', patches, toMessage: (result) => result }, builder as unknown as HtmlBuilder<IslandResult>)
  if (action === undefined) throw new Error('Island did not attach its mount')
  return action
}

function installIsland() {
  document.body.innerHTML = '<main id="island"><section id="inside"><p>initial</p></section></main><aside id="outside">keep</aside>'
  const root = document.getElementById('island')
  if (root === null) throw new Error('missing test island')
  return root
}

const apply = (root: Element, patches: ReadonlyArray<IslandPatch>) => Effect.runPromise(Stream.runCollect(islandAction(Stream.fromIterable(patches)).f(root, Stream.empty)))

const rejectionSnapshot = async (patch: IslandPatch, reason: string) => {
  const root = installIsland()
  const before = document.documentElement.outerHTML
  const results = await apply(root, [patch])
  expect(document.documentElement.outerHTML).toBe(before)
  expect(results).toMatchObject([{ _tag: 'RejectedIslandPatch', reason }])
}

describe('Island', () => {
  it('appliesOuterHtmlAndInnerHtmlWithinRoot', async () => {
    const root = installIsland()
    const results = await apply(root, [
      { _tag: 'InnerHtml', selector: '#inside', html: '<p id="new">inner</p>' },
      { _tag: 'OuterHtml', selector: '#new', html: '<p id="new">outer</p>' },
    ])
    expect(root.querySelector('#new')?.textContent).toBe('outer')
    expect(results).toMatchObject([{ _tag: 'Applied' }, { _tag: 'Applied' }])
  })

  it('rejectsMalformedMissingRootAndOutsideTargetsBeforeMutation', async () => {
    await rejectionSnapshot({ _tag: 'InnerHtml', selector: '#broken:not(', html: '<p>bad</p>' }, 'InvalidSelector')
    await rejectionSnapshot({ _tag: 'InnerHtml', selector: '#absent', html: '<p>bad</p>' }, 'MissingTarget')
    await rejectionSnapshot({ _tag: 'InnerHtml', selector: '#island', html: '<p>bad</p>' }, 'TargetOutsideIsland')
    await rejectionSnapshot({ _tag: 'OuterHtml', selector: '#outside', html: '<p>bad</p>' }, 'TargetOutsideIsland')
  })

  it('rejectsSiblingInsertionWithoutInIslandParent', async () => {
    await rejectionSnapshot({ _tag: 'OuterHtml', selector: '#outside', html: '<p id="new">sibling</p>' }, 'TargetOutsideIsland')
  })

  it('preservesActiveInputValueFocusAndSelection', async () => {
    const root = installIsland()
    root.innerHTML = '<section id="form"><input id="field" value="server"></section>'
    const input = root.querySelector<HTMLInputElement>('#field')
    if (input === null) throw new Error('missing test input')
    input.value = 'typed by user'
    input.focus()
    input.setSelectionRange(3, 8)
    await apply(root, [{ _tag: 'InnerHtml', selector: '#form', html: '<input id="field" value="updated">' }])
    const current = root.querySelector<HTMLInputElement>('#field')
    expect(current?.value).toBe('typed by user')
    expect(document.activeElement).toBe(current)
    expect(current?.selectionStart).toBe(3)
    expect(current?.selectionEnd).toBe(8)
  })

  it('interruptedIslandStopsReceivingPatches', async () => {
    const root = installIsland()
    const before = root.outerHTML
    const fiber = Effect.runFork(Stream.runCollect(islandAction(Stream.never).f(root, Stream.empty)))
    await Effect.runPromise(Fiber.interrupt(fiber))
    expect(root.outerHTML).toBe(before)
  })
})
