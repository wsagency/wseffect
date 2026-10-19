import { Schema } from 'effect'
import { responsiveSchema } from './componentSchema.js'
import { responsiveClasses, responsiveProp, type Responsive } from './responsive.js'

export const marginValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-1', '-2', '-3', '-4', '-5', '-6', '-7', '-8', '-9'] as const

export const marginPropDefs = {
  m: responsiveProp({ className: 'rt-r-m', values: marginValues, customProperties: ['--m'] }),
  mx: responsiveProp({ className: 'rt-r-mx', values: marginValues, customProperties: ['--ml', '--mr'] }),
  my: responsiveProp({ className: 'rt-r-my', values: marginValues, customProperties: ['--mt', '--mb'] }),
  mt: responsiveProp({ className: 'rt-r-mt', values: marginValues, customProperties: ['--mt'] }),
  mr: responsiveProp({ className: 'rt-r-mr', values: marginValues, customProperties: ['--mr'] }),
  mb: responsiveProp({ className: 'rt-r-mb', values: marginValues, customProperties: ['--mb'] }),
  ml: responsiveProp({ className: 'rt-r-ml', values: marginValues, customProperties: ['--ml'] }),
} as const

export const marginPropSchemas = {
  m: Schema.optional(responsiveSchema(marginValues, true)),
  mx: Schema.optional(responsiveSchema(marginValues, true)),
  my: Schema.optional(responsiveSchema(marginValues, true)),
  mt: Schema.optional(responsiveSchema(marginValues, true)),
  mr: Schema.optional(responsiveSchema(marginValues, true)),
  mb: Schema.optional(responsiveSchema(marginValues, true)),
  ml: Schema.optional(responsiveSchema(marginValues, true)),
}

export const marginClasses = (props: object) => {
  const classes: string[] = []
  const style: Record<string, string> = {}
  for (const key of ['m', 'mx', 'my', 'mt', 'mr', 'mb', 'ml'] as const) {
    const value = (props as Record<string, Responsive<string> | undefined>)[key]
    if (value === undefined) continue
    const result = responsiveClasses(marginPropDefs[key], value)
    classes.push(...result.classes)
    for (const property in result.style) style[property] = result.style[property]!
  }
  return { classes, style }
}
