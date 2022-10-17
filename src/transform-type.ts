import {
  BeetTypeMapKey,
  numbersTypeMap,
  NumbersTypeMapKey,
} from '@metaplex-foundation/beet'
import {
  IdlFieldsType,
  IdlDefinedTypeDefinition,
  IdlType,
  isFieldsType,
  isIdlTypeDefined,
  IdlTypeHashMap,
  IdlTypeBTreeMap,
  Idl,
  isShankIdl,
} from './types'
import { logWarn } from './utils'

const mapRx = /^(Hash|BTree)Map<([^,\s]+)\s?,([^>\s]+)\s?>/

/**
 * When anchor doesn't understand a type it just assumes it is a user defined one.
 * This includes HashMaps and BTreeMaps. However it doesn't check if that type
 * is actually defined somewhere.
 * Thus we end up with invalid types here like `HashMap<String,DataItem>` which
 * is basically just the type definition copied from the Rust code.
 *
 * This function attempts to fix this. At this point only top level struct
 * fields are supported.
 *
 * Whenever more cases of incorrect types are encountered this transformer needs
 * to be updated to handle them.
 */
export function adaptIdl(idl: Idl) {
  if (isShankIdl(idl)) return

  if (idl.types != null) {
    for (let i = 0; i < idl.types.length; i++) {
      idl.types[i] = transformDefinition(idl.types[i])
    }
  }
}

// -----------------
// Types
// -----------------
function transformDefinition(def: IdlDefinedTypeDefinition) {
  const ty = def.type
  if (isFieldsType(ty)) {
    def.type = transformFields(ty)
  }
  return def
}

function transformType(ty: IdlType) {
  if (isIdlTypeDefined(ty)) {
    const match = ty.defined.match(mapRx)
    if (match == null) return ty

    logWarn(
      `Discovered an incorrectly defined map '${ty.defined}' as part of the IDL.
Solita will attempt to fix this type, but you should inform the authors of the tool that generated the IDL about this issue`
    )
    const [_, mapTy, inner1, inner2] = match

    const innerTy1 = resolveType(inner1)
    const innerTy2 = resolveType(inner2)

    if (mapTy === 'Hash') {
      const map: IdlTypeHashMap = { hashMap: [innerTy1, innerTy2] }
      return map
    } else {
      const map: IdlTypeBTreeMap = { bTreeMap: [innerTy1, innerTy2] }
      return map
    }
  }
  return ty
}

function resolveType(ts: string): IdlType {
  const tslower = ts.toLowerCase()
  switch (tslower) {
    case 'string':
      return 'string' as BeetTypeMapKey
    case 'publicKey':
      return 'publicKey'
    default:
      if (numbersTypeMap[tslower as NumbersTypeMapKey] != null) {
        return tslower as NumbersTypeMapKey
      }
      // For now only supporting primitive key/val types when fixing anchor types
      // if the above doesn't match, then we assume it is a user defined type
      return { defined: ts }
  }
}

function transformFields(ty: IdlFieldsType) {
  for (const f of ty.fields) {
    f.type = transformType(f.type)
  }
  return ty
}

// -----------------
// Instruction
// -----------------
