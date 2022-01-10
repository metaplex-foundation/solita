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

// TODO(thlorenz): 1. finish these tests first
// TODO(thlorenz): 2. fix missing imports (yarn test shows them)
// TODO(thlorenz): 4. make CM1 render without crashing
