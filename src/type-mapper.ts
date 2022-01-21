import {
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
  SupportedTypeDefinition,
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
import { structVarNameFromTypeName } from './render-type'

export function resolveSerdeAlias(ty: string) {
  switch (ty) {
    case 'option':
      return 'coption'
    default:
      return ty
  }
}

export type ForceFixable = (ty: IdlType) => boolean
export const FORCE_FIXABLE_NEVER: ForceFixable = () => false

export class TypeMapper {
  readonly serdePackagesUsed: Set<SerdePackage> = new Set()
  usedFixableSerde: boolean = false
  constructor(
    private readonly forceFixable: ForceFixable = FORCE_FIXABLE_NEVER,
    private readonly primaryTypeMap: PrimaryTypeMap = TypeMapper.defaultPrimaryTypeMap
  ) {}

  clearUsages() {
    this.serdePackagesUsed.clear()
    this.usedFixableSerde = false
  }

  private updateUsedFixableSerde(ty: SupportedTypeDefinition) {
    this.usedFixableSerde = this.usedFixableSerde || ty.isFixable
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

    if (ty === 'string') return this.mapStringSerde(ty)

    const mapped = this.primaryTypeMap[ty]

    assertKnownSerdePackage(mapped.sourcePack)
    const packExportName = serdePackageExportName(mapped.sourcePack)

    this.serdePackagesUsed.add(mapped.sourcePack)
    this.updateUsedFixableSerde(mapped)

    return `${packExportName}.${ty}`
  }

  private mapStringSerde(ty: 'string') {
    const mapped = this.primaryTypeMap[ty]

    assertKnownSerdePackage(mapped.sourcePack)
    const packExportName = serdePackageExportName(mapped.sourcePack)

    this.serdePackagesUsed.add(mapped.sourcePack)
    this.updateUsedFixableSerde(mapped)

    return `${packExportName}.${mapped.beet}`
  }

  private mapOptionSerde(ty: IdlTypeOption, name: string) {
    const inner = this.mapSerde(ty.option, name)
    const optionPackage = BEET_PACKAGE

    this.serdePackagesUsed.add(optionPackage)
    this.usedFixableSerde = true

    const exp = serdePackageExportName(optionPackage)
    return `${exp}.coption(${inner})`
  }

  private mapVecSerde(ty: IdlTypeVec, name: string) {
    const inner = this.mapSerde(ty.vec, name)
    const arrayPackage = BEET_PACKAGE

    this.serdePackagesUsed.add(arrayPackage)
    this.usedFixableSerde = true

    const exp = serdePackageExportName(arrayPackage)
    return `${exp}.array(${inner})`
  }

  private mapDefinedSerde(ty: IdlTypeDefined) {
    const userDefinedPackage = LOCAL_TYPES_PACKAGE
    this.serdePackagesUsed.add(userDefinedPackage)
    const exp = serdePackageExportName(userDefinedPackage)
    const structVarName = structVarNameFromTypeName(ty.defined)
    return `${exp}.${structVarName}`
  }

  mapSerde(ty: IdlType, name: string = '<no name provided>'): string {
    if (this.forceFixable(ty)) {
      this.usedFixableSerde = true
    }

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
  importsForSerdePackagesUsed(forcePackages?: Set<SerdePackage>) {
    const imports = []
    const packagesToInclude =
      forcePackages == null
        ? this.serdePackagesUsed
        : new Set([
            ...Array.from(this.serdePackagesUsed),
            ...Array.from(forcePackages),
          ])
    for (const pack of packagesToInclude) {
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
