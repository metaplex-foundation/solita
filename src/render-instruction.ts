import { DEFAULT_TYPE_MAPPER, TypeMapper } from './type-mapper'
import {
  IdlInstruction,
  IdlInstructionArg,
  IdlType,
  IdlTypeOption,
} from './types'
import { strict as assert } from 'assert'
import { logDebug } from './utils'

function renderWeb3Imports() {
  const imports = ['AccountMeta', 'PublicKey', 'TransactionInstruction']

  return `import {
  ${imports.join(',\n  ')}
} from '@solana/web3.js';
`
}

class InstructionRenderer {
  readonly upperCamelIxName: string
  readonly argsTypename: string
  readonly accountsTypename: string

  constructor(
    readonly ix: IdlInstruction,
    readonly typeMapper: TypeMapper,
    readonly programId: string
  ) {
    this.upperCamelIxName = ix.name
      .charAt(0)
      .toUpperCase()
      .concat(ix.name.slice(1))

    this.argsTypename = `${this.upperCamelIxName}InstructionArgs`
    this.accountsTypename = `${this.upperCamelIxName}InstructionAccounts`
  }

  private renderIxArgField = (arg: IdlInstructionArg) => {
    let typescriptType
    let needCOption = false
    if (typeof arg.type === 'string') {
      typescriptType = this.mapType(arg.name, arg.type)
    } else if ((arg.type as IdlTypeOption).option != null) {
      const ty: IdlTypeOption = arg.type as IdlTypeOption
      assert(
        typeof ty.option === 'string',
        'only string options types supported for now'
      )
      const inner = this.mapType(arg.name, ty.option)
      typescriptType = `COption<${inner}>`
      needCOption = true
    } else {
      throw new Error(`Type ${arg.type} is not supported yet`)
    }
    return {
      code: `${arg.name}: ${typescriptType}`,
      needCOption,
    }
  }

  private mapType(name: string, ty: IdlType & string) {
    let typescriptType = this.typeMapper[ty]
    if (typescriptType == null) {
      logDebug(`No mapped type found for ${name}: ${ty}, using any`)
      typescriptType = 'any'
    }
    return typescriptType
  }

  private renderIxArgsType() {
    let accNeedCOption = false
    const fields = this.ix.args
      .map((field) => {
        const { code, needCOption } = this.renderIxArgField(field)
        accNeedCOption = accNeedCOption || needCOption
        return code
      })
      .join(',\n  ')

    const coption = accNeedCOption ? 'type COption<T> = T | null\n' : ''

    const code = `
${coption}
export type ${this.argsTypename} = {
  ${fields}
}
`
    return { code }
  }

  private renderIxAccountKeys() {
    const keys = this.ix.accounts
      .map(
        ({ name, isMut, isSigner }) =>
          `{
      pubkey: ${name},
      isMut: ${isMut.toString()},
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
    const { code: ixArgType } = this.renderIxArgsType()
    const accountsType = this.renderAccountsType()
    const web3Imports = renderWeb3Imports()
    const keys = this.renderIxAccountKeys()
    const accountsDestructure = this.renderAccountsDestructure()
    return `
${web3Imports}
${ixArgType}
${accountsType}
export function create${this.upperCamelIxName}Instruction(
  accounts: ${this.accountsTypename},
  args: ${this.argsTypename}
) {
  ${accountsDestructure}
  // TODO: serialize with beet
  const data = args;
  const keys: AccountMeta = ${keys}
  const ix = new TransactionInstruction({
    programId: '${this.programId}',
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
  typeMapper: TypeMapper = DEFAULT_TYPE_MAPPER
) {
  const programId = 'hausS13jsjafwWwGqZTUQRmWyvyxn9EQpqMwV1PBBmk'
  const renderer = new InstructionRenderer(ix, typeMapper, programId)
  return renderer.render()
}

if (module === require.main) {
  async function main() {
    const ix = require('../test/fixtures/auction_house.json').instructions[0]
    console.log(renderInstruction(ix))
  }

  main()
    .then(() => process.exit(0))
    .catch((err: any) => {
      console.error(err)
      process.exit(1)
    })
}
