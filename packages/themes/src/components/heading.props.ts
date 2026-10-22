import { Schema } from 'effect'
import { accentColors } from '../props/color.props.js'
import { marginPropSchemas } from '../props/margin.props.js'
import { responsiveSchema } from '../props/componentSchema.js'

const sizes = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
const weights = ['light', 'regular', 'medium', 'bold'] as const
const alignments = ['left', 'center', 'right'] as const

export const Props = Schema.Struct({
  as: Schema.optional(Schema.Literals(['h1', 'h2', 'h3', 'h4', 'h5', 'h6'])),
  size: Schema.optional(responsiveSchema(sizes)),
  weight: Schema.optional(responsiveSchema(weights)),
  align: Schema.optional(responsiveSchema(alignments)),
  color: Schema.optional(Schema.Literals(accentColors)),
  ...marginPropSchemas,
})
export type ViewProps = typeof Props.Type
