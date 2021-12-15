import { IdlInstruction, IdlInstructionArg } from './types'

type Field = IdlInstructionArg & { name: string; type: string }

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

  private renderBeetField({ name, type }: Field) {
    // TODO(thlorenz): if we need to map to beet types we need a mapper here in the future
    // TODO(thlorenz): provide a way for people to use custom types once that is needed
    return `['${name}', beet.${type}]`
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
