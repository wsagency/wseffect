export interface AstNode {
  readonly type?: string
  readonly [key: string]: unknown
}

export interface RuleContext {
  readonly filename: string
  readonly options: readonly [{ readonly allow?: readonly string[] }?]
  report(input: { readonly node: AstNode; readonly message: string }): void
}

export interface Rule {
  readonly meta: {
    readonly type: string
    readonly docs: { readonly description: string }
    readonly schema: ReadonlyArray<unknown>
  }
  create(context: RuleContext): { Program(node: AstNode): void }
}

const message = 'Avoid top-level side effects in page modules'
const defaultAllow = [
  'Schema.*',
  'defineMessageUnion',
  'defineTaggedUnion',
  'definePage',
  'Submodel.defineView',
  'Command.define',
  'Mount.define',
  'Mount.defineStream',
  'createLazy',
  'createKeyedLazy',
  'pipe',
]

function isNode(value: unknown): value is AstNode {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function memberPath(node: AstNode): string | undefined {
  if (node.type === 'TSInstantiationExpression' && isNode(node.expression)) return memberPath(node.expression)
  if (node.type === 'Identifier' && typeof node.name === 'string') return node.name
  if (node.type !== 'MemberExpression') return undefined
  const object = node.object
  const property = node.property
  if (!isNode(object) || !isNode(property) || property.type !== 'Identifier' || typeof property.name !== 'string') return undefined
  const parent = memberPath(object)
  return parent === undefined ? undefined : `${parent}.${property.name}`
}

function walk(node: unknown, visit: (node: AstNode) => void): void {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit)
  } else if (isNode(node)) {
    visit(node)
    if (node.type === 'ArrowFunctionExpression' || node.type === 'FunctionExpression') return
    for (const [key, child] of Object.entries(node)) if (key !== 'parent') walk(child, visit)
  }
}

function isAllowed(path: string | undefined, allow: readonly string[]): boolean {
  if (path === undefined) return false
  return allow.some((entry) =>
    entry === path ||
    (entry.endsWith('.*') && path.startsWith(entry.slice(0, -1))) ||
    (!entry.includes('.') && path.endsWith(`.${entry}`)),
  )
}

export const noTopLevelSideEffectsInPages: Rule = {
  meta: {
    type: 'problem',
    docs: { description: message },
    schema: [{ type: 'object', properties: { allow: { type: 'array', items: { type: 'string' } } }, additionalProperties: false }],
  },
  create(context) {
    return {
      Program(program) {
        if (!context.filename.replaceAll('\\', '/').includes('/src/pages/')) return
        const allow = context.options[0]?.allow ?? defaultAllow
        const body = program.body
        if (!Array.isArray(body)) return
        for (const statement of body) {
          if (!isNode(statement)) continue
          if (statement.type === 'ExpressionStatement') {
            context.report({ node: statement, message })
            continue
          }
          const declaration = statement.type === 'ExportNamedDeclaration' && isNode(statement.declaration)
            ? statement.declaration
            : statement.type === 'ExportDefaultDeclaration' && isNode(statement.declaration)
              ? statement.declaration
              : statement
          if (declaration.type === 'VariableDeclaration') {
            const declarations = declaration.declarations
            if (!Array.isArray(declarations)) continue
            for (const item of declarations) {
              if (!isNode(item) || !isNode(item.init)) continue
              walk(item.init, (node) => {
                if (node.type !== 'CallExpression') return
                const callee = node.callee
                if (!isNode(callee) || !isAllowed(memberPath(callee), allow)) context.report({ node, message })
              })
            }
          } else if (statement.type === 'ExportDefaultDeclaration' && declaration.type !== 'FunctionDeclaration' && declaration.type !== 'ClassDeclaration') {
            walk(declaration, (node) => {
              if (node.type !== 'CallExpression') return
              const callee = node.callee
              if (!isNode(callee) || !isAllowed(memberPath(callee), allow)) context.report({ node, message })
            })
          }
        }
      },
    }
  },
}
