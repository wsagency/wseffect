import { brandViewResult } from 'foldkit/brand'
import { childAttributes, type Html, type HtmlBuilder } from 'foldkit/html'
import { defineView } from 'foldkit/submodel'
import * as Update from 'foldkit/update'
import { Schema } from 'effect'
import * as SliderUi from '@foldkit/ui/slider'
import * as RangeSliderPrimitive from '@wsagency/wseffect-primitives/range-slider'
import type { Config as PrimitiveRangeConfig } from '@wsagency/wseffect-primitives/range-slider'
import type { ViewInputs as UiInputs, SliderAttributes } from '@foldkit/ui/slider'
import { accentColors } from '../props/color.props.js'
import { radii } from '../props/radius.props.js'
import { responsiveSchema } from '../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'

const sizes = ['1', '2', '3'] as const
const variants = ['classic', 'surface', 'soft'] as const
const sizeProp = responsiveProp({ className: 'rt-r-size', values: sizes })
const variantClasses = Object.freeze({ classic: 'rt-variant-classic', surface: 'rt-variant-surface', soft: 'rt-variant-soft' })
export const Props = Schema.Struct({
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  color: Schema.optional(Schema.Literals(accentColors)),
  highContrast: Schema.optional(Schema.Boolean),
  radius: Schema.optional(Schema.Literals(radii)),
})
export type Props = typeof Props.Type
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
const classes = (props: Props | undefined): ReadonlyArray<string> => {
  const size = props?.size ?? '2'
  return [typeof size === 'string' ? `rt-r-size-${size}` : responsiveClasses(sizeProp, size).classes.join(' '), variantClasses[props?.variant ?? 'surface']]
}
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

export type RangeModel = RangeSliderPrimitive.Model
export type RangeMessage = RangeSliderPrimitive.Message
export type RangeOutMessage = RangeSliderPrimitive.OutMessage
export type RangeConfig = PrimitiveRangeConfig & Readonly<{ props?: Props }>
export type RangeFoldInput = Readonly<{ config: RangeConfig; message: RangeMessage }>
export type RangeEmbedConfig<ParentMessage> = Readonly<{ slotId: string; model: RangeModel; toParentMessage(message: RangeMessage): ParentMessage; viewInputs: RangeConfig }>
const rangeInit = (config: RangeConfig): RangeModel => RangeSliderPrimitive.init(config)
const rangeUpdate = (model: RangeModel, config: RangeConfig, message: RangeMessage) => RangeSliderPrimitive.update(model, config, message)
const rangeView = (model: RangeModel, config: RangeConfig, h: HtmlBuilder<RangeMessage>): Html => brandViewResult(h.div([
  h.Class(['rt-SliderRoot', ...classes(config.props)].join(' ')),
  h.DataAttribute('orientation', config.orientation),
  ...(config.isDisabled ? [h.DataAttribute('disabled', '')] : []),
  ...(config.props?.color === undefined ? [] : [h.DataAttribute('accent-color', config.props.color)]),
  ...(config.props?.radius === undefined ? [] : [h.DataAttribute('radius', config.props.radius)]),
], [RangeSliderPrimitive.view(model, config, h)]), 'wseffect/Slider.Range')
const rangeSubmodelView = defineView<RangeModel, RangeMessage, RangeConfig>((model, config, h) => rangeView(model, config, h))
const rangeFold = <ParentModel, ParentMessage, ParentOutMessage>(config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, RangeModel, RangeFoldInput, RangeMessage, RangeOutMessage, ParentOutMessage>, 'update'>): Update.FoldWithOutMessage<ParentModel, ParentMessage, RangeFoldInput, ParentOutMessage> => Update.foldChild({ ...config, update: (model, input) => rangeUpdate(model, input.config, input.message) })
const rangeEmbed = <ParentMessage>(h: HtmlBuilder<ParentMessage>, config: RangeEmbedConfig<ParentMessage>): Html => h.submodel({ slotId: config.slotId, model: config.model, view: rangeSubmodelView, viewInputs: config.viewInputs, toParentMessage: config.toParentMessage })
export const Range = Object.freeze({ Model: RangeSliderPrimitive.Model, Message: RangeSliderPrimitive.Message, OutMessage: RangeSliderPrimitive.OutMessage, init: rangeInit, update: rangeUpdate, view: rangeView, fold: rangeFold, embed: rangeEmbed })
