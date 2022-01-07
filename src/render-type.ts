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

if (module === require.main) {
  const types: IdlDefinedTypeDefinition[] = [
    {
      name: 'CandyMachineData',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'uuid',
            type: 'string',
          },
          {
            name: 'price',
            type: 'u64',
          },
          {
            name: 'itemsAvailable',
            type: 'u64',
          },
          {
            name: 'goLiveDate',
            type: {
              option: 'i64',
            },
          },
        ],
      },
    },
    {
      name: 'ConfigData',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'uuid',
            type: 'string',
          },
          {
            name: 'symbol',
            type: 'string',
          },
          {
            name: 'sellerFeeBasisPoints',
            type: 'u16',
          },
          {
            name: 'creators',
            type: {
              vec: {
                defined: 'Creator',
              },
            },
          },
          {
            name: 'maxSupply',
            type: 'u64',
          },
          {
            name: 'isMutable',
            type: 'bool',
          },
          {
            name: 'retainAuthority',
            type: 'bool',
          },
          {
            name: 'maxNumberOfLines',
            type: 'u32',
          },
        ],
      },
    },
    {
      name: 'ConfigLine',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'name',
            type: 'string',
          },
          {
            name: 'uri',
            type: 'string',
          },
        ],
      },
    },
    {
      name: 'Creator',
      type: {
        kind: 'struct',
        fields: [
          {
            name: 'address',
            type: 'publicKey',
          },
          {
            name: 'verified',
            type: 'bool',
          },
          {
            name: 'share',
            type: 'u8',
          },
        ],
      },
    },
  ]
  async function main() {
    for (const ty of types) {
      console.log(renderType(ty))
    }
  }

  main()
    .then(() => process.exit(0))
    .catch((err: any) => {
      console.error(err)
      process.exit(1)
    })
}
