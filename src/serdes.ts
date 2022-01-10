import { UnreachableCaseError } from './utils'
import { strict as assert } from 'assert'
import {
  BEET_EXPORT_NAME,
  BEET_PACKAGE,
  BEET_SOLANA_EXPORT_NAME,
  BEET_SOLANA_PACKAGE,
  LOCAL_TYPES_EXPORT_NAME,
  LOCAL_TYPES_PACKAGE,
  SOLANA_WEB3_EXPORT_NAME,
  SOLANA_WEB3_PACKAGE,
  TypeMappedSerdeField,
} from './types'

export type SerdePackage =
  | typeof BEET_PACKAGE
  | typeof BEET_SOLANA_PACKAGE
  | typeof SOLANA_WEB3_PACKAGE
  | typeof LOCAL_TYPES_PACKAGE
export type SerdePackageExportName =
  | typeof BEET_EXPORT_NAME
  | typeof BEET_SOLANA_EXPORT_NAME
  | typeof SOLANA_WEB3_EXPORT_NAME
  | typeof LOCAL_TYPES_EXPORT_NAME

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
    case LOCAL_TYPES_PACKAGE:
      return LOCAL_TYPES_EXPORT_NAME
    default:
      throw new UnreachableCaseError(pack)
  }
}

export function serdePackageTypePrefix(pack: SerdePackage | undefined): string {
  const packExportName = serdePackageExportName(pack)
  return packExportName == null ? '' : `${packExportName}.`
}

export function isKnownSerdePackage(pack: string): pack is SerdePackage {
  return (
    pack === BEET_PACKAGE ||
    pack === BEET_SOLANA_PACKAGE ||
    pack === SOLANA_WEB3_PACKAGE
  )
}

export function assertKnownSerdePackage(
  pack: string
): asserts pack is SerdePackage {
  assert(
    isKnownSerdePackage(pack),
    `${pack} is an unknown and thus not yet supported de/serializer package`
  )
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
  fields: TypeMappedSerdeField[]
  structVarName: string
  className?: string
  argsTypename: string
  discriminatorName: string
}) {
  const fieldDecls =
    fields.length === 0
      ? ''
      : fields
          .map((f) => {
            return `['${f.name}', ${f.type}]`
          })
          .join(',\n    ')

  const structType =
    fields.length === 0
      ? `{ ${discriminatorName}: number[]; }`
      : `${argsTypename} & {
    ${discriminatorName}: number[];
  }
`

  // -----------------
  // Beet Struct (Account)
  // -----------------
  if (className != null) {
    return `const ${structVarName} = new ${BEET_EXPORT_NAME}.BeetStruct<
    ${className},
    ${structType}
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
    return `const ${structVarName} = new ${BEET_EXPORT_NAME}.BeetArgsStruct<${structType}>(
  [
    ['${discriminatorName}', ${BEET_EXPORT_NAME}.fixedSizeArray(${BEET_EXPORT_NAME}.u8, 8)],
    ${fieldDecls}
  ],
  '${argsTypename}'
)`
  }
}
