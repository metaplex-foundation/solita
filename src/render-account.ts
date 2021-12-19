import { BEET_SOLANA_LIB, serdeLibPrefix, TypeMapper } from './type-mapper'
import { IdlAccount } from './types'

function colonSeparatedTypedField(
  field: { name: string; tsType: string },
  prefix = ''
) {
  return `${prefix}${field.name}: ${field.tsType}`
}

class AccountRenderer {
  readonly upperCamelAccountName: string
  readonly camelAccountName: string
  readonly accountDataClassName: string
  readonly accountDataArgsTypeName: string
  readonly dataStructName: string
  needsBeetSolana: boolean = false

  constructor(
    private readonly account: IdlAccount,
    private readonly typeMapper: TypeMapper
  ) {
    this.upperCamelAccountName = account.name
      .charAt(0)
      .toUpperCase()
      .concat(account.name.slice(1))

    this.camelAccountName = account.name
      .charAt(0)
      .toLowerCase()
      .concat(account.name.slice(1))

    this.accountDataClassName = `${this.upperCamelAccountName}Data`
    this.accountDataArgsTypeName = `${this.accountDataClassName}Args`
    this.dataStructName = `${this.camelAccountName}DataStruct`
  }

  private getTypedFields() {
    return this.account.type.fields.map((f) => {
      this.typeMapper.assertBeetSupported(f.type, `account field ${f.name}`)
      const { typescriptType } = this.typeMapper.map(f.type, f.name)
      return { name: f.name, tsType: typescriptType }
    })
  }

  private getBeetFields(): { name: string; lib: string; type: string }[] {
    return this.account.type.fields.map((f) => {
      this.typeMapper.assertBeetSupported(f.type, `account field ${f.name}`)
      const { serdeLib } = this.typeMapper.map(f.type, f.name)
      if (serdeLib === BEET_SOLANA_LIB) {
        this.needsBeetSolana = true
      }
      const lib = serdeLibPrefix(serdeLib)
      return { name: f.name, lib, type: f.type }
    })
  }

  private renderImports() {
    const web3Imports = ['AccountInfo', 'PublicKey']
    const beetSolana = this.needsBeetSolana
      ? `\nimport * as beetSolana from '@metaplex-foundation/beet-solana';`
      : ''

    return `import {
  ${web3Imports.join(',\n  ')}
} from '@solana/web3.js';
import * as beet from '@metaplex-foundation/beet';${beetSolana}`
  }

  private renderAccountDataArgsType(
    fields: { name: string; tsType: string }[]
  ) {
    const renderedFields = fields
      .map((f) => colonSeparatedTypedField(f))
      .join('\n  ')

    return `export type ${this.accountDataArgsTypeName} = {
  ${renderedFields}
}`
  }

  private renderAccountDataClass(fields: { name: string; tsType: string }[]) {
    const constructorArgs = fields
      .map((f) => colonSeparatedTypedField(f, 'readonly '))
      .join(',\n    ')

    const constructorParams = fields
      .map((f) => `args.${f.name}`)
      .join(',\n      ')

    return `export class ${this.accountDataClassName} {
  private constructor(
    ${constructorArgs}
  ) {}

  static fromArgs(args: ${this.accountDataArgsTypeName}) {
    return new ${this.accountDataClassName}(
      ${constructorParams}
    );
  }

  static fromAccountInfo(accountInfo: AccountInfo<Buffer>, offset = 0) {
    return ${this.accountDataClassName}.deserialize(accountInfo.data, offset)
  }

  static deserialize(buf: Buffer, offset = 0) {
    return ${this.dataStructName}.deserialize(buf, offset);
  }

  serialize() {
    return ${this.dataStructName}.serialize(this)
  }
}`
  }

  private renderDataStruct(
    fields: { name: string; lib: string; type: string }[]
  ) {
    const fieldDecls = fields
      .map(({ name, lib, type }) => `[ '${name}', ${lib}.${type} ]`)
      .join(',\n    ')

    return `const ${this.dataStructName} = new beet.BeetStruct<
    ${this.accountDataClassName},
    ${this.accountDataArgsTypeName}
>(
  [
    ${fieldDecls}
  ],
  ${this.accountDataClassName}.fromArgs,
  '${this.accountDataClassName}'
)`
  }

  render() {
    const typedFields = this.getTypedFields()
    const beetFields = this.getBeetFields()
    const imports = this.renderImports()
    const accountDataArgsType = this.renderAccountDataArgsType(typedFields)
    const accountDataClass = this.renderAccountDataClass(typedFields)
    const dataStruct = this.renderDataStruct(beetFields)
    return `${imports}

${accountDataArgsType}

${accountDataClass}

${dataStruct}`
  }
}

export function renderAccount(account: IdlAccount) {
  const typeMapper = new TypeMapper()
  const renderer = new AccountRenderer(account, typeMapper)
  return renderer.render()
}

/*
if (module === require.main) {
  async function main() {
    const account = require('../test/fixtures/auction_house.json').accounts[0]
    console.log(renderAccount(account))
  }

  main()
    .then(() => process.exit(0))
    .catch((err: any) => {
      console.error(err)
      process.exit(1)
    })
}
*/
