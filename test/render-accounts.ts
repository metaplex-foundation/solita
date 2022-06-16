import { BEET_PACKAGE } from '@metaplex-foundation/beet'
import test, { Test } from 'tape'
import { renderAccount } from '../src/render-account'
import { SerdePackage } from '../src/serdes'
import { CustomSerializers } from '../src/serializers'
import { FORCE_FIXABLE_NEVER } from '../src/type-mapper'
import {
  BEET_SOLANA_PACKAGE,
  IdlAccount,
  SOLANA_WEB3_PACKAGE,
} from '../src/types'
import {
  analyzeCode,
  verifyImports,
  verifySyntacticCorrectness,
} from './utils/verify-code'

const DIAGNOSTIC_ON = false

const ROOT_DIR = '/tmp/root'
const ACCOUNT_FILE_DIR = `${ROOT_DIR}/src/generated/accounts/account-uno.ts`

async function checkRenderedAccount(
  t: Test,
  account: IdlAccount,
  imports: SerdePackage[],
  opts: {
    logImports?: boolean
    logCode?: boolean
    rxs?: RegExp[]
    nonrxs?: RegExp[]
    serializers?: CustomSerializers
    hasImplicitDiscriminator?: boolean
  } = {}
) {
  const {
    logImports = DIAGNOSTIC_ON,
    logCode = DIAGNOSTIC_ON,
    serializers = CustomSerializers.empty,
  } = opts
  const ts = renderAccount(
    account,
    ACCOUNT_FILE_DIR,
    new Map(),
    new Map(),
    new Map(),
    serializers,
    FORCE_FIXABLE_NEVER,
    (_: string) => null,
    opts.hasImplicitDiscriminator ?? true
  )

  if (logCode) {
    console.log(
      `--------- <TypeScript> --------\n${ts}\n--------- </TypeScript> --------`
    )
  }

  verifySyntacticCorrectness(t, ts)

  const analyzed = await analyzeCode(ts)
  verifyImports(t, analyzed, imports, { logImports })
  if (opts.rxs != null) {
    for (const rx of opts.rxs) {
      t.match(ts, rx, `TypeScript matches: ${rx.toString()}`)
    }
  }
  if (opts.nonrxs != null) {
    for (const rx of opts.nonrxs) {
      t.doesNotMatch(ts, rx, `TypeScript does not match: ${rx.toString()}`)
    }
  }
}

// TODO(thlorenz): Still renders args and causes compile issues
// An accounts without a field is very uncommon and thus this can be fixed later
test.skip('accounts: no field', async (t) => {
  const account = <IdlAccount>{
    name: 'AuctionHouse',
    type: {
      kind: 'struct',
      fields: [],
    },
  }

  await checkRenderedAccount(t, account, [BEET_PACKAGE, SOLANA_WEB3_PACKAGE])
  t.end()
})

test('accounts: one field', async (t) => {
  const account = <IdlAccount>{
    name: 'AuctionHouse',
    type: {
      kind: 'struct',
      fields: [
        {
          name: 'auctionHouseFeeAccount',
          type: 'publicKey',
        },
      ],
    },
  }

  await checkRenderedAccount(t, account, [
    BEET_PACKAGE,
    BEET_SOLANA_PACKAGE,
    SOLANA_WEB3_PACKAGE,
  ])
  t.end()
})

test('accounts: four fields', async (t) => {
  const account = <IdlAccount>{
    name: 'AuctionHouse',
    type: {
      kind: 'struct',
      fields: [
        {
          name: 'auctionHouseFeeAccount',
          type: 'publicKey',
        },
        {
          name: 'feePayerBump',
          type: 'u8',
        },
        {
          name: 'sellerFeeBasisPoints',
          type: 'u16',
        },
        {
          name: 'requiresSignOff',
          type: 'bool',
        },
      ],
    },
  }

  await checkRenderedAccount(t, account, [
    BEET_PACKAGE,
    BEET_SOLANA_PACKAGE,
    SOLANA_WEB3_PACKAGE,
  ])
  t.end()
})

test('accounts: pretty function for different types', async (t) => {
  const account = <IdlAccount>{
    name: 'AuctionHouse',
    type: {
      kind: 'struct',
      fields: [
        {
          name: 'auctionHouseFeeAccount',
          type: 'publicKey',
        },
        {
          name: 'feePayerBump',
          type: 'u8',
        },
        {
          name: 'someLargeNumber',
          type: 'u64',
        },
      ],
    },
  }

  await checkRenderedAccount(
    t,
    account,
    [BEET_PACKAGE, BEET_SOLANA_PACKAGE, SOLANA_WEB3_PACKAGE],
    {
      rxs: [
        /auctionHouseFeeAccount: this.auctionHouseFeeAccount.toBase58\(\)/,
        /const x = <{ toNumber: \(\) => number }>this.someLargeNumber/,
      ],
    }
  )
  t.end()
})

