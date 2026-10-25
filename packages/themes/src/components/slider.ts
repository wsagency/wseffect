import { childAttributes, type Html, type HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { defineView } from '@wsagency/wseffect-foldkit/submodel'
import * as Update from '@wsagency/wseffect-foldkit/update'
import * as SliderUi from '@wsagency/wseffect-foldkit-ui/slider'
import type { ViewInputs as UiInputs, SliderAttributes } from '@wsagency/wseffect-foldkit-ui/slider'
import { classes, Props as SliderProps } from './slider/props.js'

export const Props = SliderProps
export type Props = typeof Props.Type
export { Range } from './slider/range.js'
export type { RangeModel, RangeMessage, RangeOutMessage, RangeConfig, RangeFoldInput, RangeEmbedConfig } from './slider/range.js'
export type Model = SliderUi.Model
export const Model = SliderUi.Model
export type Message = SliderUi.Message
export const Message = SliderUi.Message
export type OutMessage = SliderUi.OutMessage
export const OutMessage = SliderUi.OutMessage
export type InitConfig = SliderUi.InitConfig
export const init = SliderUi.init
export const update = SliderUi.update
export type ViewInputs = Omit<UiInputs, 'toView'> & Readonly<{ props?: Props }>
export type EmbedConfig<ParentMessage> = Readonly<{ slotId: string; model: Model; toParentMessage(message: Message): ParentMessage; viewInputs: ViewInputs }>
const renderSingle = (model: Model, inputs: ViewInputs, h: HtmlBuilder<Message>): Html => {
  const props = inputs.props
  return SliderUi.view(model, {
    ...inputs,
    toView: (attributes: SliderAttributes) => h.div([
      ...attributes.root,
      ...childAttributes([
        h.Class(['rt-SliderRoot', ...classes(props)].join(' ')),
        ...(props?.color === undefined ? [] : [h.DataAttribute('accent-color', props.color)]),
        ...(props?.radius === undefined ? [] : [h.DataAttribute('radius', props.radius)]),
      ]),
    ], [
      h.div([...attributes.track, ...childAttributes([h.Class('rt-SliderTrack')])], [
        h.div([...attributes.filledTrack, ...childAttributes([h.Class(['rt-SliderRange', ...(props?.highContrast ? ['rt-high-contrast'] : [])].join(' '))])], []),
      ]),
      h.div([...attributes.thumb, ...childAttributes([h.Class('rt-SliderThumb')])], []),
    ]),
  }, h)
}
const singleView = defineView<Model, Message, ViewInputs>(renderSingle)
export const view = singleView
export const fold = <ParentModel, ParentMessage, ParentOutMessage>(config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, Model, Message, Message, OutMessage, ParentOutMessage>, 'update'>): Update.FoldWithOutMessage<ParentModel, ParentMessage, Message, ParentOutMessage> => Update.foldChild({ ...config, update })
export const embed = <ParentMessage>(h: HtmlBuilder<ParentMessage>, config: EmbedConfig<ParentMessage>): Html => h.submodel({ slotId: config.slotId, model: config.model, view: singleView, viewInputs: config.viewInputs, toParentMessage: config.toParentMessage })
