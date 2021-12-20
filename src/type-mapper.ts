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
import { assertKnownPackage, BEET_EXPORT_NAME, SerdePackage } from './serdes'

export class TypeMapper {
  constructor(
    private readonly primaryTypeMap: PrimaryTypeMap = TypeMapper.defaultPrimaryTypeMap
  ) {}

  private mapPrimitiveType(name: string, ty: IdlType & string) {
    this.assertBeetSupported(ty, 'map primitive type')
    const mapped = this.primaryTypeMap[ty]
    let typescriptType = mapped.ts

    if (typescriptType == null) {
      logDebug(`No mapped type found for ${name}: ${ty}, using any`)
      typescriptType = 'any'
    }
    assertKnownPackage(mapped.sourcePack)
    return { typescriptType, pack: mapped.pack, sourcePack: mapped.sourcePack }
  }

  map(type: IdlType, name: string) {
    let typescriptType
    let pack: SerdePackage | undefined
    let sourcePack: SerdePackage
    if (typeof type === 'string') {
      const mapped = this.mapPrimitiveType(name, type)
      if (mapped.pack != null) {
        assertKnownPackage(mapped.pack)
        pack = mapped.pack
      }
      typescriptType = mapped.typescriptType
      sourcePack = mapped.sourcePack
    } else if ((type as IdlTypeOption).option != null) {
      const ty: IdlTypeOption = type as IdlTypeOption
      assert(
        typeof ty.option === 'string',
        'only string options types supported for now'
      )
      const mapped = this.mapPrimitiveType(name, ty.option)
      const inner = mapped.typescriptType
      sourcePack = mapped.sourcePack
      typescriptType = `${BEET_EXPORT_NAME}.COption<${inner}>`
    } else {
      throw new Error(`Type ${type} is not supported yet`)
    }
    return { typescriptType, pack, sourcePack }
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
