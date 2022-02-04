import { renderScalarEnums } from './render-enums'
import { renderDataStruct } from './serdes'
import { ForceFixable, TypeMapper } from './type-mapper'
import {
  BEET_PACKAGE,
  IdlAccount,
  SOLANA_WEB3_PACKAGE,
  TypeMappedSerdeField,
} from './types'
import {
  accountDiscriminator,
  anchorDiscriminatorField,
  anchorDiscriminatorType,
} from './utils'

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

  constructor(
    private readonly account: IdlAccount,
    private readonly hasImplicitDiscriminator: boolean,
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
    return this.typeMapper.mapSerdeFields(this.account.type.fields)
  }

  // -----------------
  // Rendered Fields
  // -----------------
  private getTypedFields() {
    return this.account.type.fields.map((f) => {
      const tsType = this.typeMapper.map(f.type, f.name)
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
    const imports = this.typeMapper.importsForSerdePackagesUsed(
      new Set([SOLANA_WEB3_PACKAGE, BEET_PACKAGE])
    )
    return imports.join('\n')
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

  private renderByteSizeMethods() {
    if (this.typeMapper.usedFixableSerde) {
      const byteSizeValue = this.hasImplicitDiscriminator
        ? `{
      accountDiscriminator: ${this.accountDiscriminatorName},
      ...instance,
    }`
        : `instance`

      return `
  /**
   * Returns the byteSize of a {@link Buffer} holding the serialized data of
   * {@link ${this.accountDataClassName}} for the provided args.
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   */
  static byteSize(args: ${this.accountDataArgsTypeName}) {
    const instance = ${this.accountDataClassName}.fromArgs(args)
    return ${this.dataStructName}.toFixedFromValue(${byteSizeValue}).byteSize
  }

  /**
   * Fetches the minimum balance needed to exempt an account holding 
   * {@link ${this.accountDataClassName}} data from rent
   *
   * @param args need to be provided since the byte size for this account
   * depends on them
   * @param connection used to retrieve the rent exemption information
   */
  static async getMinimumBalanceForRentExemption(
    args: ${this.accountDataArgsTypeName},
    connection: web3.Connection,
    commitment?: web3.Commitment
  ): Promise<number> {
    return connection.getMinimumBalanceForRentExemption(
      ${this.accountDataClassName}.byteSize(args),
      commitment
    )
  }
  `.trim()
    } else {
      return `
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
   *
   * @param connection used to retrieve the rent exemption information
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
      `.trim()
    }
  }

  // -----------------
  // AccountData class
  // -----------------
  private renderAccountDiscriminatorVar() {
    if (!this.hasImplicitDiscriminator) return ''

    const accountDisc = JSON.stringify(
      Array.from(accountDiscriminator(this.account.name))
    )

    return `const ${this.accountDiscriminatorName} = ${accountDisc}`
  }

  private renderAccountDataClass(fields: { name: string; tsType: string }[]) {
    const constructorArgs = fields
      .map((f) => colonSeparatedTypedField(f, 'readonly '))
      .join(',\n    ')

    const constructorParams = fields
      .map((f) => `args.${f.name}`)
      .join(',\n      ')

    const prettyFields = this.getPrettyFields().join(',\n      ')
    const byteSizeMethods = this.renderByteSizeMethods()
    const accountDiscriminatorVar = this.renderAccountDiscriminatorVar()

    const serializeValue = this.hasImplicitDiscriminator
      ? `{ 
      accountDiscriminator: ${this.accountDiscriminatorName},
      ...this
    }`
      : 'this'

    return `
${accountDiscriminatorVar};
/**
 * Holds the data for the {@link ${this.upperCamelAccountName}Account} and provides de/serialization
 * functionality for that data
 */
export class ${this.accountDataClassName} implements ${this.accountDataArgsTypeName} {
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
    return ${this.dataStructName}.serialize(${serializeValue})
  }

  ${byteSizeMethods}

  /**
   * Returns a readable version of {@link ${this.accountDataClassName}} properties
   * and can be used to convert to JSON and/or logging
   */
  pretty() {
    return {
      ${prettyFields}
    };
  }
}`.trim()
  }

  // -----------------
  // Struct
  // -----------------
  private renderDataStruct(fields: TypeMappedSerdeField[]) {
    let discriminatorName: string | undefined
    let discriminatorField: TypeMappedSerdeField | undefined
    let discriminatorType: string | undefined

    if (this.hasImplicitDiscriminator) {
      discriminatorName = 'accountDiscriminator'
      discriminatorField = this.typeMapper.mapSerdeField(
        anchorDiscriminatorField('accountDiscriminator')
      )
      discriminatorType = anchorDiscriminatorType(
        this.typeMapper,
        `account ${this.account.name} discriminant type`
      )
    }

    return renderDataStruct({
      fields,
      structVarName: this.dataStructName,
      className: this.accountDataClassName,
      argsTypename: this.accountDataArgsTypeName,
      discriminatorName,
      discriminatorField,
      discriminatorType,
      isFixable: this.typeMapper.usedFixableSerde,
    })
  }

  render() {
    this.typeMapper.clearUsages()

    const typedFields = this.getTypedFields()
    const beetFields = this.serdeProcess()
    const enums = renderScalarEnums(this.typeMapper.scalarEnumsUsed).join('\n')
    const imports = this.renderImports()
    const accountDataArgsType = this.renderAccountDataArgsType(typedFields)
    const accountDataClass = this.renderAccountDataClass(typedFields)
    const dataStruct = this.renderDataStruct(beetFields)
    return `${imports}

${enums}

${accountDataArgsType}

${accountDataClass}

${dataStruct}`
  }
}

export function renderAccount(
  account: IdlAccount,
  forceFixable: ForceFixable,
  userDefinedEnums: Set<string>,
  hasImplicitDiscriminator: boolean
) {
  const typeMapper = new TypeMapper(forceFixable, userDefinedEnums)
  const renderer = new AccountRenderer(
    account,
    hasImplicitDiscriminator,
    typeMapper
  )
  return renderer.render()
}
