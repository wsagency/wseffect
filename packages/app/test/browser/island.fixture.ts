import { Effect, Stream } from 'effect'
import { Mount } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { Island, type IslandPatch, type IslandResult } from '../../src/island.js'

function getAction(patches: Stream.Stream<IslandPatch>): Mount.MountAction<IslandResult> {
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
  Island({ id: 'island', html: '', patches, toMessage: (result) => result }, builder as unknown as HtmlBuilder<IslandResult>)
  if (action === undefined) throw new Error('Island did not attach its mount')
  return action
}

declare global {
  interface Window {
    applyIslandPatches(patches: ReadonlyArray<IslandPatch>): Promise<ReadonlyArray<IslandResult>>
  }
}

window.applyIslandPatches = (patches) => {
  const root = document.getElementById('island')
  if (root === null) throw new Error('Missing island root')
  return Effect.runPromise(Stream.runCollect(getAction(Stream.fromIterable(patches)).f(root, Stream.empty)))
}
