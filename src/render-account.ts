import { PathLike } from 'fs'
import { renderScalarEnums } from './render-enums'
import { renderDataStruct } from './serdes'
import { CustomSerializers, SerializerSnippets } from './serializers'
import { ForceFixable, TypeMapper } from './type-mapper'
import {
  BEET_PACKAGE,
  hasPaddingAttr,
  IdlAccount,
  isIdlTypeDataEnum,
  isIdlTypeDefined,
  isIdlTypeScalarEnum,
  PrimitiveTypeKey,
  ResolveFieldType,
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
  readonly beetName: string

  readonly serializerSnippets: SerializerSnippets

  constructor(
    private readonly account: IdlAccount,
    private readonly fullFileDir: PathLike,
    private readonly hasImplicitDiscriminator: boolean,
    private readonly resolveFieldType: ResolveFieldType,
    private readonly typeMapper: TypeMapper,
    private readonly serializers: CustomSerializers
  ) {
    this.upperCamelAccountName = account.name
      .charAt(0)
      .toUpperCase()
      .concat(account.name.slice(1))

    this.camelAccountName = account.name
      .charAt(0)
      .toLowerCase()
      .concat(account.name.slice(1))

    this.accountDataClassName = this.upperCamelAccountName
    this.accountDataArgsTypeName = `${this.accountDataClassName}Args`
    this.beetName = `${this.camelAccountName}Beet`
    this.accountDiscriminatorName = `${this.camelAccountName}Discriminator`

    this.serializerSnippets = this.serializers.snippetsFor(
      this.account.name,
      this.fullFileDir as string,
      this.beetName
    )
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
      return { name: f.name, tsType, isPadding: hasPaddingAttr(f) }
    })
  }

  private getPrettyFields() {
    return this.account.type.fields
      .filter((f) => !hasPaddingAttr(f))
      .map((f) => {
        if (f.type === 'publicKey') {
          return `${f.name}: this.${f.name}.toBase58()`
        }
        if (
          f.type === 'u64' ||
          f.type === 'u128' ||
          f.type === 'u256' ||
          f.type === 'u512' ||
          f.type === 'i64' ||
          f.type === 'i128' ||
          f.type === 'i256' ||
          f.type === 'i512'
        ) {
          return `${f.name}: (() => {
        const x = <{ toNumber: () => number }>this.${f.name}
        if (typeof x.toNumber === 'function') {
          try {
            return x.toNumber()
          } catch (_) { return x }
        }
        return x
      })()`
        }

        if (isIdlTypeDefined(f.type)) {
          const resolved = this.resolveFieldType(f.type.defined)

          if (resolved != null && isIdlTypeScalarEnum(resolved)) {
            const tsType = this.typeMapper.map(f.type, f.name)
            const variant = `${tsType}[this.${f.name}`
            return `${f.name}: '${f.type.defined}.' + ${variant}]`
          }
          if (resolved != null && isIdlTypeDataEnum(resolved)) {
            // TODO(thlorenz): Improve rendering of data enums to include other fields
            return `${f.name}: this.${f.name}.__kind`
          }
        }

        return `${f.name}: this.${f.name}`
      })
  }

  // -----------------
  // Imports
  // -----------------
  private renderImports() {
    const imports = this.typeMapper.importsUsed(
      this.fullFileDir.toString(),
      new Set([SOLANA_WEB3_PACKAGE, BEET_PACKAGE])
    )
    return imports.join('\n')
  }

  // -----------------
  // Account Args
  // -----------------
  private renderAccountDataArgsType(
    fields: { name: string; tsType: string; isPadding: boolean }[]
  ) {
    const renderedFields = fields
      .filter((f) => !f.isPadding)
      .map((f) => colonSeparatedTypedField(f))
      .join('\n  ')

    return `/**
 * Arguments used to create {@link ${this.accountDataClassName}}
 * @category Accounts
 * @category generated
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
    return ${this.beetName}.toFixedFromValue(${byteSizeValue}).byteSize
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
    return ${this.beetName}.byteSize;
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

    return `export const ${this.accountDiscriminatorName} = ${accountDisc}`
  }

  private renderAccountDataClass(
    fields: { name: string; tsType: string; isPadding: boolean }[]
  ) {
    const constructorArgs = fields
      .filter((f) => !f.isPadding)
      .map((f) => colonSeparatedTypedField(f, 'readonly '))
      .join(',\n    ')

    const constructorParams = fields
      .filter((f) => !f.isPadding)
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
 * Holds the data for the {@link ${this.upperCamelAccountName}} Account and provides de/serialization
 * functionality for that data
 *
 * @category Accounts
 * @category generated
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
   * Retrieves the account info from the provided address and deserializes
   * the {@link ${this.accountDataClassName}} from its data.
   *
   * @throws Error if no account info is found at the address or if deserialization fails
   */
  static async fromAccountAddress(
    connection: web3.Connection,
    address: web3.PublicKey,
  ): Promise<${this.accountDataClassName}> {
    const accountInfo = await connection.getAccountInfo(address);
    if (accountInfo == null) {
      throw new Error(\`Unable to find ${this.accountDataClassName} account at \${address}\`);
    }
    return ${this.accountDataClassName}.fromAccountInfo(accountInfo, 0)[0];
  }


  /**
   * Deserializes the {@link ${this.accountDataClassName}} from the provided data Buffer.
   * @returns a tuple of the account data and the offset up to which the buffer was read to obtain it.
   */
  static deserialize(
    buf: Buffer,
    offset = 0
  ): [ ${this.accountDataClassName}, number ]{
    return ${this.serializerSnippets.deserialize}(buf, offset);
  }

  /**
   * Serializes the {@link ${this.accountDataClassName}} into a Buffer.
   * @returns a tuple of the created Buffer and the offset up to which the buffer was written to store it.
   */
  serialize(): [ Buffer, number ] {
    return ${this.serializerSnippets.serialize}(${serializeValue})
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
  private renderBeet(fields: TypeMappedSerdeField[]) {
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

    const struct = renderDataStruct({
      fields,
      structVarName: this.beetName,
      className: this.accountDataClassName,
      argsTypename: this.accountDataArgsTypeName,
      discriminatorName,
      discriminatorField,
      discriminatorType,
      isFixable: this.typeMapper.usedFixableSerde,
    })
    return `
/**
 * @category Accounts
 * @category generated
 */
${struct}`.trim()
  }

  render() {
    this.typeMapper.clearUsages()

    const typedFields = this.getTypedFields()
    const beetFields = this.serdeProcess()
    const enums = renderScalarEnums(this.typeMapper.scalarEnumsUsed).join('\n')
    const imports = this.renderImports()
    const accountDataArgsType = this.renderAccountDataArgsType(typedFields)
    const accountDataClass = this.renderAccountDataClass(typedFields)
    const beetDecl = this.renderBeet(beetFields)
    return `${imports}
${this.serializerSnippets.importSnippet}

${enums}

${accountDataArgsType}

${accountDataClass}

${beetDecl}

${this.serializerSnippets.resolveFunctionsSnippet}`
  }
}

export function renderAccount(
  account: IdlAccount,
  fullFileDir: PathLike,
  accountFilesByType: Map<string, string>,
  customFilesByType: Map<string, string>,
  typeAliases: Map<string, PrimitiveTypeKey>,
  serializers: CustomSerializers,
  forceFixable: ForceFixable,
  resolveFieldType: ResolveFieldType,
  hasImplicitDiscriminator: boolean
) {
  const typeMapper = new TypeMapper(
    accountFilesByType,
    customFilesByType,
    typeAliases,
    forceFixable
  )
  const renderer = new AccountRenderer(
    account,
    fullFileDir,
    hasImplicitDiscriminator,
    resolveFieldType,
    typeMapper,
    serializers
  )
  return renderer.render()
}
