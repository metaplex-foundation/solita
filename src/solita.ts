import { PathLike, promises as fs } from 'fs'
import path from 'path'
import { renderAccount } from './render-account'
import { renderErrors } from './render-errors'
import { renderInstruction } from './render-instruction'
import { Idl } from './types'
import { logDebug, logInfo, logTrace, prepareTargetDir } from './utils'
import { format, Options } from 'prettier'

export * from './types'

function renderIndex(modules: string[]) {
  return modules.map((x) => `export * from './${x}';`).join('\n')
}

const DEFAULT_FORMAT_OPTS: Options = {
  semi: false,
  singleQuote: true,
  trailingComma: 'es5',
  useTabs: false,
  tabWidth: 2,
  arrowParens: 'always',
  printWidth: 80,
  parser: 'typescript',
}

export class Solita {
  private readonly formatCode: boolean
  private readonly formatOpts: Options
  constructor(
    private readonly idl: Idl,
    {
      formatCode = false,
      formatOpts = {},
    }: { formatCode?: boolean; formatOpts?: Options } = {}
  ) {
    this.formatCode = formatCode
    this.formatOpts = { ...DEFAULT_FORMAT_OPTS, ...formatOpts }
  }

  renderCode() {
    const programId = this.idl.metadata.address
    const instructions: Record<string, string> = {}
    for (const ix of this.idl.instructions) {
      logDebug(`Rendering instruction ${ix.name}`)
      logTrace('args: %O', ix.args)
      logTrace('accounts: %O', ix.accounts)
      let code = renderInstruction(ix, programId)
      if (this.formatCode) {
        try {
          code = format(code, this.formatOpts)
        } catch (err) {
          console.error(`Failed to format ${ix.name} instruction`)
          console.error(err)
        }
      }
      instructions[ix.name] = code
    }

    const accounts: Record<string, string> = {}
    for (const account of this.idl.accounts ?? []) {
      logDebug(`Rendering account ${account.name}`)
      logTrace('type: %O', account.type)
      let code = renderAccount(account)
      if (this.formatCode) {
        try {
          code = format(code, this.formatOpts)
        } catch (err) {
          console.error(`Failed to format ${account.name} account`)
          console.error(err)
        }
      }
      accounts[account.name] = code
    }

    logDebug('Rendering %d errors', this.idl.errors?.length ?? 0)
    let errors = renderErrors(this.idl.errors ?? [])
    if (errors != null && this.formatCode) {
      try {
        errors = format(errors, this.formatOpts)
      } catch (err) {
        console.error(`Failed to format errors`)
        console.error(err)
      }
    }

    return { instructions, accounts, errors }
  }

  async renderAndWriteTo(outputDir: PathLike) {
    const { instructions, accounts, errors } = this.renderCode()
    await this.writeInstructions(outputDir, instructions)

    if (Object.keys(accounts).length !== 0) {
      await this.writeAccounts(outputDir, accounts)
    }
    if (errors != null) {
      await this.writeErrors(outputDir, errors)
    }
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
