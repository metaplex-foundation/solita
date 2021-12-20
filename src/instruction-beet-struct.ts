import { TypeMapper } from './type-mapper'
import {
  IdlInstruction,
  IdlInstructionArg,
  IdlTypeOption,
  PrimaryTypeMap,
} from './types'

type Field = IdlInstructionArg & { name: string; type: string | IdlTypeOption }

export class InstructionBeetStructRenderer {
  private readonly typeName: string
  readonly structArgName: string

  private constructor(
    private readonly typeMapper: TypeMapper,
    private readonly fields: Field[],
    private readonly isArgsStruct: boolean,
    name: string
  ) {
    const upperCamelCaseTypename = name
      .charAt(0)
      .toUpperCase()
      .concat(name.slice(1))
    const camelCaseTypename = name.charAt(0).toLowerCase().concat(name.slice(1))

    this.typeName = upperCamelCaseTypename
    this.structArgName = `${camelCaseTypename}Struct`
  }

  private renderBeetOptionType(optionType: IdlTypeOption) {
    const serde = optionType.option
    // TODO(thlorenz): support deeper type nesting when needed
    this.typeMapper.assertBeetSupported(
      serde as string,
      'de/serialize as part of an Option'
    )
    return `beet.coption(beet.${serde})`
  }

  private renderBeetField({ name, type }: Field) {
    // TODO(thlorenz): provide a way for people to use custom types once that is needed
    if (typeof type === 'string') {
      return `['${name}', beet.${type}]`
    } else if (typeof type.option != null) {
      const optionType = this.renderBeetOptionType(type)
      return `['${name}', ${optionType}]`
    }
    throw new Error(`Unsupported type ${type} for instruction field ${name}`)
  }

  render() {
    const fields = this.fields
      .map((f: Field) => this.renderBeetField(f))
      .join(',\n    ')

    const beetStructType = this.isArgsStruct ? 'BeetArgsStruct' : 'BeetStruct'

    return `const ${this.structArgName} = new beet.${beetStructType}<${this.typeName} & {
    instructionDiscriminator: number[];
  }
>(
  [
    [ 'instructionDiscriminator', beet.fixedSizeArray(beet.u8, 8) ],
    ${fields}
  ],
  '${this.typeName}'
);`
  }

  static create(
    ix: IdlInstruction,
    primaryTypeMap: PrimaryTypeMap = TypeMapper.defaultPrimaryTypeMap
  ) {
    const typeMapper = new TypeMapper(primaryTypeMap)
    return new InstructionBeetStructRenderer(
      typeMapper,
      ix.args as Field[],
      true,
      `${ix.name}InstructionArgs`
    )
  }
}

/*
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
*/
