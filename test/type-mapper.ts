import test from 'tape'
import spok, { Specifications } from 'spok'
import { TypeMapper } from '../src/type-mapper'
import { BEET_PACKAGE, BEET_SOLANA_PACKAGE, IdlType } from '../src/types'

test('type-mapper: primitive types - numbers', (t) => {
  const tm = new TypeMapper()

  for (const n of <IdlType[]>['i8', 'u32', 'i16']) {
    const res = tm.map(n)
    spok(t, res, {
      $topic: n,
      typescriptType: 'number',
      pack: spok.notDefined,
      sourcePack: BEET_PACKAGE,
    } as Specifications<IdlType>)
  }
  t.end()
})

test('type-mapper: primitive types - bignums', (t) => {
  const tm = new TypeMapper()

  for (const n of <IdlType[]>['i64', 'u128', 'i256', 'u512']) {
    const res = tm.map(n)
    spok(t, res, {
      $topic: n,
      typescriptType: 'bignum',
      pack: BEET_PACKAGE,
      sourcePack: BEET_PACKAGE,
    } as Specifications<IdlType>)
  }
  t.end()
})

test('type-mapper: composite types - option<number | bignum>', (t) => {
  const tm = new TypeMapper()

  {
    const res = tm.map({
      option: 'u16',
    })
    spok(t, res, {
      $topic: 'option<u16>',
      typescriptType: 'beet.COption<number>',
      pack: spok.notDefined,
      sourcePack: BEET_PACKAGE,
    } as Specifications<IdlType>)
  }

  {
    const res = tm.map({
      option: 'u64',
    })
    spok(t, res, {
      $topic: 'option<u16>',
      typescriptType: 'beet.COption<beet.bignum>',
      pack: spok.notDefined,
      sourcePack: BEET_PACKAGE,
    } as Specifications<IdlType>)
  }
  t.end()
})
