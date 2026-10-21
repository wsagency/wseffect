import { Schema } from 'effect'
import { responsiveSchema } from '../props/componentSchema.js'
import { accentColors } from '../props/color.props.js'
import { marginPropSchemas } from '../props/margin.props.js'
export const orientations = ['horizontal', 'vertical'] as const
export const sizes = ['1', '2', '3', '4'] as const
export const Props = Schema.Struct({ orientation: Schema.optional(responsiveSchema(orientations)), size: Schema.optional(responsiveSchema(sizes)), color: Schema.optional(Schema.Literals(accentColors)), decorative: Schema.optional(Schema.Boolean), ...marginPropSchemas })
export type ViewProps = typeof Props.Type
