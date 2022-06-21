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
    verify?: boolean
    lineNumbers?: boolean
    rxs?: RegExp[]
    nonrxs?: RegExp[]
  } = {}
) {
  const {
    logImports = DIAGNOSTIC_ON,
    logCode = DIAGNOSTIC_ON,
    verify = true,
    lineNumbers = true,
  } = opts
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
    const renderTs = lineNumbers
      ? ts
          .split('\n')
          .map((x, idx) => `${(idx + 1).toString().padStart(3, ' ')}: ${x}`)
          .join('\n')
      : ts
    console.log(
      `--------- <TypeScript> --------\n${renderTs}\n--------- </TypeScript> --------`
    )
  }
  if (verify) {
    verifySyntacticCorrectness(t, ts)
    const analyzed = await analyzeCode(ts)
    verifyImports(t, analyzed, imports, { logImports })
    if (opts.rxs != null) {
      for (const rx of opts.rxs) {
        t.match(ts, rx, `TypeScript matches ${rx.toString()}`)
      }
    }
    if (opts.nonrxs != null) {
      for (const rx of opts.nonrxs) {
        t.doesNotMatch(ts, rx, `TypeScript does not match: ${rx.toString()}`)
      }
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
  await checkRenderedIx(
    t,
    ix,
    [BEET_PACKAGE, BEET_SOLANA_PACKAGE, SOLANA_WEB3_PACKAGE],
    { logCode: true }
  )
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

// -----------------
// Known Accounts
// -----------------
test('ix: empty args one system program account', async (t) => {
  const ix = {
    name: 'empyArgsWithSystemProgram',
    accounts: [
      {
        name: 'authority',
        isMut: false,
        isSigner: true,
      },
      {
        name: 'systemProgram',
        isMut: false,
        isSigner: false,
      },
    ],
    args: [],
  }
  await checkRenderedIx(t, ix, [BEET_PACKAGE, SOLANA_WEB3_PACKAGE], {
    rxs: [
      /programId\?\: web3\.PublicKey/,
      /programId = new web3\.PublicKey\('testprogram'\)/,
    ],
    nonrxs: [/pubkey\: programId/],
  })
})

test('ix: with args one system program account and programId', async (t) => {
  const ix = {
    name: 'empyArgsWithSystemProgram',
    accounts: [
      {
        name: 'authority',
        isMut: false,
        isSigner: true,
      },
      {
        name: 'systemProgram',
        isMut: false,
        isSigner: false,
      },
      {
        name: 'programId',
        isMut: false,
        isSigner: false,
      },
    ],
    args: [],
  }
  await checkRenderedIx(t, ix, [BEET_PACKAGE, SOLANA_WEB3_PACKAGE], {
    logCode: false,
    rxs: [
      /programId\?\: web3\.PublicKey/,
      /programId = new web3\.PublicKey\('testprogram'\)/,
      /pubkey\: programId/,
    ],
  })
})
