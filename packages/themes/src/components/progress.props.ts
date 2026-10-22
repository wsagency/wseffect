import { Schema } from 'effect'
import { responsiveSchema } from '../props/componentSchema.js'
import { accentColors } from '../props/color.props.js'
import { radii } from '../props/radius.props.js'

export const sizes = ['1', '2', '3'] as const
export const variants = ['classic', 'surface', 'soft'] as const
export const Props = Schema.Struct({
  size: Schema.optional(responsiveSchema(sizes)),
  variant: Schema.optional(Schema.Literals(variants)),
  color: Schema.optional(Schema.Literals(accentColors)),
  highContrast: Schema.optional(Schema.Boolean),
  radius: Schema.optional(Schema.Literals(radii)),
  value: Schema.optional(Schema.Number),
  max: Schema.optional(Schema.Number),
  duration: Schema.optional(Schema.String),
})
export type ViewProps = typeof Props.Type
