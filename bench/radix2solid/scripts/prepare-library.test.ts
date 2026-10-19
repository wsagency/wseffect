import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, utimesSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import test from 'node:test'
import { checkoutPinnedSource, contentSha256 } from './prepare-library.ts'

function pack(root: string, label: string, contents: string, timestamp: string): string {
  const directory = join(root, label)
  const packageDirectory = join(directory, 'package')
  mkdirSync(packageDirectory, { recursive: true })
  const source = join(packageDirectory, 'index.js')
  writeFileSync(source, contents)
  const date = new Date(timestamp)
  utimesSync(source, date, date)
  utimesSync(packageDirectory, date, date)
  const archive = join(root, `${label}.tgz`)
  execFileSync('tar', ['-czf', archive, '-C', directory, 'package'])
  return archive
}

test('contentSha256 ignores tar entry modification times', () => {
  const root = mkdtempSync(join(tmpdir(), 'radix2solid-content-hash-'))
  try {
    const first = pack(root, 'first', 'export const answer = 42\n', '2001-01-01T00:00:00.000Z')
    const second = pack(root, 'second', 'export const answer = 42\n', '2025-01-01T00:00:00.000Z')
    assert.notDeepEqual(readFileSync(first), readFileSync(second))
    assert.equal(contentSha256(first), contentSha256(second))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})

test('contentSha256 changes when unpacked file contents change', () => {
  const root = mkdtempSync(join(tmpdir(), 'radix2solid-content-hash-'))
  try {
    const first = pack(root, 'first', 'export const answer = 42\n', '2001-01-01T00:00:00.000Z')
    const changed = pack(root, 'changed', 'export const answer = 43\n', '2001-01-01T00:00:00.000Z')
    assert.notEqual(contentSha256(first), contentSha256(changed))
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
test('pinned source checkout reports a commit that is missing from an injectable local remote', () => {
  const root = mkdtempSync(join(tmpdir(), 'radix2solid-missing-pin-'))
  const source = join(root, 'source')
  const remote = join(root, 'remote.git')
  const bench = join(root, 'workspace', 'bench', 'radix2solid')
  try {
    mkdirSync(source, { recursive: true })
    mkdirSync(bench, { recursive: true })
    execFileSync('git', ['init', source], { stdio: 'pipe' })
    execFileSync('git', ['-C', source, 'config', 'user.name', 'fixture'])
    execFileSync('git', ['-C', source, 'config', 'user.email', 'fixture@example.invalid'])
    writeFileSync(join(source, 'tracked.txt'), 'fixture\n')
    execFileSync('git', ['-C', source, 'add', 'tracked.txt'])
    execFileSync('git', ['-C', source, 'commit', '-m', 'fixture'])
    execFileSync('git', ['init', '--bare', remote], { stdio: 'pipe' })
    execFileSync('git', ['-C', source, 'remote', 'add', 'origin', remote])
    execFileSync('git', ['-C', source, 'push', 'origin', 'HEAD'], { stdio: 'pipe' })

    assert.throws(
      () => checkoutPinnedSource(bench, true, { repository: remote, commit: '0'.repeat(40) }),
      /pinned revision .* is not fetchable from/,
    )
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
