import { IdlType } from './types'

export type TypeMapper = Record<IdlType & string, string>
export const DEFAULT_TYPE_MAPPER: TypeMapper = {
  u8: 'number',
  u16: 'number',
  u32: 'number',
  u64: 'number',
  u128: 'BN',
  i8: 'number',
  i16: 'number',
  i32: 'number',
  i64: 'number',
  i128: 'BN',
  bool: 'boolean',
  string: 'string',
  bytes: 'Buffer',
  publicKey: 'PublicKey',
}
