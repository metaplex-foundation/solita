import {
  IdlInstruction,
  IdlInstructionArg,
  SOLANA_WEB3_EXPORT_NAME,
  IdlInstructionAccount,
  SOLANA_SPL_TOKEN_PACKAGE,
  SOLANA_SPL_TOKEN_EXPORT_NAME,
  TypeMappedSerdeField,
  SOLANA_WEB3_PACKAGE,
  isIdlInstructionAccountWithDesc,
  PrimitiveTypeKey,
  isAccountsCollection,
} from './types'
import { strict as assert } from 'assert'
import { ForceFixable, TypeMapper } from './type-mapper'
import { renderDataStruct } from './serdes'
import {
  isKnownPubkey,
  renderKnownPubkeyAccess,
  ResolvedKnownPubkey,
  resolveKnownPubkey,
} from './known-pubkeys'
import { BEET_PACKAGE } from '@metaplex-foundation/beet'
import { renderScalarEnums } from './render-enums'
import { InstructionDiscriminator } from './instruction-discriminator'
import { PathLike } from 'fs'

type ProcessedAccountKey = IdlInstructionAccount & {
  knownPubkey?: ResolvedKnownPubkey
  optional: boolean
}

class InstructionRenderer {
  readonly upperCamelIxName: string
  readonly camelIxName: string
  readonly argsTypename: string
  readonly accountsTypename: string
  readonly instructionDiscriminatorName: string
  readonly structArgName: string
  private readonly instructionDiscriminator: InstructionDiscriminator
  private readonly programIdPubkey: string

  constructor(
    readonly ix: IdlInstruction,
    readonly fullFileDir: PathLike,
    readonly programId: string,
    private readonly typeMapper: TypeMapper,
    private readonly renderAnchorRemainingAccounts: boolean
  ) {
    this.upperCamelIxName = ix.name
      .charAt(0)
      .toUpperCase()
      .concat(ix.name.slice(1))

    this.camelIxName = ix.name.charAt(0).toLowerCase().concat(ix.name.slice(1))

    this.argsTypename = `${this.upperCamelIxName}InstructionArgs`
    this.accountsTypename = `${this.upperCamelIxName}InstructionAccounts`
    this.instructionDiscriminatorName = `${this.camelIxName}InstructionDiscriminator`
    this.structArgName = `${ix.name}Struct`

    this.instructionDiscriminator = new InstructionDiscriminator(
      ix,
      'instructionDiscriminator',
      typeMapper
    )
    this.programIdPubkey = `new ${SOLANA_WEB3_EXPORT_NAME}.PublicKey('${this.programId}')`
  }

  // -----------------
  // Instruction Args Type
  // -----------------
  private renderIxArgField = (arg: IdlInstructionArg) => {
    const typescriptType = this.typeMapper.map(arg.type, arg.name)
    return `${arg.name}: ${typescriptType}`
  }

  private renderIxArgsType() {
    if (this.ix.args.length === 0) return ''
    const fields = this.ix.args
      .map((field) => this.renderIxArgField(field))
      .join(',\n  ')

    const code = `
/**
 * @category Instructions
 * @category ${this.upperCamelIxName}
 * @category generated
 */
export type ${this.argsTypename} = {
  ${fields}
}`.trim()
    return code
  }

  // -----------------
  // Imports
  // -----------------
  private renderImports(processedKeys: ProcessedAccountKey[]) {
    const typeMapperImports = this.typeMapper.importsUsed(
      this.fullFileDir.toString(),
      new Set([SOLANA_WEB3_PACKAGE, BEET_PACKAGE])
    )
    const needsSplToken = processedKeys.some(
      (x) => x.knownPubkey?.pack === SOLANA_SPL_TOKEN_PACKAGE
    )
    const splToken = needsSplToken
      ? `\nimport * as ${SOLANA_SPL_TOKEN_EXPORT_NAME} from '${SOLANA_SPL_TOKEN_PACKAGE}';`
      : ''

    return `
${splToken}
${typeMapperImports.join('\n')}`.trim()
  }

