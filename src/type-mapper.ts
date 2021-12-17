import { IdlType, IdlTypeOption, PrimaryTypeMap } from './types'
import { logDebug } from './utils'
import { strict as assert } from 'assert'
import {
  BeetTypeMapKey,
  supportedTypeMap as beetSupportedTypeMap,
} from '@metaplex-foundation/beet'
import {
  BeetSolanaTypeMapKey,
  supportedTypeMap as beetSolanaSupportedTypeMap,
} from '@metaplex-foundation/beet-solana'

export class TypeMapper {
  constructor(
    private readonly primaryTypeMap: PrimaryTypeMap = TypeMapper.defaultPrimaryTypeMap
  ) {}

  private mapPrimitiveType(name: string, ty: IdlType & string) {
    this.assertBeetSupported(ty, 'map primitive type')
    let typescriptType = this.primaryTypeMap[ty].ts
    if (typescriptType == null) {
      logDebug(`No mapped type found for ${name}: ${ty}, using any`)
      typescriptType = 'any'
    }
    return typescriptType
  }

  map(type: IdlType, name: string) {
    let typescriptType
    if (typeof type === 'string') {
      typescriptType = this.mapPrimitiveType(name, type)
    } else if ((type as IdlTypeOption).option != null) {
      const ty: IdlTypeOption = type as IdlTypeOption
      assert(
        typeof ty.option === 'string',
        'only string options types supported for now'
      )
      const inner = this.mapPrimitiveType(name, ty.option)
      typescriptType = `beet.COption<${inner}>`
    } else {
      throw new Error(`Type ${type} is not supported yet`)
    }
    return typescriptType
  }

  assertBeetSupported(
    serde: string,
    context: string
  ): asserts serde is BeetTypeMapKey | BeetSolanaTypeMapKey {
    assert(
      this.primaryTypeMap[serde as keyof PrimaryTypeMap] != null,
      `Types to ${context} need to be supported by Beet, ${serde} is not`
    )
  }

  static defaultPrimaryTypeMap: PrimaryTypeMap = {
    ...beetSupportedTypeMap,
    ...beetSolanaSupportedTypeMap,
  }
}
