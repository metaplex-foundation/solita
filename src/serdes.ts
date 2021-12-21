import { UnreachableCaseError } from './utils'
import { strict as assert } from 'assert'

export const BEET_PACKAGE = '@metaplex-foundation/beet'
export const BEET_SOLANA_PACKAGE = '@metaplex-foundation/beet-solana'
export const SOLANA_WEB3_PACKAGE = '@solana/web3.js'
export const BEET_EXPORT_NAME = 'beet'
export const BEET_SOLANA_EXPORT_NAME = 'beetSolana'
export const SOLANA_WEB3_EXPORT_NAME = 'web3'
export type SerdePackage =
  | typeof BEET_PACKAGE
  | typeof BEET_SOLANA_PACKAGE
  | typeof SOLANA_WEB3_PACKAGE
export type SerdePackageExportName =
  | typeof BEET_EXPORT_NAME
  | typeof BEET_SOLANA_EXPORT_NAME
  | typeof SOLANA_WEB3_EXPORT_NAME

export function serdePackageExportName(
  pack: SerdePackage | undefined
): SerdePackageExportName | null {
  if (pack == null) return null
  switch (pack) {
    case BEET_PACKAGE:
      return BEET_EXPORT_NAME
    case BEET_SOLANA_PACKAGE:
      return BEET_SOLANA_EXPORT_NAME
    case SOLANA_WEB3_PACKAGE:
      return SOLANA_WEB3_EXPORT_NAME
    default:
      throw new UnreachableCaseError(pack)
  }
}

export function serdePackageTypePrefix(pack: SerdePackage | undefined): string {
  const packExportName = serdePackageExportName(pack)
  return packExportName == null ? '' : `${packExportName}.`
}

export function isKnownPackage(pack: string): pack is SerdePackage {
  return (
    pack === BEET_PACKAGE ||
    pack === BEET_SOLANA_PACKAGE ||
    pack === SOLANA_WEB3_PACKAGE
  )
}

export function assertKnownPackage(pack: string): asserts pack is SerdePackage {
  assert(
    isKnownPackage(pack),
    `${pack} is an unknown and thus not yet supported de/serializer package`
  )
}
