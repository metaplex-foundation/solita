import test from 'tape'
import { IdlAccount } from '../src/solita'
import { renderAccountProviders } from '../src/render-account-providers'

function accountNamed(accName: string): IdlAccount {
  return {
    name: accName,
    type: {
      kind: 'struct',
      fields: [],
    },
  }
}

function includesAccount(t: test.Test, code: string, accName: string) {
  const lines = code.split('\n')
  const exports = lines.pop()!
  const imports = lines.join('\n')
  const importNeedle = `import { ${accName}`
  t.ok(imports.includes(importNeedle), `imports ${accName}`)
  t.ok(exports.includes(accName), `exports ${accName}`)
}

test('accountProviders: for zero accounts', (t) => {
  const code = renderAccountProviders([])
  t.equal(code.length, 0, 'renders no code')
  t.end()
})

test('accountProviders: for one account', (t) => {
  const code = renderAccountProviders([accountNamed('collectionAccount')])
  includesAccount(t, code, 'CollectionAccount')
  t.end()
})

test('accountProviders: for three accounts', (t) => {
  const code = renderAccountProviders([
    accountNamed('collectionAccount'),
    accountNamed('data'),
    accountNamed('solitaMaker'),
  ])
  includesAccount(t, code, 'CollectionAccount')
  includesAccount(t, code, 'Data')
  includesAccount(t, code, 'SolitaMaker')
  t.end()
})
