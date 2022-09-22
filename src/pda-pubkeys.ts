import {
  IdlInstructionAccount,
  IdlInstructionArg,
  IdlPda,
  IdlPdaConst,
  IdlSeed,
  IdlSeedAccount,
  IdlSeedArg,
  IdlSeedConst,
  IdlTypeSeed,
  isIdlPdaConst,
  isIdlSeedAccount,
  isIdlSeedArg,
  isIdlSeedConst,
  isIdlTypeSeed,
  ProcessedAccountKey,
  ProcessedAccountKeyWithPda,
  SOLANA_WEB3_EXPORT_NAME,
} from './types'
import { PublicKey } from '@solana/web3.js'
import camelcase from 'camelcase'

function idlPdaToSeedArray(pda: IdlPda): IdlSeed[] {
  return pda.programId ? [pda.programId, ...pda.seeds] : [...pda.seeds]
}

export function isIdlPdaAccountEligible(
  accountWithPda: ProcessedAccountKeyWithPda,
  processedKeys: ProcessedAccountKey[],
  ixName: string
): boolean {
  const seedArray = idlPdaToSeedArray(accountWithPda.pda)
  for (const seed of seedArray) {
    if (isIdlSeedAccount(seed)) {
      const pathComponents = seed.path.split('.')
      if (pathComponents.length === 1) {
        const fieldPubkey = camelcase(pathComponents[0])
        const referencedField = processedKeys.find(
          (key) => camelcase(key.name) === fieldPubkey
        )
        if (referencedField === undefined) {
          throw new Error(
            `fieldPubkey '${fieldPubkey}' referenced in the PDA constraints for '${accountWithPda.name}' was not found in the accounts array for the '${ixName}' instruction!`
          )
        } else if (
          referencedField.optional ||
          (referencedField.pda && !isIdlPdaConst(referencedField.pda))
        ) {
          // can't derive seeds if the field is optional or if its reliant on another non const PDA.
          // TODO: add helper methods to find this stuff
          return false
        }
      } else {
        // this means it references a field in another account, which
        // would require fetching that account data from on chain.
        // TODO: make a helper function to find this PDA async
        return false
      }
    }
  }
  return true
}

function parseIdlSeeed(
  seed: IdlSeed,
  args: IdlInstructionArg[],
  accounts: IdlInstructionAccount[]
): string {
  if (isIdlSeedConst(seed)) {
    return parseIdlSeedConst(seed)
  } else if (isIdlSeedArg(seed)) {
    return parseIdlSeedArg(seed, args)
  } else {
    return parseIdlSeedAccount(seed, accounts)
  }
}

function parseIdlSeedValueString(type: IdlTypeSeed, value: any): string {
  switch (type) {
    case 'u8':
      return `Buffer.from([${value}])`
    case 'u16':
      return `
      (()=>{
        const buf = Buffer.alloc(2)
        buf.writeUInt16LE(${value})
        return buf
      })()`
    case 'u32':
      return `
      (()=>{
        const buf = Buffer.alloc(4)
        buf.writeUInt32LE(${value})
        return buf
      })()`
    case 'u64':
      return `
      (()=>{
        const buf = Buffer.alloc(8)
        buf.writeBigUInt64LE(BigInt(${value}))
        return buf
      })()`
    case 'string':
      return `Buffer.from("${value}", 'utf8')`
    case 'publicKey':
      return `${value}.toBuffer()`
    default:
      if (type.array) {
        return `Buffer.from([${value}])`
      }
      throw new Error(`Unexpected seed type: ${type}`)
  }
}

function parseIdlSeedValue(type: IdlTypeSeed, value: any): Uint8Array {
  switch (type) {
    case 'u8':
      return Buffer.from([value])
    case 'u16':
      const bU16 = Buffer.alloc(2)
      bU16.writeUInt16LE(value)
      return bU16
    case 'u32':
      let bU32 = Buffer.alloc(4)
      bU32.writeUInt32LE(value)
      return bU32
    case 'u64':
      let bU64 = Buffer.alloc(8)
      bU64.writeBigUInt64LE(BigInt(value))
      return bU64
    case 'string':
      return Buffer.from(value, 'utf8')
    case 'publicKey':
      return value.toBuffer()
    default:
      if (type.array) {
        return Buffer.from(value)
      }
      throw new Error(`Unexpected seed type: ${type}`)
  }
}

function parseIdlSeedConst(seed: IdlSeedConst): string {
  return parseIdlSeedValueString(seed.type, seed.value)
}

function parseIdlSeedArg(seed: IdlSeedArg, args: IdlInstructionArg[]): string {
  const seedArgName = camelcase(seed.path.split('.')[0])
  const ixArg = args.find((arg) => camelcase(arg.name) === seedArgName)
  if (ixArg === undefined) {
    throw new Error(`Unable to parse argument for seed ${seedArgName}`)
  } else if (!isIdlTypeSeed(ixArg.type)) {
    throw new Error(
      `Argument for seed ${seedArgName} has unsupported type: ${ixArg.type}`
    )
  }
  const argType = ixArg.type
  return parseIdlSeedValueString(argType, `args.${seedArgName}`)
}

function parseIdlSeedAccount(
  seed: IdlSeedAccount,
  accounts: IdlInstructionAccount[]
): string {
  const seedAccountName = camelcase(seed.path.split('.')[0])
  const ixAccount = accounts.find(
    (account) => camelcase(account.name) === seedAccountName
  )
  if (ixAccount === undefined) {
    throw new Error(`Unable to parse account for seed ${ixAccount}`)
  }
  return parseIdlSeedValueString('publicKey', `accounts.${seedAccountName}`)
}

export function getIdlPdaConstValue(
  pda: IdlPdaConst,
  programIdString: string
): PublicKey {
  const programId = new PublicKey(
    pda.programId
      ? parseIdlSeedValue(pda.programId.type, pda.programId.value)
      : programIdString
  )
  const seeds = pda.seeds.map(({ type, value }) =>
    parseIdlSeedValue(type, value)
  )
  return PublicKey.findProgramAddressSync(seeds, programId)[0]
}

export function renderPdaPubkey(
  pda: IdlPda,
  args: IdlInstructionArg[],
  accounts: IdlInstructionAccount[],
  programIdPubkey: string
): string {
  const seeds = `[${pda.seeds
    .map((seed) => parseIdlSeeed(seed, args, accounts))
    .join()}]`
  const programId = pda.programId
    ? `${SOLANA_WEB3_EXPORT_NAME}.PublicKey.new(${parseIdlSeeed(
        pda.programId,
        args,
        accounts
      )})`
    : programIdPubkey
  return `${SOLANA_WEB3_EXPORT_NAME}.PublicKey.findProgramAddressSync(${seeds},${programId})[0]`
}
