import {
  IdlInstruction,
  IdlInstructionArg,
  IdlType,
  IdlTypeOption,
} from './types'
import { strict as assert } from 'assert'
import { logDebug } from './utils'
import { BeetStructRenderer } from './beet-struct'
import * as beet from '@metaplex-foundation/beet'
import { assertBeetSupported } from './asserts'

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
  readonly argsTypename: string
  readonly accountsTypename: string

  constructor(readonly ix: IdlInstruction, readonly programId: string) {
    this.upperCamelIxName = ix.name
      .charAt(0)
      .toUpperCase()
      .concat(ix.name.slice(1))

    this.argsTypename = `${this.upperCamelIxName}InstructionArgs`
    this.accountsTypename = `${this.upperCamelIxName}InstructionAccounts`
  }

  private renderIxArgField = (arg: IdlInstructionArg) => {
    let typescriptType
    if (typeof arg.type === 'string') {
      typescriptType = this.mapPrimitiveType(arg.name, arg.type)
    } else if ((arg.type as IdlTypeOption).option != null) {
      const ty: IdlTypeOption = arg.type as IdlTypeOption
      assert(
        typeof ty.option === 'string',
        'only string options types supported for now'
      )
      const inner = this.mapPrimitiveType(arg.name, ty.option)
      typescriptType = `beet.COption<${inner}>`
    } else {
      throw new Error(`Type ${arg.type} is not supported yet`)
    }
    return `${arg.name}: ${typescriptType}`
  }

  private mapPrimitiveType(name: string, ty: IdlType & string) {
    assertBeetSupported(ty, 'map primitive type')
    let typescriptType = beet.supportedTypeMap[ty].ts
    if (typescriptType == null) {
      logDebug(`No mapped type found for ${name}: ${ty}, using any`)
      typescriptType = 'any'
    }
    return typescriptType
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

    const structRenderer = BeetStructRenderer.forInstruction(this.ix)
    const argsStructType = structRenderer.render()
    const argsStructName = structRenderer.structArgName

    const keys = this.renderIxAccountKeys()
    const accountsDestructure = this.renderAccountsDestructure()
    return `${imports}
${ixArgType}
${argsStructType}
${accountsType}
export function create${this.upperCamelIxName}Instruction(
  accounts: ${this.accountsTypename},
  args: ${this.argsTypename}
) {
  ${accountsDestructure}
  const [data ] = ${argsStructName}.serialize(args);
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
    const ix = require('../test/fixtures/auction_house.json').instructions[2]
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
