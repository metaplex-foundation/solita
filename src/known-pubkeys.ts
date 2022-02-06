import {
  SOLANA_SPL_TOKEN_EXPORT_NAME,
  SOLANA_SPL_TOKEN_PACKAGE,
  SOLANA_WEB3_EXPORT_NAME,
  SOLANA_WEB3_PACKAGE,
} from './types'
import { UnreachableCaseError } from './utils'

export type PubkeysPackage =
  | typeof SOLANA_WEB3_PACKAGE
  | typeof SOLANA_SPL_TOKEN_PACKAGE
export type PubkeysPackageExportName =
  | typeof SOLANA_WEB3_EXPORT_NAME
  | typeof SOLANA_SPL_TOKEN_EXPORT_NAME

const knownPubkeysMap: Map<
  string,
  {
    exp: string
    pack: PubkeysPackage
  }
> = new Map([
  ['tokenProgram', { exp: 'TOKEN_PROGRAM_ID', pack: SOLANA_SPL_TOKEN_PACKAGE }],
  [
    'ataProgram',
    { exp: 'ASSOCIATED_TOKEN_PROGRAM_ID', pack: SOLANA_SPL_TOKEN_PACKAGE },
  ],
  [
    'systemProgram',
    { exp: 'SystemProgram.programId', pack: SOLANA_WEB3_PACKAGE },
  ],
  ['rent', { exp: 'SYSVAR_RENT_PUBKEY', pack: SOLANA_WEB3_PACKAGE }],
])

function pubkeysPackageExportName(
  pack: PubkeysPackage
): PubkeysPackageExportName {
  switch (pack) {
    case SOLANA_SPL_TOKEN_PACKAGE:
      return SOLANA_SPL_TOKEN_EXPORT_NAME
    case SOLANA_WEB3_PACKAGE:
      return SOLANA_WEB3_EXPORT_NAME
    default:
      throw new UnreachableCaseError(pack)
  }
}

export type ResolvedKnownPubkey = {
  exp: string
  pack: PubkeysPackage
  packExportName: PubkeysPackageExportName
}

export function isKnownPubkey(id: string) {
  return knownPubkeysMap.has(id)
}

export function resolveKnownPubkey(id: string): ResolvedKnownPubkey | null {
  const item = knownPubkeysMap.get(id)
  if (item == null) return null

  const packExportName = pubkeysPackageExportName(item.pack)
  return { ...item, packExportName }
}

export function renderKnownPubkeyAccess({
  exp,
  packExportName,
}: ResolvedKnownPubkey) {
  return `${packExportName}.${exp}`
}
