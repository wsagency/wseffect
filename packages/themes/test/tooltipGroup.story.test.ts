import { Duration } from 'effect'
import * as Option from 'effect/Option'
import type { HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { defineMessageUnion } from '@wsagency/wseffect-foldkit/message'
import * as Scene from '@wsagency/wseffect-foldkit/scene'
import { describe, it } from 'vitest'
import * as TooltipGroup from '@wsagency/wseffect-primitives/tooltip-group'
import * as UiTooltip from '@wsagency/wseffect-foldkit-ui/tooltip'
import * as Tooltip from '../src/components/tooltip.js'

const Message = defineMessageUnion({
  First: { message: Tooltip.Message },
  Second: { message: Tooltip.Message },
})
type Message = typeof Message.Type
type Model = { first: Tooltip.Model; second: Tooltip.Model; group: TooltipGroup.Model }

const sendFirst = (message: Tooltip.Message): Message => Message.First({ message })
const sendSecond = (message: Tooltip.Message): Message => Message.Second({ message })
const foldTooltip = (
  read: (model: Model) => Option.Option<Tooltip.Model>,
  write: (model: Model, tooltip: Tooltip.Model) => Model,
  toParentMessage: (message: Tooltip.Message) => Message,
  readGroup: (model: Model) => TooltipGroup.Model,
) => Tooltip.fold<Model, Message, never>({
  read,
  write,
  toParentMessage,
  readGroup,
  foldOutMessage: outMessage => model => ({
    model: outMessage._tag === 'Shown' || outMessage._tag === 'Hidden'
      ? { ...model, group: TooltipGroup.update(model.group, {
        _tag: outMessage._tag === 'Shown' ? 'TooltipOpened' : 'TooltipClosed',
        now: 700,
      }).model }
      : model,
  }),
})
const foldFirst = foldTooltip(
  model => Option.some(model.first),
  (model, first) => ({ ...model, first }),
  sendFirst,
  model => model.group,
)
const foldSecond = foldTooltip(
  model => Option.some(model.second),
  (model, second) => ({ ...model, second }),
  sendSecond,
  model => model.group,
)
const update = (model: Model, message: Message) => Message.match(message, {
  First: ({ message: child }) => foldFirst(model, child),
  Second: ({ message: child }) => foldSecond(model, child),
})
const view = (model: Model, h: HtmlBuilder<Message>) => h.div([], [
  Tooltip.embed(h, {
    slotId: 'first', model: model.first, toParentMessage: sendFirst,
    viewInputs: { trigger: ['First'], content: ['First tooltip'] },
  }),
  Tooltip.embed(h, {
    slotId: 'second', model: model.second, toParentMessage: sendSecond,
    viewInputs: { trigger: ['Second'], content: ['Second tooltip'] },
  }),
])

describe('themed TooltipGroup coordination', () => {
  it('waits on first hover and skips delay for the next tooltip in the group window', () => {
    Scene.scene(
      { update, view },
      Scene.given({ first: Tooltip.init({ id: 'first' }), second: Tooltip.init({ id: 'second' }), group: TooltipGroup.init() }),
      Scene.hover(Scene.role('button', { name: 'First' })),
      Scene.Command.expectExact(UiTooltip.WaitBeforeShowing({ delay: Duration.millis(700), version: 1 })),
      Scene.Command.resolve(UiTooltip.WaitBeforeShowing, UiTooltip.Message.CompletedWaitBeforeShowing({ version: 1 })),
      Scene.Mount.resolve(UiTooltip.AnchorTooltip, UiTooltip.Message.CompletedAnchorTooltip()),
      Scene.expect(Scene.role('tooltip')).toHaveAttr('data-state', 'delayed-open'),
      Scene.hover(Scene.role('button', { name: 'Second' })),
      Scene.Command.expectExact(UiTooltip.WaitBeforeShowing({ delay: Duration.millis(0), version: 1 })),
      Scene.Command.resolve(UiTooltip.WaitBeforeShowing, UiTooltip.Message.CompletedWaitBeforeShowing({ version: 1 })),
      Scene.Mount.resolve(UiTooltip.AnchorTooltip, UiTooltip.Message.CompletedAnchorTooltip()),
      Scene.expect(Scene.role('tooltip')).toExist(),
      Scene.expect(Scene.role('tooltip', { name: 'Second tooltip' })).toHaveAttr('data-state', 'instant-open'),
    )
  })
})
