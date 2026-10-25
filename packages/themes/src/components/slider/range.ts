import { brandViewResult } from '@wsagency/wseffect-foldkit/brand'
import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { defineView } from '@wsagency/wseffect-foldkit/submodel'
import * as Update from '@wsagency/wseffect-foldkit/update'
import * as RangePrimitive from '@wsagency/wseffect-foldkit-ui/slider'
import type { RangeConfig as PrimitiveRangeConfig } from '@wsagency/wseffect-foldkit-ui/slider'
import { classes, Props as SliderProps } from './props.js'

export const Props = SliderProps
export type Props = typeof Props.Type
export type RangeModel = RangePrimitive.Range.RangeModel
export type RangeMessage = RangePrimitive.Range.RangeMessage
export type RangeOutMessage = RangePrimitive.Range.RangeOutMessage
export type RangeConfig = PrimitiveRangeConfig & Readonly<{ props?: Props }>
export type RangeFoldInput = Readonly<{ config: RangeConfig; message: RangeMessage }>
export type RangeEmbedConfig<ParentMessage> = Readonly<{ slotId: string; model: RangeModel; toParentMessage(message: RangeMessage): ParentMessage; viewInputs: RangeConfig }>

const rangeInit = (config: RangeConfig): RangeModel => RangePrimitive.Range.init(config)
const rangeUpdate = (model: RangeModel, config: RangeConfig, message: RangeMessage) => RangePrimitive.Range.update(model, config, message)
const rangeView = (model: RangeModel, config: RangeConfig, h: HtmlBuilder<RangeMessage>): Html => brandViewResult(h.div([
  h.Class(['rt-SliderRoot', ...classes(config.props), ...(config.props?.highContrast ? ['rt-high-contrast'] : [])].join(' ')),
  h.DataAttribute('range-slider-root', ''),
  h.DataAttribute('orientation', config.orientation),
  ...(config.isDisabled ? [h.DataAttribute('disabled', '')] : []),
  ...(config.props?.color === undefined ? [] : [h.DataAttribute('accent-color', config.props.color)]),
  ...(config.props?.radius === undefined ? [] : [h.DataAttribute('radius', config.props.radius)]),
], [RangePrimitive.Range.view(model, config, h)]), 'wseffect/Slider.Range')
const rangeSubmodelView = defineView<RangeModel, RangeMessage, RangeConfig>((model, config, h) => rangeView(model, config, h))
const rangeFold = <ParentModel, ParentMessage, ParentOutMessage>(config: Omit<Update.ChildFoldWithDerivedParentOutMessage<ParentModel, ParentMessage, RangeModel, RangeFoldInput, RangeMessage, RangeOutMessage, ParentOutMessage>, 'update'>): Update.FoldWithOutMessage<ParentModel, ParentMessage, RangeFoldInput, ParentOutMessage> => Update.foldChild({ ...config, update: (model, input) => rangeUpdate(model, input.config, input.message) })
const rangeEmbed = <ParentMessage>(h: HtmlBuilder<ParentMessage>, config: RangeEmbedConfig<ParentMessage>): Html => h.submodel({ slotId: config.slotId, model: config.model, view: rangeSubmodelView, viewInputs: config.viewInputs, toParentMessage: config.toParentMessage })

export const Range = Object.freeze({ Model: RangePrimitive.Range.Model, Message: RangePrimitive.Range.Message, OutMessage: RangePrimitive.Range.OutMessage, init: rangeInit, update: rangeUpdate, view: rangeView, fold: rangeFold, embed: rangeEmbed })
