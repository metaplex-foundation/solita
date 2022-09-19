import {
  IdlEnumVariant,
  IdlField,
  IdlInstructionArg,
  IdlType,
  IdlTypeArray,
  IdlTypeBTreeMap,
  IdlTypeBTreeSet,
  IdlTypeDefined,
  IdlTypeEnum,
  IdlTypeHashMap,
  IdlTypeHashSet,
  IdlTypeOption,
  IdlTypeTuple,
  IdlTypeVec,
  isIdlTypeArray,
  isIdlTypeBTreeMap,
  isIdlTypeBTreeSet,
  isIdlTypeDefined,
  isIdlTypeEnum,
  isIdlTypeHashMap,
  isIdlTypeHashSet,
  isIdlTypeOption,
  isIdlTypeTuple,
  isIdlTypeVec,
  isNumberLikeType,
  isPrimitiveType,
  PrimaryTypeMap,
  PrimitiveTypeKey,
  TypeMappedSerdeField,
} from './types'
import { getOrCreate, logDebug, withoutTsExtension } from './utils'
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
import { beetVarNameFromTypeName } from './render-type'
import path from 'path'
import { PathLike } from 'fs'

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

const NO_NAME_PROVIDED = '<no name provided>'
export class TypeMapper {
  readonly serdePackagesUsed: Set<SerdePackage> = new Set()
  readonly localImportsByPath: Map<string, Set<string>> = new Map()
  readonly scalarEnumsUsed: Map<string, string[]> = new Map()
  usedFixableSerde: boolean = false
  constructor(
    /** Account types mapped { typeName: fullPath } */
    private readonly accountTypesPaths: Map<string, string> = new Map(),
    /** Custom types mapped { typeName: fullPath } */
    private readonly customTypesPaths: Map<string, string> = new Map(),
    /** Aliases mapped { alias: actualType } */
    private readonly typeAliases: Map<string, PrimitiveTypeKey> = new Map(),
    private readonly forceFixable: ForceFixable = FORCE_FIXABLE_NEVER,
    private readonly primaryTypeMap: PrimaryTypeMap = TypeMapper.defaultPrimaryTypeMap
  ) {}

  clearUsages() {
    this.serdePackagesUsed.clear()
    this.localImportsByPath.clear()
    this.scalarEnumsUsed.clear()
    this.usedFixableSerde = false
  }

  clone() {
    return new TypeMapper(
      this.accountTypesPaths,
      this.customTypesPaths,
      this.typeAliases,
      this.forceFixable,
      this.primaryTypeMap
    )
  }

  /**
   * When using a cloned typemapper temporarily in order to track usages for a
   * subset of mappings we need to sync the main mapper to include the updates
   * captured by the sub mapper. This is what this method does.
   */
  syncUp(tm: TypeMapper) {
    for (const used of tm.serdePackagesUsed) {
      this.serdePackagesUsed.add(used)
    }
    for (const [key, val] of tm.localImportsByPath) {
      const thisVal = this.localImportsByPath.get(key) ?? new Set()
      this.localImportsByPath.set(key, new Set([...thisVal, ...val]))
    }
    for (const [key, val] of tm.scalarEnumsUsed) {
      const thisVal = this.scalarEnumsUsed.get(key) ?? []
      this.scalarEnumsUsed.set(key, Array.from(new Set([...thisVal, ...val])))
    }
    this.usedFixableSerde = this.usedFixableSerde || tm.usedFixableSerde
  }

  private updateUsedFixableSerde(ty: SupportedTypeDefinition) {
    this.usedFixableSerde = this.usedFixableSerde || ty.isFixable
  }

  private updateScalarEnumsUsed(name: string, ty: IdlTypeEnum) {
    const variants = ty.variants.map((x: IdlEnumVariant) => x.name)
    const currentUsed = this.scalarEnumsUsed.get(name)
    if (currentUsed != null) {
      assert.deepStrictEqual(
        variants,
        currentUsed,
        `Found two enum variant specs for ${name}, ${variants} and ${currentUsed}`
      )
    } else {
      this.scalarEnumsUsed.set(name, variants)
    }
  }

