type AnchorInstructionAccount = {
  name: string
  isMut: boolean
  isSigner: boolean
}

type AnchorInstruction = {
  name: string
  accounts: AnchorInstructionAccount[]
}

type AnchorAccountField = {
  name: string
  type: string
}

type AnchorAccount = {
  name: string
  kind: 'struct' // could also be enum?
  fields: AnchorAccountField[]
}

type AnchorError = {
  code: number
  name: string
  msg: string
}

type AnchorIDL = {
  version: string
  name: string
  instructions: AnchorInstruction[]
  accounts: AnchorAccount[]
  errors: AnchorError[]
}
