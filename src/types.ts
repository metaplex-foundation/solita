// Currently a limited version of the types found inside https://github.com/project-serum/anchor/blob/master/ts/src/idl.ts
// Will be extended to include the full spec eventually. At this point only cases actually encountered in contracts were
// addressed

import {
  BeetExports,
  BeetTypeMapKey,
  numbersTypeMap,
  NumbersTypeMapKey,
  SupportedTypeDefinition,
} from '@metaplex-foundation/beet'
import {
  BeetSolanaExports,
  BeetSolanaTypeMapKey,
} from '@metaplex-foundation/beet-solana'
import { SerdePackage } from './serdes'
import { strict as assert } from 'assert'

// -----------------
// Config
// -----------------
export type TypeAliases = Record<string, PrimitiveTypeKey>
/**
 * Key: account name for which to customize de/serializer
 * Value: path to module from project root providing `serialize` and/or
 *        `deserialize` methods
 */
export type Serializers = Record<string, string>

// -----------------
// IDL
// -----------------
export type IdlField = {
  name: string
  type: IdlType
  attrs?: string[]
}
export const IDL_FIELD_ATTR_PADDING = 'padding'

export type IdlInstructionAccount = {
  name: string
  isMut: boolean
  isSigner: boolean
  desc?: string
  optional?: boolean
}

export type IdlType =
  | BeetTypeMapKey
  | 'publicKey'
  | IdlTypeDefined
  | IdlTypeOption
  | IdlTypeVec
  | IdlTypeArray
  | IdlTypeEnum
  | IdlTypeDataEnum
  | IdlTypeTuple
  | IdlTypeMap

// User defined type.
export type IdlTypeDefined = {
  defined: string
}

export type IdlTypeOption = {
  option: IdlType
}

export type IdlTypeVec = {
  vec: IdlType
}

export type IdlTypeArray = {
  array: [idlType: IdlType, size: number]
}

// -----------------
// Enums
// -----------------
export type IdlEnumVariant = {
  name: string
}

export type IdlDataEnumVariant =
  | IdlDataEnumVariantWithNamedFields
  | IdlDataEnumVariantWithUnnamedFields
  // Rust allows mixing data variants with scalar variants
  | IdlEnumVariant

export type IdlDataEnumVariantWithNamedFields = {
  name: string
  fields: IdlField[]
}

export type IdlDataEnumVariantWithUnnamedFields = {
  name: string
  fields: IdlType[]
}

export type IdlTypeEnum = IdlTypeScalarEnum | IdlTypeDataEnum
export type IdlTypeScalarEnum = {
  kind: 'enum'
  name?: string
  variants: IdlEnumVariant[]
}

export type IdlTypeDataEnum = {
  kind: 'enum'
  name?: string
  variants: IdlDataEnumVariant[]
}

export type IdlTypeTuple = {
  tuple: IdlType[]
}

// -----------------
// Maps
// -----------------
export type IdlTypeMap = IdlTypeHashMap | IdlTypeBTreeMap
export type IdlTypeHashMap = {
  hashMap: [IdlType, IdlType]
}
export type IdlTypeBTreeMap = {
  bTreeMap: [IdlType, IdlType]
}

// -----------------
// Defined
// -----------------
export type IdlFieldsType = {
  kind: 'struct' | 'enum'
  fields: IdlField[]
}

export type IdlDefinedTypeDefinition = {
  name: string
  type: IdlFieldsType | IdlTypeEnum | IdlTypeDataEnum
}

// -----------------
// Instruction
// -----------------
export type IdlInstructionArg = {
  name: string
  type: IdlType
}

export type IdlInstruction = {
  name: string
  accounts: IdlInstructionAccount[]
  args: IdlInstructionArg[]
}

// -----------------
// Account
// -----------------
export type IdlAccountType = {
  kind: 'struct' | 'enum'
  fields: IdlField[]
}

export type IdlAccount = {
  name: string
  type: IdlAccountType
}

