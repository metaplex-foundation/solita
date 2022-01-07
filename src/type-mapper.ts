import {
  BEET_EXPORT_NAME,
  IdlType,
  IdlTypeDefined,
  IdlTypeOption,
  IdlTypeVec,
  isIdlTypeDefined,
  isIdlTypeOption,
  isIdlTypeVec,
  LOCAL_TYPES_PACKAGE,
  PrimaryTypeMap,
} from './types'
import { logDebug } from './utils'
import { strict as assert } from 'assert'
import {
  BeetTypeMapKey,
  BEET_PACKAGE,
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
  readonly serdePackagesUsed: Set<SerdePackage> = new Set()
  constructor(
    private readonly primaryTypeMap: PrimaryTypeMap = TypeMapper.defaultPrimaryTypeMap
  ) {}

  clearSerdePackagesUsed() {
    this.serdePackagesUsed.clear()
  }

  private mapPrimitiveTypeOld(ty: IdlType & string, name: string) {
    this.assertBeetSupported(ty, 'map primitive type')
    const mapped = this.primaryTypeMap[ty]
    let typescriptType = mapped.ts

    if (typescriptType == null) {
      logDebug(`No mapped type found for ${name}: ${ty}, using any`)
      typescriptType = 'any'
    }
    assertKnownSerdePackage(mapped.sourcePack)
    if (mapped.pack != null) {
      assertKnownSerdePackage(mapped.pack)
    }
    return { typescriptType, pack: mapped.pack, sourcePack: mapped.sourcePack }
  }

  mapOld(type: IdlType, name: string = '<no name provided>') {
    let typescriptType
    let pack: SerdePackage | undefined
    let sourcePack: SerdePackage
    if (typeof type === 'string') {
      const mapped = this.mapPrimitiveTypeOld(type, name)
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
      const mapped = this.mapPrimitiveTypeOld(ty.option, name)
      const inner = mapped.typescriptType
      sourcePack = mapped.sourcePack
      let innerPrefix = ''
      if (mapped.pack != null) {
        assertKnownSerdePackage(mapped.pack)
        innerPrefix = `${serdePackageExportName(mapped.pack)}.`
      }
      typescriptType = `${BEET_EXPORT_NAME}.COption<${innerPrefix}${inner}>`
    } else {
      console.log(type)
      throw new Error(
        `Type ${type} needed for name '${name}' is not supported yet`
      )
    }
    return { typescriptType, pack, sourcePack }
  }

  private mapPrimitiveType(ty: IdlType & string, name: string) {
    this.assertBeetSupported(ty, 'map primitive type')
    const mapped = this.primaryTypeMap[ty]
    let typescriptType = mapped.ts

    if (typescriptType == null) {
      logDebug(`No mapped type found for ${name}: ${ty}, using any`)
      typescriptType = 'any'
    }
    if (mapped.pack != null) {
      assertKnownSerdePackage(mapped.pack)
      const exp = serdePackageExportName(mapped.pack)
      typescriptType = `${exp}.${typescriptType}`
      this.serdePackagesUsed.add(mapped.pack)
    }
    return typescriptType
  }

  private mapOption(ty: IdlTypeOption, name: string) {
    const inner = this.map(ty.option, name)
    const optionPackage = BEET_PACKAGE
    this.serdePackagesUsed.add(optionPackage)
    const exp = serdePackageExportName(optionPackage)
    return `${exp}.COption<${inner}>`
  }

  private mapVec(ty: IdlTypeVec, name: string) {
    const inner = this.map(ty.vec, name)
    return `${inner}[]`
  }

  private mapDefined(ty: IdlTypeDefined) {
    const userDefinedPackage = LOCAL_TYPES_PACKAGE
    this.serdePackagesUsed.add(userDefinedPackage)
    const exp = serdePackageExportName(userDefinedPackage)
    return `${exp}.${ty.defined}`
  }

  map(ty: IdlType, name: string = '<no name provided>'): string {
    if (typeof ty === 'string') {
      return this.mapPrimitiveType(ty, name)
    }
    if (isIdlTypeOption(ty)) {
      return this.mapOption(ty, name)
    }
    if (isIdlTypeVec(ty)) {
      return this.mapVec(ty, name)
    }
    if (isIdlTypeDefined(ty)) {
      return this.mapDefined(ty)
    }
    return 'FAIL'
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
