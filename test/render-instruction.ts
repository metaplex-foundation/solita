import test, { Test } from 'tape'
import { renderInstruction } from '../src/render-instruction'
import { SerdePackage } from '../src/serdes'
import { FORCE_FIXABLE_NEVER } from '../src/type-mapper'
import {
  BEET_PACKAGE,
  BEET_SOLANA_PACKAGE,
  IdlInstruction,
  SOLANA_WEB3_PACKAGE,
} from '../src/types'
import {
  analyzeCode,
  verifyImports,
  verifySyntacticCorrectness,
} from './utils/verify-code'
const PROGRAM_ID = 'testprogram'

const DIAGNOSTIC_ON = false
const INSTRUCTION_FILE_DIR = '/root/app/instructions/'

async function checkRenderedIx(
  t: Test,
  ix: IdlInstruction,
  imports: SerdePackage[],
  opts: {
    logImports?: boolean
    logCode?: boolean
    rxs?: RegExp[]
  } = {}
) {
  const { logImports = DIAGNOSTIC_ON, logCode = DIAGNOSTIC_ON } = opts
  const ts = renderInstruction(
    ix,
    INSTRUCTION_FILE_DIR,
    PROGRAM_ID,
    new Map(),
    new Map(),
    new Map(),
    FORCE_FIXABLE_NEVER
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
      t.match(ts, rx, `TypeScript matches ${rx.toString()}`)
    }
  }
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
  await checkRenderedIx(t, ix, [BEET_PACKAGE, SOLANA_WEB3_PACKAGE])
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
  await checkRenderedIx(t, ix, [BEET_PACKAGE, SOLANA_WEB3_PACKAGE])
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
    BEET_PACKAGE,
    BEET_SOLANA_PACKAGE,
    SOLANA_WEB3_PACKAGE,
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
    BEET_PACKAGE,
    BEET_SOLANA_PACKAGE,
    SOLANA_WEB3_PACKAGE,
  ])
  t.end()
})

test('ix: three accounts, two optional', async (t) => {
  const ix = <IdlInstruction>{
    name: 'choicy',
    accounts: [
      {
        name: 'authority',
        isMut: false,
        isSigner: true,
      },
      {
        name: 'useAuthorityRecord',
        isMut: true,
        isSigner: false,
        desc: 'Use Authority Record PDA If present the program Assumes a delegated use authority',
        optional: true,
      },
      {
        name: 'burner',
        isMut: false,
        isSigner: false,
        desc: 'Program As Signer (Burner)',
        optional: true,
      },
    ],
    args: [],
  }
  await checkRenderedIx(t, ix, [BEET_PACKAGE, SOLANA_WEB3_PACKAGE], {
    rxs: [
      // Ensuring that the pubkeys for optional accounts aren't required
      /authority\: web3\.PublicKey/,
      /useAuthorityRecord\?\: web3\.PublicKey/,
      /burner\?\: web3\.PublicKey/,
      // Ensuring that the accounts are only added if the relevant pubkey is
      // provided
      /if \(useAuthorityRecord != null\)/,
      /if \(burner != null\)/,
      // Additionally verifying that either the first or both optional pubkeys are
      // provided, but not only the second optional pubkey
      /if \(useAuthorityRecord == null\).+throw new Error/,
    ],
  })
  t.end()
})

test('ix: accounts render comments with and without desc', async (t) => {
  const ix = <IdlInstruction>{
    name: 'choicy',
    accounts: [
      {
        name: 'withoutDesc',
        isMut: false,
        isSigner: true,
      },
      {
        name: 'withDesc',
        isMut: true,
        isSigner: false,
        desc: 'Use Authority Record PDA If present the program Assumes a delegated use authority',
      },
    ],
    args: [],
  }
  await checkRenderedIx(t, ix, [BEET_PACKAGE, SOLANA_WEB3_PACKAGE], {
    rxs: [
      /@property .+signer.+ withoutDesc/,
      /@property .+writable.+ withDesc Use Authority Record PDA If present the program Assumes a delegated use authority/,
    ],
  })
})
