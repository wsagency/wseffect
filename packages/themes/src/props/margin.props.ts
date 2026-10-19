import { responsiveProp } from './responsive.js'

export const marginValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-1', '-2', '-3', '-4', '-5', '-6', '-7', '-8', '-9'] as const

export const marginPropDefs = {
  m: responsiveProp({ className: 'rt-r-m', values: marginValues, customProperties: ['--m'] }),
  mx: responsiveProp({ className: 'rt-r-mx', values: marginValues, customProperties: ['--mx'] }),
  my: responsiveProp({ className: 'rt-r-my', values: marginValues, customProperties: ['--my'] }),
  mt: responsiveProp({ className: 'rt-r-mt', values: marginValues, customProperties: ['--mt'] }),
  mr: responsiveProp({ className: 'rt-r-mr', values: marginValues, customProperties: ['--mr'] }),
  mb: responsiveProp({ className: 'rt-r-mb', values: marginValues, customProperties: ['--mb'] }),
  ml: responsiveProp({ className: 'rt-r-ml', values: marginValues, customProperties: ['--ml'] }),
} as const
