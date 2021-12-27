import {
  IdlInstruction,
  IdlInstructionArg,
  ProcessedSerde,
  BEET_EXPORT_NAME,
  BEET_SOLANA_EXPORT_NAME,
  SOLANA_WEB3_EXPORT_NAME,
  IdlInstructionAccount,
  SOLANA_SPL_TOKEN_PACKAGE,
  BEET_SOLANA_PACKAGE,
  SOLANA_SPL_TOKEN_EXPORT_NAME,
} from './types'
import { TypeMapper } from './type-mapper'
import {
  renderDataStruct,
  serdePackageTypePrefix,
  serdeProcess,
} from './serdes'
import { instructionDiscriminator } from './utils'
import {
  renderKnownPubkeyAccess,
  ResolvedKnownPubkey,
  resolveKnownPubkey,
} from './known-pubkeys'

type ProcessedAccountKey = IdlInstructionAccount & {
  knownPubkey?: ResolvedKnownPubkey
}

class InstructionRenderer {
  readonly upperCamelIxName: string
  readonly camelIxName: string
  readonly argsTypename: string
  readonly accountsTypename: string
  readonly instructionDiscriminatorName: string
  readonly structArgName: string
  needsBeetSolana: boolean = false

  constructor(
    readonly ix: IdlInstruction,
    readonly programId: string,
    private readonly typeMapper = new TypeMapper()
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
  }

  // -----------------
  // Instruction Args Type
  // -----------------
  private renderIxArgField = (arg: IdlInstructionArg) => {
    const { typescriptType, pack } = this.typeMapper.map(arg.type, arg.name)
    const typePrefix = serdePackageTypePrefix(pack)
    return `${arg.name}: ${typePrefix}${typescriptType}`
  }

  private renderIxArgsType() {
    const fields = this.ix.args
      .map((field) => this.renderIxArgField(field))
      .join(',\n  ')

    const code = `export type ${this.argsTypename} = {
  ${fields}
}`
    return code
  }

  // -----------------
  // Imports
  // -----------------
  private renderImports(processedKeys: ProcessedAccountKey[]) {
    const beetSolana = this.needsBeetSolana
      ? `\nimport * as ${BEET_SOLANA_EXPORT_NAME} from '${BEET_SOLANA_PACKAGE}';`
      : ''

    const needsSplToken = processedKeys.some(
      (x) => x.knownPubkey?.pack === SOLANA_SPL_TOKEN_PACKAGE
    )
    const splToken = needsSplToken
      ? `\nimport * as ${SOLANA_SPL_TOKEN_EXPORT_NAME} from '${SOLANA_SPL_TOKEN_PACKAGE}';`
      : ''

    return `
import * as ${SOLANA_WEB3_EXPORT_NAME} from '@solana/web3.js';
import * as ${BEET_EXPORT_NAME} from '@metaplex-foundation/beet'
${splToken}
${beetSolana}`.trim()
  }

  // -----------------
  // Accounts
  // -----------------
  private processIxAccounts(): ProcessedAccountKey[] {
    return this.ix.accounts.map((acc) => {
      const knownPubkey = resolveKnownPubkey(acc.name)
      return knownPubkey == null ? acc : { ...acc, knownPubkey }
    })
  }

  private renderIxAccountKeys(processedKeys: ProcessedAccountKey[]) {
    const keys = processedKeys
      .map(({ name, isMut, isSigner, knownPubkey }) => {
        const access =
          knownPubkey == null ? name : renderKnownPubkeyAccess(knownPubkey)
        return `{
      pubkey: ${access},
      isWritable: ${isMut.toString()},
      isSigner: ${isSigner.toString()},
    }`
      })
      .join(',\n    ')
    return `[\n    ${keys}\n  ]\n`
  }

  private renderAccountsType(processedKeys: ProcessedAccountKey[]) {
    const web3 = SOLANA_WEB3_EXPORT_NAME
    const fields = processedKeys
      .filter((x) => x.knownPubkey == null)
      .map((x) => `${x.name}: ${web3}.PublicKey`)
      .join('\n  ')

    return `export type ${this.accountsTypename} = {
  ${fields}
}
`
  }

  private renderAccountsDestructure(processedKeys: ProcessedAccountKey[]) {
    const params = processedKeys
      .filter((x) => x.knownPubkey == null)
      .map((x) => `${x.name}`)
      .join(',\n    ')
    return `const {
    ${params}
  } = accounts;
`
  }

  // -----------------
  // Data Struct
  // -----------------
  private serdeProcess() {
    const { processed, needsBeetSolana } = serdeProcess(
      this.ix.args,
      this.typeMapper
    )
    this.needsBeetSolana = needsBeetSolana
    return processed
  }

  private renderDataStruct(args: ProcessedSerde[]) {
    return renderDataStruct({
      fields: args,
      structVarName: this.structArgName,
      argsTypename: this.argsTypename,
      discriminatorName: 'instructionDiscriminator',
    })
  }

  render() {
    const ixArgType = this.renderIxArgsType()
    const processedKeys = this.processIxAccounts()
    const accountsType = this.renderAccountsType(processedKeys)

    const processedArgs = this.serdeProcess()
    const argsStructType = this.renderDataStruct(processedArgs)

    const keys = this.renderIxAccountKeys(processedKeys)
    const accountsDestructure = this.renderAccountsDestructure(processedKeys)
    const instructionDisc = JSON.stringify(
      Array.from(instructionDiscriminator(this.ix.name))
    )

    const web3 = SOLANA_WEB3_EXPORT_NAME
    const imports = this.renderImports(processedKeys)
    return `${imports}

${ixArgType}
${argsStructType}
${accountsType}
const ${this.instructionDiscriminatorName} = ${instructionDisc};

export function create${this.upperCamelIxName}Instruction(
  accounts: ${this.accountsTypename},
  args: ${this.argsTypename}
) {
  ${accountsDestructure}
  const [data ] = ${this.structArgName}.serialize({ 
    instructionDiscriminator: ${this.instructionDiscriminatorName},
    ...args
  });
  const keys: ${web3}.AccountMeta[] = ${keys}
  const ix = new ${web3}.TransactionInstruction({
    programId: new ${web3}.PublicKey('${this.programId}'),
    keys,
    data
  });
  return ix; 
}
`
  }
}

export function renderInstruction(ix: IdlInstruction, programId: string) {
  const renderer = new InstructionRenderer(ix, programId)
  return renderer.render()
}
