import type { Html, HtmlBuilder } from 'foldkit/html'

const checkPath = 'M8.53547 0.62293C8.88226 0.849446 8.97976 1.3142 8.75325 1.66099L4.5083 8.1599C4.38833 8.34356 4.19397 8.4655 3.9764 8.49358C3.75883 8.52167 3.53987 8.45309 3.3772 8.30591L0.616113 5.80777C0.308959 5.52987 0.285246 5.05559 0.563148 4.74844C0.84105 4.44128 1.31533 4.41757 1.62249 4.69547L3.73256 6.60459L7.49741 0.840706C7.72393 0.493916 8.18868 0.396414 8.53547 0.62293Z'
const dividerPath = 'M0.75 4.5C0.75 4.08579 1.08579 3.75 1.5 3.75H7.5C7.91421 3.75 8.25 4.08579 8.25 4.5C8.25 4.91421 7.91421 5.25 7.5 5.25H1.5C1.08579 5.25 0.75 4.91421 0.75 4.5Z'
const chevronDownPath = 'M0.135232 3.15803C0.324102 2.95657 0.640521 2.94637 0.841971 3.13523L4.5 6.56464L8.158 3.13523C8.3595 2.94637 8.6759 2.95657 8.8648 3.15803C9.0536 3.35949 9.0434 3.67591 8.842 3.86477L4.84197 7.6148C4.64964 7.7951 4.35036 7.7951 4.15803 7.6148L0.158031 3.86477C-0.0434285 3.67591 -0.0536285 3.35949 0.135232 3.15803Z'

const svgAttributes = <Message>(h: HtmlBuilder<Message>, className?: string, ariaHidden = false) => [
  h.Attribute('width', '9'),
  h.Attribute('height', '9'),
  h.Attribute('viewBox', '0 0 9 9'),
  h.Attribute('fill', 'currentcolor'),
  h.Attribute('xmlns', 'http://www.w3.org/2000/svg'),
  ...(className === undefined ? [] : [h.Class(className)]),
  ...(ariaHidden ? [h.AriaHidden(true)] : []),
]

export const thickCheckIcon = <Message>(h: HtmlBuilder<Message>, className?: string, ariaHidden?: boolean): Html =>
  h.svg(svgAttributes(h, className, ariaHidden), [h.path([
    h.Attribute('fill-rule', 'evenodd'),
    h.Attribute('clip-rule', 'evenodd'),
    h.Attribute('d', checkPath),
  ], [])])

export const thickDividerIcon = <Message>(h: HtmlBuilder<Message>, className?: string, ariaHidden?: boolean): Html =>
  h.svg(svgAttributes(h, className, ariaHidden), [h.path([
    h.Attribute('fill-rule', 'evenodd'),
    h.Attribute('clip-rule', 'evenodd'),
    h.Attribute('d', dividerPath),
  ], [])])

export const chevronDownIcon = <Message>(h: HtmlBuilder<Message>, className?: string, ariaHidden?: boolean): Html =>
  h.svg(svgAttributes(h, className, ariaHidden), [h.path([h.Attribute('d', chevronDownPath)], [])])
