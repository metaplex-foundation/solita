import { TypeMapper } from './type-mapper'
import { IdlDefinedTypeDefinition, IdlField } from './types'
import { strict as assert } from 'assert'
import { serdePackageTypePrefix } from './serdes'

class TypeRenderer {
  readonly upperCamelTyName: string
  readonly camelTyName: string
  constructor(
    readonly ty: IdlDefinedTypeDefinition,
    private readonly typeMapper = new TypeMapper()
  ) {
    this.upperCamelTyName = ty.name
      .charAt(0)
      .toUpperCase()
      .concat(ty.name.slice(1))

    this.camelTyName = ty.name.charAt(0).toLowerCase().concat(ty.name.slice(1))
  }

  private renderTypeField = (field: IdlField) => {
    const { typescriptType, pack } = this.typeMapper.map(field.type, field.name)
    const typePrefix = serdePackageTypePrefix(pack)
    return `${field.name}: ${typePrefix}${typescriptType}`
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

  render() {
    assert.equal(
      this.ty.type.kind,
      'struct',
      `only user defined structs are supported, ${this.ty.name} is of type ${this.ty.type.kind}`
    )
    return this.renderTypeScriptType()
  }
}

export function renderType(ty: IdlDefinedTypeDefinition) {
  const renderer = new TypeRenderer(ty)
  return renderer.render()
}
