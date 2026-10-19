import { responsiveProp } from './responsive.js'

export const gapValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'] as const
export const gapPropDefs = {
  gap: responsiveProp({ className: 'rt-r-gap', values: gapValues, customProperties: ['--gap'] }),
  gapX: responsiveProp({ className: 'rt-r-cg', values: gapValues, customProperties: ['--column-gap'] }),
  gapY: responsiveProp({ className: 'rt-r-rg', values: gapValues, customProperties: ['--row-gap'] }),
} as const
