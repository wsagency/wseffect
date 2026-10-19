import { Schema } from 'effect'
import { responsiveSchema } from './componentSchema.js'
import { responsiveClasses, responsiveProp, type Responsive } from './responsive.js'

export const paddingValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

export const paddingPropDefs = {
  p: responsiveProp({ className: 'rt-r-p', values: paddingValues, customProperties: ['--p'] }),
  px: responsiveProp({ className: 'rt-r-px', values: paddingValues, customProperties: ['--pl', '--pr'] }),
  py: responsiveProp({ className: 'rt-r-py', values: paddingValues, customProperties: ['--pt', '--pb'] }),
  pt: responsiveProp({ className: 'rt-r-pt', values: paddingValues, customProperties: ['--pt'] }),
  pr: responsiveProp({ className: 'rt-r-pr', values: paddingValues, customProperties: ['--pr'] }),
  pb: responsiveProp({ className: 'rt-r-pb', values: paddingValues, customProperties: ['--pb'] }),
  pl: responsiveProp({ className: 'rt-r-pl', values: paddingValues, customProperties: ['--pl'] }),
} as const

export const paddingPropSchemas = {
  p: Schema.optional(responsiveSchema(paddingValues, true)),
  px: Schema.optional(responsiveSchema(paddingValues, true)),
  py: Schema.optional(responsiveSchema(paddingValues, true)),
  pt: Schema.optional(responsiveSchema(paddingValues, true)),
  pr: Schema.optional(responsiveSchema(paddingValues, true)),
  pb: Schema.optional(responsiveSchema(paddingValues, true)),
  pl: Schema.optional(responsiveSchema(paddingValues, true)),
}

export const paddingClasses = (props: Readonly<Record<string, Responsive<string> | undefined>>) => {
  const classes: string[] = []
  const style: Record<string, string> = {}
  for (const key of ['p', 'px', 'py', 'pt', 'pr', 'pb', 'pl'] as const) {
    const value = (props as Record<string, Responsive<string> | undefined>)[key]
    if (value === undefined) continue
    const result = responsiveClasses(paddingPropDefs[key], value)
    classes.push(...result.classes)
    for (const property in result.style) style[property] = result.style[property]!
  }
  return { classes, style }
}
