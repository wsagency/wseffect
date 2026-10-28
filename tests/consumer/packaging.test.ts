import assert from 'node:assert/strict'
import test, { after, before } from 'node:test'
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../..')
const packages = ['app', 'themes', 'foldkit', 'foldkit-ui', 'vite-plugin'] as const
const archives: Record<string, Set<string>> = {}
const archivePaths: Record<string, string> = {}
const notices: Record<string, string> = {}
let packDirectory = ''

before(async () => {
  packDirectory = await mkdtemp(join(tmpdir(), 'wseffect-packaging-'))
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
    assert.match(notice, /not endorsed by/i, `${directory} notice must state non-endorsement`)
    assert.doesNotMatch(notice, /not affiliated with/i, `${directory} notice must not incorrectly disclaim WS Agency affiliation`)
    assert.match(notice, /not endorsed by[^.\n]*WS Agency/i, `${directory} notice must include WS Agency in the non-endorsement statement`)
    const upstream = directory === 'themes' ? /not endorsed by Radix, WorkOS, radix2solid/i : /not endorsed by Foldkit/i
    assert.match(notice, upstream, `${directory} notice must identify applicable upstream rights holders`)
  }
})

test('keepsThirdPartyNotices', async () => {
  for (const directory of packages) {
    const entries = archives[directory]
    const sourceLicense = await readFile(resolve(repoRoot, 'packages', directory, 'LICENSE'))
    const archivedLicense = execFileSync('tar', ['-xOf', archivePaths[directory]!, 'package/LICENSE'])
    assert.deepEqual(archivedLicense, sourceLicense, `${directory} LICENSE must remain unchanged`)
    try {
      const sourceNotices = await readFile(resolve(repoRoot, 'packages', directory, 'THIRD-PARTY-NOTICES.md'))
      assert.ok(entries?.has('THIRD-PARTY-NOTICES.md'), `${directory} archive must include THIRD-PARTY-NOTICES.md when present in source`)
      const archivedNotices = execFileSync('tar', ['-xOf', archivePaths[directory]!, 'package/THIRD-PARTY-NOTICES.md'])
      assert.deepEqual(archivedNotices, sourceNotices, `${directory} THIRD-PARTY-NOTICES.md must remain unchanged`)
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
    }
  }
})