  // -----------------
  // Accounts
  // -----------------
  private processIxAccounts(): ProcessedAccountKey[] {
    let processedAccountsKey: ProcessedAccountKey[] = []
    for (const acc of this.ix.accounts) {
      if (isAccountsCollection(acc)) {
        for (const ac of acc.accounts) {
          // Make collection items easy to identify and avoid name clashes
          ac.name = this.deriveCollectionAccountsName(ac.name, acc.name)
          const knownPubkey = resolveKnownPubkey(ac.name)
          const optional = ac.optional ?? false
          if (knownPubkey == null) {
            processedAccountsKey.push({ ...ac, optional })
          } else {
            processedAccountsKey.push({ ...ac, knownPubkey, optional })
          }
        }
      } else {
        const knownPubkey = resolveKnownPubkey(acc.name)
        const optional = acc.optional ?? false
        if (knownPubkey == null) {
          processedAccountsKey.push({ ...acc, optional })
        } else {
          processedAccountsKey.push({ ...acc, knownPubkey, optional })
        }
      }
    }
    return processedAccountsKey
  }

  private deriveCollectionAccountsName(
    accountName: string,
    collectionName: string
  ) {
    const camelAccount = accountName
      .charAt(0)
      .toUpperCase()
      .concat(accountName.slice(1))

    return `${collectionName}Item${camelAccount}`
  }

  private renderIxAccountKeys(processedKeys: ProcessedAccountKey[]) {
    const requireds = processedKeys.filter((x) => !x.optional)
    const optionals = processedKeys.filter((x, idx) => {
      if (!x.optional) return false
      assert(
        idx >= requireds.length,
        `All optional accounts need to follow required accounts, ${x.name} is not`
      )
      return true
    })

    const anchorRemainingAccounts =
      this.renderAnchorRemainingAccounts && processedKeys.length > 0
        ? `
  if (accounts.anchorRemainingAccounts != null) {
    for (const acc of accounts.anchorRemainingAccounts) {
      keys.push(acc)
    }
  }
`
        : ''

    const requiredKeys = requireds
      .map(({ name, isMut, isSigner, knownPubkey }) => {
        const pubkey =
          knownPubkey == null
            ? `accounts.${name}`
            : `accounts.${name} ?? ${renderKnownPubkeyAccess(
                knownPubkey,
                this.programIdPubkey
              )}`
        return `{
      pubkey: ${pubkey},
      isWritable: ${isMut.toString()},
      isSigner: ${isSigner.toString()},
    }`
      })
      .join(',\n    ')

    const optionalKeys =
      optionals.length > 0
        ? optionals
            .map(({ name, isMut, isSigner }, idx) => {
              const requiredOptionals = optionals.slice(0, idx)
              const requiredChecks = requiredOptionals
                .map((x) => `accounts.${x.name} == null`)
                .join(' || ')
              const checkRequireds =
                requiredChecks.length > 0
                  ? `if (${requiredChecks}) { throw new Error('When providing \\'${name}\\' then ` +
                    `${requiredOptionals
                      .map((x) => `\\'accounts.${x.name}\\'`)
                      .join(', ')} need(s) to be provided as well.') }`
                  : ''
              // NOTE: we purposely don't add the default resolution here since the intent is to
              // only pass that account when it is provided
              return `
  if (accounts.${name} != null) {
    ${checkRequireds}
    keys.push({
      pubkey: accounts.${name},
      isWritable: ${isMut.toString()},
      isSigner: ${isSigner.toString()},
    })
  }`
            })
            .join('\n') + '\n'
        : ''

    return `[\n    ${requiredKeys}\n  ]\n${optionalKeys}\n${anchorRemainingAccounts}\n`
  }

  private renderAccountsType(processedKeys: ProcessedAccountKey[]) {
    if (processedKeys.length === 0) return ''
    const web3 = SOLANA_WEB3_EXPORT_NAME
    const fields = processedKeys
      .map((x) => {
        if (x.knownPubkey != null) {
          return `${x.name}?: ${web3}.PublicKey`
        }
        const optional = x.optional ? '?' : ''
        return `${x.name}${optional}: ${web3}.PublicKey`
      })
      .join('\n  ')

    const anchorRemainingAccounts = this.renderAnchorRemainingAccounts
      ? 'anchorRemainingAccounts?: web3.AccountMeta[]'
      : ''

    const propertyComments = processedKeys
      // known pubkeys are not provided by the user and thus aren't part of the type
      .filter((x) => !isKnownPubkey(x.name))
      .map((x) => {
        const attrs = []
        if (x.isMut) attrs.push('_writable_')
        if (x.isSigner) attrs.push('**signer**')

        const optional = x.optional ? ' (optional) ' : ' '
        const desc = isIdlInstructionAccountWithDesc(x) ? x.desc : ''
        return (
          `* @property [${attrs.join(', ')}] ` + `${x.name}${optional}${desc} `
        )
      })

    const properties =
      propertyComments.length > 0
        ? `\n *\n  ${propertyComments.join('\n')} `
        : ''

    const docs = `
/**
  * Accounts required by the _${this.ix.name}_ instruction${properties}
  * @category Instructions
  * @category ${this.upperCamelIxName}
  * @category generated
  */
`.trim()
    return `${docs}
          export type ${this.accountsTypename} = {
  ${fields}
  ${anchorRemainingAccounts}
        }
        `
  }