  // -----------------
  // Map TypeScript Type
  // -----------------
  private mapPrimitiveType(ty: PrimitiveTypeKey, name: string) {
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

  private mapArrayType(ty: IdlTypeArray, name: string) {
    const inner = this.map(ty.array[0], name)
    const size = ty.array[1]
    return `${inner}[] /* size: ${size} */`
  }

  private mapTupleType(ty: IdlTypeTuple, name: string) {
    const innerTypes = []
    for (const inner of ty.tuple) {
      innerTypes.push(this.map(inner, name))
    }
    const inners = innerTypes.join(', ')
    return `[${inners}]`
  }

  private mapBTreeMapType(ty: IdlTypeBTreeMap, name: string) {
    return this.mapMapType(ty.bTreeMap, name)
  }

  private mapHashMapType(ty: IdlTypeHashMap, name: string) {
    return this.mapMapType(ty.hashMap, name)
  }

  private mapMapType(inners: [IdlType, IdlType], name: string) {
    const innerTypes = [this.map(inners[0], name), this.map(inners[1], name)]

    // Overcoming TypeScript issues related to `toFixedFromValue` which considers `bignum`
    // incompat with `Partial<bignum>`.
    // If this can be fixed in beet instead we won't need this overspecification anymore.
    const innerTy1 =
      !isNumberLikeType(inners[1]) || isPrimitiveType(inners[1])
        ? innerTypes[1]
        : `Partial<${innerTypes[1]}>`

    return `Map<${innerTypes[0]}, ${innerTy1}>`
  }

  private mapBTreeSetType(ty: IdlTypeBTreeSet, name: string) {
    return this.mapSetType(ty.bTreeSet, name)
  }

  private mapHashSetType(ty: IdlTypeHashSet, name: string) {
    return this.mapSetType(ty.hashSet, name)
  }

  private mapSetType(inner: IdlType, name: string) {
    const innerType = this.map(inner, name)
    return `Set<${innerType}>`
  }

  private mapDefinedType(ty: IdlTypeDefined) {
    const fullFileDir = this.definedTypesImport(ty)
    const imports = getOrCreate(this.localImportsByPath, fullFileDir, new Set())
    imports.add(ty.defined)
    return ty.defined
  }

  private mapEnumType(ty: IdlTypeEnum, name: string) {
    if (name === NO_NAME_PROVIDED && ty.name != null) {
      name = ty.name
    }
    assert.notEqual(
      name,
      NO_NAME_PROVIDED,
      'Need to provide name for enum types'
    )
    this.updateScalarEnumsUsed(name, ty)
    return name
  }

  map(ty: IdlType, name: string = NO_NAME_PROVIDED): string {
    assert(ty != null, `Type for ${name} needs to be defined`)

    if (typeof ty === 'string') {
      return this.mapPrimitiveType(ty, name)
    }
    if (isIdlTypeOption(ty)) {
      return this.mapOptionType(ty, name)
    }
    if (isIdlTypeVec(ty)) {
      return this.mapVecType(ty, name)
    }
    if (isIdlTypeArray(ty)) {
      return this.mapArrayType(ty, name)
    }
    if (isIdlTypeDefined(ty)) {
      const alias = this.typeAliases.get(ty.defined)
      return alias == null
        ? this.mapDefinedType(ty)
        : this.mapPrimitiveType(alias, name)
    }
    if (isIdlTypeEnum(ty)) {
      return this.mapEnumType(ty, name)
    }

    if (isIdlTypeTuple(ty)) {
      return this.mapTupleType(ty, name)
    }

    if (isIdlTypeHashMap(ty)) {
      return this.mapHashMapType(ty, name)
    }
    if (isIdlTypeBTreeMap(ty)) {
      return this.mapBTreeMapType(ty, name)
    }

    if (isIdlTypeHashSet(ty)) {
      return this.mapHashSetType(ty, name)
    }
    if (isIdlTypeBTreeSet(ty)) {
      return this.mapBTreeSetType(ty, name)
    }

    console.log(ty)

    throw new Error(`Type ${ty} required for ${name} is not yet supported`)
  }

  // -----------------
  // Map Serde
  // -----------------
  private mapPrimitiveSerde(ty: PrimitiveTypeKey, name: string) {
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

  private mapArraySerde(ty: IdlTypeArray, name: string) {
    const inner = this.mapSerde(ty.array[0], name)
    const size = ty.array[1]
    const mapped = this.primaryTypeMap['UniformFixedSizeArray']
    const arrayPackage = mapped.sourcePack
    assertKnownSerdePackage(arrayPackage)

    this.serdePackagesUsed.add(arrayPackage)
    this.updateUsedFixableSerde(mapped)

    const exp = serdePackageExportName(arrayPackage)
    return `${exp}.${mapped.beet}(${inner}, ${size})`
  }

  private mapDefinedSerde(ty: IdlTypeDefined) {
    const fullFileDir = this.definedTypesImport(ty)
    const imports = getOrCreate(this.localImportsByPath, fullFileDir, new Set())
    const varName = beetVarNameFromTypeName(ty.defined)
    imports.add(varName)
    return varName
  }

  private mapEnumSerde(ty: IdlTypeEnum, name: string) {
    if (name === NO_NAME_PROVIDED && ty.name != null) {
      name = ty.name
    }
    assert.notEqual(
      name,
      NO_NAME_PROVIDED,
      'Need to provide name for enum types'
    )
    const scalarEnumPackage = BEET_PACKAGE
    const exp = serdePackageExportName(BEET_PACKAGE)
    this.serdePackagesUsed.add(scalarEnumPackage)

    this.updateScalarEnumsUsed(name, ty)
    return `${exp}.fixedScalarEnum(${name})`
  }

  private mapTupleSerde(ty: IdlTypeTuple, name: string) {
    const tuplePackage = BEET_PACKAGE
    const exp = serdePackageExportName(BEET_PACKAGE)
    this.serdePackagesUsed.add(tuplePackage)

    const innerSerdes = []
    const innerMapper = this.clone()
    for (const inner of ty.tuple) {
      innerSerdes.push(innerMapper.mapSerde(inner, name))
    }
    this.syncUp(innerMapper)
    const inners = innerSerdes.join(', ')

    if (innerMapper.usedFixableSerde) {
      const tuple = this.primaryTypeMap.Tuple
      return `${exp}.${tuple.beet}([${inners}])`
    } else {
      const fixedTuple = this.primaryTypeMap.FixedSizeTuple
      return `${exp}.${fixedTuple.beet}([${inners}])`
    }
  }

  private mapBTreeMapSerde(ty: IdlTypeBTreeMap, name: string) {
    return this.mapMapSerde(ty.bTreeMap, name)
  }

  private mapHashMapSerde(ty: IdlTypeHashMap, name: string) {
    return this.mapMapSerde(ty.hashMap, name)
  }

  private mapMapSerde(inners: [IdlType, IdlType], name: string) {
    const mapPackage = BEET_PACKAGE
    const exp = serdePackageExportName(BEET_PACKAGE)
    this.serdePackagesUsed.add(mapPackage)
    this.usedFixableSerde = true

    const [key, val] = [
      this.mapSerde(inners[0], name),
      this.mapSerde(inners[1], name),
    ]

    const map = this.primaryTypeMap.Map
    return `${exp}.${map.beet}(${key}, ${val})`
  }

  private mapBTreeSetSerde(ty: IdlTypeBTreeSet, name: string) {
    return this.mapSetSerde(ty.bTreeSet, name)
  }

  private mapHashSetSerde(ty: IdlTypeHashSet, name: string) {
    return this.mapSetSerde(ty.hashSet, name)
  }

  private mapSetSerde(inner: IdlType, name: string) {
    const mapPackage = BEET_PACKAGE
    const exp = serdePackageExportName(BEET_PACKAGE)
    this.serdePackagesUsed.add(mapPackage)
    this.usedFixableSerde = true

    const key = this.mapSerde(inner, name)

    const set = this.primaryTypeMap.Set
    return `${exp}.${set.beet}(${key})`
  }

  mapSerde(ty: IdlType, name: string = NO_NAME_PROVIDED): string {
    assert(ty != null, `Type for ${name} needs to be defined`)

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
    if (isIdlTypeArray(ty)) {
      return this.mapArraySerde(ty, name)
    }
    if (isIdlTypeEnum(ty)) {
      return this.mapEnumSerde(ty, name)
    }
    if (isIdlTypeDefined(ty)) {
      const alias = this.typeAliases.get(ty.defined)
      return alias == null
        ? this.mapDefinedSerde(ty)
        : this.mapPrimitiveSerde(alias, name)
    }

    if (isIdlTypeTuple(ty)) {
      return this.mapTupleSerde(ty, name)
    }

    if (isIdlTypeHashMap(ty)) {
      return this.mapHashMapSerde(ty, name)
    }
    if (isIdlTypeBTreeMap(ty)) {
      return this.mapBTreeMapSerde(ty, name)
    }

    if (isIdlTypeHashSet(ty)) {
      return this.mapHashSetSerde(ty, name)
    }
    if (isIdlTypeBTreeSet(ty)) {
      return this.mapBTreeSetSerde(ty, name)
    }
    throw new Error(`Type ${ty} required for ${name} is not yet supported`)
  }

  mapSerdeField = (
    field: IdlField | IdlInstructionArg
  ): TypeMappedSerdeField => {
    const ty = this.mapSerde(field.type, field.name)
    return { name: field.name, type: ty }
  }

  mapSerdeFields(
    fields: (IdlField | IdlInstructionArg)[]
  ): TypeMappedSerdeField[] {
    return fields.map(this.mapSerdeField)
  }

  // -----------------
  // Imports Generator
  // -----------------
  importsUsed(fileDir: PathLike, forcePackages?: Set<SerdePackage>) {
    return [
      ...this._importsForSerdePackages(forcePackages),
      ...this._importsForLocalPackages(fileDir.toString()),
    ]
  }

  private _importsForSerdePackages(forcePackages?: Set<SerdePackage>) {
    const packagesToInclude =
      forcePackages == null
        ? this.serdePackagesUsed
        : new Set([
            ...Array.from(this.serdePackagesUsed),
            ...Array.from(forcePackages),
          ])
    const imports = []
    for (const pack of packagesToInclude) {
      const exp = serdePackageExportName(pack)
      imports.push(`import * as ${exp} from '${pack}';`)
    }
    return imports
  }

  private _importsForLocalPackages(fileDir: string) {
    const renderedImports: string[] = []
    for (const [originPath, imports] of this.localImportsByPath) {
      let relPath = path.relative(fileDir, originPath)
      if (!relPath.startsWith('.')) {
        relPath = `./${relPath}`
      }
      const importPath = withoutTsExtension(relPath)
      renderedImports.push(
        `import { ${Array.from(imports).join(', ')} }  from '${importPath}';`
      )
    }
    return renderedImports
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
  private definedTypesImport(ty: IdlTypeDefined) {
    return (
      this.accountTypesPaths.get(ty.defined) ??
      this.customTypesPaths.get(ty.defined) ??
      assert.fail(
        `Unknown type ${ty.defined} is neither found in types nor an Account`
      )
    )
  }

  static defaultPrimaryTypeMap: PrimaryTypeMap = {
    ...beetSupportedTypeMap,
    ...beetSolanaSupportedTypeMap,
  }
}
