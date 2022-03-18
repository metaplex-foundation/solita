import { TypeMapper } from './type-mapper'
import {
  BEET_PACKAGE,
  IdlDefinedTypeDefinition,
  IdlField,
  isIdlTypeEnum,
} from './types'
import { strict as assert } from 'assert'
import { renderTypeDataStruct, serdePackageExportName } from './serdes'
import { renderScalarEnum } from './render-enums'
import { PathLike } from 'fs'

export function beetVarNameFromTypeName(ty: string) {
  const camelTyName = ty.charAt(0).toLowerCase().concat(ty.slice(1))
  return `${camelTyName}Beet`
}

class TypeRenderer {
  readonly upperCamelTyName: string
  readonly camelTyName: string
  readonly beetArgName: string
  constructor(
    readonly ty: IdlDefinedTypeDefinition,
    readonly fullFileDir: PathLike,
    readonly typeMapper = new TypeMapper()
  ) {
    this.upperCamelTyName = ty.name
      .charAt(0)
      .toUpperCase()
      .concat(ty.name.slice(1))

    this.camelTyName = ty.name.charAt(0).toLowerCase().concat(ty.name.slice(1))
    this.beetArgName = beetVarNameFromTypeName(ty.name)
  }

  // -----------------
  // Rendered Fields
  // -----------------
  private renderTypeField = (field: IdlField) => {
    const typescriptType = this.typeMapper.map(field.type, field.name)
    return `${field.name}: ${typescriptType}`
  }

  private renderTypeScriptType() {
    if (isIdlTypeEnum(this.ty.type)) {
      return renderScalarEnum(
        this.ty.name,
        this.ty.type.variants.map((x) => x.name),
        true
      )
    }
    if (this.ty.type.fields.length === 0) return ''
    const fields = this.ty.type.fields
      .map((field) => this.renderTypeField(field))
      .join(',\n  ')

    const code = `export type ${this.upperCamelTyName} = {
  ${fields}
}`
    return code
  }

  // -----------------
  // Imports
  // -----------------
  private renderImports() {
    const imports = this.typeMapper.importsUsed(this.fullFileDir)
    return imports.join('\n')
  }

  // -----------------
  // Data Struct
  // -----------------
  private renderDataStructOrEnum() {
    if (isIdlTypeEnum(this.ty.type)) {
      const serde = this.typeMapper.mapSerde(this.ty.type, this.ty.name)
      const enumTy = this.typeMapper.map(this.ty.type, this.ty.name)
      this.typeMapper.serdePackagesUsed.add(BEET_PACKAGE)
      const exp = serdePackageExportName(BEET_PACKAGE)
      // Need the cast here since otherwise type is assumed to be
      // FixedSizeBeet<typeof ${enumTy}, typeof ${enumTy}> which is incorrect
      return `const ${this.beetArgName} = ${serde} as ${exp}.FixedSizeBeet<${enumTy}, ${enumTy}>`
    }

    const mappedFields = this.typeMapper.mapSerdeFields(this.ty.type.fields)
    return renderTypeDataStruct({
      fields: mappedFields,
      beetVarName: this.beetArgName,
      typeName: this.upperCamelTyName,
      isFixable: this.typeMapper.usedFixableSerde,
    })
  }

  render() {
    this.typeMapper.clearUsages()
    const kind = this.ty.type.kind
    assert(
      kind === 'struct' || kind === 'enum',
      `only user defined structs or enums are supported, ${this.ty.name} is of type ${this.ty.type.kind}`
    )
    const typeScriptType = this.renderTypeScriptType()
    const dataStruct = this.renderDataStructOrEnum()
    const imports = this.renderImports()
    return `
${imports}
${typeScriptType}

/**
 * @category userTypes
 * @category generated
 */
export ${dataStruct}
`.trim()
  }
}

export function renderType(
  ty: IdlDefinedTypeDefinition,
  fullFileDir: PathLike,
  accountFilesByType: Map<string, string>,
  customFilesByType: Map<string, string>
) {
  const typeMapper = new TypeMapper(accountFilesByType, customFilesByType)
  const renderer = new TypeRenderer(ty, fullFileDir, typeMapper)
  const code = renderer.render()
  const isFixable = renderer.typeMapper.usedFixableSerde
  return { code, isFixable }
}
