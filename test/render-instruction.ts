import test, { Test } from 'tape'
import { renderInstruction } from '../src/render-instruction'
import { IdlInstruction } from '../src/types'
import {
  analyzeCode,
  verifyImports,
  verifySyntacticCorrectness,
} from './utils/verify-code'
const PROGRAM_ID = 'testprogram'

const DIAGNOSTIC_ON = false

async function checkRenderedIx(
  t: Test,
  ix: IdlInstruction,
  imports: string[],
  opts: {
    logImports: boolean
    logCode: boolean
  } = { logImports: DIAGNOSTIC_ON, logCode: DIAGNOSTIC_ON }
) {
  const ts = renderInstruction(ix, PROGRAM_ID)
  verifySyntacticCorrectness(t, ts)

  const analyzed = await analyzeCode(ts)
  if (opts.logCode) {
    console.log(
      `--------- <TypeScript> --------\n${ts}\n--------- </TypeScript> --------`
    )
  }
  verifyImports(t, analyzed, imports, { logImports: opts.logImports })
}

test('ix: empty args', async (t) => {
  const ix = {
    name: 'empyArgs',
    accounts: [
      {
        name: 'authority',
        isMut: false,
        isSigner: true,
      },
    ],
    args: [],
  }
  await checkRenderedIx(t, ix, [
    'import * as beet from "@metaplex-foundation/beet"',
    'import * as web3 from "@solana/web3.js"',
  ])
  t.end()
})

// TODO(thlorenz): This still requires an accounts arg and destructures nothing from it
// However having no accounts is very uncommon and thus this can be fixed later
test.skip('ix: empty args and empty accounts', async (t) => {
  const ix = {
    name: 'empyArgs',
    accounts: [],
    args: [],
  }
  await checkRenderedIx(t, ix, [])
  t.end()
})

test('ix: one arg', async (t) => {
  const ix = <IdlInstruction>{
    name: 'oneArg',
    accounts: [
      {
        name: 'authority',
        isMut: false,
        isSigner: true,
      },
    ],
    args: [
      {
        name: 'amount',
        type: 'u64',
      },
    ],
  }
  await checkRenderedIx(t, ix, [
    'import * as beet from "@metaplex-foundation/beet"',
    'import * as web3 from "@solana/web3.js"',
  ])
  t.end()
})

test('ix: two args', async (t) => {
  const ix = <IdlInstruction>{
    name: 'oneArg',
    accounts: [
      {
        name: 'authority',
        isMut: false,
        isSigner: true,
      },
    ],
    args: [
      {
        name: 'amount',
        type: 'u64',
      },
      {
        name: 'authority',
        type: 'publicKey',
      },
    ],
  }
  await checkRenderedIx(t, ix, [
    'import * as beet from "@metaplex-foundation/beet"',
    'import * as beetSolana from "@metaplex-foundation/beet-solana"',
    'import * as web3 from "@solana/web3.js"',
  ])
  t.end()
})

test('ix: two accounts and two args', async (t) => {
  const ix = <IdlInstruction>{
    name: 'oneArg',
    accounts: [
      {
        name: 'authority',
        isMut: false,
        isSigner: true,
      },
      {
        name: 'feeWithdrawalDestination',
        isMut: true,
        isSigner: false,
      },
    ],
    args: [
      {
        name: 'amount',
        type: 'u64',
      },
      {
        name: 'authority',
        type: 'publicKey',
      },
    ],
  }
  await checkRenderedIx(t, ix, [
    'import * as beet from "@metaplex-foundation/beet"',
    'import * as beetSolana from "@metaplex-foundation/beet-solana"',
    'import * as web3 from "@solana/web3.js"',
  ])
  t.end()
})
