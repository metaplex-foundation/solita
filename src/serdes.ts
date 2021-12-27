import { UnreachableCaseError } from './utils'
import { strict as assert } from 'assert'
import { IdlAccountField, IdlInstructionArg, ProcessedSerde } from './types'
import { TypeMapper } from './type-mapper'

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

// -----------------
// Processing Account fields and Instruction args
// -----------------
export function serdeProcess(
  fields: (IdlAccountField | IdlInstructionArg)[],
  typeMapper: TypeMapper
): { processed: ProcessedSerde[]; needsBeetSolana: boolean } {
  let needsBeetSolana = false
  const processed = fields.map((f) => {
    // TODO(thlorenz): Handle Option types
    assert(typeof f.type === 'string', 'only supporting string types for now')
    typeMapper.assertBeetSupported(f.type, `account field ${f.name}`)
    const { pack, sourcePack } = typeMapper.map(f.type, f.name)
    if (sourcePack === BEET_SOLANA_PACKAGE) {
      needsBeetSolana = true
    }
    if (pack != null) {
      assertKnownPackage(pack)
    }
    const packExportName = serdePackageExportName(pack)
    return { name: f.name, packExportName, type: f.type, sourcePack }
  })
  return { processed, needsBeetSolana }
}

// -----------------
// Rendering processed serdes to struct
// -----------------
export function renderDataStruct({
  fields,
  structVarName,
  className,
  argsTypename,
  discriminatorName,
}: {
  fields: ProcessedSerde[]
  structVarName: string
  className?: string
  argsTypename: string
  discriminatorName: string
}) {
  const fieldDecls = fields
    .map(({ name, sourcePack, type }) => {
      const typePrefix = serdePackageTypePrefix(sourcePack)
      return `['${name}', ${typePrefix}${type}]`
    })
    .join(',\n    ')

  // -----------------
  // Beet Struct (Account)
  // -----------------
  if (className != null) {
    return `const ${structVarName} = new ${BEET_EXPORT_NAME}.BeetStruct<
    ${className},
    ${argsTypename} & {
    ${discriminatorName}: number[];
  }
>(
  [
    ['${discriminatorName}', ${BEET_EXPORT_NAME}.fixedSizeArray(${BEET_EXPORT_NAME}.u8, 8)],
    ${fieldDecls}
  ],
  ${className}.fromArgs,
  '${className}'
)`
  } else {
    // -----------------
    // Beet Args Struct (Instruction)
    // -----------------
    return `const ${structVarName} = new ${BEET_EXPORT_NAME}.BeetArgsStruct<
    ${argsTypename} & {
    ${discriminatorName}: number[];
  }
>(
  [
    ['${discriminatorName}', ${BEET_EXPORT_NAME}.fixedSizeArray(${BEET_EXPORT_NAME}.u8, 8)],
    ${fieldDecls}
  ],
  '${argsTypename}'
)`
  }
}
