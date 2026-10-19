#!/usr/bin/env node
import { checkPages, writePages } from './index.js'

const args = process.argv.slice(2)
const check = args[0] === '--check'
const appRoot = args[check ? 1 : 0]
if (appRoot === undefined) {
  console.error('usage: wseffect-codegen [--check] <appRoot>')
  process.exitCode = 2
} else {
  const options = { pagesDir: 'src/pages' }
  if (check) {
    const result = await checkPages(appRoot, options)
    if (!result.ok) {
      console.error(result.diff)
      process.exitCode = 1
    }
  } else {
    console.log(await writePages(appRoot, options))
  }
}
