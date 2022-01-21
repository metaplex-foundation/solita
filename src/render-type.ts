import { TypeMapper } from './type-mapper'
import { IdlDefinedTypeDefinition, IdlField } from './types'
import { strict as assert } from 'assert'
import { renderTypeDataStruct } from './serdes'

export function structVarNameFromTypeName(ty: string) {
  const camelTyName = ty.charAt(0).toLowerCase().concat(ty.slice(1))
  return `${camelTyName}Struct`
}

class TypeRenderer {
  readonly upperCamelTyName: string
  readonly camelTyName: string
  readonly structArgName: string
  constructor(
    readonly ty: IdlDefinedTypeDefinition,
    readonly typeMapper = new TypeMapper()
  ) {
    this.upperCamelTyName = ty.name
      .charAt(0)
      .toUpperCase()
      .concat(ty.name.slice(1))

    this.camelTyName = ty.name.charAt(0).toLowerCase().concat(ty.name.slice(1))
    this.structArgName = structVarNameFromTypeName(ty.name)
  }

  // -----------------
  // Rendered Fields
  // -----------------
  private renderTypeField = (field: IdlField) => {
    const typescriptType = this.typeMapper.map(field.type, field.name)
    return `${field.name}: ${typescriptType}`
  }

  private renderTypeScriptType() {
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
    const imports = this.typeMapper.importsForSerdePackagesUsed()
    return imports.join('\n')
  }

  // -----------------
  // Data Struct
  // -----------------
  private renderDataStruct() {
    const mappedFields = this.typeMapper.mapSerdeFields(this.ty.type.fields)
    return renderTypeDataStruct({
      fields: mappedFields,
      structVarName: this.structArgName,
      typeName: this.upperCamelTyName,
      isFixable: this.typeMapper.usedFixableSerde,
    })
  }

  render() {
    this.typeMapper.clearUsages()
    assert.equal(
      this.ty.type.kind,
      'struct',
      `only user defined structs are supported, ${this.ty.name} is of type ${this.ty.type.kind}`
    )
    const typeScriptType = this.renderTypeScriptType()
    const dataStruct = this.renderDataStruct()
    const imports = this.renderImports()
    return `
${imports}
${typeScriptType}
export ${dataStruct}
`.trim()
  }
}

export function renderType(ty: IdlDefinedTypeDefinition) {
  const renderer = new TypeRenderer(ty)
  const code = renderer.render()
  const isFixable = renderer.typeMapper.usedFixableSerde
  return { code, isFixable }
}
