import { PathLike, promises as fs } from 'fs'
import path from 'path'
import { renderAccount } from './render-account'
import { renderErrors } from './render-errors'
import { renderInstruction } from './render-instruction'
import { Idl } from './types'
import { logDebug, logInfo, prepareTargetDir } from './utils'

export * from './types'

function renderIndex(modules: string[]) {
  return modules.map((x) => `export * from './${x}';`).join('\n')
}

export class SolanaIdlToApi {
  constructor(private readonly idl: Idl) {}

  renderCode() {
    const instructions: Record<string, string> = {}
    for (const ix of this.idl.instructions) {
      instructions[ix.name] = renderInstruction(ix)
    }

    const accounts: Record<string, string> = {}
    for (const account of this.idl.accounts) {
      accounts[account.name] = renderAccount(account)
    }

    const errors = renderErrors(this.idl.errors)
    return { instructions, accounts, errors }
  }

  async renderAndWriteTo(outputDir: PathLike) {
    const { instructions, accounts, errors } = this.renderCode()
    await this.writeInstructions(outputDir, instructions)
    await this.writeAccounts(outputDir, accounts)
    await this.writeErrors(outputDir, errors)
  }

  // -----------------
  // Instructions
  // -----------------
  private async writeInstructions(
    outputDir: PathLike,
    instructions: Record<string, string>
  ) {
    const instructionsDir = path.join(outputDir.toString(), 'instructions')
    await prepareTargetDir(instructionsDir)
    logInfo('Writing instructions to directory: %s', instructionsDir)
    for (const [name, code] of Object.entries(instructions)) {
      logDebug('Writing instruction: %s', name)
      await fs.writeFile(path.join(instructionsDir, `${name}.ts`), code, 'utf8')
    }
    logDebug('Writing index.ts exporting all instructions')
    const indexCode = renderIndex(Object.keys(instructions).sort())
    await fs.writeFile(
      path.join(instructionsDir, `index.ts`),
      indexCode,
      'utf8'
    )
  }

  // -----------------
  // Accounts
  // -----------------
  private async writeAccounts(
    outputDir: PathLike,
    accounts: Record<string, string>
  ) {
    const accountsDir = path.join(outputDir.toString(), 'accounts')
    await prepareTargetDir(accountsDir)
    logInfo('Writing accounts to directory: %s', accountsDir)
    for (const [name, code] of Object.entries(accounts)) {
      logDebug('Writing account: %s', name)
      await fs.writeFile(path.join(accountsDir, `${name}.ts`), code, 'utf8')
    }
    logDebug('Writing index.ts exporting all accounts')
    const indexCode = renderIndex(Object.keys(accounts).sort())
    await fs.writeFile(path.join(accountsDir, `index.ts`), indexCode, 'utf8')
  }

  // -----------------
  // Errors
  // -----------------
  private async writeErrors(outputDir: PathLike, errorsCode: string) {
    const errorsDir = path.join(outputDir.toString(), 'errors')
    await prepareTargetDir(errorsDir)
    logInfo('Writing errors to directory: %s', errorsDir)
    logDebug('Writing index.ts containing all errors')
    await fs.writeFile(path.join(errorsDir, `index.ts`), errorsCode, 'utf8')
  }
}

const AUCTION_HOUSE_OUTPUT_DIR = path.resolve(
  __dirname,
  '../../mpl/auction-house/js/src/generated'
)
const AUCTION_HOUSE_IDL_PATH = require.resolve(
  '../test/fixtures/auction_house.json'
)

if (module === require.main) {
  async function main() {
    const OUTPUT_DIR = process.env.OUTPUT_DIR
    const outputDir = OUTPUT_DIR
      ? path.resolve(process.cwd(), OUTPUT_DIR)
      : AUCTION_HOUSE_OUTPUT_DIR

    const IDL = process.env.IDL
    const idlPath = IDL
      ? path.resolve(process.cwd(), IDL)
      : AUCTION_HOUSE_IDL_PATH

    const idl = require(idlPath)
    const solanaIdlToApi = new SolanaIdlToApi(idl)
    return solanaIdlToApi.renderAndWriteTo(outputDir)
  }

  main()
    .then(() => process.exit(0))
    .catch((err: any) => {
      console.error(err)
      process.exit(1)
    })
}
