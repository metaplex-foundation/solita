import { IdlType, IdlTypeOption, PrimaryTypeMap } from './types'
import { logDebug, UnreachableCaseError } from './utils'
import { strict as assert } from 'assert'
import {
  BeetTypeMapKey,
  supportedTypeMap as beetSupportedTypeMap,
} from '@metaplex-foundation/beet'
import {
  BeetSolanaTypeMapKey,
  supportedTypeMap as beetSolanaSupportedTypeMap,
} from '@metaplex-foundation/beet-solana'

export const BEET_LIB = '@metaplex-foundation/beet'
export const BEET_SOLANA_LIB = '@metaplex-foundation/beet-solana'
export type SerdeLib = typeof BEET_LIB | typeof BEET_SOLANA_LIB

export function serdeLibPrefix(lib: SerdeLib) {
  switch (lib) {
    case BEET_LIB:
      return 'beet'
    case BEET_SOLANA_LIB:
      return 'beetSolana'
    default:
      throw new UnreachableCaseError(lib)
  }
}

function getSerdeLib(ty: BeetTypeMapKey | BeetSolanaTypeMapKey): SerdeLib {
  if (beetSupportedTypeMap[ty as BeetTypeMapKey] != null) {
    return BEET_LIB
  }
  if (beetSolanaSupportedTypeMap[ty as BeetSolanaTypeMapKey] != null) {
    return BEET_SOLANA_LIB
  }
  throw new Error(`Type ${ty} is in neither lib and thus not beet supported`)
}

export class TypeMapper {
  constructor(
    private readonly primaryTypeMap: PrimaryTypeMap = TypeMapper.defaultPrimaryTypeMap
  ) {}

  private mapPrimitiveType(name: string, ty: IdlType & string) {
    this.assertBeetSupported(ty, 'map primitive type')
    const mapped = this.primaryTypeMap[ty]
    const serdeLib = getSerdeLib(ty)
    let typescriptType = mapped.ts

    if (typescriptType == null) {
      logDebug(`No mapped type found for ${name}: ${ty}, using any`)
      typescriptType = 'any'
    }
    return { typescriptType, serdeLib }
  }

  map(type: IdlType, name: string) {
    let typescriptType
    let serdeLib: SerdeLib
    if (typeof type === 'string') {
      ;({ typescriptType, serdeLib } = this.mapPrimitiveType(name, type))
    } else if ((type as IdlTypeOption).option != null) {
      const ty: IdlTypeOption = type as IdlTypeOption
      assert(
        typeof ty.option === 'string',
        'only string options types supported for now'
      )
      const { typescriptType: inner } = this.mapPrimitiveType(name, ty.option)
      typescriptType = `COption<${inner}>`
      serdeLib = BEET_LIB
    } else {
      throw new Error(`Type ${type} is not supported yet`)
    }
    return { typescriptType, serdeLib }
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
