import { AccountMeta, PublicKey, TransactionInstruction } from '@solana/web3.js'
import * as beet from '@metaplex-foundation/beet'

export type InitializeInstructionArgs = {}
const initializeInstructionArgsStruct = new beet.BeetArgsStruct<
  InitializeInstructionArgs & {
    instructionDiscriminator: number[]
  }
>(
  [['instructionDiscriminator', beet.fixedSizeArray(beet.u8, 8)]],
  'InitializeInstructionArgs'
)
export type InitializeInstructionAccounts = {}

const initializeAccountDiscriminator = [175, 175, 109, 31, 13, 152, 155, 237]

export function createInitializeInstruction(
  accounts: InitializeInstructionAccounts,
  args: InitializeInstructionArgs
) {
  const {} = accounts

  const [data] = initializeInstructionArgsStruct.serialize({
    instructionDiscriminator: initializeAccountDiscriminator,
    ...args,
  })
  const keys: AccountMeta[] = []

  const ix = new TransactionInstruction({
    programId: new PublicKey('FSXmW2S4p2wJD1JXujLCWU97BJkfipQNxw67GexUtDjw'),
    keys,
    data,
  })
  return ix
}
