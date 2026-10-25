import { brandViewResult } from '@wsagency/wseffect-foldkit/brand'
import type { Html, HtmlBuilder } from '@wsagency/wseffect-foldkit/html'
import { responsiveProp, responsiveClasses } from '../props/responsive.js'
import { layoutPropDefs } from '../props/layout.props.js'
import { paddingClasses } from '../props/padding.classes.js'
import { marginClasses } from '../props/margin.classes.js'
import type { ViewProps } from './box.props.js'
import { styledElement } from './element.js'
export { Props } from './box.props.js'
export type { ViewProps } from './box.props.js'

const displayValues = ['none', 'inline', 'inline-block', 'block', 'contents', 'flex', 'inline-flex', 'grid', 'inline-grid'] as const
const displayProp = responsiveProp({ className: 'rt-r-display', values: displayValues })


export const view = <Message>(props: ViewProps, children: ReadonlyArray<Html | string>, h: HtmlBuilder<Message>): Html => {
  const results = [
    responsiveClasses(displayProp, props.display),
    responsiveClasses(layoutPropDefs.position, props.position),
    responsiveClasses(layoutPropDefs.overflow, props.overflow),
    responsiveClasses(layoutPropDefs.width, props.width),
    responsiveClasses(layoutPropDefs.minWidth, props.minWidth),
    responsiveClasses(layoutPropDefs.maxWidth, props.maxWidth),
    responsiveClasses(layoutPropDefs.height, props.height),
    responsiveClasses(layoutPropDefs.minHeight, props.minHeight),
    responsiveClasses(layoutPropDefs.maxHeight, props.maxHeight),
  ]
  const padding = paddingClasses(props)
  const margin = marginClasses(props)
  return brandViewResult(styledElement(props.as ?? 'div', ['rt-Box', ...results.flatMap(result => result.classes), ...padding.classes, ...margin.classes], Object.assign({}, ...results.map(result => result.style), padding.style, margin.style), children, h), 'wseffect/Box')
}
