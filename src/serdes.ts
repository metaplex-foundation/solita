import { UnreachableCaseError } from './utils'
import { strict as assert } from 'assert'
import {
  BEET_EXPORT_NAME,
  BEET_PACKAGE,
  BEET_SOLANA_EXPORT_NAME,
  BEET_SOLANA_PACKAGE,
  IdlField,
  IdlInstructionArg,
  IdlType,
  IdlTypeOption,
  ProcessedSerde,
  SOLANA_WEB3_EXPORT_NAME,
  SOLANA_WEB3_PACKAGE,
} from './types'
import { resolveSerdeAlias, TypeMapper } from './type-mapper'

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
// Processing Account fields and Instruction args
// -----------------
function processField(
  field: { name: string; type: IdlType },
  typeMapper: TypeMapper
): ProcessedSerde {
  if (typeof field.type === 'string') {
    typeMapper.assertBeetSupported(field.type, `account field ${field.name}`)
    const { pack, sourcePack } = typeMapper.map(field.type, field.name)
    if (pack != null) {
      assertKnownSerdePackage(pack)
    }
    return { name: field.name, type: field.type, sourcePack }
  }
  const optionType: IdlTypeOption = field.type as IdlTypeOption
  if (optionType.option != null) {
    const sourcePack = BEET_PACKAGE

    const inner = processField(
      { name: '<inner>', type: optionType.option },
      typeMapper
    )
    return {
      name: field.name,
      type: 'option',
      sourcePack,
      inner,
    }
  }

  throw new Error('Only option and string field types supported for now')
}

export function serdeProcess(
  fields: (IdlField | IdlInstructionArg)[],
  typeMapper: TypeMapper
): { processed: ProcessedSerde[]; needsBeetSolana: boolean } {
  const processed = fields.map((f) => processField(f, typeMapper))
  const needsBeetSolana = processed.some(
    (x) => x.sourcePack === BEET_SOLANA_PACKAGE
  )
  return { processed, needsBeetSolana }
}

// -----------------
// Rendering processed serdes to struct
// -----------------
function renderFieldType({ sourcePack, type, inner }: ProcessedSerde) {
  const typePrefix = serdePackageTypePrefix(sourcePack)
  const ty = resolveSerdeAlias(type)
  if (inner == null) {
    return `${typePrefix}${ty}`
  }

  const renderedInnerType: string = renderFieldType(inner)
  return `${typePrefix}${ty}(${renderedInnerType})`
}

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
  const fieldDecls =
    fields.length === 0
      ? ''
      : fields
          .map((f) => {
            const renderedType = renderFieldType(f)
            return `['${f.name}', ${renderedType}]`
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
