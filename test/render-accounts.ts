import { BEET_PACKAGE } from '@metaplex-foundation/beet'
import test, { Test } from 'tape'
import { renderAccount } from '../src/render-account'
import { SerdePackage } from '../src/serdes'
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

const ACCOUNT_FILE_DIR = '/root/app/accounts/'

async function checkRenderedAccount(
  t: Test,
  account: IdlAccount,
  imports: SerdePackage[],
  opts: {
    logImports?: boolean
    logCode?: boolean
    rxs?: RegExp[]
  } = {}
) {
  const { logImports = DIAGNOSTIC_ON, logCode = DIAGNOSTIC_ON } = opts
  const ts = renderAccount(
    account,
    ACCOUNT_FILE_DIR,
    new Map(),
    new Map(),
    FORCE_FIXABLE_NEVER,
    (_: string) => null,
    true
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
        /someLargeNumber: this.someLargeNumber.toString\(\)/,
      ],
    }
  )
  t.end()
})