export type IdlError = {
  code: number
  name: string
  msg?: string
}

export type Idl = {
  version: string
  name: string
  instructions: IdlInstruction[]
  accounts?: IdlAccount[]
  errors?: IdlError[]
  types?: IdlDefinedTypeDefinition[]
  metadata: {
    address: string
  }
}

// -----------------
// Shank Idl Extensions
// -----------------
export type ShankIdl = Idl & {
  instructions: ShankIdlInstruction[]
  metadata: ShankMetadata
}
export type ShankIdlInstruction = IdlInstruction & {
  accounts: IdlInstructionAccountWithDesc[]
  discriminant: {
    type: IdlType
    value: number
  }
}
export type IdlInstructionAccountWithDesc = IdlInstructionAccount & {
  desc: string
}
export type ShankMetadata = Idl['metadata'] & { origin: 'shank' }

// -----------------
// De/Serializers + Extensions
// -----------------
export type PrimitiveTypeKey = BeetTypeMapKey | BeetSolanaTypeMapKey
export type PrimaryType = SupportedTypeDefinition & {
  beet: BeetExports | BeetSolanaExports
}
export type PrimaryTypeMap = Record<PrimitiveTypeKey, PrimaryType>
export type ProcessedSerde = {
  name: string
  sourcePack: SerdePackage
  type: string
  inner?: ProcessedSerde
}

export type TypeMappedSerdeField = {
  name: string
  type: string
}

// -----------------
// Resolvers
// -----------------
export type ResolveFieldType = (
  typeName: string
) => IdlAccountType | IdlTypeEnum | null
// -----------------
// Guards
// -----------------
export function isIdlTypeOption(ty: IdlType): ty is IdlTypeOption {
  return (ty as IdlTypeOption).option != null
}
export function isIdlTypeVec(ty: IdlType): ty is IdlTypeVec {
  return (ty as IdlTypeVec).vec != null
}

export function isIdlTypeArray(ty: IdlType): ty is IdlTypeArray {
  return (ty as IdlTypeArray).array != null
}

export function asIdlTypeArray(ty: IdlType): IdlTypeArray {
  assert(isIdlTypeArray(ty))
  return ty
}

export function isIdlTypeDefined(ty: IdlType): ty is IdlTypeDefined {
  return (ty as IdlTypeDefined).defined != null
}

export function isIdlTypeEnum(
  ty: IdlType | IdlFieldsType | IdlTypeEnum
): ty is IdlTypeEnum {
  return (ty as IdlTypeEnum).variants != null
}

// -----------------
// Enums
// -----------------
export function isIdlTypeDataEnum(
  ty: IdlType | IdlFieldsType | IdlTypeEnum
): ty is IdlTypeDataEnum {
  const dataEnum = ty as IdlTypeDataEnum
  return (
    dataEnum.variants != null &&
    dataEnum.variants.length > 0 &&
    // if only one variant has data then we have to treat the entire enum as a data enum
    // since we can no longer represent it as a TypeScript enum
    dataEnum.variants.some(isDataEnumVariant)
  )
}

export function isIdlTypeScalarEnum(
  ty: IdlType | IdlFieldsType | IdlTypeEnum
): ty is IdlTypeScalarEnum {
  return isIdlTypeEnum(ty) && !isIdlTypeDataEnum(ty)
}

export function isDataEnumVariant(
  ty: IdlDataEnumVariant
): ty is
  | IdlDataEnumVariantWithNamedFields
  | IdlDataEnumVariantWithUnnamedFields {
  return (
    (
      ty as
        | IdlDataEnumVariantWithNamedFields
        | IdlDataEnumVariantWithUnnamedFields
    ).fields != null
  )
}

export function isDataEnumVariantWithNamedFields(
  ty: IdlDataEnumVariant
): ty is IdlDataEnumVariantWithNamedFields {
  return (
    isDataEnumVariant(ty) &&
    (ty as IdlDataEnumVariantWithNamedFields).fields[0].name != null
  )
}

