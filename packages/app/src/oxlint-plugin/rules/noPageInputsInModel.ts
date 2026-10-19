export interface AstNode {
  readonly type?: string
  readonly [key: string]: unknown
}

export interface RuleContext {
  readonly filename: string
  report(input: { readonly node: AstNode; readonly message: string }): void
}

export interface Rule {
  readonly meta: {
    readonly type: 'problem'
    readonly docs: { readonly description: string }
    readonly schema: readonly []
  }
  create(context: RuleContext): { Program(node: AstNode): void }
}

const message = 'Do not copy PageInputs into a Message; read shared inputs in the view instead'

function isNode(value: unknown): value is AstNode {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function children(node: AstNode): AstNode[] {
  const result: AstNode[] = []
  for (const [key, value] of Object.entries(node)) {
    if (key === 'parent') continue
    if (Array.isArray(value)) {
      for (const child of value) if (isNode(child)) result.push(child)
    } else if (isNode(value)) result.push(value)
  }
  return result
}

function collectPatternNames(pattern: AstNode, names: Set<string>): void {
  if (pattern.type === 'Identifier' && typeof pattern.name === 'string') {
    names.add(pattern.name)
    return
  }
  if (pattern.type === 'RestElement' && isNode(pattern.argument)) {
    collectPatternNames(pattern.argument, names)
    return
  }
  if (pattern.type === 'AssignmentPattern' && isNode(pattern.left)) {
    collectPatternNames(pattern.left, names)
    return
  }
  if (pattern.type === 'ObjectPattern' && Array.isArray(pattern.properties)) {
    for (const property of pattern.properties) {
      if (!isNode(property)) continue
      if (property.type === 'RestElement' && isNode(property.argument)) collectPatternNames(property.argument, names)
      else if (isNode(property.value)) collectPatternNames(property.value, names)
    }
    return
  }
  if (pattern.type === 'ArrayPattern' && Array.isArray(pattern.elements)) {
    for (const element of pattern.elements) if (isNode(element)) collectPatternNames(element, names)
  }
}

function calleePath(node: AstNode): string | undefined {
  if (node.type === 'TSInstantiationExpression' && isNode(node.expression)) return calleePath(node.expression)
  if (node.type === 'Identifier' && typeof node.name === 'string') return node.name
  if (node.type !== 'MemberExpression' || !isNode(node.object) || !isNode(node.property)) return undefined
  if (node.property.type !== 'Identifier' || typeof node.property.name !== 'string') return undefined
  const object = calleePath(node.object)
  return object === undefined ? undefined : `${object}.${node.property.name}`
}

function isInputReference(node: AstNode, names: ReadonlySet<string>, inputObject?: string): boolean {
  if (node.type === 'Identifier' && typeof node.name === 'string' && names.has(node.name)) return true
  if (inputObject !== undefined && node.type === 'MemberExpression' && isNode(node.object)) {
    let root = node.object
    while (root.type === 'MemberExpression' && isNode(root.object)) root = root.object
    if (root.type === 'Identifier' && root.name === inputObject) return true
  }
  return false
}

function firstInputReference(root: AstNode, names: ReadonlySet<string>, inputObject?: string): AstNode | undefined {
  if (root.type === 'Identifier' && isInputReference(root, names, inputObject)) return root
  if (root.type === 'MemberExpression' && isInputReference(root, names, inputObject)) return root
  for (const child of children(root)) {
    const found = firstInputReference(child, names, inputObject)
    if (found) return found
  }
  return undefined
}

function inspectView(view: AstNode, messageNames: ReadonlySet<string>, report: (node: AstNode) => void): void {
  const reported = new Set<AstNode>()
  const params = view.params
  if (!Array.isArray(params) || !isNode(params[1])) return
  const inputParam = params[1]
  const names = new Set<string>()
  collectPatternNames(inputParam, names)
  const inputObject = inputParam.type === 'Identifier' && typeof inputParam.name === 'string' ? inputParam.name : undefined
  const builder = isNode(params[2]) && params[2].type === 'Identifier' && typeof params[2].name === 'string' ? params[2].name : undefined
  const reportOnce = (node: AstNode) => {
    if (reported.has(node)) return
    reported.add(node)
    report(node)
  }

  const visit = (node: AstNode): void => {
    if (node.type === 'CallExpression' && isNode(node.callee)) {
      const path = calleePath(node.callee)
      const messageName = path?.split('.')[0]
      if (messageName !== undefined && messageNames.has(messageName)) {
        const found = firstInputReference(node, names, inputObject)
        if (found) reportOnce(found)
      } else if (builder !== undefined && path?.startsWith(`${builder}.On`)) {
        const args = node.arguments
        if (Array.isArray(args)) {
          for (const arg of args) {
            if (!isNode(arg)) continue
            const found = firstInputReference(arg, names, inputObject)
            if (found) {
              reportOnce(found)
              break
            }
          }
        }
      }
    }
    for (const child of children(node)) visit(child)
  }
  if (isNode(view.body)) visit(view.body)
}

export const noPageInputsInModel: Rule = {
  meta: {
    type: 'problem',
    docs: { description: message },
    schema: [],
  },
  create(context) {
    return {
      Program(program) {
        if (!context.filename.replaceAll('\\', '/').includes('/src/pages/')) return
        const messageNames = new Set<string>()
        const views = new Map<string, AstNode>()
        const collectBindings = (node: AstNode): void => {
          if (node.type === 'VariableDeclarator' && isNode(node.id) && node.id.type === 'Identifier' && typeof node.id.name === 'string' && isNode(node.init)) {
            if (node.init.type === 'CallExpression' && isNode(node.init.callee) && calleePath(node.init.callee) === 'defineMessageUnion') {
              messageNames.add(node.id.name)
            }
            if (node.init.type === 'ArrowFunctionExpression' || node.init.type === 'FunctionExpression') views.set(node.id.name, node.init)
          }
          for (const child of children(node)) collectBindings(child)
        }
        collectBindings(program)

        const findViews = (node: AstNode): void => {
          if (node.type === 'CallExpression' && isNode(node.callee) && calleePath(node.callee) === 'Submodel.defineView') {
            const args = node.arguments
            if (Array.isArray(args) && isNode(args[0])) {
              const view = args[0].type === 'Identifier' && typeof args[0].name === 'string' ? views.get(args[0].name) : args[0]
              if (view && (view.type === 'ArrowFunctionExpression' || view.type === 'FunctionExpression')) {
                inspectView(view, messageNames, (reference) => context.report({ node: reference, message }))
              }
            }
          }
          for (const child of children(node)) findViews(child)
        }
        findViews(program)
      },
    }
  },
}

