import { responsiveProp } from './responsive.js'

export const paddingValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const

export const paddingPropDefs = {
  p: responsiveProp({ className: 'rt-r-p', values: paddingValues, customProperties: ['--p'] }),
  px: responsiveProp({ className: 'rt-r-px', values: paddingValues, customProperties: ['--px'] }),
  py: responsiveProp({ className: 'rt-r-py', values: paddingValues, customProperties: ['--py'] }),
  pt: responsiveProp({ className: 'rt-r-pt', values: paddingValues, customProperties: ['--pt'] }),
  pr: responsiveProp({ className: 'rt-r-pr', values: paddingValues, customProperties: ['--pr'] }),
  pb: responsiveProp({ className: 'rt-r-pb', values: paddingValues, customProperties: ['--pb'] }),
  pl: responsiveProp({ className: 'rt-r-pl', values: paddingValues, customProperties: ['--pl'] }),
} as const
