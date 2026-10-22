import type { HtmlBuilder } from 'foldkit/html'
import * as Scene from 'foldkit/scene'
import { it } from 'vitest'
import * as TooltipGroup from '../src/tooltip-group.js'

const update = (model: TooltipGroup.Model, _message: never) => ({ model })
const render = (model: TooltipGroup.Model, h: HtmlBuilder<never>) => h.div([
  h.Attribute('data-show-delay', String(TooltipGroup.reflectShowDelay(model))),
], [])

it('reflects group delay for the Tooltip view', () => {
  Scene.scene(
    { update, view: render },
    Scene.given(TooltipGroup.init()),
    Scene.expect(Scene.selector('[data-show-delay="700"]')).toExist(),
  )
})
