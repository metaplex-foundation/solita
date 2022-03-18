import { PathLike, promises as fs } from 'fs'
import path from 'path'
import { renderAccount } from './render-account'
import { renderErrors } from './render-errors'
import { renderInstruction } from './render-instruction'
import { renderType } from './render-type'
import { strict as assert } from 'assert'
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
import { Paths } from './paths'

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
  private paths: Paths | undefined
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
  accountFilesByType() {
    assert(this.paths != null, 'should have set paths')
    return new Map(
      this.idl.accounts?.map((x) => [
        x.name,
        this.paths!.accountFile(x.name),
      ]) ?? []
    )
  }

  customFilesByType() {
    assert(this.paths != null, 'should have set paths')
    return new Map(
      this.idl.types?.map((x) => [x.name, this.paths!.typeFile(x.name)]) ?? []
    )
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
    assert(this.paths != null, 'should have set paths')

    const programId = this.idl.metadata.address
    const fixableTypes: Set<string> = new Set()
    const accountFiles = this.accountFilesByType()
    const customFiles = this.customFilesByType()

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
        let { code, isFixable } = renderType(
          ty,
          this.paths!.typesDir,
          accountFiles,
          customFiles
        )

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
        this.paths.instructionsDir,
        programId,
        accountFiles,
        customFiles,
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
        this.paths.accountsDir,
        accountFiles,
        customFiles,
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
    this.paths = new Paths(outputDir)
    const { instructions, accounts, types, errors } = this.renderCode()
    const reexports = ['instructions']
    await this.writeInstructions(instructions)

    if (Object.keys(accounts).length !== 0) {
      reexports.push('accounts')
      await this.writeAccounts(accounts)
    }
    if (Object.keys(types).length !== 0) {
      reexports.push('types')
      await this.writeTypes(types)
    }
    if (errors != null) {
      reexports.push('errors')
      await this.writeErrors(errors)
    }

    await this.writeMainIndex(reexports)
  }

  // -----------------
  // Instructions
  // -----------------
  private async writeInstructions(instructions: Record<string, string>) {
    assert(this.paths != null, 'should have set paths')

    await prepareTargetDir(this.paths.instructionsDir)
    logInfo('Writing instructions to directory: %s', this.paths.instructionsDir)
    for (const [name, code] of Object.entries(instructions)) {
      logDebug('Writing instruction: %s', name)
      await fs.writeFile(this.paths.instructionFile(name), code, 'utf8')
    }
    logDebug('Writing index.ts exporting all instructions')
    const indexCode = renderImportIndex(Object.keys(instructions).sort())
    await fs.writeFile(this.paths.instructionFile('index'), indexCode, 'utf8')
  }

  // -----------------
  // Accounts
  // -----------------
  private async writeAccounts(accounts: Record<string, string>) {
    assert(this.paths != null, 'should have set paths')

    await prepareTargetDir(this.paths.accountsDir)
    logInfo('Writing accounts to directory: %s', this.paths.accountsDir)
    for (const [name, code] of Object.entries(accounts)) {
      logDebug('Writing account: %s', name)
      await fs.writeFile(this.paths.accountFile(name), code, 'utf8')
    }
    logDebug('Writing index.ts exporting all accounts')
    const indexCode = renderImportIndex(Object.keys(accounts).sort())
    await fs.writeFile(this.paths.accountFile('index'), indexCode, 'utf8')
  }

  // -----------------
  // Types
  // -----------------
  private async writeTypes(types: Record<string, string>) {
    assert(this.paths != null, 'should have set paths')

    await prepareTargetDir(this.paths.typesDir)
    logInfo('Writing types to directory: %s', this.paths.typesDir)
    for (const [name, code] of Object.entries(types)) {
      logDebug('Writing type: %s', name)
      await fs.writeFile(this.paths.typeFile(name), code, 'utf8')
    }
    logDebug('Writing index.ts exporting all types')
    const reexports = Object.keys(types)
    // NOTE: this allows account types to be referenced via `defined.<AccountName>`, however
    // it would break if we have an account used that way, but no types
    // If that occurs we need to generate the `types/index.ts` just reexporting accounts
    const indexCode = renderImportIndex(reexports.sort())
    await fs.writeFile(this.paths.typeFile('index'), indexCode, 'utf8')
  }

  // -----------------
  // Errors
  // -----------------
  private async writeErrors(errorsCode: string) {
    assert(this.paths != null, 'should have set paths')

    await prepareTargetDir(this.paths.errorsDir)
    logInfo('Writing errors to directory: %s', this.paths.errorsDir)
    logDebug('Writing index.ts containing all errors')
    await fs.writeFile(this.paths.errorFile('index'), errorsCode, 'utf8')
  }

  // -----------------
  // Main Index File
  // -----------------

  async writeMainIndex(reexports: string[]) {
    assert(this.paths != null, 'should have set paths')

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

    await fs.writeFile(path.join(this.paths.root, `index.ts`), code, 'utf8')
  }
}
