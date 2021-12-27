import {
  IdlInstruction,
  IdlInstructionArg,
  ProcessedSerde,
  BEET_EXPORT_NAME,
  BEET_SOLANA_EXPORT_NAME,
  SOLANA_WEB3_EXPORT_NAME,
} from './types'
import { TypeMapper } from './type-mapper'
import {
  renderDataStruct,
  serdePackageTypePrefix,
  serdeProcess,
} from './serdes'
import { instructionDiscriminator } from './utils'

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
  private renderImports() {
    const beetSolana = this.needsBeetSolana
      ? `\nimport * as ${BEET_SOLANA_EXPORT_NAME} from '@metaplex-foundation/beet-solana';`
      : ''

    return `import * as ${SOLANA_WEB3_EXPORT_NAME} from '@solana/web3.js';
import * as ${BEET_EXPORT_NAME} from '@metaplex-foundation/beet';${beetSolana}`
  }

  // -----------------
  // Accounts
  // -----------------
  private renderIxAccountKeys() {
    const keys = this.ix.accounts
      .map(
        ({ name, isMut, isSigner }) =>
          `{
      pubkey: ${name},
      isWritable: ${isMut.toString()},
      isSigner: ${isSigner.toString()},
    }`
      )
      .join(',\n    ')
    return `[\n    ${keys}\n  ]\n`
  }

  private renderAccountsType() {
    const web3 = SOLANA_WEB3_EXPORT_NAME
    const fields = this.ix.accounts
      .map((x) => `${x.name}: ${web3}.PublicKey`)
      .join('\n  ')

    return `export type ${this.accountsTypename} = {
  ${fields}
}
`
  }

  private renderAccountsDestructure() {
    const params = this.ix.accounts.map((x) => `${x.name}`).join(',\n    ')
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
    const accountsType = this.renderAccountsType()

    const processedArgs = this.serdeProcess()
    const argsStructType = this.renderDataStruct(processedArgs)

    const keys = this.renderIxAccountKeys()
    const accountsDestructure = this.renderAccountsDestructure()
    const instructionDisc = JSON.stringify(
      Array.from(instructionDiscriminator(this.ix.name))
    )

    const web3 = SOLANA_WEB3_EXPORT_NAME
    const imports = this.renderImports()
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
