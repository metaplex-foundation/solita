export type TypeMapper = Record<string, string>
export const DEFAULT_TYPE_MAPPER: TypeMapper = {
  u8: 'number',
  u16: 'number',
  u32: 'number',
  u64: 'number',
  u128: 'BN',
  u256: 'BN',
  i8: 'number',
  i16: 'number',
  i32: 'number',
  i64: 'number',
  i128: 'BN',
  i256: 'BN',
  bool: 'boolean',
  publicKey: 'PublicKey',
}
