import test, { Test } from 'tape'
import { renderAccount } from '../src/render-account'
import { IdlAccount } from '../src/types'
import {
  analyzeCode,
  verifyImports,
  verifySyntacticCorrectness,
} from './utils/verify-code'

const DIAGNOSTIC_ON = false

async function checkRenderedAccount(
  t: Test,
  account: IdlAccount,
  imports: string[],
  opts: {
    logImports: boolean
    logCode: boolean
  } = { logImports: DIAGNOSTIC_ON, logCode: DIAGNOSTIC_ON }
) {
  const ts = renderAccount(account)
  verifySyntacticCorrectness(t, ts)

  const analyzed = await analyzeCode(ts)
  if (opts.logCode) {
    console.log(
      `--------- <TypeScript> --------\n${ts}\n--------- </TypeScript> --------`
    )
  }
  verifyImports(t, analyzed, imports, { logImports: opts.logImports })
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

  await checkRenderedAccount(t, account, [
    "import * as beet from '@metaplex-foundation/beet'",
    "import * as web3 from '@solana/web3.js'",
  ])
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
    "import * as beet from '@metaplex-foundation/beet'",
    "import * as beetSolana from '@metaplex-foundation/beet-solana'",
    "import * as web3 from '@solana/web3.js'",
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
    "import * as beet from '@metaplex-foundation/beet'",
    "import * as beetSolana from '@metaplex-foundation/beet-solana'",
    "import * as web3 from '@solana/web3.js'",
  ])
  t.end()
})
