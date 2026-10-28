import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { mkdir, mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..')
const packages = ['app', 'themes', 'foldkit', 'foldkit-ui', 'vite-plugin'] as const
const archives: Record<string, Set<string>> = {}
const archivePaths: Record<string, string> = {}
const notices: Record<string, string> = {}
let packDirectory = ''

before(async () => {
  const tempRoot = process.env.TMPDIR ?? join(process.env.HOME ?? '.', '.cache/wseffect-work/release-packages/tmp')
  await mkdir(tempRoot, { recursive: true })
  packDirectory = await mkdtemp(join(tempRoot, 'wseffect-packaging-'))
  for (const directory of packages) {
    execFileSync('pnpm', ['--dir', resolve(repoRoot, 'packages', directory), 'pack', '--pack-destination', packDirectory], { stdio: 'pipe' })
    const filename = (await readdir(packDirectory)).find((file) => file.endsWith('.tgz') && file.includes(`wseffect-${directory}`))
    assert.ok(filename, `pnpm pack did not create an archive for ${directory}`)
    const archivePath = join(packDirectory, filename)
    archivePaths[directory] = archivePath
    const entries = execFileSync('tar', ['-tzf', archivePath], { encoding: 'utf8' })
      .trim()
      .split('\n')
      .map((entry) => entry.replace(/^package\//, ''))
    archives[directory] = new Set(entries)
    if (archives[directory].has('WS-AGENCY-NOTICE.md')) {
      notices[directory] = execFileSync('tar', ['-xOf', archivePath, 'package/WS-AGENCY-NOTICE.md'], { encoding: 'utf8' })
    }
  }
})

after(async () => {
  await rm(packDirectory, { recursive: true, force: true })
})

test('shipsUpstreamForFoldkitUiAndPlugin', () => {
  for (const directory of ['foldkit', 'foldkit-ui', 'vite-plugin']) {
    assert.ok(archives[directory]?.has('UPSTREAM.md'), `${directory} tarball is missing UPSTREAM.md`)
  }
})

test('shipsAgencyNoticeForEveryPackage', () => {
  for (const directory of packages) {
    assert.ok(archives[directory]?.has('WS-AGENCY-NOTICE.md'), `${directory} tarball is missing WS-AGENCY-NOTICE.md`)
  }
})

test('noticeExcludesBrandRightsFromMit', () => {
  for (const directory of packages) {
    const notice = notices[directory] ?? ''
    assert.match(notice, /MIT[^.\n]*(?:code|software)[^.\n]*only/i, `${directory} notice must limit MIT to code`)
    assert.match(notice, /no (?:trademark )?rights?[^.\n]*(?:WS Agency|name|logo)|(?:WS Agency|name|logo)[^.\n]*no (?:trademark )?rights?/i, `${directory} notice must deny WS Agency name and logo rights`)
    assert.match(notice, /unofficial/i, `${directory} notice must identify the project as unofficial`)
    const upstream = directory === 'themes' ? /Radix|WorkOS|radix2solid/i : /Foldkit/i
    assert.match(notice, upstream, `${directory} notice must identify applicable upstream rights holders`)
  }
})

test('keepsThirdPartyNotices', async () => {
  for (const directory of packages) {
    const entries = archives[directory]
    const sourceLicense = await readFile(resolve(repoRoot, 'packages', directory, 'LICENSE'))
    const archivedLicense = execFileSync('tar', ['-xOf', archivePaths[directory], 'package/LICENSE'])
    assert.deepEqual(archivedLicense, sourceLicense, `${directory} LICENSE must remain unchanged`)
    if (entries.has('THIRD-PARTY-NOTICES.md')) {
      const sourceNotices = await readFile(resolve(repoRoot, 'packages', directory, 'THIRD-PARTY-NOTICES.md'))
      const archivedNotices = execFileSync('tar', ['-xOf', archivePaths[directory], 'package/THIRD-PARTY-NOTICES.md'])
      assert.deepEqual(archivedNotices, sourceNotices, `${directory} THIRD-PARTY-NOTICES.md must remain unchanged`)
    }
  }
})
