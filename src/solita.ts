import { PathLike, promises as fs } from 'fs'
import path from 'path'
import { renderAccount } from './render-account'
import { renderErrors } from './render-errors'
import { renderInstruction } from './render-instruction'
import { renderType } from './render-type'
import {
  Idl,
  IdlType,
  isIdlDefinedType,
  isIdlTypeDefined,
  isIdlTypeEnum,
  isShankIdl,
  SOLANA_WEB3_PACKAGE,
} from './types'
import {
  logDebug,
  logInfo,
  logTrace,
  prepareTargetDir,
  prependGeneratedWarning,
} from './utils'
import { format, Options } from 'prettier'

export * from './types'

function renderImportIndex(modules: string[]) {
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
  private readonly accountsHaveImplicitDiscriminator: boolean
  private readonly prependGeneratedWarning: boolean
  constructor(
    private readonly idl: Idl,
    {
      formatCode = false,
      formatOpts = {},
      prependGeneratedWarning = true,
    }: {
      formatCode?: boolean
      formatOpts?: Options
      prependGeneratedWarning?: boolean
    } = {}
  ) {
    this.formatCode = formatCode
    this.formatOpts = { ...DEFAULT_FORMAT_OPTS, ...formatOpts }
    this.prependGeneratedWarning = prependGeneratedWarning
    this.accountsHaveImplicitDiscriminator = !isShankIdl(idl)
  }

  // -----------------
  // Extract
  // -----------------
  accountTypes() {
    return new Set(this.idl.accounts?.map((x) => x.name) ?? [])
  }

  customTypes() {
    return new Set(this.idl.types?.map((x) => x.name) ?? [])
  }

  resolveFieldType = (typeName: string) => {
    for (const acc of this.idl.accounts ?? []) {
      if (acc.name === typeName) return acc.type
    }
    for (const def of this.idl.types ?? []) {
      if (def.name === typeName) return def.type
    }
    return null
  }
  // -----------------
  // Render
  // -----------------
  renderCode() {
    const programId = this.idl.metadata.address
    const fixableTypes: Set<string> = new Set()
    const accountTypes = this.accountTypes()
    const customTypes = this.customTypes()

    function forceFixable(ty: IdlType) {
      if (isIdlTypeDefined(ty) && fixableTypes.has(ty.defined)) {
        return true
      }
      return false
    }

    // NOTE: we render types first in order to know which ones are 'fixable' by
    // the time we render accounts and instructions

    // -----------------
    // Types
    // -----------------
    const types: Record<string, string> = {}
    logDebug('Rendering %d types', this.idl.types?.length ?? 0)
    if (this.idl.types != null) {
      for (const ty of this.idl.types) {
        logDebug(`Rendering type ${ty.name}`)
        logTrace('kind: %s', ty.type.kind)
        if (isIdlDefinedType(ty.type)) {
          logTrace('fields: %O', ty.type.fields)
        } else {
          if (isIdlTypeEnum(ty.type)) {
            logTrace('variants: %O', ty.type.variants)
          }
        }
        let { code, isFixable } = renderType(ty, accountTypes, customTypes)

        if (isFixable) {
          fixableTypes.add(ty.name)
        }
        if (this.prependGeneratedWarning) {
          code = prependGeneratedWarning(code)
        }
        if (this.formatCode) {
          try {
            code = format(code, this.formatOpts)
          } catch (err) {
            console.error(`Failed to format ${ty.name} instruction`)
            console.error(err)
          }
        }
        types[ty.name] = code
      }
    }

    // -----------------
    // Instructions
    // -----------------
    const instructions: Record<string, string> = {}
    for (const ix of this.idl.instructions) {
      logDebug(`Rendering instruction ${ix.name}`)
      logTrace('args: %O', ix.args)
      logTrace('accounts: %O', ix.accounts)
      let code = renderInstruction(
        ix,
        programId,
        accountTypes,
        customTypes,
        forceFixable
      )
      if (this.prependGeneratedWarning) {
        code = prependGeneratedWarning(code)
      }
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

    // -----------------
    // Accounts
    // -----------------
    const accounts: Record<string, string> = {}
    for (const account of this.idl.accounts ?? []) {
      logDebug(`Rendering account ${account.name}`)
      logTrace('type: %O', account.type)
      let code = renderAccount(
        account,
        accountTypes,
        customTypes,
        forceFixable,
        this.resolveFieldType,
        this.accountsHaveImplicitDiscriminator
      )
      if (this.prependGeneratedWarning) {
        code = prependGeneratedWarning(code)
      }
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

    // -----------------
    // Errors
    // -----------------
    logDebug('Rendering %d errors', this.idl.errors?.length ?? 0)
    let errors = renderErrors(this.idl.errors ?? [])

    if (errors != null && this.prependGeneratedWarning) {
      errors = prependGeneratedWarning(errors)
    }
    if (errors != null && this.formatCode) {
      try {
        errors = format(errors, this.formatOpts)
      } catch (err) {
        console.error(`Failed to format errors`)
        console.error(err)
      }
    }

    return { instructions, accounts, types, errors }
  }

  async renderAndWriteTo(outputDir: PathLike) {
    const { instructions, accounts, types, errors } = this.renderCode()
    const reexports = ['instructions']
    await this.writeInstructions(outputDir, instructions)

    if (Object.keys(accounts).length !== 0) {
      reexports.push('accounts')
      await this.writeAccounts(outputDir, accounts)
    }
    if (Object.keys(types).length !== 0) {
      reexports.push('types')
      await this.writeTypes(outputDir, types)
    }
    if (errors != null) {
      reexports.push('errors')
      await this.writeErrors(outputDir, errors)
    }

    await this.writeMainIndex(outputDir, reexports)
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
    const indexCode = renderImportIndex(Object.keys(instructions).sort())
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
    const indexCode = renderImportIndex(Object.keys(accounts).sort())
    await fs.writeFile(path.join(accountsDir, `index.ts`), indexCode, 'utf8')
  }

  // -----------------
  // Types
  // -----------------
  private async writeTypes(outputDir: PathLike, types: Record<string, string>) {
    const typesDir = path.join(outputDir.toString(), 'types')
    await prepareTargetDir(typesDir)
    logInfo('Writing types to directory: %s', typesDir)
    for (const [name, code] of Object.entries(types)) {
      logDebug('Writing type: %s', name)
      await fs.writeFile(path.join(typesDir, `${name}.ts`), code, 'utf8')
    }
    logDebug('Writing index.ts exporting all types')
    const reexports = Object.keys(types)
    // NOTE: this allows account types to be referenced via `defined.<AccountName>`, however
    // it would break if we have an account used that way, but no types
    // If that occurs we need to generate the `types/index.ts` just reexporting accounts
    const indexCode = renderImportIndex(reexports.sort())
    await fs.writeFile(path.join(typesDir, `index.ts`), indexCode, 'utf8')
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

  // -----------------
  // Main Index File
  // -----------------

  async writeMainIndex(outputDir: PathLike, reexports: string[]) {
    const programAddress = this.idl.metadata.address
    const reexportCode = renderImportIndex(reexports.sort())
    const imports = `import { PublicKey } from '${SOLANA_WEB3_PACKAGE}'`
    const programIdConsts = `
/**
 * Program address
 *
 * @category constants
 * @category generated
 */
export const PROGRAM_ADDRESS = '${programAddress}'

/**
 * Program publick key
 *
 * @category constants
 * @category generated
 */
export const PROGRAM_ID = new PublicKey(PROGRAM_ADDRESS)
`
    let code = `
${imports}
${reexportCode}
${programIdConsts}
`.trim()

    if (this.formatCode) {
      try {
        code = format(code, this.formatOpts)
      } catch (err) {
        console.error(`Failed to format mainIndex`)
        console.error(err)
      }
    }

    await fs.writeFile(
      path.join(outputDir.toString(), `index.ts`),
      code,
      'utf8'
    )
  }
}
