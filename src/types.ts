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
  type: string
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
  accounts: IdlAccount[]
  errors: IdlError[]
}

export type PrimaryTypeMap = Record<
  BeetTypeMapKey | BeetSolanaTypeMapKey,
  SupportedTypeDefinition & {
    beet: BeetExports | BeetSolanaExports
  }
>
