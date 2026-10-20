import { Effect, Schema, Stream } from 'effect'
import { Mount, Runtime } from 'foldkit'
import type { HtmlBuilder } from 'foldkit/html'
import { Island, type IslandPatch, type IslandResult } from '../../src/island.js'

function getAction(patches: Stream.Stream<IslandPatch>): Mount.MountAction<IslandResult> {
  let action: Mount.MountAction<IslandResult> | undefined
  const attachMount = (attributes: ReadonlyArray<{ readonly _tag: string; readonly action?: Mount.MountAction<IslandResult> }>) => {
    action = attributes.find((attribute) => attribute._tag === 'OnMount')?.action
    return action
  }
  const builder = {
    Id: (value: string) => ({ _tag: 'Id', value }),
    OnMount: (value: Mount.MountAction<IslandResult>) => ({ _tag: 'OnMount', action: value }),
    keyed: (_tag: string) => (_key: PropertyKey, attributes: ReadonlyArray<{ readonly _tag: string; readonly action?: Mount.MountAction<IslandResult> }>) => attachMount(attributes),
  }
  Island({ id: 'island', html: '<section id="inside"><p>initial</p></section>', patches, toMessage: (result) => result }, builder as unknown as HtmlBuilder<IslandResult>)
  if (action === undefined) throw new Error('Island did not attach its mount')
  return action
}

type HarnessMessage =
  | { readonly _tag: 'RerenderSame' }
  | { readonly _tag: 'RerenderChanged' }
  | { readonly _tag: 'IslandResult'; readonly result: IslandResult }

const initialHtml = '<section id="target"><p id="initial">initial</p></section>'
const changedHtml = '<section id="changed-html">changed</section>'

const runtime = Runtime.makeElement({
  Model: Schema.Struct({ html: Schema.String, revision: Schema.Number }),
  container: document.getElementById('runtime'),
  init: () => ({ model: { html: initialHtml, revision: 0 } }),
  update: (model, message: HarnessMessage) => {
    switch (message._tag) {
      case 'RerenderSame': return { model: { ...model, revision: model.revision + 1 } }
      case 'RerenderChanged': return { model: { html: changedHtml, revision: model.revision + 1 } }
      case 'IslandResult': return { model }
    }
  },
  view: (model, h) => h.div([], [
    h.button([h.Id('rerender-same'), h.OnClick({ _tag: 'RerenderSame' })], ['same']),
    h.button([h.Id('rerender-changed'), h.OnClick({ _tag: 'RerenderChanged' })], ['changed']),
    h.span([h.Id('revision')], [String(model.revision)]),
    Island({
      id: 'runtime-island',
      html: model.html,
      patches: Stream.make({ _tag: 'InnerHtml', selector: '#target', html: '<p id="patched">patched</p>' }),
      toMessage: (result) => ({ _tag: 'IslandResult' as const, result }),
    }, h),
  ]),
})
Runtime.run(runtime)

declare global {
  interface Window {
    applyIslandPatches(patches: ReadonlyArray<IslandPatch>): Promise<ReadonlyArray<IslandResult>>
    prepareIslandPatches(patches: ReadonlyArray<IslandPatch>): () => Promise<ReadonlyArray<IslandResult>>
  }
}

window.prepareIslandPatches = (patches) => {
  const root = document.getElementById('island')
  if (root === null) throw new Error('Missing island root')
  const updates = getAction(Stream.fromIterable(patches)).f(root, Stream.empty)
  return () => Effect.runPromise(Stream.runCollect(updates))
}

window.applyIslandPatches = (patches) => window.prepareIslandPatches(patches)()