export function isDataEnumVariantWithUnnamedFields(
  ty: IdlDataEnumVariant
): ty is IdlDataEnumVariantWithUnnamedFields {
  return !isDataEnumVariantWithNamedFields(ty)
}

// -----------------
// Tuple
// -----------------
export function isIdlTypeTuple(ty: IdlType): ty is IdlTypeTuple {
  return (ty as IdlTypeTuple).tuple != null
}

// -----------------
// Maps
// -----------------
export function isIdlTypeHashMap(ty: IdlType): ty is IdlTypeHashMap {
  return (ty as IdlTypeHashMap).hashMap != null
}

export function isIdlTypeBTreeMap(ty: IdlType): ty is IdlTypeBTreeMap {
  return (ty as IdlTypeBTreeMap).bTreeMap != null
}

export function isIdlTypeMap(ty: IdlType): ty is IdlTypeMap {
  return isIdlTypeHashMap(ty) || isIdlTypeBTreeMap(ty)
}

export function isIdlFieldsType(
  ty: IdlType | IdlFieldsType
): ty is IdlFieldsType {
  return (ty as IdlFieldsType).fields != null
}

// -----------------
// Struct/Enum
// -----------------

export function isFieldsType(
  ty: IdlFieldsType | IdlTypeEnum | IdlTypeDataEnum
): ty is IdlFieldsType {
  const dety = ty as IdlFieldsType
  return (
    (dety.kind === 'enum' || dety.kind === 'struct') &&
    Array.isArray(dety.fields)
  )
}

// -----------------
// Idl
// -----------------
export function isShankIdl(ty: Idl): ty is ShankIdl {
  return (ty as ShankIdl).metadata?.origin === 'shank'
}

export function isShankIdlInstruction(
  ty: IdlInstruction
): ty is ShankIdlInstruction {
  return typeof (ty as ShankIdlInstruction).discriminant === 'object'
}

export function isIdlInstructionAccountWithDesc(
  ty: IdlInstructionAccount
): ty is IdlInstructionAccountWithDesc {
  return typeof (ty as IdlInstructionAccountWithDesc).desc === 'string'
}

// -----------------
// Padding
// -----------------
export function hasPaddingAttr(field: IdlField): boolean {
  return field.attrs != null && field.attrs.includes(IDL_FIELD_ATTR_PADDING)
}

// -----------------
// Primitivies
// -----------------
// NOTE: part of this could be moved to beet
export type PrimitiveType = Exclude<NumbersTypeMapKey, typeof BIGNUM>
export const BIGNUM = [
  'u64',
  'u128',
  'u256',
  'u512',
  'i64',
  'i128',
  'i256',
  'i512',
] as const
export type Bignum = typeof BIGNUM[number]
export function isNumberLikeType(ty: IdlType): ty is NumbersTypeMapKey {
  return (
    typeof ty === 'string' && numbersTypeMap[ty as NumbersTypeMapKey] != null
  )
}
export function isPrimitiveType(ty: IdlType): ty is PrimitiveType {
  return isNumberLikeType(ty) && !BIGNUM.includes(ty as Bignum)
}

// -----------------
// Packages
// -----------------
export const BEET_PACKAGE = '@metaplex-foundation/beet'
export const BEET_SOLANA_PACKAGE = '@metaplex-foundation/beet-solana'
export const SOLANA_WEB3_PACKAGE = '@solana/web3.js'
export const SOLANA_SPL_TOKEN_PACKAGE = '@solana/spl-token'
export const BEET_EXPORT_NAME = 'beet'
export const BEET_SOLANA_EXPORT_NAME = 'beetSolana'
export const SOLANA_WEB3_EXPORT_NAME = 'web3'
export const SOLANA_SPL_TOKEN_EXPORT_NAME = 'splToken'

export const PROGRAM_ID_PACKAGE = '<program-id>'
export const PROGRAM_ID_EXPORT_NAME = '<program-id-export>'
