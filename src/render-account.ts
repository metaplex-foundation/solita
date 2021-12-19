import {
  assertKnownPackage,
  BEET_SOLANA_PACKAGE,
  SerdePackage,
  serdePackageExportName,
  serdePackageTypePrefix,
} from './serdes'
import { TypeMapper } from './type-mapper'
import { IdlAccount } from './types'

function colonSeparatedTypedField(
  field: { name: string; tsType: string },
  prefix = ''
) {
  return `${prefix}${field.name}: ${field.tsType}`
}

type AccountBeetField = {
  name: string
  sourcePack: SerdePackage
  type: string
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

    this.accountDataClassName = `${this.upperCamelAccountName}AccountData`
    this.accountDataArgsTypeName = `${this.accountDataClassName}Args`
    this.dataStructName = `${this.camelAccountName}AccountDataStruct`
  }

  private getTypedFields() {
    return this.account.type.fields.map((f) => {
      this.typeMapper.assertBeetSupported(f.type, `account field ${f.name}`)
      const { typescriptType } = this.typeMapper.map(f.type, f.name)
      return { name: f.name, tsType: typescriptType }
    })
  }

  private getBeetFields(): AccountBeetField[] {
    return this.account.type.fields.map((f) => {
      this.typeMapper.assertBeetSupported(f.type, `account field ${f.name}`)
      const { pack, sourcePack } = this.typeMapper.map(f.type, f.name)
      if (pack === BEET_SOLANA_PACKAGE) {
        this.needsBeetSolana = true
      }
      if (pack != null) {
        assertKnownPackage(pack)
      }
      const packExportName = serdePackageExportName(pack)
      return { name: f.name, packExportName, type: f.type, sourcePack }
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

  /**
   * Creates a {@link ${this.accountDataClassName}} instance from the provided args.
   */
  static fromArgs(args: ${this.accountDataArgsTypeName}) {
    return new ${this.accountDataClassName}(
      ${constructorParams}
    );
  }

  /**
   * Deserializes the {@link ${this.accountDataClassName}} from the data of the provided {@link AccountInfo}.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static fromAccountInfo(
    accountInfo: AccountInfo<Buffer>,
    offset = 0
  ): [ ${this.accountDataClassName}, number ]  {
    return ${this.accountDataClassName}.deserialize(accountInfo.data, offset)
  }

  /**
   * Deserializes the {@link ${this.accountDataClassName}} from the provided data Buffer.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static deserialize(
    buf: Buffer,
    offset = 0
  ): [ ${this.accountDataClassName}, number ]{
    return ${this.dataStructName}.deserialize(buf, offset);
  }

  /**
   * Serializes the {@link ${this.accountDataClassName}} into a Buffer.
   * @returns a tuple of the created Buffer and the offset up to which the buffer was written to store it.
   */
  serialize(): [ Buffer, number ] {
    return ${this.dataStructName}.serialize(this)
  }
}`
  }

  private renderDataStruct(fields: AccountBeetField[]) {
    const fieldDecls = fields
      .map(({ name, sourcePack, type }) => {
        const typePrefix = serdePackageTypePrefix(sourcePack)
        return `[ '${name}', ${typePrefix}${type} ]`
      })
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
