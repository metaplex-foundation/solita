// Currently a limited version of the types found inside https://github.com/project-serum/anchor/blob/master/ts/src/idl.ts
// Will be extended to include the full spec eventually. At this point only cases actually encountered in contracts were
// addressed

import {
  BeetExports,
  BeetTypeMapKey,
  SupportedTypeDefinition,
} from '@metaplex-foundation/beet'
import {
  BeetSolanaExports,
  BeetSolanaTypeMapKey,
} from '@metaplex-foundation/beet-solana'
import { SerdePackage } from './serdes'

// -----------------
// Config
// -----------------
export type TypeAliases = Record<string, PrimitiveTypeKey>

// -----------------
// IDL
// -----------------
export type IdlField = {
  name: string
  type: IdlType
}

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

export type IdlEnumVariant = {
  name: string
}

export type IdlTypeEnum = {
  kind: 'enum'
  variants: IdlEnumVariant[]
}

export type IdlDefinedType = {
  kind: 'struct' | 'enum'
  fields: IdlField[]
}

export type IdlDefinedTypeDefinition = {
  name: string
  type: IdlDefinedType | IdlTypeEnum
}

export type IdlInstructionArg = {
  name: string
  type: IdlType
}

export type IdlInstruction = {
  name: string
  accounts: IdlInstructionAccount[]
  args: IdlInstructionArg[]
}

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
export type PrimaryTypeMap = Record<
  PrimitiveTypeKey,
  SupportedTypeDefinition & {
    beet: BeetExports | BeetSolanaExports
  }
>
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

export function isIdlTypeDefined(ty: IdlType): ty is IdlTypeDefined {
  return (ty as IdlTypeDefined).defined != null
}

export function isIdlTypeEnum(
  ty: IdlType | IdlDefinedType | IdlTypeEnum
): ty is IdlTypeEnum {
  return (ty as IdlTypeEnum).variants != null
}

export function isIdlDefinedType(
  ty: IdlType | IdlDefinedType
): ty is IdlDefinedType {
  return (ty as IdlDefinedType).fields != null
}

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
