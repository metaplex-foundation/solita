import {
  BEET_EXPORT_NAME,
  BEET_SOLANA_EXPORT_NAME,
  renderDataStruct,
  serdePackageExportName,
  serdeProcess,
  SOLANA_WEB3_EXPORT_NAME,
} from './serdes'
import { TypeMapper } from './type-mapper'
import { IdlAccount, ProcessedSerde } from './types'
import { accountDiscriminator } from './utils'

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
  readonly accountDiscriminatorName: string
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
    this.accountDiscriminatorName = `${this.camelAccountName}AccountDiscriminator`
  }

  private serdeProcess() {
    const { processed, needsBeetSolana } = serdeProcess(
      this.account.type.fields,
      this.typeMapper
    )
    this.needsBeetSolana = needsBeetSolana
    return processed
  }

  // -----------------
  // Rendered Fields
  // -----------------
  private getTypedFields() {
    return this.account.type.fields.map((f) => {
      this.typeMapper.assertBeetSupported(f.type, `account field ${f.name}`)
      const { typescriptType, pack } = this.typeMapper.map(f.type, f.name)
      let tsType = typescriptType
      if (pack != null) {
        const packExportName = serdePackageExportName(pack)
        tsType = `${packExportName}.${typescriptType}`
      }
      return { name: f.name, tsType }
    })
  }

  private getPrettyFields() {
    return this.account.type.fields.map((f) => {
      const postfix = f.type === 'publicKey' ? '.toBase58()' : ''
      return `${f.name}: this.${f.name}${postfix}`
    })
  }

  // -----------------
  // Imports
  // -----------------
  private renderImports() {
    const beetSolana = this.needsBeetSolana
      ? `\nimport * as ${BEET_SOLANA_EXPORT_NAME} from '@metaplex-foundation/beet-solana';`
      : ''

    return `import * as ${SOLANA_WEB3_EXPORT_NAME} from '@solana/web3.js';
import * as ${BEET_EXPORT_NAME} from '@metaplex-foundation/beet';${beetSolana}`
  }

  // -----------------
  // Account Args
  // -----------------
  private renderAccountDataArgsType(
    fields: { name: string; tsType: string }[]
  ) {
    const renderedFields = fields
      .map((f) => colonSeparatedTypedField(f))
      .join('\n  ')

    return `/**
 * Arguments used to create {@link ${this.accountDataClassName}}
 */
export type ${this.accountDataArgsTypeName} = {
  ${renderedFields}
}`
  }

  // -----------------
  // AccountData class
  // -----------------
  private renderAccountDataClass(fields: { name: string; tsType: string }[]) {
    const constructorArgs = fields
      .map((f) => colonSeparatedTypedField(f, 'readonly '))
      .join(',\n    ')

    const constructorParams = fields
      .map((f) => `args.${f.name}`)
      .join(',\n      ')

    const prettyFields = this.getPrettyFields().join(',\n      ')
    const accountDisc = JSON.stringify(
      Array.from(accountDiscriminator(this.account.name))
    )

    return `const ${this.accountDiscriminatorName} = ${accountDisc};
/**
 * Holds the data for the {@link ${this.upperCamelAccountName}Account} and provides de/serialization
 * functionality for that data
 */
export class ${this.accountDataClassName} {
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
   * Deserializes the {@link ${this.accountDataClassName}} from the data of the provided {@link web3.AccountInfo}.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static fromAccountInfo(
    accountInfo: web3.AccountInfo<Buffer>,
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
    return ${this.dataStructName}.serialize({ 
      accountDiscriminator: ${this.accountDiscriminatorName},
      ...this
    })
  }

  /**
   * Returns the byteSize of a {@link Buffer} holding the serialized data of
   * {@link ${this.accountDataClassName}}
   */
  static get byteSize() {
    return ${this.dataStructName}.byteSize;
  }

  /**
   * Fetches the minimum balance needed to exempt an account holding 
   * {@link ${this.accountDataClassName}} data from rent
   */
  static async getMinimumBalanceForRentExemption(
    connection: web3.Connection,
    commitment?: web3.Commitment,
  ): Promise<number> {
    return connection.getMinimumBalanceForRentExemption(
      ${this.accountDataClassName}.byteSize,
      commitment,
    );
  }

  /**
   * Determines if the provided {@link Buffer} has the correct byte size to
   * hold {@link ${this.accountDataClassName}} data.
   */
  static hasCorrectByteSize(buf: Buffer, offset = 0) {
    return buf.byteLength - offset === ${this.accountDataClassName}.byteSize;
  }

  /**
   * Returns a readable version of {@link ${this.accountDataClassName}} properties
   * and can be used to convert to JSON and/or logging
   */
  pretty() {
    return {
      ${prettyFields}
    };
  }
}`
  }

  // -----------------
  // Struct
  // -----------------
  private renderDataStruct(fields: ProcessedSerde[]) {
    return renderDataStruct({
      fields,
      structVarName: this.dataStructName,
      className: this.accountDataClassName,
      argsTypename: this.accountDataArgsTypeName,
      discriminatorName: 'accountDiscriminator',
    })
  }

  render() {
    const typedFields = this.getTypedFields()
    const beetFields = this.serdeProcess()
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
