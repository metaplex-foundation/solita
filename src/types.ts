export type AnchorInstructionAccount = {
  name: string
  isMut: boolean
  isSigner: boolean
}

export type AnchorInstructionArg = {
  name: string
  type: string | { option: 'string' }
}

export type AnchorInstruction = {
  name: string
  accounts: AnchorInstructionAccount[]
  args: AnchorInstructionArg[]
}

export type AnchorAccountField = {
  name: string
  type: string
}

export type AnchorAccount = {
  name: string
  kind: 'struct' // could also be enum?
  fields: AnchorAccountField[]
}

export type AnchorError = {
  code: number
  name: string
  msg: string
}

export type AnchorIDL = {
  version: string
  name: string
  instructions: AnchorInstruction[]
  accounts: AnchorAccount[]
  errors: AnchorError[]
}
