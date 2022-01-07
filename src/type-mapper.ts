import {
  BEET_EXPORT_NAME,
  IdlType,
  IdlTypeOption,
  PrimaryTypeMap,
} from './types'
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
import {
  assertKnownSerdePackage,
  SerdePackage,
  serdePackageExportName,
} from './serdes'

export function resolveSerdeAlias(ty: string) {
  switch (ty) {
    case 'option':
      return 'coption'
    default:
      return ty
  }
}

export class TypeMapper {
  constructor(
    private readonly primaryTypeMap: PrimaryTypeMap = TypeMapper.defaultPrimaryTypeMap
  ) {}

  private mapPrimitiveType(ty: IdlType & string, name: string) {
    this.assertBeetSupported(ty, 'map primitive type')
    const mapped = this.primaryTypeMap[ty]
    let typescriptType = mapped.ts

    if (typescriptType == null) {
      logDebug(`No mapped type found for ${name}: ${ty}, using any`)
      typescriptType = 'any'
    }
    assertKnownSerdePackage(mapped.sourcePack)
    return { typescriptType, pack: mapped.pack, sourcePack: mapped.sourcePack }
  }

  map(type: IdlType, name: string = '<no name provided>') {
    let typescriptType
    let pack: SerdePackage | undefined
    let sourcePack: SerdePackage
    if (typeof type === 'string') {
      const mapped = this.mapPrimitiveType(type, name)
      if (mapped.pack != null) {
        assertKnownSerdePackage(mapped.pack)
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
      const mapped = this.mapPrimitiveType(ty.option, name)
      const inner = mapped.typescriptType
      sourcePack = mapped.sourcePack
      let innerPrefix = ''
      if (mapped.pack != null) {
        assertKnownSerdePackage(mapped.pack)
        innerPrefix = `${serdePackageExportName(mapped.pack)}.`
      }
      typescriptType = `${BEET_EXPORT_NAME}.COption<${innerPrefix}${inner}>`
    } else {
      throw new Error(
        `Type ${type} needed for name '${name}' is not supported yet`
      )
    }
    return { typescriptType, pack, sourcePack }
  }

  assertBeetSupported(
    serde: IdlType,
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
