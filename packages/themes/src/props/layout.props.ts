import { responsiveProp } from './responsive.js'

const overflowValues = ['visible', 'hidden', 'clip', 'scroll', 'auto'] as const
const positionValues = ['static', 'relative', 'absolute', 'fixed', 'sticky'] as const
const positionEdgeValues = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '-1', '-2', '-3', '-4', '-5', '-6', '-7', '-8', '-9'] as const
const flexShrinkValues = ['0', '1'] as const
const flexGrowValues = ['0', '1'] as const
const alignSelfValues = ['start', 'center', 'end', 'baseline', 'stretch'] as const
const justifySelfValues = ['start', 'center', 'end', 'baseline', 'stretch'] as const

export const layoutPropDefs = {
  position: responsiveProp({ className: 'rt-r-position', values: positionValues }),
  inset: responsiveProp({ className: 'rt-r-inset', values: positionEdgeValues, customProperties: ['--inset'] }),
  top: responsiveProp({ className: 'rt-r-top', values: positionEdgeValues, customProperties: ['--top'] }),
  right: responsiveProp({ className: 'rt-r-right', values: positionEdgeValues, customProperties: ['--right'] }),
  bottom: responsiveProp({ className: 'rt-r-bottom', values: positionEdgeValues, customProperties: ['--bottom'] }),
  left: responsiveProp({ className: 'rt-r-left', values: positionEdgeValues, customProperties: ['--left'] }),
  overflow: responsiveProp({ className: 'rt-r-overflow', values: overflowValues }),
  overflowX: responsiveProp({ className: 'rt-r-ox', values: overflowValues }),
  overflowY: responsiveProp({ className: 'rt-r-oy', values: overflowValues }),
  flexBasis: responsiveProp({ className: 'rt-r-fb', customProperties: ['--flex-basis'] }),
  flexShrink: responsiveProp({ className: 'rt-r-fs', values: flexShrinkValues, customProperties: ['--flex-shrink'] }),
  flexGrow: responsiveProp({ className: 'rt-r-fg', values: flexGrowValues, customProperties: ['--flex-grow'] }),
  gridArea: responsiveProp({ className: 'rt-r-ga', customProperties: ['--grid-area'] }),
  gridColumn: responsiveProp({ className: 'rt-r-gc', customProperties: ['--grid-column'] }),
  gridColumnStart: responsiveProp({ className: 'rt-r-gcs', customProperties: ['--grid-column-start'] }),
  gridColumnEnd: responsiveProp({ className: 'rt-r-gce', customProperties: ['--grid-column-end'] }),
  gridRow: responsiveProp({ className: 'rt-r-gr', customProperties: ['--grid-row'] }),
  gridRowStart: responsiveProp({ className: 'rt-r-grs', customProperties: ['--grid-row-start'] }),
  gridRowEnd: responsiveProp({ className: 'rt-r-gre', customProperties: ['--grid-row-end'] }),
  alignSelf: responsiveProp({ className: 'rt-r-as', values: alignSelfValues }),
  justifySelf: responsiveProp({ className: 'rt-r-js', values: justifySelfValues }),
} as const
