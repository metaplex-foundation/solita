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
// IDL
// -----------------
export type IdlInstructionAccount = {
  name: string
  isMut: boolean
  isSigner: boolean
}

export type IdlType =
  | BeetTypeMapKey
  | 'publicKey'
  | IdlTypeDefined
  | IdlTypeOption
  | IdlTypeVec
  | IdlTypeArray

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

export type IdlInstructionArg = {
  name: string
  type: IdlType
}

export type IdlInstruction = {
  name: string
  accounts: IdlInstructionAccount[]
  args: IdlInstructionArg[]
}

export type IdlAccountField = {
  name: string
  type: IdlType
}

export type IdlAccountType = {
  kind: 'struct' | 'enum'
  fields: IdlAccountField[]
}

export type IdlAccount = {
  name: string
  type: IdlAccountType
}

export type IdlError = {
  code: number
  name: string
  msg: string
}

export type Idl = {
  version: string
  name: string
  instructions: IdlInstruction[]
  accounts?: IdlAccount[]
  errors?: IdlError[]
  metadata: {
    address: string
  }
}

// -----------------
// De/Serializers + Extensions
// -----------------
export type PrimaryTypeMap = Record<
  BeetTypeMapKey | BeetSolanaTypeMapKey,
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
