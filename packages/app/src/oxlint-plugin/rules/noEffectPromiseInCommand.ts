export interface AstNode {
  readonly type?: string
  readonly [key: string]: unknown
}

export interface RuleContext {
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

const message = 'Effect.promise in a Command module turns rejection into a defect; use Effect.tryPromise and map failure to a Message (ERR-1)'

function isMemberCall(node: AstNode, objectName: string, propertyName: string): boolean {
  if (node.type !== 'CallExpression') return false
  const callee = node.callee as AstNode | undefined
  if (callee?.type !== 'MemberExpression') return false
  const object = callee.object as AstNode | undefined
  const property = callee.property as AstNode | undefined
  return object?.type === 'Identifier' && object.name === objectName &&
    property?.type === 'Identifier' && property.name === propertyName
}

function walk(node: unknown, visit: (node: AstNode) => void): void {
  if (Array.isArray(node)) {
    for (const child of node) walk(child, visit)
  } else if (node !== null && typeof node === 'object') {
    const current = node as AstNode
    visit(current)
    for (const [key, child] of Object.entries(current)) {
      if (key !== 'parent') walk(child, visit)
    }
  }
}

export const noEffectPromiseInCommand: Rule = {
  meta: {
    type: 'problem',
    docs: { description: message },
    schema: [],
  },
  create(context) {
    return {
      Program(program) {
        let containsCommand = false
        const promises: AstNode[] = []
        walk(program, (node) => {
          if (isMemberCall(node, 'Command', 'define')) containsCommand = true
          if (isMemberCall(node, 'Effect', 'promise')) promises.push(node)
        })
        if (containsCommand) {
          for (const promise of promises) context.report({ node: promise, message })
        }
      },
    }
  },
}
