import { IdlInstruction, IdlInstructionArg } from './types'
import { InstructionBeetStructRenderer } from './instruction-beet-struct'
import { TypeMapper } from './type-mapper'
import { serdePackageTypePrefix } from './serdes'
import { instructionDiscriminator } from './utils'

function renderImports() {
  const web3Imports = ['AccountMeta', 'PublicKey', 'TransactionInstruction']

  return `import {
  ${web3Imports.join(',\n  ')}
} from '@solana/web3.js';
import * as beet from '@metaplex-foundation/beet';
`
}

class InstructionRenderer {
  readonly upperCamelIxName: string
  readonly camelIxName: string
  readonly argsTypename: string
  readonly accountsTypename: string
  readonly instructionDiscriminatorName: string

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
    this.instructionDiscriminatorName = `${this.camelIxName}AccountDiscriminator`
  }

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
    const fields = this.ix.accounts
      .map((x) => `${x.name}: PublicKey`)
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

  render() {
    const ixArgType = this.renderIxArgsType()
    const accountsType = this.renderAccountsType()
    const imports = renderImports()

    const structRenderer = InstructionBeetStructRenderer.create(this.ix)
    const argsStructType = structRenderer.render()
    const argsStructName = structRenderer.structArgName

    const keys = this.renderIxAccountKeys()
    const accountsDestructure = this.renderAccountsDestructure()
    const instructionDisc = JSON.stringify(
      Array.from(instructionDiscriminator(this.ix.name))
    )
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
  const [data ] = ${argsStructName}.serialize({ 
    instructionDiscriminator: ${this.instructionDiscriminatorName},
    ...args
  });
  const keys: AccountMeta[] = ${keys}
  const ix = new TransactionInstruction({
    programId: new PublicKey('${this.programId}'),
    keys,
    data
  });
  return ix; 
}
`
  }
}

export function renderInstruction(ix: IdlInstruction) {
  const programId = 'hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk'
  const renderer = new InstructionRenderer(ix, programId)
  return renderer.render()
}

/*
if (module === require.main) {
  async function main() {
    const ix = require('../test/fixtures/auction_house.json').instructions[3]
    console.log(renderInstruction(ix))
  }

  main()
    .then(() => process.exit(0))
    .catch((err: any) => {
      console.error(err)
      process.exit(1)
    })
}
*/
