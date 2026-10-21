import { Schema } from 'effect'
import * as RadioGroup from './radio-group.js'
import { accentColors } from '../props/color.props.js'
import { responsiveSchema } from '../props/componentSchema.js'

const sizes = ['1', '2', '3'] as const
const variants = ['surface', 'classic'] as const
const columns = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const gaps = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
export const Props = Schema.Struct({
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  color: Schema.optional(Schema.Literals(accentColors)),
  highContrast: Schema.optional(Schema.Boolean),
  columns: Schema.optional(Schema.Literals(columns)),
  gap: Schema.optional(Schema.Literals(gaps)),
})
export type Props = typeof Props.Type
export type Model = RadioGroup.Model
export type Message = RadioGroup.Message
export type OutMessage<Value extends string> = RadioGroup.OutMessage<Value>
export const create = RadioGroup.create
