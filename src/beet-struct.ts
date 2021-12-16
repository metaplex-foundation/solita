import { IdlInstruction, IdlInstructionArg, IdlTypeOption } from './types'
import { strict as assert } from 'assert'
import * as beet from '@metaplex-foundation/beet'

type Field = IdlInstructionArg & { name: string; type: string | IdlTypeOption }

function assertBeetSupported(
  serde: string,
  context: string
): asserts serde is beet.BeetTypeMapKeys {
  assert(
    beet.supportedTypeMap[serde] != null,
    `Types to ${context} need to be supported by Beet, ${serde} is not`
  )
}

export class BeetStructRenderer {
  readonly structName: string
  private constructor(
    private readonly fields: Field[],
    private readonly typeName: string
  ) {
    const camelCaseTypename = this.typeName
      .charAt(0)
      .toLowerCase()
      .concat(this.typeName.slice(1))
    this.structName = `${camelCaseTypename}Struct`
  }

  private renderBeetOptionType(optionType: IdlTypeOption) {
    const serde = optionType.option
    assertBeetSupported(serde, 'de/serialize as part of an Option')
    return `beet.coption(beet.${serde})`
  }

  private renderBeetField({ name, type }: Field) {
    // TODO(thlorenz): if we need to map to beet types we need a mapper here in the future
    // TODO(thlorenz): provide a way for people to use custom types once that is needed
    if (typeof type === 'string') {
      return `['${name}', beet.${type}]`
    } else if (typeof type.option != null) {
      const optionType = this.renderBeetOptionType(type)
      return `['${name}', ${optionType}]`
    }
  }

  render() {
    const fields = this.fields
      .map((f: Field) => this.renderBeetField(f))
      .join(',\n    ')

    return `const ${this.structName} = new beet.BeetStruct<${this.typeName}>(
  [
    ${fields}
  ]
);`
  }

  static forInstruction(ix: IdlInstruction) {
    // TODO(thlorenz): support more complex args, i.e. with composite types (see
    // `updateAuctionHouse` instruction) which has an `option` type
    return new BeetStructRenderer(ix.args as Field[], ix.name)
  }
}

if (module === require.main) {
  async function main() {
    const ix = require('../test/fixtures/auction_house.json').instructions[2]
    const renderer = BeetStructRenderer.forInstruction(ix)
    console.log(renderer.render())
  }

  main()
    .then(() => process.exit(0))
    .catch((err: any) => {
      console.error(err)
      process.exit(1)
    })
}
