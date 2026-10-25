import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { brandDistDirectory } from '@wsagency/wseffect-vite-plugin'

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
brandDistDirectory(packageRoot, '@wsagency/wseffect-app')
