import { Schema } from 'effect'
import { responsiveSchema } from '../props/componentSchema.js'
export const sizes = ['1', '2', '3'] as const
export const Props = Schema.Struct({ size: Schema.optional(responsiveSchema(sizes)), loading: Schema.optional(Schema.Boolean) })
export type ViewProps = typeof Props.Type
