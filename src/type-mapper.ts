import {
  BEET_EXPORT_NAME,
  IdlField,
  IdlInstructionArg,
  IdlType,
  IdlTypeDefined,
  IdlTypeOption,
  IdlTypeVec,
  isIdlTypeDefined,
  isIdlTypeOption,
  isIdlTypeVec,
  LOCAL_TYPES_PACKAGE,
  PrimaryTypeMap,
  TypeMappedSerdeField,
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
  serdePackageTypePrefix,
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

  // -----------------
  // Map TypeScript Type
  // -----------------
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

  private mapOptionType(ty: IdlTypeOption, name: string) {
    const inner = this.map(ty.option, name)
    const optionPackage = BEET_PACKAGE
    this.serdePackagesUsed.add(optionPackage)
    const exp = serdePackageExportName(optionPackage)
    return `${exp}.COption<${inner}>`
  }

  private mapVecType(ty: IdlTypeVec, name: string) {
    const inner = this.map(ty.vec, name)
    return `${inner}[]`
  }

  private mapDefinedType(ty: IdlTypeDefined) {
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
      return this.mapOptionType(ty, name)
    }
    if (isIdlTypeVec(ty)) {
      return this.mapVecType(ty, name)
    }
    if (isIdlTypeDefined(ty)) {
      return this.mapDefinedType(ty)
    }

    throw new Error(`Type ${ty} required for ${name} is not yet supported`)
  }

  // -----------------
  // Map Serde
  // -----------------
  private mapPrimitiveSerde(ty: IdlType & string, name: string) {
    this.assertBeetSupported(ty, `account field ${name}`)
    const mapped = this.primaryTypeMap[ty]

    assertKnownSerdePackage(mapped.sourcePack)
    const packExportName = serdePackageExportName(mapped.sourcePack)
    this.serdePackagesUsed.add(mapped.sourcePack)
    return `${packExportName}.${ty}`
  }

  private mapOptionSerde(ty: IdlTypeOption, name: string) {
    const inner = this.mapSerde(ty.option, name)
    const optionPackage = BEET_PACKAGE
    this.serdePackagesUsed.add(optionPackage)
    const exp = serdePackageExportName(optionPackage)
    return `${exp}.coption(${inner})`
  }

  private mapVecSerde(ty: IdlTypeVec, name: string) {
    const inner = this.mapSerde(ty.vec, name)
    const fixedSizeArrayPackage = BEET_PACKAGE
    this.serdePackagesUsed.add(fixedSizeArrayPackage)
    const exp = serdePackageExportName(fixedSizeArrayPackage)
    // TODO(thlorenz): for now hardcoding `1` until we figure out how to handle dynamically sized arrays
    return `${exp}.fixedSizeArray(${inner}, 1)`
  }

  private mapDefinedSerde(ty: IdlTypeDefined) {
    const userDefinedPackage = LOCAL_TYPES_PACKAGE
    this.serdePackagesUsed.add(userDefinedPackage)
    const exp = serdePackageExportName(userDefinedPackage)
    return `${exp}.${ty.defined}.struct`
  }

  mapSerde(ty: IdlType, name: string = '<no name provided>'): string {
    if (typeof ty === 'string') {
      return this.mapPrimitiveSerde(ty, name)
    }
    if (isIdlTypeOption(ty)) {
      return this.mapOptionSerde(ty, name)
    }
    if (isIdlTypeVec(ty)) {
      return this.mapVecSerde(ty, name)
    }
    if (isIdlTypeDefined(ty)) {
      return this.mapDefinedSerde(ty)
    }
    throw new Error(`Type ${ty} required for ${name} is not yet supported`)
  }

  mapSerdeFields(
    fields: (IdlField | IdlInstructionArg)[]
  ): TypeMappedSerdeField[] {
    return fields.map((f) => {
      const ty = this.mapSerde(f.type, f.name)
      return { name: f.name, type: ty }
    })
  }

  // -----------------
  // Imports Generator
  // -----------------
  importsForSerdePackagesUsed() {
    const imports = []
    for (const pack of this.serdePackagesUsed) {
      const exp = serdePackageExportName(pack)
      imports.push(`import * as ${exp} from '${pack}';`)
    }
    return imports
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