test('accounts: one field with custom serializers', async (t) => {
  const account = <IdlAccount>{
    name: 'AuctionHouse',
    type: {
      kind: 'struct',
      fields: [
        {
          name: 'auctionHouseFeeAccount',
          type: 'publicKey',
        },
      ],
    },
  }

  const serializers = CustomSerializers.create(
    ROOT_DIR,
    new Map([['AuctionHouse', 'src/custom/serializer.ts']])
  )

  await checkRenderedAccount(
    t,
    account,
    [BEET_PACKAGE, BEET_SOLANA_PACKAGE, SOLANA_WEB3_PACKAGE],
    {
      serializers,
      rxs: [
        /import \* as customSerializer from '(\.\.\/){3}custom\/serializer'/i,
        /const resolvedSerialize = typeof serializer\.serialize === 'function'/,
        /\? serializer\.serialize\.bind\(serializer\)/,
        /\: auctionHouseBeet\.serialize\.bind\(auctionHouseBeet\)/i,
      ],
    }
  )
  t.end()
})

// -----------------
// Padding
// -----------------
test('accounts: one account with two fields, one has padding attr', async (t) => {
  const account = <IdlAccount>{
    name: 'StructAccountWithPadding',
    type: {
      kind: 'struct',
      fields: [
        {
          name: 'count',
          type: 'u8',
        },
        {
          name: 'padding',
          type: {
            array: ['u8', 3],
          },
          attrs: ['padding'],
        },
      ],
    },
  }

  await checkRenderedAccount(t, account, [BEET_PACKAGE, SOLANA_WEB3_PACKAGE], {
    rxs: [
      /readonly count\: number/,
      /count\: this\.count/,
      /args\.count/,
      /'padding', beet\.uniformFixedSizeArray\(beet\.u8, 3\)/,
      /padding\: Array\(3\).fill\(0\),/,
    ],
    nonrxs: [/readonly padding/, /padding\: this\.padding/, /args\.padding/],
  })
  t.end()
})

test('accounts: one account with two fields without implicit discriminator, one has padding attr', async (t) => {
  const account = <IdlAccount>{
    name: 'StructAccountWithPadding',
    type: {
      kind: 'struct',
      fields: [
        {
          name: 'count',
          type: 'u8',
        },
        {
          name: 'padding',
          type: {
            array: ['u8', 3],
          },
          attrs: ['padding'],
        },
      ],
    },
  }

  await checkRenderedAccount(t, account, [BEET_PACKAGE, SOLANA_WEB3_PACKAGE], {
    rxs: [
      /readonly count\: number/,
      /args\.count/,
      /count\: this\.count/,
      /'padding', beet\.uniformFixedSizeArray\(beet\.u8, 3\)/,
      /padding\: Array\(3\).fill\(0\),/,
    ],
    nonrxs: [/readonly padding/, /padding\: this\.padding/, /args\.padding/],
    hasImplicitDiscriminator: false,
  })
  t.end()
})

test('accounts: one account with three fields, middle one has padding attr', async (t) => {
  const account = <IdlAccount>{
    name: 'StructAccountWithPadding',
    type: {
      kind: 'struct',
      fields: [
        {
          name: 'count',
          type: 'u8',
        },
        {
          name: 'padding',
          type: {
            array: ['u8', 5],
          },
          attrs: ['padding'],
        },
        {
          name: 'largerCount',
          type: 'u64',
        },
      ],
    },
  }

  await checkRenderedAccount(t, account, [BEET_PACKAGE, SOLANA_WEB3_PACKAGE], {
    rxs: [
      /readonly count\: number/,
      /readonly largerCount\: beet.bignum/,
      /args\.count/,
      /args\.largerCount/,
      /count\: this\.count/,
      /largerCount\: /,
      /'padding', beet\.uniformFixedSizeArray\(beet\.u8, 5\)/,
      /padding\: Array\(5\).fill\(0\),/,
    ],
    nonrxs: [/readonly padding/, /padding\: this\.padding/, /args\.padding/],
  })
  t.end()
})

test('accounts: one account with three fields, middle one has padding attr without implicitDiscriminator', async (t) => {
  const account = <IdlAccount>{
    name: 'StructAccountWithPadding',
    type: {
      kind: 'struct',
      fields: [
        {
          name: 'count',
          type: 'u8',
        },
        {
          name: 'padding',
          type: {
            array: ['u8', 5],
          },
          attrs: ['padding'],
        },
        {
          name: 'largerCount',
          type: 'u64',
        },
      ],
    },
  }

  await checkRenderedAccount(t, account, [BEET_PACKAGE, SOLANA_WEB3_PACKAGE], {
    logCode: true,
    rxs: [
      /readonly count\: number/,
      /readonly largerCount\: beet.bignum/,
      /args\.count/,
      /args\.largerCount/,
      /count\: this\.count/,
      /largerCount\: /,
      /'padding', beet\.uniformFixedSizeArray\(beet\.u8, 5\)/,
      /padding\: Array\(5\).fill\(0\),/,
    ],
    nonrxs: [/readonly padding/, /padding\: this\.padding/, /args\.padding/],
    hasImplicitDiscriminator: false,
  })
  t.end()
})
