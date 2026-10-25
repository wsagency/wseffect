import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, it } from '@effect/vitest'
import * as TooltipGroup from './group.js'

const update = TooltipGroup.update
const view = (model: TooltipGroup.Model, h: HtmlBuilder<TooltipGroup.Message>) => h.div([
  h.Attribute('data-show-delay', String(TooltipGroup.reflectShowDelay(model))),
], [])

describe('TooltipGroup Scene', () => {
  it("reflects the group's initial delay into Tooltip view inputs", () => {
    Scene.scene(
      { update, view },
      Scene.given(TooltipGroup.init()),
      Scene.expect(Scene.selector('[data-show-delay="700"]')).toExist(),
    )
  })
})
