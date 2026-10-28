import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8')
const license = read('LICENSE')
const readme = read('README.md')
const contributing = read('CONTRIBUTING.md')

const mitText = (copyright: string) => `MIT License\n\n${copyright}\n\nPermission is hereby granted, free of charge, to any person obtaining a copy\nof this software and associated documentation files (the "Software"), to deal\nin the Software without restriction, including without limitation the rights\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\ncopies of the Software, and to permit persons to whom the Software is\nfurnished to do so, subject to the following conditions:\n\nThe above copyright notice and this permission notice shall be included in all\ncopies or substantial portions of the Software.\n\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE\nSOFTWARE.`

test('root license contains project and retained upstream MIT notices in order', () => {
  assert.equal(license.split('\n', 1)[0], 'MIT License')
  const notices = [
    mitText('Copyright (c) 2026 wseffect contributors'),
    mitText('Copyright (c) 2023 WorkOS'),
    mitText('Copyright (c) 2021 Radix'),
    mitText('Copyright (c) 2026 Radix2Solid contributors'),
  ]
  let previous = -1
  for (const notice of notices) {
    const at = license.indexOf(notice)
    assert.ok(at > previous, `missing or out-of-order MIT notice: ${notice.split('\n')[2]}`)
    previous = at
  }
  assert.match(license.replace(/\s+/g, ' '), /wseffect adapts and reuses upstream work under its original licenses[\s\S]*?not affiliated with or endorsed by Foldkit, WorkOS or Radix/)
  assert.equal(license.match(/^----$/gm)?.length, 4)
})

test('README states project independence, package scope, and WS Agency attribution', () => {
  assert.match(readme, /unofficial[\s\S]*not endorsed[\s\S]*trademark rights/i)
  assert.match(readme, /@wsagency\/wseffect-app/)
  assert.match(readme, /@wsagency\/wseffect-themes/)
  assert.match(readme, /@wsagency\/wseffect-foldkit/)
  assert.match(readme, /@wsagency\/wseffect-foldkit-ui/)
  assert.match(readme, /@wsagency\/wseffect-vite-plugin/)
  assert.match(readme, /## Created for WS Agency/)
  assert.match(readme, /<picture>[\s\S]*https:\/\/ws\.agency\/brand\/ws-vertical-white\.svg[\s\S]*https:\/\/ws\.agency\/brand\/ws-vertical-color\.svg[\s\S]*width="160"[\s\S]*<\/picture>/)
  assert.ok(readme.includes('wseffect was created by [Kristijan Lukačin](https://github.com/klukacin) (@klukacin) for [WS Agency](https://ws.agency), the firm behind this project. We love open source, enterprise development and AI. Have a project in mind? [Let’s build it together](https://ws.agency/contact).'))
  assert.ok(readme.includes('The WS Agency name and logos are excluded from this project’s MIT license'))
  assert.match(readme, /https:\/\/design\.ws\.agency\/docs\/usage-and-licenses\.md/)
})

test('README documents the vendored Foldkit ownership without an external peer workaround', () => {
  assert.match(readme, /Vendored Foldkit packages[\s\S]*exact Effect 4\.0\.7 pins/)
  assert.doesNotMatch(readme, /<!-- up8:start -->|peerDependencyRules|PR #1699/)
})

test('README has the LIC-3 attribution and required sections in order', () => {
  const headings = ['## Contributing', '## Local development', '## Distribution and gates', '## License']
  let previous = readme.indexOf('## Created for WS Agency')
  for (const heading of headings) {
    const at = readme.indexOf(heading)
    assert.ok(at > previous, `missing or out-of-order heading: ${heading}`)
    previous = at
  }
})

test('CONTRIBUTING documents vendored maintenance, optional upstream PRs, performance, and commit rules', () => {
  assert.match(contributing, /## Vendored Foldkit maintenance/)
  assert.match(contributing, /Upstream PRs are optional[\s\S]*generally useful[\s\S]*fits Foldkit's philosophy/)
  assert.match(contributing, /--workers=4/)
  assert.match(contributing, /NODE_OPTIONS=--max-old-space-size=8192/)
  assert.match(contributing, /## Dependency and size changes/)
  assert.match(contributing, /upstream size proposals are optional[\s\S]*neutral for correctness and speed[\s\S]*targeted tests/i)
  assert.match(contributing, /## Performance rules/)
  for (const rule of ['PERF-1', 'PERF-2', 'PERF-3', 'PERF-4', 'PERF-5', 'PERF-6', 'TH-15']) {
    assert.ok(contributing.includes(rule), `missing ${rule}`)
  }
  assert.match(contributing, /## Commits[\s\S]*no AI co-author trailers/i)
})
