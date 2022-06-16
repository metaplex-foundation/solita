import { strict as assert } from 'assert'
import {
  BEET_EXPORT_NAME,
  BEET_PACKAGE,
  BEET_SOLANA_EXPORT_NAME,
  BEET_SOLANA_PACKAGE,
  SOLANA_WEB3_EXPORT_NAME,
  SOLANA_WEB3_PACKAGE,
  TypeMappedSerdeField,
} from './types'

export type SerdePackage =
  | typeof BEET_PACKAGE
  | typeof BEET_SOLANA_PACKAGE
  | typeof SOLANA_WEB3_PACKAGE

export type SerdePackageExportName =
  | typeof BEET_EXPORT_NAME
  | typeof BEET_SOLANA_EXPORT_NAME
  | typeof SOLANA_WEB3_EXPORT_NAME

export const serdePackages: Map<SerdePackage, SerdePackageExportName> = new Map(
  [
    [BEET_PACKAGE, BEET_EXPORT_NAME],
    [BEET_SOLANA_PACKAGE, BEET_SOLANA_EXPORT_NAME],
    [SOLANA_WEB3_PACKAGE, SOLANA_WEB3_EXPORT_NAME],
  ]
)

const packsByLengthDesc = Array.from(serdePackages.keys()).sort((a, b) =>
  a.length > b.length ? -1 : 1
)

export function serdePackageExportName(
  pack: SerdePackage | undefined
): SerdePackageExportName | null {
  if (pack == null) return null

  const exportName = serdePackages.get(pack)
  assert(exportName != null, `Unknown serde package ${pack}`)
  return exportName
}

export function extractSerdePackageFromImportStatment(importStatement: string) {
  // Avoiding matching on 'beet' for 'beet-solana' by checking longer keys first
  for (const pack of packsByLengthDesc) {
    const exportName = serdePackages.get(pack)!

    if (importStatement.includes(pack)) {
      assert(
        importStatement.includes(`as ${exportName}`),
        `${importStatement} should import ${pack} as ${exportName}`
      )
      return pack
    }
  }
  return null
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

function renderField(field?: TypeMappedSerdeField, addSeparator = false) {
  const sep = addSeparator ? ',' : ''
  return field == null ? '' : `['${field.name}', ${field.type}]${sep}`
}

function renderFields(fields?: TypeMappedSerdeField[]) {
  return fields == null || fields.length === 0
    ? ''
    : fields.map((x) => renderField(x)).join(',\n    ')
}

/**
 * Renders DataStruct for Instruction Args and Account Args
 */
export function renderDataStruct({
  fields,
  structVarName,
  className,
  argsTypename,
  discriminatorField,
  discriminatorName,
  discriminatorType,
  paddingField,
  isFixable,
}: {
  discriminatorName?: string
  discriminatorField?: TypeMappedSerdeField
  discriminatorType?: string
  paddingField?: { name: string; size: number }
  fields: TypeMappedSerdeField[]
  structVarName: string
  className?: string
  argsTypename: string
  isFixable: boolean
}) {
  const fieldDecls = renderFields(fields)
  const discriminatorDecl = renderField(discriminatorField, true)
  discriminatorType = discriminatorType ?? 'number[]'

  const extraFields = []
  if (discriminatorName != null) {
    extraFields.push(`${discriminatorName}: ${discriminatorType}`)
  }
  if (paddingField != null) {
    extraFields.push(
      `${paddingField.name}: number[] /* size: ${paddingField.size} */`
    )
  }

  let structType =
    fields.length === 0
      ? `{ ${extraFields.join('\n    ')} }`
      : extraFields.length === 0
      ? argsTypename
      : `${argsTypename} & {
      ${extraFields.join('\n      ')}
  }
`

  // -----------------
  // Beet Struct (Account)
  // -----------------
  if (className != null) {
    const beetStructType = isFixable ? 'FixableBeetStruct' : 'BeetStruct'
    return `export const ${structVarName} = new ${BEET_EXPORT_NAME}.${beetStructType}<
    ${className},
    ${structType}
>(
  [
    ${discriminatorDecl}
    ${fieldDecls}
  ],
  ${className}.fromArgs,
  '${className}'
)`
  } else {
    const beetArgsStructType = isFixable
      ? 'FixableBeetArgsStruct'
      : 'BeetArgsStruct'
    // -----------------
    // Beet Args Struct (Instruction)
    // -----------------
    return `export const ${structVarName} = new ${BEET_EXPORT_NAME}.${beetArgsStructType}<${structType}>(
  [
    ${discriminatorDecl}
    ${fieldDecls}
  ],
  '${argsTypename}'
)`
  }
}

/**
 * Renders DataStruct for user defined types
 */
export function renderTypeDataStruct({
  fields,
  beetVarName,
  typeName,
  isFixable,
}: {
  fields: TypeMappedSerdeField[]
  beetVarName: string
  typeName: string
  isFixable: boolean
}) {
  assert(
    fields.length > 0,
    `Rendering struct for ${typeName} should have at least 1 field`
  )
  const fieldDecls = fields
    .map((f) => {
      return `['${f.name}', ${f.type}]`
    })
    .join(',\n    ')

  const beetArgsStructType = isFixable
    ? 'FixableBeetArgsStruct'
    : 'BeetArgsStruct'

  // -----------------
  // Beet Args Struct (Instruction)
  // -----------------
  return `const ${beetVarName} = new ${BEET_EXPORT_NAME}.${beetArgsStructType}<${typeName}>(
  [
    ${fieldDecls}
  ],
  '${typeName}'
)`
}
