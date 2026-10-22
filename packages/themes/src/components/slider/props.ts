import { Schema } from 'effect'
import { accentColors } from '../../props/color.props.js'
import { radii } from '../../props/radius.props.js'
import { responsiveSchema } from '../../props/componentSchema.js'
import { responsiveProp, responsiveClasses } from '../../props/responsive.js'

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

export const classes = (props: Props | undefined): ReadonlyArray<string> => {
  const size = props?.size ?? '2'
  return [typeof size === 'string' ? `rt-r-size-${size}` : responsiveClasses(sizeProp, size).classes.join(' '), variantClasses[props?.variant ?? 'surface']]
}
