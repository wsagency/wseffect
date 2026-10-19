import { spawnSync } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export interface OxlintDiagnostic {
  readonly file: string
  readonly line: number
  readonly ruleId: string | null
}

export function runOxlint(fixtureDir: string, rule: string): OxlintDiagnostic[] {
  const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
  const pluginPath = resolve(packageRoot, 'dist/oxlint-plugin/index.js')
  const tempDir = mkdtempSync(`${tmpdir()}/wseffect-oxlint-`)
  const configPath = resolve(tempDir, 'oxlint.json')
  writeFileSync(configPath, JSON.stringify({
    jsPlugins: [{ name: 'wseffect', specifier: pluginPath }],
    rules: { [rule]: 'error' },
  }))
  try {
    const run = spawnSync('pnpm', ['exec', 'oxlint', '-c', configPath, fixtureDir, '--format', 'json'], {
      cwd: packageRoot,
      encoding: 'utf8',
    })
    let result
    try {
      result = JSON.parse(run.stdout) as { diagnostics?: Array<{ filename?: string; code: string; labels: Array<{ span: { line: number } }> }> }
    } catch {
      throw new Error(run.stderr || run.stdout || `oxlint exited with status ${run.status}`)
    }
    return (result.diagnostics ?? []).map((diagnostic) => ({
      file: diagnostic.filename ?? '',
      line: diagnostic.labels[0]?.span.line ?? 0,
      ruleId: diagnostic.code.replace(/^([^(]+)\(([^)]+)\)$/, '$1/$2'),
    }))
  } finally {
    rmSync(tempDir, { recursive: true, force: true })
  }
}