  private renderAccountsParamDoc(processedKeys: ProcessedAccountKey[]) {
    if (processedKeys.length === 0) return '  *'
    return `  *
  * @param accounts that will be accessed while the instruction is processed`
  }

  private renderAccountsArg(processedKeys: ProcessedAccountKey[]) {
    if (processedKeys.length === 0) return ''
    return `accounts: ${this.accountsTypename}, \n`
  }

  // -----------------
  // Data Struct
  // -----------------
  private serdeProcess() {
    return this.typeMapper.mapSerdeFields(this.ix.args)
  }

  private renderDataStruct(args: TypeMappedSerdeField[]) {
    const discriminatorField = this.typeMapper.mapSerdeField(
      this.instructionDiscriminator.getField()
    )
    const discriminatorType = this.instructionDiscriminator.renderType()
    const struct = renderDataStruct({
      fields: args,
      discriminatorName: 'instructionDiscriminator',
      discriminatorField,
      discriminatorType,
      structVarName: this.structArgName,
      argsTypename: this.argsTypename,
      isFixable: this.typeMapper.usedFixableSerde,
    })
    return `
/**
 * @category Instructions
 * @category ${this.upperCamelIxName}
 * @category generated
 */
${struct} `.trim()
  }

  render() {
    this.typeMapper.clearUsages()

    const ixArgType = this.renderIxArgsType()
    const processedKeys = this.processIxAccounts()
    const accountsType = this.renderAccountsType(processedKeys)

    const processedArgs = this.serdeProcess()
    const argsStructType = this.renderDataStruct(processedArgs)

    const keys = this.renderIxAccountKeys(processedKeys)
    const accountsParamDoc = this.renderAccountsParamDoc(processedKeys)
    const accountsArg = this.renderAccountsArg(processedKeys)
    const instructionDisc = this.instructionDiscriminator.renderValue()
    const enums = renderScalarEnums(this.typeMapper.scalarEnumsUsed).join('\n')

    const web3 = SOLANA_WEB3_EXPORT_NAME
    const imports = this.renderImports(processedKeys)

    const [
      createInstructionArgsComment,
      createInstructionArgs,
      createInstructionArgsSpread,
      comma,
    ] =
      this.ix.args.length === 0
        ? ['', '', '', '']
        : [
            `\n * @param args to provide as instruction data to the program\n * `,
            `args: ${this.argsTypename} `,
            '...args',
            ', ',
          ]
    const programIdArg = `${comma}programId = ${this.programIdPubkey}`

    return `${imports}

${enums}
${ixArgType}
${argsStructType}
${accountsType}
    export const ${this.instructionDiscriminatorName} = ${instructionDisc};

    /**
     * Creates a _${this.upperCamelIxName}_ instruction.
    ${accountsParamDoc}${createInstructionArgsComment}
     * @category Instructions
     * @category ${this.upperCamelIxName}
     * @category generated
     */
    export function create${this.upperCamelIxName}Instruction(
      ${accountsArg}${createInstructionArgs}${programIdArg}
    ) {
      const [data] = ${this.structArgName}.serialize({
        instructionDiscriminator: ${this.instructionDiscriminatorName},
    ${createInstructionArgsSpread}
    });
    const keys: ${web3}.AccountMeta[] = ${keys}
    const ix = new ${web3}.TransactionInstruction({
      programId,
      keys,
      data
  });
  return ix; 
}
`
  }
}

export function renderInstruction(
  ix: IdlInstruction,
  fullFileDir: PathLike,
  programId: string,
  accountFilesByType: Map<string, string>,
  customFilesByType: Map<string, string>,
  typeAliases: Map<string, PrimitiveTypeKey>,
  forceFixable: ForceFixable,
  renderAnchorRemainingAccounts: boolean
) {
  const typeMapper = new TypeMapper(
    accountFilesByType,
    customFilesByType,
    typeAliases,
    forceFixable
  )
  const renderer = new InstructionRenderer(
    ix,
    fullFileDir,
    programId,
    typeMapper,
    renderAnchorRemainingAccounts
  )
  return renderer.render()
}
