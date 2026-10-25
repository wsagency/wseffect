import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const components = [
  'theme', 'box', 'flex', 'grid', 'text', 'heading', 'card', 'button',
  'text-field', 'dialog', 'dropdown-menu', 'tabs',
]

for (const component of components) {
  const path = resolve(root, 'dist/components', `${component}.js`)
  const source = await readFile(path, 'utf8')
  if (!source.includes("from '@wsagency/wseffect-foldkit/brand'")) {
    throw new Error(`${component}.js does not brand its view result`)
  }
}
