import type { Attribute, Html, HtmlBuilder } from 'foldkit/html'

type Tag = 'div' | 'span' | 'label' | 'p' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

export const styledElement = <Message>(
  tag: Tag,
  classes: ReadonlyArray<string>,
  style: Readonly<Record<string, string>>,
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Message>,
): Html => {
  const attributes: Attribute<Message>[] = []
  if (classes.length > 0) attributes.push(h.Class(classes.join(' ')))
  if (Object.keys(style).length > 0) attributes.push(h.Style(style))
  return element(tag, attributes, children, h)
}

export const element = <Message>(
  tag: Tag,
  attributes: ReadonlyArray<Attribute<Message>>,
  children: ReadonlyArray<Html | string>,
  h: HtmlBuilder<Message>,
): Html => {
  switch (tag) {
    case 'div': return h.div(attributes, children)
    case 'span': return h.span(attributes, children)
    case 'label': return h.label(attributes, children)
    case 'p': return h.p(attributes, children)
    case 'h1': return h.h1(attributes, children)
    case 'h2': return h.h2(attributes, children)
    case 'h3': return h.h3(attributes, children)
    case 'h4': return h.h4(attributes, children)
    case 'h5': return h.h5(attributes, children)
    case 'h6': return h.h6(attributes, children)
  }
}
