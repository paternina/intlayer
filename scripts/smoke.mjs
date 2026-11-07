// Smoke test for the BUILT artifact (run after `npm run build`). Plain Node, no test runner,
// so it also works on the oldest supported Node version.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const require = createRequire(import.meta.url)
const esm = await import('../dist/index.js')
const cjs = require('../dist/index.cjs')

const iife = {}
vm.runInNewContext(`${readFileSync(new URL('../dist/index.global.js', import.meta.url), 'utf8')}\nthis.out = Intlayer`, iife)

for (const [name, mod] of [['esm', esm], ['cjs', cjs], ['iife', iife.out]]) {
  for (const fn of ['createI18n', 'validateMessages', 'assertValidMessages', 'isRTL']) {
    assert.equal(typeof mod[fn], 'function', `${name}: missing export ${fn}`)
  }

  const i18n = mod.createI18n({
    locale: 'en',
    messages: { en: { hi: 'Hello {name}', n: '{c, plural, one {# item} other {# items}}' } }
  })
  assert.equal(i18n.t('hi', { name: 'Ana' }), 'Hello Ana', name)
  assert.equal(i18n.t('n', { c: 1500 }), '1,500 items', name)
  assert.equal(mod.validateMessages({ a: '{c, plural, one {x}}' }).valid, false, name)
}

console.log('dist smoke test passed (esm, cjs, iife) on Node', process.version)
